# EmberNova | NASA Space Apps Challenge 2026

Local research application for the [NASA Space Apps Challenge 2026](https://www.spaceappschallenge.org/2026/). No deployment has been performed.

- **Team:** EmberNova
- **Challenge:** [Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/)
- **Pitch:** EmberNova is an evidence-grounded SI research workspace. It finds the NASA microgravity combustion experiments relevant to a spacecraft or habitat fire-safety question, compares their measured data with explicit validity checks, and cites every number back to NASA sources.
- **Local application:** `http://127.0.0.1:8000` after starting the backend with a built frontend.

## Start here

| You are | Read |
| --- | --- |
| Anyone | [docs/EXECUTIVE_SUMMARY.md](docs/EXECUTIVE_SUMMARY.md), [docs/README.md](docs/README.md) |
| Codex, the implementer | [AGENTS.md](AGENTS.md) → [docs/implementation/HANDOFF_TO_CODEX.md](docs/implementation/HANDOFF_TO_CODEX.md) |
| Claude Code, the architect and reviewer | [CLAUDE.md](CLAUDE.md) |
| Demo and submission owner | [docs/product/DEMO_STRATEGY.md](docs/product/DEMO_STRATEGY.md), [docs/submission.md](docs/submission.md) |

## Data

The NASA PSI corpus snapshot lives in `data/`. It is read-only, and the large payloads are gitignored. See [data/README.md](data/README.md) and the verified [dataset audit](docs/research/DATASET_AUDIT.md). PSI investigation data is CC0-1.0. Cite the investigation DOIs listed in `data/SOURCE_CATALOG.csv`.

## Working together

This assignment keeps all changes local and uncommitted. No GitHub operations, production connections or deployment are authorized. Keep credentials in the ignored root `.env`; use `.env.example` as the configuration reference. Read the [independent audit](docs/implementation/CODEX_ARCHITECTURE_AUDIT.md), [progress](docs/implementation/CODEX_PROGRESS.md), and [review handoff](docs/implementation/CODEX_REVIEW_HANDOFF.md).

## Run locally (Windows PowerShell)

Requirements: Python 3.12 through uv, Node 20+, npm, and ffmpeg on PATH for the NASA transport-stream derivatives. The original corpus must already exist under `data/`. The build copies PDFs/media and verifies original hashes; allow about 2 GB free for dependencies, caches and outputs. Existing Chrome is used for browser tests.

For the environment prepared in this workspace:

```powershell
# Terminal 1, from the repository root
cd backend
.venv/Scripts/python.exe -I -X utf8 -m uvicorn embernova.main:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000`. The production frontend build is served locally by FastAPI. For frontend development, open another terminal:

```powershell
cd frontend
npm.cmd run dev
```

Vite serves `http://127.0.0.1:5173` and proxies `/api` to port 8000. `npm.cmd` avoids the Windows execution-policy block on `npm.ps1`.

For a fresh dependency installation and corpus build:

```powershell
# From the repository root, with uv installed
cd backend
uv sync
uv run python -I -m embernova.ingest.build all --fake-embeddings
cd ../frontend
npm.cmd ci
npm.cmd run generate
npm.cmd run build
```

If uv is not on PATH in this prepared workspace, use `build/bootstrap/bin/uv.exe` with `--cache-dir build/uv-cache` and `UV_PYTHON_INSTALL_DIR` pointing at `build/python`. Stop the API before rebuilding its knowledge store or Analysis Bundle.

The keyless build uses real NASA evidence and lexical retrieval. `--fake-embeddings` is a compatibility flag; fake vectors are never exposed as semantic search. To build the optional real semantic index:

```powershell
cd backend
.venv/Scripts/python.exe -I -m embernova.ingest.build embed
```

Set `OPENAI_API_KEY` only in the root `.env` or server environment. Keyless explorers, scientific tools and recorded demonstrations work without it. Live chat uses the configured model; actual account verification is recorded in `build/eval/livecheck.json`. Configured token prices provide estimates, not provider billing controls. Defaults bound research turns to six tool rounds, 120 seconds and approximately $0.30 per turn, with a $2 daily application budget.

Analysis Lab is optional: set `ANALYSIS_LAB=true` only after `scripts/smoke_hosted_sandbox.py` passes, then enable it for a thread in the composer. It uploads only hash-verified CSV exports of the Analysis Bundle to a hosted 1 GB container with network disabled. It never executes generated code on this computer. Results, units and CSVs are validated; empty/invalid outputs remain visibly invalid. Container/file deletion is requested after each turn, with container expiry as fallback if cleanup fails. This costs a container charge per enabled turn and intentionally favors isolation over session reuse.

## Verify and reproduce

```powershell
cd backend
.venv/Scripts/python.exe -I -m pytest -q
.venv/Scripts/ruff.exe check .
.venv/Scripts/ruff.exe format --check .
.venv/Scripts/python.exe -I -c "from embernova.evaluation import demos; demos()"
.venv/Scripts/python.exe -I -c "from embernova.evaluation import retrieval; retrieval()"
cd ../frontend
npm.cmd run test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd exec playwright -- test
```

Browser tests start their own local server on port 8011 and disable live API calls. `EMBERNOVA_LIVE_E2E=1` enables the separately marked live browser test and uses the local server key. Browser screenshots and evaluation reports go to `build/eval/`. Generated artifacts export their query, source hashes, row evidence and computation record; Analysis Lab exports include `analysis.py` labeled SI-generated.

## Available evidence and limits

The current build indexes 34 investigations, 93 documents, 3,187 physical pages/extracted parts, and 39 original media items. Numeric curation covers FLEX, BASS-II, CFI conditions and matched hot/cool-flame workbook values, and the FLEX-2 design matrix. CFI's 87 CSV records include eight duplicate rows: 79 distinct test identifiers are retained for analysis. Unmapped investigations remain searchable as documents and source metadata.

Core tools provide unit-aware queries, descriptive statistics, source-built charts, run-group comparisons, the Applicability Envelope, and a d²-law consistency check. Missing conditions remain unknown. A lunar atmosphere overlap is not lunar-gravity evidence or a safety certification. The strict ≤10.2 psi reference can have no jointly matching FLEX rows even though nearby reduced-pressure tests exist.

Retrieval benchmark recall remains below the architecture target; see `build/eval/retrieval.json` and the review handoff. Citation-ID validation does not prove semantic entailment or complete numerical grounding. Saffire telemetry, additional CFI-G/ACME/SPICE numerical parsers, reviewed synthesized investigation profiles, conceptual illustrations, a validated predictive model, and deployment are not part of the verified build.

## SI use

The project architecture and code were developed with SI assistance (Claude Code as architect and reviewer, Codex as implementer). The product's SI outputs are labeled in the app. See the SI disclosure in [docs/research/NASA_CHALLENGE_ANALYSIS.md §4](docs/research/NASA_CHALLENGE_ANALYSIS.md).
