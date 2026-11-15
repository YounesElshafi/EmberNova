# EmberNova documentation map

**Project overview:** see [ARCHITECTURE.md](ARCHITECTURE.md), [SCIENTIFIC_METHODOLOGY.md](SCIENTIFIC_METHODOLOGY.md), [DATA_SOURCES.md](DATA_SOURCES.md), [TESTING.md](TESTING.md), [LIMITATIONS.md](LIMITATIONS.md) and [DEPLOYMENT.md](DEPLOYMENT.md). These are short summaries of the release and link to the canonical documents below.

Team members: start with **[EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md)**. Codex starts with **[implementation/HANDOFF_TO_CODEX.md](implementation/HANDOFF_TO_CODEX.md)**.

## Ownership

Each topic has exactly one canonical document. Other documents link to the owner and do not restate it.

| Folder / file | Purpose | Owner |
| --- | --- | --- |
| `EXECUTIVE_SUMMARY.md` | One-page answer to "what, why, how, what first" | Claude |
| `research/NASA_CHALLENGE_ANALYSIS.md` | Challenge text, objectives, 2026 rules, SI rules | Claude |
| `research/JUDGING_AND_AWARDS.md` | Judging criteria, awards, award-alignment matrix | Claude |
| `research/DATASET_AUDIT.md` | Verified corpus facts, usability tiers, data-quality issues | Claude |
| `research/SCIENCE_NOTES.md` | Scientific background the system relies on | Claude |
| `research/TECHNOLOGY_RESEARCH.md` | Technology comparisons with dated evidence | Claude |
| `research/SOURCE_REFERENCES.md` | Bibliography and URLs | Claude |
| `product/PRODUCT_REQUIREMENTS.md` | Critique, feature catalog (P0–P3), user journeys, acceptance criteria per feature | Claude |
| `product/DEMO_STRATEGY.md` | Demo scenarios, 30 s video, 7 slides, judge Q&A | Claude |
| `architecture/SYSTEM_ARCHITECTURE.md` | Context, components, diagrams, end-to-end flows | Claude |
| `architecture/DATA_ARCHITECTURE.md` | Stores, schemas, IDs, ingestion and curation | Claude |
| `architecture/RETRIEVAL_ARCHITECTURE.md` | Search and ranking | Claude |
| `architecture/AI_ARCHITECTURE.md` | Models, agent loop, prompts, guardrails, cost | Claude |
| `architecture/AGENT_TOOLS.md` | Tool contracts | Claude |
| `architecture/SCIENTIFIC_ANALYSIS.md` | Units, comparison validity, envelope, d²-law, modeling decision | Claude |
| `architecture/SCIENTIFIC_VALIDATION.md` | Reliability safeguards, mapped to each risk | Claude |
| `architecture/ARTIFACT_SYSTEM.md` | Artifact types, ChartSpec, reproducibility, SI labeling | Claude |
| `architecture/CODE_EXECUTION_SECURITY.md` | Analysis Lab sandbox | Claude |
| `architecture/FRONTEND_ARCHITECTURE.md` | Screens, components, state, UX, visual identity | Claude |
| `architecture/BACKEND_ARCHITECTURE.md` | Modules, runtime, caching, limits, observability | Claude |
| `architecture/API_CONTRACTS.md` + `contracts/*.json` | HTTP and SSE contracts (the JSON Schemas are canonical for shapes) | Claude |
| `architecture/TESTING_STRATEGY.md` | Tests, benchmark, evaluation | Claude |
| `architecture/DEPLOYMENT.md` | VPS, Docker, Judge Mode operations | Claude |
| `decisions/ADR-*.md` | Decision records | Claude |
| `implementation/CODEX_MASTER_PLAN.md` | Milestones, tasks, acceptance criteria, dependency graph | Claude |
| `implementation/HANDOFF_TO_CODEX.md` | Start brief | Claude |
| `implementation/REVIEW_PROTOCOL.md` | Review method and finding template | Claude |
| `implementation/PROGRESS_LOG.md` | Implementation reports | **Codex** |
| `implementation/reviews/` | Review reports | Claude |
| `../curation/benchmark/` | Retrieval benchmark with gold labels, written by the architect so it stays independent of the implementer | Claude |
| `../curation/{investigations,tables,media_rules.yaml}` | Investigation profiles, column mappings, media rules | **Codex** writes, Claude reviews |

## Consistency checklist

Run this after any architecture change:

```bash
grep -rn "gpt-6\|text-embedding\|gpt-image" docs AGENTS.md CLAUDE.md   # model IDs must match AI_ARCHITECTURE.md §2
grep -rn "ev:" docs | grep -v "\[\[ev:"                                # citation marker format
grep -rhoE "\b(search_investigations|get_investigation|search_documents|get_document_page|list_datasets|query_measurements|make_chart|compare_runs|check_applicability_envelope|check_d2_law|get_timeseries|find_media)\b" docs | sort | uniq -c
grep -rhoE "\b(turn\.[a-z_]+|text\.[a-z_]+|tool\.[a-z_]+|evidence\.[a-z_]+|artifact\.[a-z_]+|status)\b" docs/architecture | sort | uniq -c
```

## Terminology

The 2026 Space Apps rules use **"Super Intelligence (SI)"** in place of "AI". All user-facing text (UI, submission, demo) says **SI**. Internal docs may say "LLM" or "model" when they mean the technical component.
