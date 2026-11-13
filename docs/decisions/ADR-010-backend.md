# ADR-010: FastAPI single-process backend, uv-managed

- **Status:** Accepted (2026-11-13)
- **Options:** **FastAPI**, Django, Flask, Node/Express.
- **Decision:**
  - Python 3.12 with FastAPI, Pydantic v2 and Uvicorn (1 worker), managed with uv.
  - pandas, DuckDB and pint for data work; structlog for logging.
  - Ingestion is a CLI in the same package.
- **Reasons:**
  - Typed contracts: Pydantic generates the JSON Schemas for strict tools and the OpenAPI spec.
  - Async SSE support.
  - Access to the scientific Python ecosystem.
  - One codebase for both the build and the runtime.
- **Consequences:** CPU-bound tools run in a thread pool, and the in-memory caches stay coherent because there is one process.
- **Reverse if:** concurrency needs exceed one process. Then move app state to Postgres and run multiple workers.
