# Architecture Decision Records

| ADR | Decision |
| --- | --- |
| [001](ADR-001-single-agent-deterministic-tools.md) | One agent + deterministic scientific tools |
| [002](ADR-002-llm-openai.md) | OpenAI: `gpt-6.1-sol` agent, `gpt-6-luna` bulk, `text-embedding-3-small` |
| [003](ADR-003-retrieval.md) | Hybrid two-level retrieval, no GraphRAG |
| [004](ADR-004-storage.md) | SQLite + Parquet/DuckDB + SQLite app DB |
| [005](ADR-005-provenance-evidence.md) | Deterministic evidence IDs, validated citations |
| [006](ADR-006-deterministic-charts.md) | Backend ChartSpec → Plotly |
| [007](ADR-007-code-execution.md) | Analysis Lab on OpenAI Code Interpreter (explicit containers) |
| [008](ADR-008-predictive-modeling.md) | No general predictor; Envelope; gated droplet model |
| [009](ADR-009-frontend.md) | Vite + React + TS SPA |
| [010](ADR-010-backend.md) | FastAPI single process, uv |
| [011](ADR-011-media.md) | Media derivatives, filename-inferred association |
| [012](ADR-012-deployment-judge-resilience.md) | Team VPS container + Judge Mode + HF fallback |
| [013](ADR-013-si-labeling.md) | SI labeling and watermarking |
| [014](ADR-014-repo-data-hygiene.md) | Read-only corpus, reproducible build |

To change a decision, add a new ADR that supersedes the old one and update the canonical architecture doc. Only the architect edits these files (AGENTS.md §6).
