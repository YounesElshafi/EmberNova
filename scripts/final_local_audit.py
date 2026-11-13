"""Offline final checks; only generated recordings/reports may be written."""

import csv
import json
import math
import statistics
from collections import defaultdict

from embernova.config import ROOT, settings
from embernova.provenance import canonical, now
from embernova.science.bundle import Bundle
from embernova.science.units import convert
from embernova.storage import Store
from jsonschema import Draft202012Validator
from referencing import Registry, Resource


def main():
    cfg = settings()
    store, bundle = Store(cfg), Bundle(cfg)
    report = {"checked_at": now(), "live_requests": False}
    # Independently recompute the hosted result from original CSV, not its exported inputs.
    values = defaultdict(list)
    source = (
        ROOT
        / "data/investigations/PSI-69_FLEX/raw/datasets/PSI-69_Experimental table_FLEX.csv"
    )
    with source.open(encoding="cp1252", newline="") as file:
        for row in csv.DictReader(file):
            try:
                k = float(row["Burning rate; mm"])
                if (
                    float(row["Ambient pressure; mmHg"]) > 0
                    and math.isfinite(k)
                    and k > 0
                ):
                    values[row["Fuel"]].append(convert(k, "mm**2/s", "m**2/s"))
            except ValueError:
                continue
    lab = json.loads(
        (cfg.build_dir / "eval/analysis_lab.json").read_text(encoding="utf-8")
    )
    assert lab["success"], "Hosted analysis did not succeed"
    artifact = store.get("artifacts", lab["artifacts"][0]["artifact_id"])
    verified = []
    for result in artifact["payload"]["result"]["results"]:
        matches = [
            fuel for fuel in ["methanol", "n-heptane"] if fuel in result["name"].lower()
        ]
        assert len(matches) == 1, "Expected an unambiguous fuel-specific median"
        fuel = matches[0]
        # Fuel names below are source labels, not inferred experimental conditions.
        raw_fuel = {"methanol": "Methanol", "n-heptane": "Heptane"}[fuel]
        samples = values[raw_fuel]
        assert result["n"] == len(samples)
        assert math.isclose(
            convert(result["value"], result["unit"], "m**2/s"),
            statistics.median(samples),
            rel_tol=1e-12,
        )
        verified.append(
            {"fuel": fuel, "n": len(samples), "median_si": statistics.median(samples)}
        )
    assert {v["fuel"] for v in verified} == {"methanol", "n-heptane"} and len(
        verified
    ) == 2
    report["independent_lab_results"] = verified
    # Record a verified real Lab turn for use during API outages.
    events = store.events(lab["session_id"])
    assert events[-1]["event"] == "turn.completed"
    folder = cfg.build_dir / "replays"
    (folder / "live-lab.json").write_text(
        canonical(
            {
                "meta": {
                    "replay_id": "live-lab",
                    "title": "Hosted Python: verified FLEX fuel medians",
                    "question": artifact["payload"]["result"]["question"],
                    "recorded_at": now(),
                    "model": cfg.agent_model,
                    "scenario": "analysis_lab",
                    "origin": "recorded_live",
                    "si_generated": True,
                    "bundle_sha256": bundle.manifest["bundle_sha256"],
                    "independently_verified": "Raw FLEX CSV median and sample counts matched using pint.",
                },
                "events": events,
            }
        ),
        encoding="utf-8",
    )
    schemas = [
        json.loads(path.read_text(encoding="utf-8"))
        for path in (ROOT / "docs/architecture/contracts").glob("*.schema.json")
    ]
    registry = Registry().with_resources(
        (s["$id"], Resource.from_contents(s)) for s in schemas
    )
    validator = Draft202012Validator(
        next(s for s in schemas if "sse_events" in s["$id"]), registry=registry
    )
    headings = {
        "Answer": "answer",
        "Evidence": "evidence",
        "Engineering implications": "implications",
        "Limits of the evidence": "limits",
        "Open questions": "hypotheses",
    }
    counts = {}
    for path in folder.glob("*.json"):
        playback = json.loads(path.read_text(encoding="utf-8"))
        migrated = False
        for event in playback["events"]:
            if event["event"] == "turn.started":
                event["replay"] = True
            if event["event"] == "text.completed":
                answer = event["answer"]
                sections = [headings.get(h, h) for h in answer["sections_present"]]
                migrated |= (
                    not answer.get("si_generated")
                    or sections != answer["sections_present"]
                )
                answer.update(si_generated=True, sections_present=sections)
            validator.validate(event)
        if migrated:
            playback["meta"]["transport_schema_normalized"] = (
                "SI flag and section keys only; recorded prose/evidence unchanged"
            )
        path.write_text(canonical(playback), encoding="utf-8")
        counts[path.stem] = len(playback["events"])
    report["recordings_schema_validated"] = counts
    # Never reveal the configured secret, even if a scan fails.
    key = cfg.openai_api_key.get_secret_value().encode() if cfg.openai_api_key else None
    checked = 0
    roots = [
        ROOT / "backend/src",
        ROOT / "backend/tests",
        ROOT / "frontend/src",
        ROOT / "frontend/dist",
        ROOT / "scripts",
        ROOT / "docs",
        ROOT / "curation",
    ]
    files = [
        path
        for root in roots
        for path in root.rglob("*")
        if path.is_file() and "__pycache__" not in path.parts
    ]
    files += [
        ROOT / "README.md",
        ROOT / ".env.example",
        ROOT / "SI_DISCLOSURE.json",
        store.app_path,
    ]
    for path in files:
        assert not key or key not in path.read_bytes(), (
            "Configured API secret found in a deliverable; stop and remediate"
        )
        checked += 1
    report["configured_secret_scan"] = {
        "files_checked": checked,
        "matches": 0,
        "key_configured": bool(key),
    }
    (cfg.build_dir / "eval/final_local_audit.json").write_text(
        canonical(report), encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
