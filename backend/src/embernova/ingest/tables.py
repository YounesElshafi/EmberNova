import csv
import json
import re
import sqlite3
from collections import Counter

import pandas as pd
import yaml

from embernova.config import ROOT, Settings
from embernova.ingest.cellparse import parse_cell
from embernova.provenance import canonical, digest, safe_path, sha256

CHECK_MESSAGES = {
    "composition_sum": "Reported gas mole fractions do not sum to 1 within tolerance; values kept as reported",
    "final_exceeds_initial": "Final oxygen exceeds initial oxygen; values kept as reported",
    "final_far_below_initial": "Final oxygen is far below initial oxygen; values kept as reported",
    "extinction_exceeds_initial": "Extinction diameter exceeds initial droplet diameter; values kept as reported",
    "suspect_value_withheld": "A cell looks like a transcription error; raw text kept, normalized value withheld",
}


def row_checks(checks: list[dict], values: dict) -> list[str]:
    """Plausibility warnings across columns. They never change or drop source values."""

    def si(name):
        return values.get(name, {}).get("value_si")

    flags = []
    for check in checks:
        if check["rule"] == "composition_sum":
            parts = [si(n) for n in check["variables"]]
            if all(p is not None for p in parts) and abs(sum(parts) - 1) > check["tolerance"]:
                flags.append("composition_sum")
        elif check["rule"] in {"greater_than", "less_than"}:
            a, b = si(check["a"]), si(check["b"])
            if a is None or b is None:
                continue
            margin = check.get("margin", 0)
            if (check["rule"] == "greater_than" and a > b + margin) or (
                check["rule"] == "less_than" and a < b - margin
            ):
                flags.append(check["flag"])
    return flags


def build_tables(cfg: Settings, db: sqlite3.Connection, sources: dict) -> dict:
    # Imported here so the web server (which imports CHECK_MESSAGES via export.py) never loads
    # openpyxl, and through it Pillow; workbooks are only read by the offline corpus build.
    from openpyxl import load_workbook

    runs, conditions, measurements, findings, provenance = [], [], [], [], []
    for path in sorted((ROOT / "curation/tables").glob("*.yaml")):
        mapping = yaml.safe_load(path.read_text(encoding="utf-8"))
        source = sources[mapping["file_id"]]
        table_id = mapping["table_id"]
        original = safe_path(cfg.data_dir, source["relative_local_path"])
        if mapping.get("format") == "xlsx":
            workbook = load_workbook(original, read_only=True, data_only=True)
            try:
                sheet = workbook[mapping["sheet"]]
                if sheet.max_row > 20000 or sheet.max_column > 200:
                    raise ValueError("Workbook exceeds curated table limits")
                values = sheet.iter_rows(values_only=True)
                headers = [str(v) if v is not None else "" for v in next(values)]
                raw_pairs = [
                    (i, dict(zip(headers, ["" if v is None else str(v) for v in row], strict=True)))
                    for i, row in enumerate(values, 2)
                    if any(v is not None for v in row)
                ]
            finally:
                workbook.close()
            if mapping.get("filter_keys_file_id"):
                key_source = sources[mapping["filter_keys_file_id"]]
                with safe_path(cfg.data_dir, key_source["relative_local_path"]).open(
                    encoding="utf-8-sig", newline=""
                ) as key_file:
                    keys = {
                        r[mapping["filter_key_column"]].strip() for r in csv.DictReader(key_file)
                    }
                raw_pairs = [
                    (n, r) for n, r in raw_pairs if r[mapping["run_label_column"]].strip() in keys
                ]
        else:
            with original.open(encoding=mapping["encoding"], newline="") as f:
                raw_pairs = list(enumerate(csv.DictReader(f), 2))
        label_columns = mapping.get("run_label_columns") or [mapping["run_label_column"]]

        def label_of(raw, label_columns=label_columns):
            return " ".join((raw.get(c) or "").strip() for c in label_columns).strip()

        # Blank spreadsheet rows and documented non-test rows (notes, flow-visualization
        # entries) are not experiments. The mapping file states the pattern and why.
        skip = (
            re.compile(mapping["exclude_label_regex"])
            if mapping.get("exclude_label_regex")
            else None
        )
        raw_pairs = [
            (n, r) for n, r in raw_pairs if (lbl := label_of(r)) and not (skip and skip.search(lbl))
        ]
        raw_rows = [r for _, r in raw_pairs]
        seen = {}
        for rownum, raw in raw_pairs:
            label = label_of(raw)
            uid = f"{table_id}:{label}"
            duplicate_of = None
            if uid in seen:
                if mapping.get("duplicate_policy") != "preserve_identical_source_rows" or seen[
                    uid
                ] != canonical(raw):
                    raise ValueError(f"Duplicate run key with unresolved meaning: {uid}")
                duplicate_of = uid
                uid += f"@row{rownum}"
            else:
                seen[uid] = canonical(raw)
            run = {
                "run_uid": uid,
                "investigation_id": mapping["investigation_id"],
                "table_id": table_id,
                "source_run_label": label,
                "alt_labels": [raw[k].strip() for k in mapping.get("alt_label_columns", [])],
                "source_row": rownum,
                "provenance_id": digest([source["sha256"], rownum]),
                "quality_flags": ["duplicate_row"] if duplicate_of else [],
                "duplicate_of_run_uid": duplicate_of,
                "raw_json": canonical(raw),
                **mapping["defaults"],
            }
            provenance.append(
                {
                    "provenance_id": run["provenance_id"],
                    "file_id": mapping["file_id"],
                    "sha256": source["sha256"],
                    "source_row": rownum,
                    "mapping": path.name,
                    "mapping_sha256": sha256(path),
                    "evidence_json": canonical(mapping["evidence"]),
                }
            )
            values = {}
            for column, spec in mapping["columns"].items():
                if column not in raw:
                    raise ValueError(f"Missing curated header: {column}")
                if spec["role"] == "run_field":
                    run[spec["field"]] = raw[column]
                    if spec["field"] == "fuel_raw":
                        run["fuel_canonical"] = spec.get("canonical_map", {}).get(
                            raw[column], raw[column].strip()
                        )
                    elif spec.get("canonical_map") is not None:
                        key = raw[column].strip()
                        run[spec["field"] + "_canonical"] = spec["canonical_map"].get(
                            key, spec["canonical_map"].get(key.casefold(), key or None)
                        )
                    continue
                name = spec.get("variable", spec.get("quantity"))
                value = parse_cell(raw[column], spec.get("unit"))
                # Preserve lossy original header units alongside authoritative interpreted units.
                value["unit_raw"] = spec.get("unit_raw", spec.get("unit"))
                value["quality_flags"] += spec.get("quality_flags", [])
                value.update(
                    run_uid=uid,
                    source_column=column,
                    value_kind=mapping["defaults"]["value_kind"],
                    derivation=None,
                )
                v = value["value_si"]
                bounds = spec.get("plausible_si")
                if v is not None and (
                    (bounds and not bounds[0] <= v <= bounds[1])
                    or ("mole_fraction" in name and not 0 <= v <= 1)
                ):
                    if spec.get("on_implausible") == "withhold":
                        # Likely transcription error (e.g. "037 mm"): keep the raw cell visible,
                        # withhold only this normalized value, keep the rest of the test usable.
                        value.update(value_si=None, display_value=None)
                        value["quality_flags"].append("suspect_value_withheld")
                    else:
                        value["quality_flags"].append("implausible_value")
                if value["quality_flags"]:
                    run["quality_flags"] += [
                        flag
                        for flag in value["quality_flags"]
                        if flag != "unit_inferred_from_source_doc"
                    ]
                value["variable" if spec["role"] == "condition" else "quantity"] = name
                (conditions if spec["role"] == "condition" else measurements).append(value)
                values[name] = value
            if all(
                values.get(n, {}).get("value_si") is not None
                for n in ["o2_mole_fraction", "total_pressure"]
            ):
                oxygen, pressure = values["o2_mole_fraction"], values["total_pressure"]
                pp = oxygen["value_si"] * pressure["value_si"]
                conditions.append(
                    {
                        "run_uid": uid,
                        "variable": "o2_partial_pressure",
                        "value_si": pp,
                        "unit_si": "pascal",
                        "display_value": pp,
                        "display_unit": "Pa",
                        "value_raw": "",
                        "unit_raw": None,
                        "value_min_si": None,
                        "value_max_si": None,
                        "value_list_si": None,
                        "qualifier": "exact",
                        "value_kind": "derived",
                        "source_column": "derived",
                        "derivation": "o2_mole_fraction * total_pressure",
                        "quality_flags": pressure["quality_flags"][:],
                    }
                )
            run["quality_flags"] += row_checks(mapping.get("row_checks", []), values)
            for flag in sorted(set(run["quality_flags"])):
                findings.append(
                    {
                        "finding_id": digest([uid, flag]),
                        "run_uid": uid,
                        "table_id": table_id,
                        "check": flag,
                        "severity": "error" if flag == "implausible_value" else "warn",
                        "message": CHECK_MESSAGES.get(flag, flag.replace("_", " ")),
                    }
                )
            run["quality_flags"] = sorted(set(run["quality_flags"]))
            runs.append(run)
        summary = {
            "table_id": table_id,
            "investigation_id": mapping["investigation_id"],
            "title": mapping["title"],
            "file_id": mapping["file_id"],
            "row_count": len(raw_rows),
            "kind": "conditions_design"
            if mapping["defaults"]["value_kind"] == "design"
            else "runs",
            "curation_file": str(path.relative_to(ROOT)).replace("\\", "/"),
            "mapping": mapping,
            "source": source,
            "quality_summary": dict(
                Counter(f["severity"] for f in findings if f["table_id"] == table_id)
            ),
        }
        db.execute(
            "INSERT INTO datasets VALUES (?,?,?)",
            (table_id, mapping["investigation_id"], canonical(summary)),
        )
    bundle = cfg.build_dir / "bundle"
    bundle.mkdir(exist_ok=True)
    for name, rows in [
        ("runs", runs),
        ("conditions", conditions),
        ("measurements", measurements),
        ("quality_findings", findings),
        ("provenance", provenance),
    ]:
        pd.DataFrame(rows).to_parquet(bundle / f"{name}.parquet", index=False)
    manifest = {
        "bundle_version": "1.0.0",
        "files": [{"name": p.name, "sha256": sha256(p)} for p in sorted(bundle.glob("*.parquet"))],
    }
    manifest["bundle_sha256"] = digest(manifest)
    (bundle / "bundle_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest
