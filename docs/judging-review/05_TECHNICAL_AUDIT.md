# 05 — Technical audit

## 1. What was run

| Check | Result |
| --- | --- |
| Backend tests (`pytest -q`) | 37 passed in 6.9 s. In my restricted shell the default temp directory was not writable, so I passed `--basetemp`; not a project defect |
| Ruff lint | Clean |
| Frontend unit tests | 5 passed (3 files) |
| ESLint, `tsc --noEmit` | Clean |
| Server start | OK on a spare port with an isolated state directory; `/api/health` ok |
| API exercise | ~45 calls across search, envelope, compare, d²-law, query, chart, media, replays, error paths |
| UI | Headless Chrome against the production build: 12 pages/states, desktop and 390 px mobile; one console error (a 404 for a missing session, expected) |
| Live SI turn | 1 turn: 27.9 s, 6 tools, 51.6k input tokens (32k cached), 672 output, est. $0.049, 0 invalid citations |
| Team's Playwright suite | Not run, to avoid overwriting the team's reports in `build/eval/` |

Measured latencies: envelope 300–430 ms, compare 117 ms, d²-law 108 ms, chart 111 ms, document search ~760 ms, investigation search 1.05–4.5 s (first call slowest), home page load 0.75 s.

## 2. Architecture assessment

Single FastAPI process, SQLite + Parquet, one agent loop over the OpenAI Responses API, React/Vite front end. About 3.4k lines of backend code. This is proportionate: no framework sprawl, deterministic tools own all numbers, the model only selects and narrates. The design choice that matters most for judging — charts and statistics never come from the model — is implemented as described (`tools.py`, `science/charts.py`).

Over-built for a hackathon: the hosted code-execution lab, JSON-schema contracts for events, and the replay recorder. They work, but the same hours would have bought several more curated datasets.

## 3. Confirmed defects

Severity: P0 breaks a core judged capability or a public deployment; P1 visible quality problem; P2 minor.

### T1 (P0). Ranking returns confident results for nonsense and out-of-scope queries

- **Location:** `backend/src/embernova/retrieval.py:148-243`, normalization at lines 178-192.
- **Reproduce:** `POST /api/search/investigations {"query":"asdfqwer zzzz"}`.
- **Actual:** six results, top item "text 1.00", scores 0.54–0.60. "rocket engine propellant combustion" → FLEX-2 first, no scope notice.
- **Cause:** dense retrieval always returns neighbours, and `text_rrf` is min-max normalized within the result set, so the best of any list is always 1.00.
- **Expected:** empty or "no strong match" state below a similarity floor; an out-of-scope notice for propulsion queries.

### T2 (P0). Objective facet is a substring test on free text

- **Location:** `retrieval.py:185-187`; duplicated in `main.py:226-232`.
- **Reproduce:** `{"query":"smoke detection","objectives":["detection"]}`.
- **Actual:** BASS-II ranks first (facet 1.0) above SAME and SAME-R (facet 0.0), because BASS-II's objective text contains the word "detection" and SAME's does not.
- **Related:** on all ten unfiltered queries the facet component was 0.00, so 30% of the scoring formula is inert unless a filter is chosen, and wrong when it is.
- **Expected:** curated `fire_safety_objective` tags per investigation (the vocabulary already exists in `curation/vocab.yaml`), each with a source locator.

### T3 (P1). Data-availability bonus distorts relevance

- **Location:** `retrieval.py:188, 216-218` (+0.1 for any investigation with a curated table).
- **Reproduce:** "water mist extinguisher" → FLEX 0.70, FLEX-2 0.65. "highest oxygen concentration microgravity tests" → BASS-II, FLEX; CFI-G (the correct answer per the challenge text) absent from the top six.
- **Expected:** show availability as a badge, not as part of the relevance score; or apply it only as a tie-breaker.

### T4 (P0 for deployment). Shared budget can lock out all users

- **Location:** `agent/budget.py`, `agent/loop.py:463-465`, `.env.example` (`DAILY_BUDGET_USD=2`, `MAX_TURN_COST_USD=0.30`).
- **Behavior:** each turn reserves $0.30; a failed, cancelled or timed-out turn keeps the reservation for the rest of the day. Seven failed turns exhaust $2 and every later visitor gets 429.
- **Also:** the per-IP limit uses `request.client.host` (`main.py:552`). Behind a reverse proxy every visitor shares one address, so the limit becomes 20 turns per hour for the whole world.
- **Expected:** release failed reservations down to actual metered cost (or a small floor); read the client address from the proxy header when a trusted proxy is configured; size the daily budget for judging traffic.

### T5 (P0 for deployment). Sessions are global

- **Location:** `main.py:484-498` (`GET /api/sessions`) and `516-519`.
- **Behavior:** returns the 30 most recent sessions from every visitor; the sidebar shows them as "Recent research". Any visitor can open and read another visitor's thread.
- **Expected:** keep the session list in the browser (local storage of own session IDs) or scope by an anonymous cookie.

### T6 (P1). d²-law endpoint returns an empty "ok" chart for unsupported tables

See report 04, S2-5. `analyses.py:314, 326`.

### T7 (P1). Comparison sample-size and zero-extinction handling

See report 04, S1-1 and S1-2. `analyses.py:36-64`.

### T8 (P1). Result tables render raw structures

- **Location:** `frontend/src/artifacts/ArtifactView.tsx` (comparison and envelope tables).
- **Observed:** "Group summaries" cells contain `{"n":22,"median":0.48,"q1":0.4625,"q3":0.5175000000000001,...}`; condition values `[1.0025001428224871,0.7069737849304663]`; booleans as `true/false`; units as `mm**2/s` and `dimensionless`.

### T9 (P2). Misleading labels

- `frontend/src/pages/Explorers.tsx:114` always shows "Local snapshot · lexical relevance" even when `/api/meta` reports `retrieval_mode: hybrid`.
- The replay banner reads "Playback of verified local computations. No live SI request is running" for recordings that are SI sessions.
- Chart legends and envelope cards use `PSI-39`, `PSI-69` instead of CFI, FLEX.

### T10 (P2). Dataset table shows every bundle column

The FLEX normalized view lists 20 quantity columns, of which 11 belong to other datasets and read "unknown" in every row.

## 4. Security

| Area | Finding |
| --- | --- |
| Secrets in the tree | `.env` and `.env.txt` both hold the OpenAI key in the project root. Both are git-ignored (`.env.*`), so they will not be committed, but `.env.txt` is a stray copy; delete it. Key value was not read or printed during this review |
| Path traversal | `/api/files/..%2F..%2F.env/original` → 404. `safe_path` is used for file responses |
| Input limits | 64 KB body cap (413), text ≤ 4000 chars, validated schemas (422) |
| Code execution | No local execution of model code. Hosted container only, behind a flag, network disabled per the team's smoke test. Not re-verified by me (would cost provider calls) |
| Prompt injection | System prompt treats source text as untrusted; tools are read-only. Reasonable for the threat model |
| Unauthenticated cost | `/api/search/*` triggers a paid embedding call per new query with only a coarse global cap (120/hour, `dense.py`). Low cost, but open to anyone once public |
| CSP | `script-src 'self' 'unsafe-inline' blob:` — inline scripts allowed; acceptable for a hackathon, tighten later |
| API docs | `/api/docs` is public. Harmless; arguably useful to judges |
| Admin endpoints | Disabled unless `ADMIN_TOKEN` is set; constant-time compare. Fine |

## 5. Reliability and maintainability

- **Tests depend on the built corpus.** `conftest.py` fails unless `build/knowledge.db` exists, so the suite cannot run in CI from a clean clone without the multi-GB data.
- **`main.py` is 692 lines** with every route in one closure; fine for now.
- **Front-end bundle:** Plotly chunk 4.67 MB uncompressed (lazy-loaded). Acceptable.
- **Error handling in the agent loop** is thorough: provider failure, timeout, cancellation, tool errors and the tool-round limit each produce a labeled event, with a final tools-disabled synthesis round.
- **Model identifiers** come from config. Fallback model availability was never verified against the account (team's own note).
- **No deployment artifacts.** `docs/architecture/DEPLOYMENT.md` describes a Dockerfile and compose file; neither exists. `embernova-build deploy-bundle` is referenced but I did not find it implemented.
- **Version control.** `git ls-files` lists 4 files. All application code is untracked. A disk failure today loses the project, and there is nothing for judges to open in the repository.

## 6. Retrieval quality (team's own benchmark, `build/eval/retrieval.json`)

| Split | n | Recall@5 | MRR | nDCG@10 | Mean latency |
| --- | --- | --- | --- | --- | --- |
| dev | 20 | 0.607 | 0.757 | 0.708 | 0.98 s |
| test | 10 | 0.624 | 0.808 | 0.634 | 1.16 s |

The team's targets are recall 0.85 and nDCG 0.75; both are missed. Passage-level evaluation has one labeled question, and it fails. I did not re-run the benchmark.

## 7. Documentation vs implementation

Documented but not implemented: synthesized investigation profiles, Saffire time-series (`/api/timeseries` returns 404 by design), illustrations, deployment, light theme, most facets. The README's "Available evidence and limits" section states these gaps accurately, which is to the team's credit; `docs/architecture/` still describes the fuller system and should not be shown to judges as a description of what exists.
