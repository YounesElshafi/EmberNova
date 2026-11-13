"""Hosted-only scientific code execution. No exec/eval/subprocess of generated code exists here."""

import io
import json
import math
from pathlib import PurePosixPath

import pandas as pd
from jsonschema import validate

from embernova.config import ROOT
from embernova.provenance import canonical, sha256
from embernova.science.units import UREG

ALLOWED_INPUTS = {
    "runs.csv",
    "conditions.csv",
    "measurements.csv",
    "quality_findings.csv",
    "provenance.csv",
    "analysis_inputs.json",
}
RESULT_SCHEMA = json.loads(
    (ROOT / "docs/architecture/contracts/analysis_result.schema.json").read_text()
)


def validate_result(raw: bytes, input_aliases: dict | None = None) -> dict:
    if len(raw) > 2_000_000:
        raise ValueError("Sandbox result exceeds 2 MB")

    def reject(value):
        raise ValueError("Non-finite sandbox result")

    result = json.loads(raw, parse_constant=reject)
    validate(result, RESULT_SCHEMA)
    if not result["inputs"]:
        raise ValueError("No source inputs were read; this is not a completed analysis")
    for item in result["results"]:
        UREG.Unit(item["unit"])
        if not math.isfinite(item["value"]) or (
            item["uncertainty"] is not None and not math.isfinite(item["uncertainty"])
        ):
            raise ValueError("Non-finite numeric output")
    for item in result["inputs"]:
        item["file"] = (input_aliases or {}).get(item["file"], item["file"])
        if item["file"] not in ALLOWED_INPUTS:
            raise ValueError("Result references an unmounted input")
    return result


class HostedLab:
    def __init__(self, client, cfg, bundle):
        self.client, self.cfg, self.bundle = client, cfg, bundle
        self.container = None
        self.uploads = []
        self.calls = 0
        self.input_aliases = {}

    async def start(self):
        manifest = {f["name"]: f["sha256"] for f in self.bundle.manifest["files"]}
        export_dir = self.cfg.build_dir / "sandbox_inputs" / self.bundle.manifest["bundle_sha256"]
        export_dir.mkdir(parents=True, exist_ok=True)
        inputs = []
        for parquet, expected_hash in manifest.items():
            source_path = self.bundle.root / parquet
            if sha256(source_path) != expected_hash:
                raise ValueError("Analysis Bundle hash mismatch")
            frame = pd.read_parquet(source_path)

            def serialize(value):
                if hasattr(value, "tolist"):
                    value = value.tolist()
                return canonical(value) if isinstance(value, (list, dict)) else value

            for column in frame.select_dtypes(include="object"):
                frame[column] = frame[column].map(serialize)
            csv_name = parquet.replace(".parquet", ".csv")
            frame.to_csv(export_dir / csv_name, index=False, float_format="%.17g")
            inputs.append(
                {
                    "file": csv_name,
                    "sha256": sha256(export_dir / csv_name),
                    "source_parquet": parquet,
                    "source_sha256": expected_hash,
                    "rows": len(frame),
                }
            )
        (export_dir / "analysis_inputs.json").write_text(
            canonical(
                {
                    "bundle_sha256": self.bundle.manifest["bundle_sha256"],
                    "files": inputs,
                    "transform": "Backend pandas CSV export from verified Parquet. Raw strings and units preserved; list cells JSON-encoded; float output uses 17 significant digits.",
                }
            ),
            encoding="utf-8",
        )
        for name in sorted(ALLOWED_INPUTS):
            path = export_dir / name
            if path.stat().st_size > 20_000_000:
                raise ValueError("Sandbox input exceeds 20 MB")
            with path.open("rb") as stream:
                uploaded = await self.client.files.create(file=(name, stream), purpose="user_data")
            self.uploads.append(uploaded.id)
        self.container = await self.client.containers.create(
            name="embernova-analysis",
            memory_limit="1g",
            file_ids=self.uploads,
            network_policy={"type": "disabled"},
            expires_after={"anchor": "last_active_at", "minutes": 20},
        )
        if self.container.memory_limit != "1g" or self.container.network_policy.type != "disabled":
            raise ValueError("Required hosted isolation policy was not confirmed")
        mounted = [f async for f in self.client.containers.files.list(self.container.id, limit=100)]
        for file in mounted:
            actual = PurePosixPath(file.path).name
            matches = [name for name in ALLOWED_INPUTS if actual.endswith(name)]
            if len(matches) != 1:
                raise ValueError("Unexpected mounted input filename")
            self.input_aliases[actual] = matches[0]
            self.input_aliases[file.path] = matches[0]
        return {"type": "code_interpreter", "container": self.container.id}

    def instructions(self):
        return """Analysis Lab is explicitly enabled. Python runs ONLY in the provided hosted container, with 1 GB memory and network disabled. No host filesystem or secrets are mounted. Use at most 3 Python calls. The mounted runs.csv, conditions.csv, measurements.csv, quality_findings.csv and provenance.csv are deterministic backend exports from the verified Parquet Analysis Bundle. Read them with pandas.read_csv; no Parquet reader or installation is required. analysis_inputs.json records their hashes, original Parquet hashes, and export transformation. List-valued cells such as quality_flags and alt_labels are JSON strings; parse them with json.loads, treating empty cells as empty lists. Raw strings and units are preserved; numeric cells use 17 significant digits. Print package versions first. Merge runs with conditions/measurements on run_uid, pivot variable/quantity, and use value_si and unit_si for calculations. Preserve design/measured distinctions. Exclude runs flagged duplicate_row, implausible_value, or encoding_artifact. Code and results are SI-generated derived analyses, never new measured observations. Never create measured-data chart points from imagination.
Write /mnt/data/result.json exactly matching the supplied schema. Output at most 4 small CSVs with plain filenames and <=50000 rows each. Charts refer only to those CSVs; the backend renders charts. Do not output PNGs, execute shell commands, access the network, or read environment variables. All statistics must refer to the mounted inputs. Results are exploratory and require scientific review.
Schema: """ + canonical(RESULT_SCHEMA)

    async def _read(self, file, limit):
        if (getattr(file, "bytes", 0) or 0) > limit:
            raise ValueError("Sandbox output exceeds size limit")
        data = bytearray()
        async with self.client.containers.files.content.with_streaming_response.retrieve(
            file.id, container_id=self.container.id
        ) as response:
            async for chunk in response.iter_bytes():
                data.extend(chunk)
                if len(data) > limit:
                    raise ValueError("Sandbox output exceeds size limit")
        return bytes(data)

    async def collect(self, response, tools):
        calls = [item for item in response.output if item.type == "code_interpreter_call"]
        self.calls += len(calls)
        if self.calls > 3:
            raise ValueError("Hosted code call limit reached")
        cells = [
            {
                "code": item.code or "",
                "stdout": "\n".join(str(getattr(o, "logs", "")) for o in (item.outputs or []))[
                    :50000
                ],
                "stderr": None,
            }
            for item in calls
        ]
        files = [f async for f in self.client.containers.files.list(self.container.id, limit=100)]
        by_name = {PurePosixPath(f.path).name: f for f in files if f.path.startswith("/mnt/data/")}
        payload = {
            "kind": "analysis_run",
            "cells": cells,
            "result": None,
            "validation_errors": [],
            "charts": [],
            "files": [],
            "container": {
                "memory_limit": "1g",
                "input_file_ids": self.uploads,
                "bundle_sha256": self.bundle.manifest["bundle_sha256"],
                "network_policy": "disabled",
            },
        }
        try:
            if "result.json" not in by_name:
                raise ValueError("Code did not produce result.json")
            result = validate_result(
                await self._read(by_name["result.json"], 2_000_000), self.input_aliases
            )
            names = {t["file"] for t in result["tables"]} | {
                c["data_file"] for c in result["charts"]
            }
            if len(names) > 4:
                raise ValueError("Too many sandbox output files")
            frames = {}
            for name in names:
                if (
                    name not in by_name
                    or PurePosixPath(name).name != name
                    or not name.endswith(".csv")
                ):
                    raise ValueError("Invalid or missing sandbox CSV reference")
                raw = await self._read(by_name[name], 10_000_000)
                frame = pd.read_csv(io.BytesIO(raw), nrows=50001)
                if len(frame) > 50000:
                    raise ValueError("Sandbox CSV exceeds 50000 rows")
                frames[name] = frame
            if not result["results"] and not any(len(frame) for frame in frames.values()):
                raise ValueError(
                    "No derived results were produced; source access or computation was blocked"
                )
            payload["result"] = result
            payload["tables"] = [
                {
                    "name": name,
                    "rows": frame.astype(object).where(frame.notna(), None).to_dict("records"),
                }
                for name, frame in frames.items()
            ]
            for chart in result["charts"]:
                frame = frames[chart["data_file"]]
                x, y = chart["x"]["field"], chart["y"]["field"]
                if not {x, y} <= set(frame) or not chart["x"]["unit"] or not chart["y"]["unit"]:
                    raise ValueError("Chart fields or units are missing")
                for axis in [chart["x"], chart["y"]]:
                    UREG.Unit(axis["unit"])
                if not all(math.isfinite(float(v)) for column in [x, y] for v in frame[column]):
                    raise ValueError("Chart has non-finite or nonnumeric values")
                series = []
                grouped = (
                    frame.groupby(chart["series_field"])
                    if chart["series_field"]
                    else [("SI-derived analysis", frame)]
                )
                for i, (name, part) in enumerate(grouped):
                    series.append(
                        {
                            "name": str(name),
                            "style": {
                                "color_token": f"series-{i + 1}",
                                "symbol": "circle",
                                "hollow": False,
                            },
                            "points": {
                                "x": list(part[x]),
                                "y": list(part[y]),
                                "run_uid": list(part.run_uid)
                                if "run_uid" in part
                                else [None] * len(part),
                            },
                        }
                    )
                payload["charts"].append(
                    {
                        "spec_version": "1",
                        "chart_type": chart["chart_type"],
                        "title": chart["title"],
                        "x": {
                            "field": x,
                            "label": x,
                            "unit": chart["x"]["unit"],
                            "display_unit": chart["x"]["unit"],
                            "scale": "linear",
                        },
                        "y": {
                            "field": y,
                            "label": y,
                            "unit": chart["y"]["unit"],
                            "display_unit": chart["y"]["unit"],
                            "scale": "linear",
                        },
                        "series": series,
                        "annotations": [],
                        "notes": [
                            "SI-generated exploratory analysis; inspect the code and source inputs before relying on it."
                        ],
                        "provenance": {
                            "bundle_version": self.bundle.manifest["bundle_version"],
                            "query_hash": self.bundle.manifest["bundle_sha256"],
                            "table_ids": list(self.bundle.runs.table_id.unique()),
                            "evidence_ids": [],
                            "transform_steps": [
                                result["method"],
                                "Backend validated CSV and constructed ChartSpec",
                            ],
                        },
                    }
                )
        except Exception as exc:
            payload["validation_errors"] = [f"{type(exc).__name__}: {str(exc)[:300]}"]
        art = tools.artifact(
            payload,
            "Hosted scientific code analysis",
            {"bundle_sha256": self.bundle.manifest["bundle_sha256"]},
            "analysis_lab",
            list(self.bundle.runs.table_id.unique()),
        )
        art["status"] = "invalid_result" if payload["validation_errors"] else "ok"
        art["labels"].update(
            si_generated=True,
            selected_by_si=True,
            data_origin="SI-derived analysis of NASA measurements",
        )
        for chart in payload["charts"]:
            chart["provenance"]["evidence_ids"] = [art["evidence_id"]]
        tools.store.put("artifacts", art["artifact_id"], art)
        return art

    async def close(self):
        if self.container:
            try:
                await self.client.containers.delete(self.container.id)
            except Exception:
                pass  # provider also expires the isolated container; no host resources remain
        for file_id in self.uploads:
            try:
                await self.client.files.delete(file_id)
            except Exception:
                pass
