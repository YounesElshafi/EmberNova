import csv
import json
import re
import sqlite3

from embernova.config import Settings
from embernova.provenance import canonical, safe_path, sha256


def jsonlines(path):
    return [json.loads(s) for s in path.read_text(encoding="utf-8").splitlines() if s.strip()]


def build_catalog(cfg: Settings, db: sqlite3.Connection) -> dict:
    db.executescript("""
    CREATE TABLE investigations (investigation_id TEXT PRIMARY KEY, acronym TEXT, title TEXT, data_json TEXT);
    CREATE TABLE source_files (file_id TEXT PRIMARY KEY, investigation_id TEXT, sha256 TEXT, data_json TEXT);
    CREATE TABLE publications (pub_id INTEGER PRIMARY KEY, investigation_id TEXT, data_json TEXT);
    CREATE TABLE relations (subject TEXT, predicate TEXT, object TEXT, data_json TEXT);
    CREATE TABLE datasets (table_id TEXT PRIMARY KEY, investigation_id TEXT, data_json TEXT);
    CREATE TABLE build_info (key TEXT PRIMARY KEY, value TEXT);
    """)
    with (cfg.data_dir / "DOWNLOAD_MANIFEST.csv").open(encoding="utf-8-sig", newline="") as f:
        sources = {
            r["file_id"]: r
            for r in csv.DictReader(f)
            if r["download_status"] == "verified" and r["origin_status"] == "original"
        }
    for r in sources.values():
        if not re.fullmatch(r"[A-Za-z0-9_-]+", r["file_id"]):
            raise ValueError("Source file ID cannot be used as a safe build filename")
        path = safe_path(cfg.data_dir, r["relative_local_path"])
        if sha256(path) != r["sha256"]:
            raise ValueError(f"SHA-256 mismatch for {r['file_id']}")
        db.execute(
            "INSERT INTO source_files VALUES (?,?,?,?)",
            (r["file_id"], r["investigation_id"], r["sha256"], canonical(r)),
        )
    with (cfg.data_dir / "SOURCE_CATALOG.csv").open(encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            if r["source_type"] not in {"psi_investigation", "supplemental_investigation"}:
                continue
            iid = r["source_id"]
            meta = json.loads(
                safe_path(cfg.data_dir, r["metadata_path"]).read_text(encoding="utf-8")
            )
            r.update(
                investigation_id=iid,
                is_psi=r["source_type"] == "psi_investigation",
                curation_status="source_metadata",
                si_generated=False,
            )
            # No inferred scientific findings: the UI displays NASA's own metadata verbatim.
            r["metadata_sha256"] = sha256(safe_path(cfg.data_dir, r["metadata_path"]))
            db.execute(
                "INSERT INTO investigations VALUES (?,?,?,?)",
                (iid, r.get("acronym"), r["title"], canonical(r)),
            )
            for pub in meta.get("publications", []):
                db.execute(
                    "INSERT INTO publications(investigation_id,data_json) VALUES (?,?)",
                    (iid, canonical(pub)),
                )
    relation_path = cfg.data_dir / "indexes/SOURCE_RELATIONSHIPS.csv"
    with relation_path.open(encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            vals = list(r.values())
            db.execute(
                "INSERT INTO relations VALUES (?,?,?,?)",
                (
                    r.get("subject_id", vals[0]),
                    r.get("relationship", vals[1]),
                    r.get("object_id", vals[2]),
                    canonical(r),
                ),
            )
    return sources
