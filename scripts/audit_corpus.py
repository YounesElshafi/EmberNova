"""Read-only independent corpus audit. Run with python -I."""

import csv
import hashlib
import json
import statistics
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUT = ROOT / "build" / "eval"
OUT.mkdir(parents=True, exist_ok=True)


def lines(name):
    return [
        json.loads(s)
        for s in (DATA / "indexes" / name).read_text(encoding="utf-8").splitlines()
    ]


manifest = list(
    csv.DictReader(
        (DATA / "DOWNLOAD_MANIFEST.csv").open(encoding="utf-8-sig", newline="")
    )
)
verified = [
    r
    for r in manifest
    if r["download_status"] == "verified" and r["origin_status"] == "original"
]
bad = []
for r in verified:
    p = DATA / r["relative_local_path"]
    if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest() != r["sha256"]:
        bad.append(r["file_id"])
flex = next(
    r for r in verified if r["filename"] == "PSI-69_Experimental table_FLEX.csv"
)
rows = list(
    csv.DictReader(
        (DATA / flex["relative_local_path"]).open(encoding="cp1252", newline="")
    )
)
o = "O initial ambient composition; mole fraction"
p = "Ambient pressure; mmHg"
selected = [
    r for r in rows if 0.30 <= float(r[o]) <= 0.34 and 520 <= float(r[p]) <= 560
]
ratios = []
for r in rows:
    try:
        d0, de, k, t = [
            float(r[c])
            for c in [
                "Droplet initial diameter; mm",
                "Visible flame extinction diameter; mm",
                "Burning rate; mm",
                "Burn time; s",
            ]
        ]
        ratios.append((d0 * d0 - de * de) / (k * t))
    except (ValueError, ZeroDivisionError):
        pass
docs = lines("DOCUMENT_TEXT.jsonl")
report = next(d for d in docs if d["file_id"] == "NTRS-20150023456-1")
report_text = json.loads((DATA / report["derived_path"]).read_text(encoding="utf-8"))
summary = {
    "verified_originals": len(verified),
    "mismatches": bad,
    "documents": len(docs),
    "document_shape": list(report_text),
    "flex_sha256": flex["sha256"],
    "flex_rows": len(rows),
    "flex_headers": list(rows[0]),
    "first_row": rows[0],
    "lunar_atmosphere_rows": len(selected),
    "lunar_rows": selected,
    "duplicate_alt_ids": {
        k: v for k, v in Counter(r["FLEX Identifier"] for r in rows).items() if v > 1
    },
    "zero_pressure_tests": [r["FLEX Test #"] for r in rows if float(r[p]) <= 0],
    "d2_n": len(ratios),
    "d2_median": statistics.median(ratios),
    "media": len(lines("LOCAL_MEDIA.jsonl")),
    "manifest_digest": hashlib.sha256(
        (DATA / "DOWNLOAD_MANIFEST.csv").read_bytes()
    ).hexdigest(),
}
(OUT / "corpus_audit.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
print(
    json.dumps(
        {
            k: v
            for k, v in summary.items()
            if k not in ["lunar_rows", "flex_headers", "first_row"]
        },
        indent=2,
    )
)
parts = report_text.get("pages", report_text.get("parts", []))
print("PART SHAPE", str(parts[:1])[:600])
for part in parts:
    if "Burning rate" in part.get("text", "") or "mm2/s" in part.get("text", ""):
        print("HEADER EVIDENCE", json.dumps(part, ensure_ascii=True)[:2000])
