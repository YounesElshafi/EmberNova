import argparse
import json
import sqlite3
from contextlib import closing

from embernova.config import settings
from embernova.ingest.catalog import build_catalog
from embernova.ingest.documents import build_documents
from embernova.ingest.media import build_media
from embernova.ingest.tables import build_tables


def build() -> dict:
    cfg = settings()
    cfg.build_dir.mkdir(parents=True, exist_ok=True)
    path = cfg.build_dir / "knowledge.next.db"
    if path.exists():
        path.unlink()
    try:
        with closing(sqlite3.connect(path)) as db, db:
            sources = build_catalog(cfg, db)
            build_documents(cfg, db, sources)
            bundle = build_tables(cfg, db, sources)
            build_media(cfg, db, sources)
            counts = {
                name: db.execute(f"SELECT count(*) FROM {name}").fetchone()[0]
                for name in [
                    "investigations",
                    "source_files",
                    "documents",
                    "pages",
                    "chunks",
                    "datasets",
                    "media",
                ]
            }
            for key, value in {
                "build_version": "0.1.0",
                "snapshot_date": "2026-11-13",
                "embeddings": "disabled_lexical_only",
                "bundle_sha256": bundle["bundle_sha256"],
                "counts": json.dumps(counts),
            }.items():
                db.execute("INSERT INTO build_info VALUES (?,?)", (key, value))
        path.replace(cfg.build_dir / "knowledge.db")
    except Exception:
        if path.exists():
            path.unlink()
        raise
    (cfg.build_dir / "build_report.json").write_text(json.dumps(counts, indent=2), encoding="utf-8")
    return counts


def main():
    parser = argparse.ArgumentParser(description="Build the read-only NASA research corpus locally")
    parser.add_argument("command", choices=["all", "embed"])
    parser.add_argument(
        "--fake-embeddings",
        action="store_true",
        help="Compatibility flag: no fake vectors are exposed as semantic search",
    )
    args = parser.parse_args()
    if args.command == "embed":
        from embernova.ingest.embeddings import build_embeddings

        build_embeddings()
    else:
        print(json.dumps(build(), indent=2))


if __name__ == "__main__":
    main()
