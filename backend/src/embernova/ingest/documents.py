import json
import shutil
import sqlite3

from embernova.config import Settings
from embernova.ingest.catalog import jsonlines
from embernova.provenance import canonical, safe_path


def build_documents(cfg: Settings, db: sqlite3.Connection, sources: dict) -> None:
    db.executescript("""
    CREATE TABLE documents (document_id TEXT PRIMARY KEY, file_id TEXT, investigation_id TEXT, title TEXT, data_json TEXT);
    CREATE TABLE pages (page_id TEXT PRIMARY KEY, document_id TEXT, page_number INTEGER, text TEXT, is_empty INTEGER);
    CREATE TABLE chunks (chunk_id TEXT PRIMARY KEY, document_id TEXT, investigation_id TEXT, page INTEGER, char_start INTEGER, char_end INTEGER, context_header TEXT, text TEXT);
    CREATE VIRTUAL TABLE chunks_fts USING fts5(chunk_id UNINDEXED, context_header, text, tokenize='porter unicode61');
    CREATE VIRTUAL TABLE profiles_fts USING fts5(investigation_id UNINDEXED, profile_text, tokenize='porter unicode61');
    """)
    (cfg.build_dir / "pdf").mkdir(exist_ok=True)
    for item in jsonlines(cfg.data_dir / "indexes/DOCUMENT_TEXT.jsonl"):
        source = sources.get(item["file_id"])
        if source is None or source["sha256"] != item["sha256"]:
            raise ValueError("Text index references unverified source")
        docid = "doc:" + item["file_id"]
        extracted = json.loads(
            safe_path(cfg.data_dir, item["derived_path"]).read_text(encoding="utf-8")
        )
        title = item["filename"]
        db.execute(
            "INSERT INTO documents VALUES (?,?,?,?,?)",
            (docid, item["file_id"], item["investigation_id"], title, canonical(item)),
        )
        if source["relative_local_path"].lower().endswith(".pdf"):
            shutil.copyfile(
                safe_path(cfg.data_dir, source["relative_local_path"]),
                cfg.build_dir / "pdf" / (item["file_id"] + ".pdf"),
            )
        for n, part in enumerate(extracted["parts"], 1):
            # DOCX paragraphs/PPTX slides are explicitly parts, not physical PDF pages.
            page = part.get("page_number") or n
            text = part.get("text", "")
            pageid = f"{docid}#p{page}"
            db.execute(
                "INSERT INTO pages VALUES (?,?,?,?,?)",
                (pageid, docid, page, text, int(len(text.strip()) < 20)),
            )
            if len(text.strip()) < 20:
                continue
            # Page-bounded character spans preserve exact offsets and extraction layout.
            start, ordinal = 0, 0
            while start < len(text):
                end = min(start + 3200, len(text))
                cid = f"{pageid}:c{ordinal}"
                header = f"[{item['investigation_id']}] {title} — physical page/part {page}"
                db.execute(
                    "INSERT INTO chunks VALUES (?,?,?,?,?,?,?,?)",
                    (
                        cid,
                        docid,
                        item["investigation_id"],
                        page,
                        start,
                        end,
                        header,
                        text[start:end],
                    ),
                )
                db.execute("INSERT INTO chunks_fts VALUES (?,?,?)", (cid, header, text[start:end]))
                if end == len(text):
                    break
                start, ordinal = end - 480, ordinal + 1
    for row in db.execute("SELECT investigation_id,data_json FROM investigations").fetchall():
        meta = json.loads(row[1])
        fields = (
            "acronym",
            "title",
            "objectives",
            "approach",
            "hardware",
            "relevance",
            "subcategory",
        )
        db.execute(
            "INSERT INTO profiles_fts VALUES (?,?)",
            (row[0], "\n".join(str(meta.get(k) or "") for k in fields)),
        )
