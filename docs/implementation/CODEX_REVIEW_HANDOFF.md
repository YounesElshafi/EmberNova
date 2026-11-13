# Codex implementation review handoff

Prepared 2026-11-13. SI-assisted implementation. Everything remains local and uncommitted. No deployment or production access occurred. Read this alongside [the independent audit](CODEX_ARCHITECTURE_AUDIT.md) and [current progress](CODEX_PROGRESS.md); the older discovery entry in PROGRESS_LOG is historical.

## Result and readiness

A working local research workspace now connects real OpenAI research, NASA search, structured source measurements, deterministic computation, interactive artifacts and source inspection. The core is runnable and exercised, including actual hosted Python execution. **This is not a claim that every architecture milestone or acceptance threshold is complete.** Retrieval recall/nDCG, reviewed synthesized profiles, remaining numerical parsers, full A1–A8 evaluation and production readiness remain open. No review by Claude has occurred yet.

The architecture is fundamentally sound. The implementation preserves Python 3.12, FastAPI, Responses API, SQLite, Parquet/DuckDB, pint, React/Vite/TypeScript/Tailwind/Plotly and a single research agent. No LangChain, external vector service, graph service, Redis or second agent was introduced.

## Exact review targets

| Concern | Files |
|---|---|
| Startup, HTTP validation, SSE/cancel/reconnect, original files, media, export | `backend/src/embernova/main.py` |
| Secret handling, models, feature flags, estimated prices and spending | `backend/src/embernova/config.py`, `agent/budget.py`, `.env.example` |
| Tool loop, fallback, context compaction, final synthesis round | `backend/src/embernova/agent/loop.py`, `agent/registry.py`, `agent/prompts/system.md` |
| Citation ledger scope, marker repair, limits of audit heuristics | `backend/src/embernova/agent/citations.py`, `evidence.py`, `provenance.py` |
| Verified source ingestion and page locators | `backend/src/embernova/ingest/catalog.py`, `ingest/documents.py`, `ingest/build.py` |
| Raw/SI mappings, CFI duplicates and workbook matching | `curation/tables/*.yaml`, `backend/src/embernova/ingest/tables.py`, `ingest/cellparse.py` |
| Unit conversions, exclusions, statistics, chart points, scenario coverage | `backend/src/embernova/science/{units,bundle,charts,analyses}.py`, `tools.py` |
| Retrieval and evaluation | `backend/src/embernova/{retrieval,dense,evaluation}.py`, `ingest/embeddings.py`; benchmark remains architect-owned and unchanged |
| Hosted execution boundary and validated outputs | `backend/src/embernova/sandbox.py`, `backend/tests/test_sandbox.py`, `scripts/smoke_hosted_sandbox.py` |
| Research UI and persisted threads | `frontend/src/App.tsx`, `frontend/src/state.ts`, `pages/Workspace.tsx`, `api/client.ts` |
| Charts, source inspector, explorers and disclosures | `frontend/src/artifacts/`, `components/EvidenceInspector.tsx`, `pages/{Explorers,ResearchTools}.tsx`, `styles.css` |
| Tests and reproduction | `backend/tests/`, `frontend/src/**/*.test.*`, `frontend/e2e/`, `scripts/{verify.ps1,final_local_audit.py,audit_corpus.py}` |

## Scientific review priorities

1. FLEX Table IX: physical NASA/TP-2015-216046 pages 25–26 establish K in mm²/s, absolute pressure in mmHg and gas mole fractions. The lossy CSV calls K `Burning rate; mm`; preserve that raw header and the inferred-unit evidence. Physical PDF pages differ from printed page numbers by six.
2. FLEX has 274 rows; alternate label `193F001` matches two distinct primary tests. `test_identifier` deliberately returns both. Pressure-zero test 114 is excluded by default. Test 24 contains an original en dash, a missing-value token, not an encoding failure. Raw d² consistency has 196 complete rows; production exclusions are separately explicit.
3. The 17 FLEX rows refer specifically to oxygen 0.30–0.34 **and 520–560 mmHg**. Do not transfer that count to a ≤10.2 psi scenario. The stricter lunar preset has no joint FLEX matches. No lunar/Martian measured run dataset exists.
4. CFI CSV has 87 source rows and 79 distinct Flex Numbers. Eight exact duplicate rows are preserved with locator-qualified IDs and excluded in analyses. The workbook contributes a separate 79-row table with distinct hot/cool definitions. Its unspecified HF burn-time unit stays null. No unverified fuel/O₂ field join is asserted.
5. FLEX-2 rows are designs with lists/ranges, not fabricated measured combinations. BASS-II fan settings are not calibrated airflow; pressure is unknown.
6. Fuel medians from hosted Python were independently matched against the raw CSV: methanol n=150, median 4.6e-7 m²/s; n-heptane n=107, median 5.4e-7 m²/s. Pooled conditions confound fuel-effect interpretation. These are derived descriptive results, not safety guidance.

## Documented implementation deviations requiring architect review

- Source metadata is indexed verbatim instead of labeling synthesized profiles as reviewed. Facet coverage is consequently limited. Character/page-bounded chunks number 3,495, rather than padding to the inconsistent 5k–12k expectation; tokenizer-based boundaries remain open.
- The catalog uses JSON records with searchable relational keys, rather than the entire normalized canonical SQL schema. App state uses short SQLite connections/WAL; formal migration versions and a dedicated tool-call table are not implemented. SSE events retain execution status and artifacts.
- Tools implement a useful strict subset of canonical argument options. Objective filtering works; all planned facets, chart options, pagination contracts and time-series channels do not. Generated artifact/evidence/SSE schemas are validated in tests, but generic HTTP client responses still contain `any` types.
- Fixed passage fusion: aggregate the three strongest chunks into **one investigation rank list**, then fuse it with profile BM25 and dense ranks. Previously adding chunk votes directly overweighted report-rich investigations. Default weights remain 0.6/0.3/0.1 and are configurable; test labels were not edited or used to tune weights.
- A bounded final tools-disabled synthesis response follows six tool rounds. Without it, completed analysis could end in a round-limit error instead of an answer.
- Hosted containers lacked a Parquet reader. Backend-verified CSV exports of the same bundle preserve raw strings/units, JSON-encoded list cells and 17-digit floats. An input manifest records CSV and original Parquet hashes. Only provider-confirmed filenames may be canonicalized to mounted input aliases.
- Hosted execution uses an explicit 1 GB, network-disabled container per enabled turn, with deletion requested in `finally` and expiry as fallback. This deliberately differs from session container reuse. No host Python execution fallback exists. Cleanup failure is currently suppressed and should receive observability before broader use.
- `--fake-embeddings` selects real-data lexical search; it does not create fake scientific vectors or present lexical ranking as semantic retrieval. Actual semantic index was built through OpenAI with a content cache.
- No milestone commits, checkpoint stop or deployment followed: the user's explicit local execution instructions override those parts of AGENTS/master plan. Canonical architecture/ADR documents, AGENTS.md and CLAUDE.md were not edited.

## Actual verification and remaining gates

Reports live under ignored `build/eval/` and screenshots under `build/eval/screens/`. These are local evidence, not committed fixtures.

- Backend: 37 tests pass; Ruff lint and formatting pass. One third-party Starlette/httpx deprecation warning remains.
- Frontend: 5 tests in 3 files pass; TypeScript, ESLint and production build pass. Plotly is lazy-loaded but its chunk remains ~4.67 MB uncompressed (~1.42 MB gzip).
- Browser: nine keyless tests pass, including recorded hosted code/results, discovery, raw/normalized table, real chart, export, comparison, envelope, source citation, Range video and mobile disclosures. Two live-only tests are skipped in that suite. Live tests separately retrieved FLEX 20CAL10 → 0.94 mm with reload persistence and completed habitat research through a 16-point chart backed by the 17 matching rows (one K is missing). CODEX_PROGRESS identifies reports/screenshots.
- Actual OpenAI account: `gpt-6.1-sol` authenticated and accessible; strict function calls, structured JSON and Responses streaming tested. Configured fallback exists and connection fallback has an offline regression test; its real account availability was not separately verified.
- Latest direct live habitat flow: 37.764 seconds, estimated $0.0451759, nine tools including one recovered argument error, two artifacts; zero invalid IDs/type mismatches/heuristically uncited statements. This does **not** establish semantic entailment or ≥95% aggregate tool reliability.
- Retrieval after the fusion correction: dev R@5 0.6067 / MRR 0.7567 / nDCG@10 0.7084; test 0.6238 / 0.8083 / 0.6337. Recall target 0.85 and nDCG target 0.75 are missed; MRR target 0.7 passes. Gold-page hit@8 is 0/1 on dev, with no labeled test pages: insufficient passage evaluation, and the single labeled case fails.
- Original-file audit recomputed all 274 verified original hashes again: zero mismatches. Configured-secret scan found zero matches across source, tests, docs, curation, built frontend and application database. Five recordings pass the canonical SSE/evidence/artifact schemas.

Not fully implemented/tested: reviewed SI investigation profiles; full schema/contract parity; Saffire telemetry and additional numerical parsers; semantic numerical entailment checks; full A1–A8 agent benchmark/latency/load/cross-browser/accessibility audits; first-turn response cache; production auth/migrations/operations; light theme. Conceptual imagery, generic risk scoring and predictive models are deliberately absent. Student/game features and all deployment work are excluded.

## Reproduction

From repository root, prepared environment:

```powershell
cd backend
.venv/Scripts/python.exe -I -X utf8 -m uvicorn embernova.main:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000`. The built frontend is served by FastAPI. For Vite development, run `npm.cmd run dev` in `frontend` in another terminal. Credentials stay in the ignored root `.env`. Keyless data tools and recordings need no API.

```powershell
# Repository root
backend/.venv/Scripts/python.exe -I scripts/audit_corpus.py
backend/.venv/Scripts/python.exe -I scripts/final_local_audit.py
cd backend
.venv/Scripts/python.exe -I -m pytest -q
.venv/Scripts/ruff.exe check .
.venv/Scripts/ruff.exe format --check .
.venv/Scripts/python.exe -I -m embernova.evaluation retrieval
cd ../frontend
npm.cmd run test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd exec playwright -- test
# Explicit additional provider spending, only when wanted:
$env:EMBERNOVA_LIVE_E2E='1'
npm.cmd exec playwright -- test live.spec.ts
```

For a fresh install/build see README. Stop the API before rebuilding the corpus. `final_local_audit.py` requires the previously verified real Lab result already saved locally; it makes no provider requests. Do not share `.env`, state databases or raw runtime logs.

## Suggested review order

First review scientific definitions and exclusions, then sandbox/input/output confinement and spending, then evidence/SSE contracts and end-to-end behavior. Address ranking profiles/facets and passage coverage next. Review operator cleanup, schema migrations, model-price freshness and API compatibility before any decision about public deployment. This handoff grants no deployment authorization.
