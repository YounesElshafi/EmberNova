import asyncio
import csv
import hashlib
import io
import json
import secrets
import zipfile
from contextlib import asynccontextmanager
from urllib.parse import urlsplit

import yaml
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pint.errors import PintError
from pydantic import Field

from embernova.agent.budget import Budget, BudgetError
from embernova.agent.loop import run_agent
from embernova.agent.registry import D2, Assess, Chart, Compare, Documents, Envelope, Input, Search
from embernova.agent.registry import Query as MeasurementQuery
from embernova.config import ROOT, Settings, settings
from embernova.export import model_ready_zip
from embernova.provenance import canonical, new_id, now, safe_path
from embernova.retrieval import document_page
from embernova.science.bundle import Bundle
from embernova.storage import Store
from embernova.tags import OBJECTIVES, with_tags
from embernova.tools import Tools


def wire(evt):
    return f"event: {evt['event']}\nid: {evt['turn_id']}:{evt['seq']}\ndata: {canonical(evt)}\n\n"


class SessionInput(Input):
    title: str = Field("New research", max_length=200)


class MessageInput(Input):
    text: str = Field(min_length=1, max_length=4000)
    options: dict | None = None


class LabInput(Input):
    analysis_lab: bool


def create_app(cfg: Settings | None = None) -> FastAPI:
    cfg = cfg or settings()

    def client_address(request: Request) -> str:
        # Behind a reverse proxy every request arrives from the proxy; without this the
        # per-visitor hourly limit would become one shared limit for all visitors.
        if cfg.trusted_proxy:
            forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            if forwarded:
                return forwarded
        return request.client.host if request.client else "local"

    @asynccontextmanager
    async def lifespan(app):
        app.state.store = Store(cfg)
        app.state.bundle = (
            Bundle(cfg) if (cfg.build_dir / "bundle/bundle_manifest.json").exists() else None
        )
        app.state.active = {}
        yield
        for cancellation in app.state.active.values():
            cancellation.set()

    app = FastAPI(
        title="EmberNova research API",
        version="0.1.0",
        lifespan=lifespan,
        openapi_url="/api/openapi.json",
        docs_url="/api/docs",
        redoc_url=None,
    )

    def error(request, code, message, status):
        response = JSONResponse(
            {
                "error": {
                    "code": code,
                    "message": message,
                    "details": None,
                    "request_id": getattr(request.state, "request_id", "unknown"),
                }
            },
            status_code=status,
        )
        response.headers["X-Request-Id"] = getattr(request.state, "request_id", "unknown")
        return response

    @app.middleware("http")
    async def boundaries(request: Request, call_next):
        request.state.request_id = new_id("req_")
        token = request.cookies.get("embernova_visitor", "")
        fresh = len(token) != 64 or any(c not in "0123456789abcdef" for c in token)
        if fresh:
            token = secrets.token_hex(32)
        request.state.owner = hashlib.sha256(token.encode()).hexdigest()
        if request.method in {"POST", "PATCH", "PUT", "DELETE"}:
            origin = request.headers.get("origin")
            if request.headers.get("sec-fetch-site") == "cross-site" or (
                origin and urlsplit(origin).netloc != request.headers.get("host")
            ):
                return error(request, "forbidden", "Cross-origin writes are not allowed", 403)
        parts = request.url.path.strip("/").split("/")
        if len(parts) >= 3 and parts[:2] == ["api", "sessions"]:
            try:
                item = request.app.state.store.get("sessions", parts[2])
            except KeyError:
                return error(request, "not_found", "Research thread not found", 404)
            if item.get("owner") != request.state.owner:
                return error(request, "not_found", "Research thread not found", 404)
        if request.method in {"POST", "PATCH", "PUT"}:
            # Starlette caches the bounded body for downstream validation.
            body = bytearray()
            async for chunk in request.stream():
                body.extend(chunk)
                if len(body) > 65536:
                    return error(request, "payload_too_large", "Request body exceeds 64 KB", 413)
            request._body = bytes(body)
        response = await call_next(request)
        if fresh:
            response.set_cookie(
                "embernova_visitor",
                token,
                httponly=True,
                secure=cfg.secure_cookies,
                samesite="strict",
                max_age=60 * 60 * 24 * 30,
            )
        response.headers["X-Request-Id"] = request.state.request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; frame-src 'self'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"
        )
        return response

    @app.exception_handler(HTTPException)
    async def http_error(request, exc):
        codes = {
            404: "not_found",
            409: "conflict",
            403: "forbidden",
            503: "llm_unavailable",
            429: "budget_exceeded",
        }
        result = error(
            request,
            codes.get(exc.status_code, "invalid_argument"),
            str(exc.detail),
            exc.status_code,
        )
        if exc.status_code == 429:
            result.headers["Retry-After"] = "3600"
        return result

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        return error(request, "invalid_argument", "Request does not match the input schema", 422)

    @app.exception_handler(KeyError)
    async def missing(request, exc):
        return error(
            request, "not_found", "Requested evidence, record or artifact was not found", 404
        )

    @app.exception_handler(ValueError)
    async def invalid(request, exc):
        return error(request, "invalid_argument", str(exc)[:600], 422)

    @app.exception_handler(PintError)
    async def unit_error(request, exc):
        return error(request, "unit_error", "Units are unknown or incompatible", 422)

    @app.exception_handler(Exception)
    async def internal_error(request, exc):
        return error(
            request,
            "internal",
            "The research service could not complete this request. No unsupported results were substituted.",
            500,
        )

    def store(request: Request):
        return request.app.state.store

    def tools(request: Request, state: Store = Depends(store)):
        if request.app.state.bundle is None:
            raise HTTPException(503, "Build the NASA corpus before using research tools")
        return Tools(state, request.app.state.bundle, owner=request.state.owner)

    @app.get("/api/health")
    def health():
        knowledge = (cfg.build_dir / "knowledge.db").is_file()
        bundle = (cfg.build_dir / "bundle/bundle_manifest.json").is_file()
        frontend = (ROOT / "frontend/dist/index.html").is_file() and (
            ROOT / "frontend/dist/assets"
        ).is_dir()
        ready = knowledge and bundle and frontend
        return JSONResponse(
            {
                "status": "ok" if ready else "not_ready",
                "checks": {
                    "knowledge_db": knowledge,
                    "bundle": bundle,
                    "frontend": frontend,
                    "embeddings": "ready"
                    if (cfg.build_dir / "embeddings.json").exists()
                    else "not_built_optional",
                },
            },
            status_code=200 if ready else 503,
        )

    @app.get("/api/meta")
    def meta(t: Tools = Depends(tools)):
        info = {r["key"]: r["value"] for r in t.store.query("SELECT * FROM build_info")}
        live_path = cfg.build_dir / "eval/livecheck.json"
        live = json.loads(live_path.read_text()) if live_path.exists() else {}
        return {
            "build_version": info["build_version"],
            "bundle_version": t.bundle.manifest["bundle_version"],
            "snapshot_date": info["snapshot_date"],
            "corpus": {**json.loads(info["counts"]), "runs": len(t.bundle.runs)},
            "features": {
                "analysis_lab": cfg.analysis_lab and bool(live.get("authentication")),
                "illustrations": False,
            },
            "llm_available": bool(cfg.openai_api_key and cfg.openai_api_key.get_secret_value()),
            "model_access_verified": bool(
                live.get("authentication")
                and live.get("model_available")
                and live.get("model") == cfg.agent_model
            ),
            "budget_used_pct": 100 * Budget(cfg, t.store).used() / cfg.daily_budget_usd
            if cfg.daily_budget_usd
            else 100,
            "models": {"agent": cfg.agent_model},
            "retrieval_mode": "hybrid"
            if (cfg.build_dir / "embeddings.json").exists()
            and cfg.openai_api_key
            and cfg.openai_api_key.get_secret_value()
            else "bm25_only",
        }

    @app.get("/api/vocab")
    def vocab():
        return yaml.safe_load((ROOT / "curation/vocab.yaml").read_text())

    @app.get("/api/investigations")
    def investigations(
        q: str = "",
        objective: str | None = None,
        is_psi: bool | None = None,
        limit: int = Query(25, ge=1, le=100),
        cursor: int = Query(0, ge=0),
        t: Tools = Depends(tools),
    ):
        if objective and objective not in OBJECTIVES:
            raise ValueError(f"objective must be one of {list(OBJECTIVES)}")
        notes, no_match = [], False
        if q:
            found = t.call(
                "search_investigations",
                {"query": q, "limit": 15, "objectives": [objective] if objective else None},
            )
            items, notes, no_match = found["results"], found.get("notes", []), found["no_match"]
        else:
            datasets = {d["investigation_id"] for d in t.store.records("datasets")}
            items = [
                {**with_tags(i), "has_numeric_data": i["investigation_id"] in datasets}
                for i in t.store.records("investigations")
            ]
        if objective:
            # Curated tags (curation/investigation_tags.yaml), not substring matches on prose.
            items = [i for i in items if objective in i["fire_safety_objectives"]]
        if is_psi is not None:
            items = [i for i in items if i["is_psi"] == is_psi]
        return {
            "items": items[cursor : cursor + limit],
            "total": len(items),
            "next_cursor": str(cursor + limit) if cursor + limit < len(items) else None,
            "notes": notes[:1] if q else [],
            "no_match": no_match,
        }

    @app.get("/api/investigations/{investigation_id}")
    def investigation(investigation_id: str, t: Tools = Depends(tools)):
        return t.investigation(investigation_id)

    @app.post("/api/search/investigations")
    def search(args: Search, t: Tools = Depends(tools)):
        return t.call("search_investigations", args.model_dump())

    @app.post("/api/search/documents")
    def documents(args: Documents, t: Tools = Depends(tools)):
        return t.call("search_documents", args.model_dump())

    @app.get("/api/documents/{document_id}")
    def document(document_id: str, t: Tools = Depends(tools)):
        rows = t.store.records("documents", "WHERE document_id=?", (document_id,))
        if not rows:
            raise KeyError(document_id)
        return {
            **rows[0],
            "pages": t.store.query(
                "SELECT page_number,is_empty,length(text) char_count FROM pages WHERE document_id=? ORDER BY page_number",
                (document_id,),
            ),
        }

    @app.get("/api/documents/{document_id}/pages/{n}")
    def page(document_id: str, n: int, t: Tools = Depends(tools)):
        return document_page(t.store, t.ledger, document_id, n)

    @app.get("/api/files/{file_id}/original")
    def original(file_id: str, t: Tools = Depends(tools)):
        rows = t.store.records("source_files", "WHERE file_id=?", (file_id,))
        if not rows or not rows[0]["filename"].lower().endswith(".pdf"):
            raise KeyError(file_id)
        return FileResponse(
            safe_path(cfg.build_dir, "pdf/" + file_id + ".pdf"), media_type="application/pdf"
        )

    @app.get("/api/datasets")
    def datasets(investigation_id: str | None = None, t: Tools = Depends(tools)):
        return t.datasets([investigation_id] if investigation_id else None)["datasets"]

    @app.get("/api/datasets/{table_id}")
    def dataset(
        table_id: str,
        view: str = "normalized",
        limit: int = Query(50, ge=1, le=500),
        cursor: int = Query(0, ge=0),
        filters: str | None = None,
        t: Tools = Depends(tools),
    ):
        data, excluded = t.bundle.select(
            [table_id], json.loads(filters) if filters else None, include_invalid=True
        )
        rows = data.iloc[cursor : cursor + limit]
        if view == "raw":
            result = [
                {"run_uid": r.run_uid, "source_row": int(r.source_row), **json.loads(r.raw_json)}
                for _, r in rows.iterrows()
            ]
        elif view == "normalized":
            fields = [
                c
                for c in [
                    "run_uid",
                    "source_run_label",
                    "fuel_canonical",
                    "sample_material",
                    "value_kind",
                    "quality_flags",
                ]
                # Only quantities this table actually reports; other datasets' columns
                # would otherwise show as "unknown" in every row.
                + [u for u in t.bundle.units if u in data and data[u].notna().any()]
                if c in rows
            ]
            result = t.bundle.display(rows, fields)
        else:
            raise ValueError("view must be raw or normalized")
        evidence = t.rows_evidence(table_id, data, list(t.bundle.units))
        details = next(d for d in t.datasets()["datasets"] if d["table_id"] == table_id)
        return {
            **details,
            "rows": result,
            "columns": list(result[0]) if result else [],
            "evidence_id": evidence["evidence_id"],
            "excluded_from_analysis": excluded,
            "total": len(data),
            "next_cursor": str(cursor + limit) if cursor + limit < len(data) else None,
        }

    @app.get("/api/datasets/{table_id}/export")
    def export_dataset(table_id: str, format: str = "csv", t: Tools = Depends(tools)):
        data, _ = t.bundle.select([table_id], include_invalid=True)
        fields = [c for c in data if c not in {"raw_json", "alt_labels", "quality_flags"}]
        rows = t.bundle.display(data, fields)
        if format != "csv":
            raise ValueError("Only CSV export is supported; normalized Parquet is in build/bundle")
        src = t.store.records("datasets", "WHERE table_id=?", (table_id,))[0]["source"]
        output = io.StringIO()
        output.write(
            "# "
            + canonical(
                {
                    "table_id": table_id,
                    "file_id": src["file_id"],
                    "sha256": src["sha256"],
                    "bundle_sha256": t.bundle.manifest["bundle_sha256"],
                    "units": t.bundle.units,
                    "transform": "pint normalized values converted to display units; source_row and run_uid preserved",
                }
            )
            + "\n"
        )
        writer = csv.DictWriter(output, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
        return Response(
            output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="NASA_measurements.csv"'},
        )

    @app.post("/api/measurements/query")
    def measurements(args: MeasurementQuery, t: Tools = Depends(tools)):
        result = t.query(**args.model_dump())
        return {
            **result,
            "evidence": list(t.ledger.items.values()),
            "artifact_ids": [a["artifact_id"] for a in t.ledger.artifacts],
        }

    @app.post("/api/charts")
    def charts(args: Chart, t: Tools = Depends(tools)):
        return t.chart(args.model_dump())

    @app.post("/api/compare")
    def comparisons(args: Compare, t: Tools = Depends(tools)):
        return t.analyze("compare_runs", args.model_dump())

    @app.post("/api/envelope")
    def envelopes(args: Envelope, t: Tools = Depends(tools)):
        return t.analyze("check_applicability_envelope", args.model_dump())

    @app.post("/api/evidence-assessment")
    def evidence_assessment(args: Assess, t: Tools = Depends(tools)):
        return t.assess_evidence(args.model_dump())

    @app.post("/api/checks/d2law")
    def d2(args: D2, t: Tools = Depends(tools)):
        return t.analyze("check_d2_law", args.model_dump())

    @app.get("/api/coverage")
    def coverage(t: Tools = Depends(tools)):
        return t.coverage()

    @app.post("/api/suppression")
    def suppression(t: Tools = Depends(tools)):
        return t.analyze("suppression_overview", {})

    @app.get("/api/export/model-ready")
    def model_ready(fuel_class: str | None = None, t: Tools = Depends(tools)):
        return Response(
            model_ready_zip(t, fuel_class),
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="EmberNova_model_ready_{fuel_class or "all"}.zip"'
            },
        )

    @app.get("/api/timeseries/{series_id}")
    def timeseries(series_id: str):
        raise HTTPException(404, "Telemetry parsing is not available in this build")

    @app.get("/api/media")
    def media(
        investigation_id: str | None = None, type: str | None = None, t: Tools = Depends(tools)
    ):
        return t.media(
            [investigation_id] if investigation_id else None,
            media_types=[type] if type else None,
            limit=100,
        )["media"]

    def media_record(t, media_id):
        rows = t.store.records("media", "WHERE media_id=?", (media_id,))
        if not rows:
            raise KeyError(media_id)
        return rows[0]

    @app.get("/api/media/{media_id}")
    def media_item(media_id: str, t: Tools = Depends(tools)):
        return media_record(t, media_id)

    @app.get("/api/media/{media_id}/stream")
    def media_stream(media_id: str, t: Tools = Depends(tools)):
        item = media_record(t, media_id)
        # Starlette FileResponse implements validated single/multipart byte ranges.
        return FileResponse(safe_path(cfg.build_dir, item["derivative_path"]))

    @app.get("/api/media/{media_id}/thumb")
    def thumb(media_id: str, t: Tools = Depends(tools)):
        item = media_record(t, media_id)
        if not item["thumb_path"]:
            raise KeyError(media_id)
        return FileResponse(safe_path(cfg.build_dir, item["thumb_path"]))

    @app.get("/api/evidence/{evidence_id}")
    def evidence(evidence_id: str, state: Store = Depends(store)):
        return state.get("evidence", evidence_id)

    @app.get("/api/artifacts/{artifact_id}")
    def artifact(artifact_id: str, request: Request, state: Store = Depends(store)):
        return owned_artifact(artifact_id, request, state)

    def owned_artifact(artifact_id: str, request: Request, state: Store):
        art = state.get("artifacts", artifact_id)
        if (
            not state.artifact_is_public(artifact_id)
            and state.artifact_owner(artifact_id) != request.state.owner
        ):
            raise HTTPException(404, "Artifact not found")
        return art

    @app.get("/api/artifacts/{artifact_id}/data")
    def artifact_data(artifact_id: str, request: Request, state: Store = Depends(store)):
        art = owned_artifact(artifact_id, request, state)
        return art["payload"]

    @app.get("/api/artifacts/{artifact_id}/bundle")
    def artifact_bundle(artifact_id: str, request: Request, state: Store = Depends(store)):
        art = owned_artifact(artifact_id, request, state)
        output = io.BytesIO()
        with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("artifact.json", canonical(art))
            if art["type"] == "analysis_run":
                archive.writestr(
                    "analysis.py",
                    "# SI-generated exploratory analysis; scientific review required.\n"
                    + "\n\n".join(cell["code"] for cell in art["payload"]["cells"]),
                )
            archive.writestr(
                "README.md",
                "EmberNova reproducible deterministic analysis. SI-assisted application code.\nInput NASA file hashes, query arguments, bundle hash and transformation steps are recorded in artifact.json.\nMeasurements are not SI-generated. This is not certified fire-safety guidance.\n",
            )
            if art["type"] == "analysis_run":
                archive.writestr("result.json", canonical(art["payload"].get("result")))
                bundle_hash = art["reproducibility"]["bundle_sha256"]
                input_dir = cfg.build_dir / "sandbox_inputs" / bundle_hash
                for name in [
                    "runs.csv",
                    "conditions.csv",
                    "measurements.csv",
                    "quality_findings.csv",
                    "provenance.csv",
                    "analysis_inputs.json",
                ]:
                    if (input_dir / name).is_file():
                        archive.write(
                            safe_path(cfg.build_dir, f"sandbox_inputs/{bundle_hash}/{name}"),
                            f"inputs/{name}",
                        )
                archive.writestr(
                    "REPRODUCE.md",
                    "The SI-generated code expects the exported inputs under /mnt/data. Review the code and use an isolated environment with these inputs mounted there. analysis_inputs.json records CSV and source Parquet hashes. Package/version logs are stored with the code cells in artifact.json. These are exploratory derived analyses, not new NASA observations.\n",
                )
            chart = art["payload"].get("chart")
            if chart:
                for eid in chart["provenance"]["evidence_ids"]:
                    archive.writestr(f"evidence/{eid}.json", canonical(state.get("evidence", eid)))
        return Response(
            output.getvalue(),
            media_type="application/zip",
            headers={"Content-Disposition": 'attachment; filename="EmberNova_analysis.zip"'},
        )

    @app.get("/api/sessions")
    def recent_sessions(request: Request, state: Store = Depends(store)):
        with state.app() as db:
            rows = db.execute(
                "SELECT id, data FROM sessions WHERE json_extract(data, '$.owner')=? ORDER BY rowid DESC LIMIT 30",
                (request.state.owner,),
            ).fetchall()
        return [
            {
                "session_id": row["id"],
                "title": item.get("title", "Research thread"),
                "turn_count": len(item.get("history", [])),
            }
            for row in rows
            if (item := json.loads(row["data"]))
        ]

    @app.post("/api/sessions")
    def new_session(args: SessionInput, request: Request, state: Store = Depends(store)):
        sid = new_id("ses_")
        state.put(
            "sessions",
            sid,
            {
                "session_id": sid,
                "owner": request.state.owner,
                "title": args.title,
                "created_at": now(),
                "history": [],
                "analysis_lab": False,
            },
        )
        return {"session_id": sid}

    @app.get("/api/sessions/{session_id}")
    def session(session_id: str, state: Store = Depends(store)):
        item = state.get("sessions", session_id)
        return {"session": item, "turns": item.get("history", [])}

    @app.patch("/api/sessions/{session_id}")
    def lab(session_id: str, args: LabInput, state: Store = Depends(store)):
        session = state.get("sessions", session_id)
        if not cfg.analysis_lab:
            raise HTTPException(
                409,
                "Analysis Lab is disabled in local configuration. Generated code is never executed on this host.",
            )
        report_path = cfg.build_dir / "eval/sandbox_smoke.json"
        if args.analysis_lab and (
            not report_path.exists() or not json.loads(report_path.read_text()).get("verified")
        ):
            raise HTTPException(409, "The hosted isolation smoke test has not passed")
        session["analysis_lab"] = args.analysis_lab
        state.put("sessions", session_id, session)
        return {"session": session}

    @app.post("/api/sessions/{session_id}/messages")
    async def message(
        session_id: str, args: MessageInput, request: Request, t: Tools = Depends(tools)
    ):
        t.store.get("sessions", session_id)
        if not cfg.openai_api_key or not cfg.openai_api_key.get_secret_value():
            raise HTTPException(
                503,
                "OpenAI key is not configured. Data tools and recorded demonstrations remain available.",
            )
        if session_id in request.app.state.active:
            raise HTTPException(409, "A research turn is already running in this session")
        turn_id = new_id("turn_")
        try:
            Budget(cfg, t.store).reserve(turn_id, client_address(request))
        except BudgetError as exc:
            raise HTTPException(
                429,
                f"{exc}. Live SI research is paused; the recorded research sessions, "
                "data explorers and analysis tools remain available.",
            ) from exc
        cancellation = asyncio.Event()
        request.app.state.active[session_id] = cancellation

        async def stream():
            queue = asyncio.Queue()

            async def produce():
                try:
                    async for evt in run_agent(
                        cfg, t.store, t.bundle, session_id, turn_id, args.text, cancellation
                    ):
                        await queue.put(evt)
                finally:
                    await queue.put(None)

            task = asyncio.create_task(produce())
            try:
                while True:
                    try:
                        evt = await asyncio.wait_for(queue.get(), timeout=15)
                    except TimeoutError:
                        yield ": ping\n\n"
                        continue
                    if evt is None:
                        break
                    yield wire(evt)
            finally:
                cancellation.set()
                task.cancel()
                await asyncio.gather(task, return_exceptions=True)
                request.app.state.active.pop(session_id, None)

        return StreamingResponse(
            stream(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    @app.post("/api/sessions/{session_id}/cancel")
    async def cancel(session_id: str, request: Request):
        item = request.app.state.active.get(session_id)
        if item:
            item.set()
        return {"cancelled": bool(item)}

    @app.get("/api/sessions/{session_id}/turns/{turn_id}/events")
    def events(session_id: str, turn_id: str, after_seq: int = -1, state: Store = Depends(store)):
        state.get("sessions", session_id)
        return StreamingResponse(
            iter(wire(e) for e in state.events(session_id, turn_id, after_seq)),
            media_type="text/event-stream",
        )

    def replay_records():
        folder = cfg.build_dir / "replays"
        return (
            [json.loads(p.read_text(encoding="utf-8")) for p in sorted(folder.glob("*.json"))]
            if folder.exists()
            else []
        )

    @app.get("/api/replays")
    def replays():
        return [r["meta"] for r in replay_records()]

    @app.get("/api/replays/{replay_id}")
    async def replay(replay_id: str, state: Store = Depends(store)):
        item = next((r for r in replay_records() if r["meta"]["replay_id"] == replay_id), None)
        if not item:
            raise KeyError(replay_id)
        # Replay files carry the full evidence and artifact records they cite, so a fresh
        # deployment (empty state DB) can still open every citation. Existing records win.
        for evt in item["events"]:
            if evt.get("event") == "evidence.added":
                record = evt.get("evidence") or {}
                if record.get("evidence_id"):
                    state.put("evidence", record["evidence_id"], record)
            if evt.get("event") == "artifact.created":
                record = evt.get("artifact") or {}
                artifact_id = record.get("artifact_id")
                if artifact_id:
                    try:
                        state.get("artifacts", artifact_id)
                    except KeyError:
                        if "payload" not in record:
                            continue
                        state.put("artifacts", artifact_id, record)
                    state.publish_artifact(artifact_id)

        async def stream():
            for evt in item["events"]:
                await asyncio.sleep(0.02)
                yield wire(evt)

        return StreamingResponse(stream(), media_type="text/event-stream")

    def admin(request):
        if not cfg.admin_token or not secrets.compare_digest(
            request.headers.get("X-Admin-Token", ""), cfg.admin_token.get_secret_value()
        ):
            raise HTTPException(403, "Admin access is disabled or token is invalid")

    @app.post("/api/admin/replays/record")
    async def record(args: dict, request: Request, state: Store = Depends(store)):
        admin(request)
        sid = args.get("session_id", "")
        state.get("sessions", sid)
        evts = state.events(sid)
        if not evts or evts[-1]["event"] != "turn.completed":
            raise HTTPException(409, "Only completed research sessions may be recorded")
        rid = new_id("replay_")
        for evt in evts:
            if evt["event"] == "turn.started":
                evt["replay"] = True
            if evt["event"] == "artifact.created":
                artifact_id = evt.get("artifact", {}).get("artifact_id")
                if artifact_id:
                    state.get("artifacts", artifact_id)
                    state.publish_artifact(artifact_id)
        meta = {
            "replay_id": rid,
            "title": str(args.get("title", "Recorded research"))[:200],
            "question": "Recorded live research session",
            "recorded_at": now(),
            "model": cfg.agent_model,
            "scenario": str(args.get("scenario", "research")),
            "origin": "recorded_live",
        }
        (cfg.build_dir / "replays").mkdir(exist_ok=True)
        (cfg.build_dir / "replays" / (rid + ".json")).write_text(
            canonical({"meta": meta, "events": evts}), encoding="utf-8"
        )
        return {"replay_id": rid}

    @app.post("/api/admin/cache/purge")
    async def purge(request: Request):
        admin(request)
        return {"purged": 0, "note": "No live answer cache is enabled"}

    @app.post("/api/illustrations")
    def illustration():
        raise HTTPException(409, "SI illustrations are deferred; original NASA media is available")

    dist = ROOT / "frontend/dist"
    if (dist / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path.startswith("api/"):
            raise HTTPException(404, "Unknown API endpoint. See /api/docs.")
        if not (dist / "index.html").exists():
            raise HTTPException(
                404, "Not found. Build the frontend or use the Vite development server."
            )
        return FileResponse(dist / "index.html")

    return app


app = create_app()
