# ADR-004: SQLite knowledge DB + Parquet Analysis Bundle + SQLite app DB

- **Status:** Accepted (2026-11-13)
- **Problem:** Store the catalog, text, vectors, normalized measurements, time series and app state on a small shared VPS.
- **Options:** Postgres + pgvector; a vector DB (Qdrant, Chroma); Neo4j; DuckDB only; **SQLite + Parquet**.
- **Decision:**
  - `build/knowledge.db` holds the catalog, text, FTS5 indexes and embedding BLOBs. It is SQLite and read-only.
  - `build/bundle/*.parquet` is read through in-process DuckDB views. It is the single numeric source of truth and is shared with the sandbox.
  - `var/app.db` holds app state, in SQLite WAL mode.
- **Reasons:**
  - There are no services to run, and RAM use is small.
  - The files are deterministic build artifacts.
  - Parquet uploads directly to Code Interpreter.
  - About 10k vectors don't need approximate-nearest-neighbor search.
- **Consequences:** the backend runs as a single process, and data changes require a rebuild and redeploy. That is acceptable for a snapshot corpus.
- **Reverse if:** we need multiple instances or user-uploaded data. In that case, move app state to Postgres.
