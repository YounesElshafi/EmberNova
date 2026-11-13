# Handoff to Codex

You are implementing **EmberNova**, an evidence-grounded SI research workspace over NASA PSI combustion data, for NASA Space Apps 2026 ("Flame in Freefall"). Every architecture decision is already made. Your job is to build it well and fast, and to report honestly.

## Read in this order (~20 min)

1. [AGENTS.md](../../AGENTS.md): the rules, especially data safety and scientific correctness.
2. [EXECUTIVE_SUMMARY.md](../EXECUTIVE_SUMMARY.md): what is being built and why.
3. [CODEX_MASTER_PLAN.md](CODEX_MASTER_PLAN.md): milestones and acceptance criteria. **Follow it in order.**
4. While working on each milestone, read its linked architecture docs. The most important are [DATA_ARCHITECTURE.md](../architecture/DATA_ARCHITECTURE.md), [AGENT_TOOLS.md](../architecture/AGENT_TOOLS.md), [API_CONTRACTS.md](../architecture/API_CONTRACTS.md) plus `contracts/`, and [AI_ARCHITECTURE.md](../architecture/AI_ARCHITECTURE.md).
5. [DATASET_AUDIT.md](../research/DATASET_AUDIT.md): the verified facts about the corpus. Don't re-derive them.

## Facts you will need immediately

- **Corpus:** `data/` is **read-only**. Originals are under `data/investigations/<ID>_<name>/raw/`. GPT Work's extracted text is in `processed/text/*.json`, indexed by `data/indexes/DOCUMENT_TEXT.jsonl`. File state lives in `data/DOWNLOAD_MANIFEST.csv` (filter `origin_status=original`, `download_status=verified`).
- **FLEX** (`data/investigations/PSI-69_FLEX/raw/datasets/PSI-69_Experimental table_FLEX.csv`, cp1252):
  - "Burning rate; mm" is **K in mm²/s**.
  - "O/N/CO/He" means **O₂/N₂/CO₂/He mole fractions**.
  - Pressure is in **mmHg**.
  - The run key is `FLEX Test #`. The `FLEX Identifier` `193F001` is duplicated.
  - Test 114 has P = 0, and test 24 has a `�` cell.
- **Dev machine:** Windows 10, with Node, ffmpeg and Docker Desktop installed. Python 3.14 is the system default, but **use uv-managed 3.12** (`uv python install 3.12`). uv and pnpm are not installed; install uv (`winget install astral-sh.uv` or the official installer) and use npm for the frontend.
- **LLM:** OpenAI. You need `OPENAI_API_KEY` in `.env`, which the team provides. Everything except chat and embeddings must work without it. Use `--fake-embeddings` for keyless builds.
- **Deploy target:** `embernova.khedmetak.com` on the team's small shared VPS (see DEPLOYMENT.md).

## How to report

Append to [PROGRESS_LOG.md](PROGRESS_LOG.md) after each milestone using its template. Include real command output, any failures, and deviations as `PROPOSAL:` entries. Mark blockers with `BLOCKED:`, take the documented fallback, and keep going on independent work. After M5, stop for the **checkpoint review**.

## What not to do

- Don't modify `data/`.
- Don't add frameworks or services that aren't in the ADRs (no LangChain, vector DBs, Next.js or Redis).
- Don't let the LLM produce chart data, units or numbers that didn't come from a tool.
- Don't show NASA insignia, and don't present SI output without the SI label.
- Don't edit `docs/architecture/`, `docs/decisions/` or `curation/benchmark/`. Propose changes instead.
