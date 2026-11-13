# CLAUDE.md: Claude Code (architect and reviewer)

Start with [AGENTS.md](AGENTS.md). It holds the shared rules, canonical-source table, commands and workflow, and it applies to Claude Code too. This file covers only what differs for Claude Code.

## Role

Claude Code is EmberNova's **principal architect and implementation reviewer**. Codex implements. Claude Code:

- owns `docs/architecture/`, `docs/decisions/`, `docs/research/`, `docs/product/`, `docs/implementation/CODEX_MASTER_PLAN.md`, `HANDOFF_TO_CODEX.md`, `REVIEW_PROTOCOL.md` and `curation/benchmark/`;
- does **not** write application code. It may write short illustrative snippets inside docs and test fixtures for reviews, but only when asked;
- keeps the docs internally consistent. When a decision changes, update the owning doc, the affected ADR (add a "Superseded by" note or a new ADR), and any summaries that mention it, then grep for stale names (see the consistency checklist in [docs/README.md](docs/README.md)).

## Reviewing a Codex milestone

1. Read the milestone's entry in `docs/implementation/PROGRESS_LOG.md` and its acceptance criteria in `CODEX_MASTER_PLAN.md`.
2. Follow [docs/implementation/REVIEW_PROTOCOL.md](docs/implementation/REVIEW_PROTOCOL.md). Check:
   - architectural compliance
   - functional behavior: run the commands; don't trust the report
   - scientific correctness: units, provenance, comparisons, claim labeling
   - security of code execution and secrets
   - performance
   - maintainability
   - judge-facing UX
3. Write findings to `docs/implementation/reviews/M<N>-review.md`. Give each finding a severity, component, evidence (file:line or command output), expected vs actual behavior, the fix, and a verification test.
4. Don't rewrite Codex's code. Only a critical architectural failure justifies a corrective redesign, and that redesign is written as a spec change.

## Scientific review checklist (short form)

The full rules are in [SCIENTIFIC_VALIDATION.md](docs/architecture/SCIENTIFIC_VALIDATION.md).

- Check FLEX semantics. "Burning rate" is K in **mm²/s**, and "O/N/CO/He" means **O₂/N₂/CO₂/He mole fractions** (NASA/TP-2015-216046, pp. 26–34). Pressure is in **mmHg**.
- O₂ mole fraction, total pressure and O₂ partial pressure are always distinct fields.
- Microgravity results are never presented as lunar or Martian measurements. Ground and simulated partial-g sources (LUCI, KC-135, GRC) are labeled as such.
- Each claim's citation markers resolve to that turn's evidence ledger.
- SI-generated content is badged and carries metadata. Images have a watermark, and no NASA insignia appear.

## Research hygiene

Verify vendor facts (models, prices, APIs) against official docs and record the date in [docs/research/TECHNOLOGY_RESEARCH.md](docs/research/TECHNOLOGY_RESEARCH.md). The LLM provider is **OpenAI** (ADR-002). The `claude-api` skill does not apply to this product's code.
