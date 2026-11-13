# EmberNova: Executive Architecture Summary

*Architecture phase completed Nov 13 2026 by Claude Code, the architect. Codex implements.*

## What exactly are we building?

**EmberNova is an evidence-grounded SI research workspace for spacecraft and habitat fire safety.** It is built on real NASA PSI combustion data.

A researcher or engineer asks a question in plain language. For example: *"What do NASA microgravity experiments tell us about flammability and suppression in a lunar habitat atmosphere of ~34% O₂ at ~10 psi?"*

EmberNova answers in three steps:

1. **Ranks the relevant NASA investigations** and shows *why* each ranks where it does.
2. **Opens the actual evidence.** That means page-level citations into NASA reports, the measured test rows, and original experiment video.
3. **Computes deterministic, source-linked analyses.** These include interactive charts, run comparisons with a validity assessment, an *Applicability Envelope*, and data-consistency checks. The answer separates **measured results, published conclusions, derived analyses, engineering implications and hypotheses**, and states plainly what the data cannot support.

The workspace has three panes: navigation; conversation; and artifacts, evidence and media. It also includes an Investigation Explorer, a Dataset Explorer, a Comparison workspace, a Habitat Envelope tool, and a Judge Mode with recorded featured sessions.

## Why this architecture?

- **The science lives in deterministic tools, not in the language model.** A single OpenAI agent (`gpt-6.1-sol`, Responses API) plans and explains. Typed backend tools do the searching, querying, unit conversion, comparison and charting. The result is reproducible numbers, verifiable citations and cheap debugging.
- **Hybrid two-level retrieval** (BM25 + embeddings + RRF over curated investigation profiles and page chunks) fits a corpus of 34 investigations and 3.2k pages. GraphRAG, graph databases and vector databases would add cost without adding value here.
- **One numeric source of truth.** A Parquet "Analysis Bundle" of normalized runs, conditions and measurements keeps raw and SI values and provenance side by side. It feeds the API, the charts and the code sandbox alike.
- **Honest modeling.** The data can't support a general fire-risk predictor, so we don't build one. The **Applicability Envelope** shows which NASA tests bracket a target habitat atmosphere. That answers the "predictive modeling" objective with evidence rather than extrapolation.
- **Judge-proof operations.** It runs on a small VPS with a lean Docker image and no local ML models. Judge Mode replays work without API calls. A budget guard and rate limits protect the deployment. Hugging Face Spaces is the fallback.

## Selected technologies

| Concern | Choice |
| --- | --- |
| LLM | OpenAI `gpt-6.1-sol` (agent), `gpt-6-luna` (bulk and fallback), `text-embedding-3-small` at 512 dimensions, `gpt-image-1-mini` (P2 illustrations) |
| Agent | Manual streaming tool loop on the Responses API, strict function tools, evidence ledger |
| Sandbox | OpenAI hosted **Code Interpreter**, with an explicit container per session, created lazily (P1 Analysis Lab) |
| Backend | Python 3.12, FastAPI, Pydantic v2, SSE, uv; pandas, DuckDB, pint, PyMuPDF |
| Storage | `build/knowledge.db` (SQLite with FTS5 and embeddings, read-only); `build/bundle/*.parquet`; `app.db` (SQLite) |
| Frontend | Vite, React 18, TypeScript, Tailwind with Radix/shadcn, Zustand, TanStack Query, Plotly, react-markdown |
| Deploy | One Docker image on the team VPS (`embernova.khedmetak.com`) behind its reverse proxy; Hugging Face Docker Space fallback |

## Mandatory features (P0)

- Research chat with streaming, tool activity and validated `[[ev:…]]` citations
- Investigation discovery and ranking with score explanations
- Investigation Explorer
- Dataset Explorer with deterministic charts
- Run comparison with a validity panel
- Applicability Envelope
- d²-law consistency check
- Original media viewer
- Evidence inspector at page and row level
- SI labeling
- Judge Mode replays
- Deployment

## Deferred

- **P1:** Analysis Lab (code interpreter); Saffire telemetry timelines; research-gap view; relationship view; numeric-grounding audit.
- **P2:** gated empirical droplet model; SI conceptual illustrations; OCR of scanned pages.
- **P3:** university and children's education experiences. Only a module boundary is reserved.

## Most serious risks

1. **A 2.5-day build window.** Mitigation: a vertical slice first, hard cut lines, a checkpoint review.
2. **SI overclaiming.** Mitigation: the evidence ledger, citation validation, the claim-type template and envelope checks.
3. **Misread headers or units.** Mitigation: curated mapping YAML, pint, and golden tests. FLEX K is in mm²/s, and O/N/CO means O₂/N₂/CO₂.
4. **API cost and availability during judging, through Jan 26 2027.** Mitigation: replays, the budget guard, and views that work without the LLM.
5. **A small, shared VPS.** Mitigation: a lean image, compressed media, and the Hugging Face fallback.
6. **2026 SI rules.** Mitigation: watermarks, labels, disclosure, and no NASA marks. The team must also describe SI use honestly in the submission (see [NASA_CHALLENGE_ANALYSIS.md §4](research/NASA_CHALLENGE_ANALYSIS.md)).

## Which NASA datasets are used?

These are verified local files (see [DATASET_AUDIT.md](research/DATASET_AUDIT.md)):

- **FLEX PSI-69**: 274 droplet tests, 90 condition groups, O₂ from 0.12 to 0.34, ~526 to 2,320 mmHg, CO₂ and He diluents. Includes 34% O₂ at ~540 mmHg (≈10.4 psi).
- **CFI PSI-39**: 87 tests, plus a DataSummary with K_hot, K_cool and D_ext.
- **FLEX-2 PSI-68**: design conditions.
- **Saffire I–III PSI-98/99/100**: sample conditions, plus Saffire-III 1 Hz telemetry with Cygnus smoke-detector channels.
- **BASS/BASS-II PSI-26/25**: run matrices and gas measurements.
- **SAME/SAME-R PSI-102/101**: aerosol test conditions and workbooks.
- **ACME PSI-10/20/21/22/23/159**: test tables.
- **SPICE PSI-107** and **SLICE PSI-106**.
- **93 documents (3,187 pages)**, including NASA/TP-2015-216046.
- **39 local media files.**
- **Supplemental NTRS sources:** LUCI, KC-135 and GRC simulated partial-gravity reports. These are labeled supplemental and are not PSI data.

## What Codex implements first

M0 scaffold → M1 knowledge build → M2 Analysis Bundle (**FLEX first**) → M3 read API → M4 agent loop → M5 workspace UI → **checkpoint: one FLEX question flows end to end** → M6 comparison and envelope → M7 evaluation → M8 Judge Mode and deploy. The plan is in [CODEX_MASTER_PLAN.md](implementation/CODEX_MASTER_PLAN.md).

## What the final demo shows

The **lunar-habitat atmosphere** scenario (see [DEMO_STRATEGY.md](product/DEMO_STRATEGY.md)):

1. A natural-language question.
2. Ranked investigations with their reasons.
3. The Envelope map, showing that FLEX tested ~34% O₂ at ~0.71 atm.
4. A FLEX comparison: 1 atm air vs the exploration-like atmosphere, with an explicit confounder warning.
5. The d²-law check, which confirms data consistency.
6. Original FLEX video.
7. Page-level citations to NASA/TP-2015-216046.
8. A clear "what the data cannot tell you" section: droplets ≠ solids, microgravity ≠ lunar gravity, and no PSI partial-g data.

The backup scenario is Saffire-III smoke-detector telemetry for **detection**.
