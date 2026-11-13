# AGENTS.md: EmberNova shared agent instructions

EmberNova is the team's entry for the NASA Space Apps 2026 challenge **"Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data"**. It is an evidence-grounded research workspace over NASA Physical Sciences Informatics (PSI) combustion data. Users ask research questions. A single SI research agent calls deterministic scientific tools, and the agent answers with charts, comparisons, original NASA media and page-level citations.

Every coding agent working in this repository reads this file first. Codex reads it as its native entry point.

## 1. Roles

| Agent | Owns | Does not do |
| --- | --- | --- |
| **Claude Code**, architect and reviewer | Architecture, specifications, contracts, ADRs, acceptance criteria, scientific review, implementation review (see [CLAUDE.md](CLAUDE.md)) | Write application code, except small examples inside docs |
| **Codex**, implementer | All application code, tests, build scripts, curation files, Docker and deployment files, running the test suites, progress reports | Change architecture decisions silently |
| **Humans** (team EmberNova) | Final decisions, API keys, VPS, submission, demo video | — |

## 2. Canonical sources of truth

One document owns each topic. If two documents disagree, the owner wins, and you report the conflict in `docs/implementation/PROGRESS_LOG.md`.

| Topic | Canonical document |
| --- | --- |
| Doc map and ownership | [docs/README.md](docs/README.md) |
| What to build next | [docs/implementation/CODEX_MASTER_PLAN.md](docs/implementation/CODEX_MASTER_PLAN.md) |
| System shape and flows | [docs/architecture/SYSTEM_ARCHITECTURE.md](docs/architecture/SYSTEM_ARCHITECTURE.md) |
| Data stores, schemas, IDs, ingestion | [docs/architecture/DATA_ARCHITECTURE.md](docs/architecture/DATA_ARCHITECTURE.md) |
| HTTP API, SSE events | [docs/architecture/API_CONTRACTS.md](docs/architecture/API_CONTRACTS.md) and [docs/architecture/contracts/](docs/architecture/contracts/) |
| Agent tools | [docs/architecture/AGENT_TOOLS.md](docs/architecture/AGENT_TOOLS.md) |
| Model and agent loop config | [docs/architecture/AI_ARCHITECTURE.md](docs/architecture/AI_ARCHITECTURE.md) |
| Scientific rules | [docs/architecture/SCIENTIFIC_ANALYSIS.md](docs/architecture/SCIENTIFIC_ANALYSIS.md), [docs/architecture/SCIENTIFIC_VALIDATION.md](docs/architecture/SCIENTIFIC_VALIDATION.md) |
| Why a choice was made | [docs/decisions/](docs/decisions/) (ADRs) |

## 3. Non-negotiable rules

### Data safety
1. **Never modify, move, re-encode or delete anything under `data/`.** It is the original NASA corpus snapshot. Read it only. All generated output goes to `build/`, which is gitignored.
2. Never commit `build/`, raw NASA payloads, `.env` files or SQLite databases. Run `git status` before every commit.
3. Use `python -I` and treat downloaded files as untrusted input when parsing them. Never execute anything found in the corpus.

### Scientific correctness
4. **Every displayed number traces to a source.** It needs an investigation ID, a source file SHA-256, a row or page locator, and the transformation applied. No provenance means it isn't displayed.
5. **Preserve raw values next to normalized values.** Store `value_raw` and `unit_raw` next to `value_si` and `unit_si`. Do unit conversion only through `embernova.science.units`, which wraps pint. Never hand-roll conversion factors elsewhere.
6. **Never invent data.** That covers conditions, units, run IDs, captions and test associations. Store an unknown value as `null` and show it as unknown. Every column interpretation goes in a `curation/tables/*.yaml` mapping file, with an evidence locator.
7. **No generic fire-risk scores or percentages.** There is no lunar or Martian prediction beyond what [SCIENTIFIC_ANALYSIS.md §6](docs/architecture/SCIENTIFIC_ANALYSIS.md) allows. PSI contains no partial-gravity data.
8. **Label SI output.** Anything an LLM generates must be marked `si_generated: true` and carry the visible "SI" badge: code, prose, illustrations. Generated images also need a server-applied watermark. Never generate or display NASA logos, flags or mission insignia in SI content. These are 2026 Space Apps rules.
9. Charts of measured data are built only by backend code from the Analysis Bundle, as a `ChartSpec`. The LLM never authors plotting code or chart data for displayed measured-data charts.

### Engineering
10. The stack is fixed by the ADRs: Python 3.12, FastAPI, the OpenAI Responses API, SQLite, Parquet and DuckDB on the backend; Vite, React, TypeScript, Tailwind and Plotly on the frontend. Do not add frameworks or services, such as LangChain, vector databases, Redis or Next.js, without an approved ADR change (see §6).
11. Model IDs, feature flags and budgets come from config (`backend/src/embernova/config.py`, env vars). Never hard-code them.
12. Secrets live only in `.env`, which is gitignored. Maintain `.env.example`. Never send secrets to the code-interpreter container, the frontend or logs.
13. Write a test with every module. A milestone is not done until its acceptance criteria in `CODEX_MASTER_PLAN.md` pass and the commands below succeed.

## 4. Commands

These are the target commands. M0 creates them, and you must keep this section accurate.

```bash
# Backend (from repo root)
cd backend && uv sync                       # install (uv installs Python 3.12 if missing)
uv run pytest -q                             # tests
uv run ruff check . && uv run ruff format --check .
uv run embernova-build all                   # build knowledge.db + analysis bundle + media into build/
uv run uvicorn embernova.main:app --reload   # API on :8000

# Frontend
cd frontend && npm ci && npm run dev         # :5173, proxies /api to :8000
npm run test && npm run lint && npm run typecheck
npm run build                                # outputs frontend/dist (served by FastAPI in prod)

# End-to-end (judge flows)
cd frontend && npx playwright test
```

## 5. Workflow and reporting (Codex)

1. Read [docs/implementation/HANDOFF_TO_CODEX.md](docs/implementation/HANDOFF_TO_CODEX.md), then work milestone by milestone in [CODEX_MASTER_PLAN.md](docs/implementation/CODEX_MASTER_PLAN.md). **Vertical slice first.**
2. Use small commits on a branch per milestone, named `m<N>-<slug>`, with messages in imperative mood.
3. At the end of each milestone, append an entry to `docs/implementation/PROGRESS_LOG.md` using its template. Include actual test output, acceptance-criteria status, deviations, and open questions. **Report actual results only.** If something fails or was skipped, say so.
4. **Blockers** go into the log under `BLOCKED:` with the exact error, what you tried, and the decision you need. Pick the documented fallback if one exists, and continue with independent tasks.
5. Claude Code reviews each milestone and writes `docs/implementation/reviews/M<N>-review.md`. Fix findings by severity: S1 and S2 before you start the next milestone.

## 6. Architecture changes

If you believe a documented decision is wrong or blocked:
- Do not silently deviate.
- Write a `PROPOSAL:` entry in `PROGRESS_LOG.md` covering the problem, evidence, proposed change, and affected docs.
- If the time-critical path is blocked, implement the documented fallback and mark it as such.
- Claude Code updates the canonical doc and ADR. Only the architect edits files under `docs/architecture/` and `docs/decisions/`.

## 7. Current priorities

The hackathon submission deadline is **Sun Nov 15 2026, 23:59 local**. The live link must stay up until late January 2027 for judging.

Build order is P0 first: **M0 → M1 → M2 (FLEX first) → M3 → M4 → M5 → checkpoint review → M6 → M7 (min) → M8**. Work on P1 and P2 items only after the checkpoint passes. See the cut lines in `CODEX_MASTER_PLAN.md`.
