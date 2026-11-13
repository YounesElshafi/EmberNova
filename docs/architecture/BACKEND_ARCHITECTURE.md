# Backend architecture

Canonical for: module layout, runtime model, configuration, caching, rate limiting, observability, secrets and operational targets. Rationale: [ADR-010](../decisions/ADR-010-backend.md).

## 1. Stack

- Python 3.12, managed by **uv**, with `pyproject.toml` and `uv.lock`.
- FastAPI, Uvicorn (one worker), Pydantic v2 and pydantic-settings.
- `openai` (official SDK, Responses API).
- pandas, pyarrow, duckdb, numpy, pint.
- PyMuPDF: build only, and only if re-extraction is needed. GPT Work's text is reused.
- openpyxl and xlrd: build only. tiktoken: build only.
- Pillow: watermarking.
- python-ulid, structlog.
- Dev: pytest, pytest-asyncio, httpx, ruff, mypy (lenient). The scheduler is `asyncio` tasks; no Celery.

## 2. Package layout

```text
backend/
  pyproject.toml            # scripts: embernova-build = embernova.ingest.cli:main
  src/embernova/
    main.py                 # FastAPI app factory, routers, static SPA mount (/), lifespan (load knowledge.db, embeddings, DuckDB views)
    config.py               # Settings (env): models, budgets, paths, feature flags, pricing table
    logging.py              # structlog JSON, request_id middleware
    api/                    # routers: meta, investigations, search, documents, files, datasets, measurements,
                            #          charts, compare, envelope, checks, media, evidence, sessions, artifacts, replays, admin
    agent/
      loop.py               # run_turn (AI_ARCHITECTURE §3)
      registry.py           # tool name → (pydantic input model, function, description)
      prompts/system.md     # versioned system prompt
      evidence.py           # EvidenceLedger, deterministic ids
      citations.py          # validator + audit
      budget.py             # daily budget, per-IP limiter, cost accounting
      sse.py                # event models (from contracts/sse_events.schema.json) + encoder
      replay.py             # record/play
    tools/                  # one module per tool in AGENT_TOOLS.md; pure functions taking (ctx, args) → ToolResult
    retrieval/              # fts.py, dense.py (numpy matrix), fusion.py, investigations.py (ranker + explanation)
    science/                # units.py, bundle.py (DuckDB views), compare.py, envelope.py, d2law.py, charts.py (ChartSpec), stats.py
    sandbox/                # code_interpreter.py (files, containers, result download), result_schema.py
    media/                  # streaming (Range), thumbnails lookup
    storage/                # knowledge.py (sqlite ro, connection per request via aiosqlite or thread pool), appdb.py (migrations)
    illustrations/          # P2: image gen + watermark
    ingest/                 # cli.py + steps (DATA_ARCHITECTURE §9): catalog, documents, chunks, profiles, embed,
                            #   tables/{base.py, cellparse.py, flex.py, cfi.py, saffire.py, bass2.py, samer.py, flex2.py, cfig.py, acme.py, spice.py},
                            #   quality.py, media.py, pdf.py, deploy.py
  tests/                    # mirrors src; fixtures/ small CSV excerpts copied from data/ (≤ 50 rows each, with source note)
```

**Rules:**
- Tools import from `retrieval`, `science`, `media` and `storage`, never from `api` or `agent`.
- `api` routers are thin: validate, call the tool or service, serialize.

## 3. Runtime model

- **A single process** with async FastAPI. CPU-bound work (DuckDB queries, numpy) runs via `anyio.to_thread.run_sync`.
- **SQLite:**
  - `knowledge.db` opens read-only (`mode=ro&immutable=1`), with one connection per thread.
  - `app.db` uses WAL with a single writer: writes are serialized through an `asyncio.Lock`.
  - Migrations are a numbered SQL list applied at startup.
- **DuckDB:** one in-memory connection with Parquet views, created at startup; a cursor per query.
- **Startup** loads the embedding matrix (~18 MB), checks `build_info` (embedding model and dims, bundle sha) and warms the FTS. The target is under 5 s.
- **Memory target:** under 600 MB RSS under demo load, with the container limit at 768 MB.

## 4. `app.db` schema

```sql
CREATE TABLE sessions (session_id TEXT PRIMARY KEY, created_at TEXT, title TEXT, client_ip_hash TEXT,
  last_response_id TEXT, analysis_lab INTEGER DEFAULT 0, container_id TEXT, container_last_used TEXT,
  is_replay INTEGER DEFAULT 0, replay_id TEXT);
CREATE TABLE turns (turn_id TEXT PRIMARY KEY, session_id TEXT, created_at TEXT, user_text TEXT,
  status TEXT, model TEXT, prompt_version TEXT, input_tokens INTEGER, cached_tokens INTEGER, output_tokens INTEGER,
  cost_usd REAL, latency_ms INTEGER, error_code TEXT);
CREATE TABLE messages (message_id TEXT PRIMARY KEY, turn_id TEXT, role TEXT, raw_text TEXT, validated_json TEXT);
CREATE TABLE tool_calls (call_id TEXT PRIMARY KEY, turn_id TEXT, tool TEXT, args_json TEXT, status TEXT,
  latency_ms INTEGER, result_summary TEXT, evidence_ids TEXT, artifact_ids TEXT, error_code TEXT);
CREATE TABLE evidence (evidence_id TEXT, turn_id TEXT, record_json TEXT, PRIMARY KEY (evidence_id, turn_id));
CREATE TABLE artifacts (artifact_id TEXT PRIMARY KEY, session_id TEXT, turn_id TEXT, type TEXT, title TEXT,
  payload_json TEXT, labels_json TEXT, reproducibility_json TEXT, parent_artifact_id TEXT, status TEXT, created_at TEXT);
CREATE TABLE sse_events (session_id TEXT, turn_id TEXT, seq INTEGER, t_ms INTEGER, event TEXT, data_json TEXT,
  PRIMARY KEY (turn_id, seq));          -- enables replay recording and reconnect
CREATE TABLE usage_daily (day TEXT PRIMARY KEY, cost_usd REAL, turns INTEGER);
CREATE TABLE uploaded_files (bundle_sha256 TEXT, name TEXT, openai_file_id TEXT, PRIMARY KEY (bundle_sha256, name));
CREATE TABLE answer_cache (key TEXT PRIMARY KEY, turn_id TEXT, created_at TEXT);
```

## 5. Configuration (env)

| Group | Variables |
| --- | --- |
| OpenAI | `OPENAI_API_KEY` (absent → LLM features off, everything else works), and the models (see [AI_ARCHITECTURE.md §2](AI_ARCHITECTURE.md)) |
| Paths | `EMBERNOVA_BUILD_DIR` (default `./build`), `EMBERNOVA_VAR_DIR` (default `./var`), `EMBERNOVA_DATA_DIR` (build only, default `../data`) |
| Flags | `FEATURE_ANALYSIS_LAB` (false until M9 passes), `FEATURE_ILLUSTRATIONS` (false), `FEATURE_ANSWER_CACHE` (true) |
| Limits | `DAILY_BUDGET_USD`, `PER_IP_TURNS_PER_HOUR`, `MAX_TOOL_ROUNDS`, `TURN_TIMEOUT_S` |
| Admin | `ADMIN_TOKEN` (replay recording, cache purge) |
| Web | `ALLOWED_ORIGINS` (dev: `http://localhost:5173`), `PUBLIC_BASE_URL` |

## 6. Caching

| Cache | Key | TTL |
| --- | --- | --- |
| Query-embedding LRU | normalized query | process lifetime, 512 entries |
| Tool-result memo (search, list_datasets, get_investigation) | tool + args JSON + build version | process lifetime, 1,024 entries |
| First-turn answer cache | normalized question + build + prompt version | 24 h; serves as an instant replay of the stored turn, labeled "cached answer from <time>" |
| HTTP | `/api/media/*`, `/api/files/*`, `/assets/*` | `Cache-Control: public, max-age=86400, immutable` (content-hashed paths) |
| OpenAI prompt caching | automatic, from the static system prompt and tool definitions first | — |

## 7. Rate limiting and budget

- **Per-IP:** a token bucket in memory keyed by the salted-hash IP, read from the `X-Forwarded-For` set by the trusted proxy. 20 turns per hour, and 120 read requests per minute.
- **Daily budget:**
  - Sum the computed cost of every LLM call into `usage_daily`.
  - At 80%, switch to `AGENT_FALLBACK_MODEL`.
  - At 100%, refuse live turns with `budget_exceeded`. Explorers and replays stay available.
- Each turn's cost is computed from the `usage` the API returns (input, cached and output tokens) and the configured price table.

## 8. Observability

- structlog JSON logs to stdout, with `request_id`, `session_id`, `turn_id`, tool name, latency and cost. Docker's log rotation is set to 3×10 MB.
- `GET /api/meta` exposes the build version, bundle version, feature flags, `llm_available`, and budget used today as a percentage.
- `GET /api/health` returns liveness, plus readiness checks for knowledge.db, bundle and embeddings.
- Errors are logged with a stack trace and returned as `{error:{code,message,request_id}}`. Stack traces never go to clients.
- No third-party telemetry, and no user tracking.

## 9. Security

- Secrets only in env and `.env`. `.env.example` is committed.
- The OpenAI key never reaches the frontend or the code container.
- CORS is closed in production (same origin).
- Security headers: CSP (self; `img-src` and `media-src` self plus `data:`; `frame-src` self for the PDF viewer), `X-Content-Type-Options`, `Referrer-Policy`.
- File-serving endpoints only serve IDs that exist in `knowledge.db` and map to files under `build/`. **No path parameters reach the filesystem.**
- Input limits: user message ≤ 4,000 characters; request body ≤ 64 KB.
- Admin endpoints require `ADMIN_TOKEN` and are disabled when it is unset.
- Dependencies are pinned in the lockfiles.

## 10. Performance targets

These are design targets, not measurements, and get re-measured in M7.

| Operation | Target |
| --- | --- |
| `search_investigations` (warm) | ≤ 300 ms, excluding the embedding call; ≤ 900 ms including it |
| `query_measurements` / `make_chart` | ≤ 300 ms for ≤ 10k rows |
| Telemetry chart (≤ 5k points after LTTB) | ≤ 800 ms |
| Media first byte | ≤ 200 ms (Range streaming) |
| Agent turn | See [AI_ARCHITECTURE.md §8](AI_ARCHITECTURE.md) |
