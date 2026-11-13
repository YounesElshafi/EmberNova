# Technology research and decision matrix

**Research date:** Nov 13 2026. Vendor facts were checked on official pages where possible; their sources are in [SOURCE_REFERENCES.md](SOURCE_REFERENCES.md).

The **weights below are our engineering priorities, not NASA judging weights.**

**Criteria and weights:**
- SC: scientific correctness (×3)
- DC: dataset compatibility (×2)
- RL: reliability (×2)
- SE: security (×2)
- DX: development complexity, where higher is simpler (×2)
- TD: time to working demo (×3)
- CO: cost (×1)
- EX: extensibility (×1)

Scores run 1–5. Weighted = Σ score × weight, with a maximum of 80.

## 1. LLM provider and model

The team decided on **OpenAI**. Model choice within OpenAI is from official pricing and models pages, Nov 13 2026:

| Model | $/1M in / cached / out | Context | Role in EmberNova |
| --- | --- | --- | --- |
| `gpt-6-astra` | 10 / 1 / 50 | 1.05M | Not used by default. Too costly for a public judge deployment. Optional config to record featured sessions |
| **`gpt-6.1-sol`** | 2 / 0.10 / 10 | 1.05M | **Agent.** Pitched as the "balance of intelligence and cost"; reasoning effort low through max |
| `gpt-6.1-terra` | 1 / 0.05 / 5 | 1.05M | Fallback agent if Sol is rate-limited |
| **`gpt-6-luna`** | 0.10 / 0.01 / 0.50 | 1.05M | Build-time profile drafting; budget-guard fallback |
| **`text-embedding-3-small`** | 0.02 | — | Dense retrieval, `dimensions=512` |
| **`gpt-image-1-mini`** | text in 2.00, image out 8.00 | — | P2 conceptual illustrations, server-watermarked |

**Decision:** route by workload, not by query. That means one agent model, one cheap model for offline bulk work, and one embedding model. Per-query routing between models is rejected: it adds evaluation burden and loses cache reuse.

**Caveat:** the models page lists function calling and image input for the GPT-6 family. Code Interpreter examples use `gpt-6-astra`, and the docs do not list supported models explicitly. **M9 must smoke-test `code_interpreter` with `gpt-6.1-sol`.** If it is unsupported, the Analysis Lab turns use `gpt-6.1-terra` or `gpt-6-astra`, set by config.

## 2. Agent orchestration

| Option | SC | DC | RL | SE | DX | TD | CO | EX | Weighted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Manual Responses-API tool loop + typed tools** | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 4 | **75** |
| OpenAI Agents SDK | 4 | 5 | 4 | 4 | 4 | 4 | 5 | 4 | 67 |
| LangGraph state machine | 4 | 4 | 4 | 4 | 2 | 2 | 5 | 5 | 56 |
| Multi-agent (planner, retriever, analyst, writer) | 3 | 4 | 2 | 4 | 1 | 1 | 2 | 4 | 40 |

**Why:**
- We must control the SSE event stream, the per-turn evidence ledger, citation validation, budget enforcement and replay recording.
- A ~200-line loop gives full control.
- Multi-agent pipelines multiply latency and cost, and they create inconsistent evidence handoffs. Nothing in our use case needs parallel independent reasoning.

## 3. Retrieval

| Option | Notes | Verdict |
| --- | --- | --- |
| Vector-only RAG | Misses exact identifiers (e.g. "LCTF030", "SIBAL", "Kapton") | Rejected |
| **Hybrid BM25 + dense + RRF** | Anthropic's Contextual Retrieval study (2024) found BM25 combined with embeddings cut top-20 retrieval failures from 5.7% to 2.9% vs embeddings alone; reranking brought it to 1.9%. Robust and cheap | **Selected** |
| Contextual chunk headers (LLM-written) | Gains depend on corpus | Replaced by **deterministic headers** (investigation, doc title, section, page), which our metadata makes almost free. LLM headers are P2 if the benchmark shows gaps |
| Cross-encoder reranker | Needs a hosted model or local inference; the VPS is small | Deferred. The agent model reads the top 8–12 chunks, which effectively acts as a reranker |
| GraphRAG / knowledge graph DB | Our relations are ~400 explicit edges, and the graph is shallow | Rejected. Relations live in SQL, plus a rendered relationship view |
| Agentic retrieval (query decomposition) | Useful for multi-part questions | Comes "for free": the agent can call search tools several times |
| SQL-assisted retrieval | Numeric questions | Selected, via the `query_measurements` tool over the Analysis Bundle |
| Multimodal or visual embeddings | 39 media items, mostly unlabeled | Rejected. Metadata and filename association are sufficient |

## 4. Storage

| Option | Verdict |
| --- | --- |
| **SQLite (FTS5) `knowledge.db` read-only + Parquet bundle via DuckDB + SQLite `app.db`** | **Selected.** Zero services, a single file per concern, small RAM footprint, ships as a deploy artifact |
| Postgres + pgvector | Rejected. It's a service to run on a shared VPS with no need at ~10k vectors |
| Dedicated vector DB (Qdrant, Chroma) | Rejected. Brute-force cosine over ~10k×512 floats takes ~ms in numpy |
| Neo4j | Rejected (see §3) |
| DuckDB file for everything | Rejected. DuckDB's FTS extension needs a separate install, and single-writer semantics complicate app state |

## 5. Code execution sandbox

| Option | SC | DC | RL | SE | DX | TD | CO | EX | Weighted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **OpenAI hosted Code Interpreter (explicit containers)** | 4 | 4 | 4 | 5 | 5 | 5 | 4 | 3 | **70** |
| E2B microVM | 5 | 5 | 4 | 5 | 3 | 3 | 3 | 5 | 66 |
| Docker on the VPS (no network, seccomp) | 4 | 5 | 3 | 2 | 3 | 3 | 5 | 4 | 56 |
| Pyodide in the browser | 4 | 3 | 3 | 5 | 2 | 2 | 5 | 3 | 52 |

- **Facts.** Containers come in 1/4/16/64 GB tiers at $0.03/$0.12/$0.48/$1.92 per 20-minute session. They expire after 20 minutes idle, and files arrive via `file_ids` or the container files API. Outputs come back as `container_file_citation` annotations.
- **Known risk.** A community report says `container: {type: "auto"}` creates containers even when the tool goes unused. We mitigate it by creating explicit containers lazily, only when Analysis Lab is on.
- **Docker** shares the host kernel on a small multi-tenant VPS, so it's unacceptable for untrusted model code there.

## 6. Frontend

| Option | Verdict |
| --- | --- |
| **Vite + React + TS SPA** | **Selected.** Simplest with a separate Python API. Static build served by FastAPI |
| Next.js | Rejected. SSR and RSC boundaries add complexity with no SEO or SSR need |
| Vercel AI SDK UI | Rejected. Couples us to its stream protocol, while our SSE contract is domain-specific (evidence, artifacts) |
| SvelteKit | Rejected. The team and Codex have more React component ecosystem to draw on (Radix, Plotly wrappers) |

**Charting:**
- **Plotly.js** is selected: scientific defaults, log axes, error bars, hover and zoom, PNG export, and WebGL `scattergl` for 30k+ telemetry points.
- Vega-Lite is the runner-up. Its declarative spec is attractive, but we already constrain specs through our own ChartSpec.
- ECharts and Recharts are less suited to scientific axes and units.

## 7. Backend

**Selected:** FastAPI with Pydantic v2, because it's async, gives typed OpenAPI, and has native SSE via `StreamingResponse`. Django is heavier. Flask lacks typing and async ergonomics. Node would split the scientific stack away from pandas, pint and PyMuPDF.

**Units:**
- **pint** is the standard Python units library.
- `astropy.units` is heavier and astronomy-focused.

## 8. Hosting

The team has a **small, shared VPS** at embernova.khedmetak.com. One container uses about 768 MB of RAM, with a read-only data volume of ~0.5 GB. The fallback is a **Hugging Face Docker Space** running the same image; it sleeps when idle, which is acceptable as a fallback only. Details: [DEPLOYMENT.md](../architecture/DEPLOYMENT.md).

## 9. Promising but deferred

| Technique | Reason deferred |
| --- | --- |
| LLM-generated contextual chunk summaries | Deterministic headers first; adopt if Recall@5 < 0.8 on the benchmark |
| OCR for 433 empty pages (e.g. Tesseract) | Most demo-critical text is embedded. P2 |
| Gaussian-process droplet model | Gated on grouped-CV superiority over baseline (see [SCIENTIFIC_ANALYSIS.md §6](../architecture/SCIENTIFIC_ANALYSIS.md)) |
| PINNs / CFD surrogates | Data volume and structure don't justify them. Future work |
