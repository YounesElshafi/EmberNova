import json
import sqlite3
from contextlib import contextmanager

from embernova.config import Settings
from embernova.provenance import canonical


class Store:
    """Short-lived connections keep thread ownership explicit and writes transactional."""

    def __init__(self, cfg: Settings):
        self.cfg = cfg
        self._record_cache = {}
        cfg.state_dir.mkdir(parents=True, exist_ok=True)
        self.app_path = cfg.state_dir / "app.db"
        with self.app() as db:
            db.executescript("""
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS evidence(id TEXT PRIMARY KEY, data TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS artifacts(id TEXT PRIMARY KEY, data TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS artifact_owners(id TEXT PRIMARY KEY, owner TEXT);
            CREATE TABLE IF NOT EXISTS published_artifacts(id TEXT PRIMARY KEY);
            CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, data TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS turns(id TEXT PRIMARY KEY, session_id TEXT, data TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS events(turn_id TEXT, seq INTEGER, session_id TEXT, data TEXT, PRIMARY KEY(turn_id, seq));
            CREATE TABLE IF NOT EXISTS usage(id TEXT PRIMARY KEY, day TEXT, ip TEXT, created REAL, cost REAL, reserved REAL);
            """)

    @contextmanager
    def knowledge(self):
        uri = (self.cfg.build_dir / "knowledge.db").resolve().as_uri() + "?mode=ro&immutable=1"
        db = sqlite3.connect(uri, uri=True)
        db.row_factory = sqlite3.Row
        try:
            yield db
        finally:
            db.close()

    @contextmanager
    def app(self):
        db = sqlite3.connect(self.app_path, timeout=10)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def query(self, sql, params=()):
        with self.knowledge() as db:
            return [dict(r) for r in db.execute(sql, params).fetchall()]

    def _record_json(self, table, where="", params=()):
        if table not in {
            "investigations",
            "source_files",
            "documents",
            "datasets",
            "media",
            "publications",
            "relations",
        }:
            raise ValueError("Unknown catalog table")
        key = (table, where, params)
        if key in self._record_cache:
            return self._record_cache[key]
        result = tuple(
            r["data_json"] for r in self.query(f"SELECT data_json FROM {table} {where}", params)
        )
        if len(self._record_cache) >= 512:
            self._record_cache.clear()
        self._record_cache[key] = result
        return result

    def records(self, table, where="", params=()):
        return [json.loads(text) for text in self._record_json(table, where, tuple(params))]

    def put(self, table: str, key: str, data: dict):
        if table not in {"evidence", "artifacts", "sessions"}:
            raise ValueError("Unknown state table")
        with self.app() as db:
            policy = "IGNORE" if table == "evidence" else "REPLACE"
            db.execute(f"INSERT OR {policy} INTO {table} VALUES (?,?)", (key, canonical(data)))

    def get(self, table: str, key: str) -> dict:
        if table not in {"evidence", "artifacts", "sessions"}:
            raise ValueError("Unknown state table")
        with self.app() as db:
            row = db.execute(f"SELECT data FROM {table} WHERE id=?", (key,)).fetchone()
        if row is None:
            raise KeyError(key)
        return json.loads(row["data"])

    def set_artifact_owner(self, artifact_id: str, owner: str | None):
        with self.app() as db:
            db.execute("INSERT OR REPLACE INTO artifact_owners VALUES (?, ?)", (artifact_id, owner))

    def artifact_owner(self, artifact_id: str) -> str | None:
        with self.app() as db:
            row = db.execute(
                "SELECT owner FROM artifact_owners WHERE id=?", (artifact_id,)
            ).fetchone()
        return row["owner"] if row else None

    def publish_artifact(self, artifact_id: str):
        with self.app() as db:
            db.execute("INSERT OR IGNORE INTO published_artifacts VALUES (?)", (artifact_id,))

    def artifact_is_public(self, artifact_id: str) -> bool:
        with self.app() as db:
            return (
                db.execute(
                    "SELECT 1 FROM published_artifacts WHERE id=?", (artifact_id,)
                ).fetchone()
                is not None
            )

    def event(self, session_id, event):
        with self.app() as db:
            db.execute(
                "INSERT INTO events VALUES (?,?,?,?)",
                (event["turn_id"], event["seq"], session_id, canonical(event)),
            )

    def events(self, session_id, turn_id=None, after=-1):
        with self.app() as db:
            rows = db.execute(
                "SELECT data FROM events WHERE session_id=? AND (? IS NULL OR turn_id=?) AND seq>? ORDER BY rowid",
                (session_id, turn_id, turn_id, after),
            ).fetchall()
        return [json.loads(r["data"]) for r in rows]
