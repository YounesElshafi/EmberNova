# EmberNova — Final validation

Date: 2026-11-13 (session ran into 2026-11-14 UTC). Branch `review-fixes`, uncommitted. Baseline: [INITIAL_AUDIT.md](INITIAL_AUDIT.md). Plan: [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

Evidence legend:

- **AT**: automated test.
- **PR**: keyless probe against the real corpus.
- **LV**: live run through the HTTP API with the configured OpenAI model.
- **UI**: real headless-Chrome Playwright run against the built frontend, including live-model runs.

Live spend: about **$1.18** in the app's own usage ledger (76 metered calls, including one failed turn settled at a conservative reservation). The app ledger is an estimate; provider billing was not inspected.

**Status vocabulary:** Implemented & tested · Implemented, partly tested · Partial · Not implemented · Blocked.

## 1. Commands executed and outcomes

| Check | Command | Result |
|---|---|---|
| Backend tests | `cd backend && .venv/Scripts/python.exe -m pytest -q --basetemp=<writable dir>` | **78 passed** (62 before; 16 new), 1 Starlette deprecation warning |
| Backend lint/format | `ruff check src tests`, `ruff format --check src tests` | Pass |
| Frontend unit tests | `npm run test` | **9 passed** (1 new) |
| Frontend lint / types / build | `npm run lint`, `npm run typecheck`, `npm run build` | Pass. The Plotly chunk-size warning is pre-existing |
| Browser suite, keyless | `npx playwright test e2e/research.spec.ts` | **12/12 passed in 31 s; clean exit** (the earlier audit's teardown hang did not recur) |
| Browser suite, live | `EMBERNOVA_LIVE_E2E=1 npx playwright test e2e/live.spec.ts -g "inline cards\|lunar habitat question"` | **2/2 passed** (ranking cards + multi-turn; lunar evidence classification + mobile width) |
| Retrieval benchmark | dev-tuned, test reported once (see §3) | nDCG@10 improves on test in both modes |
| NASA link check | HTTP GET of every investigation `source_url` and PSI DOI | **59/59 HTTP 200**; each DOI resolves to its own `psi.nasa.gov/.../PSI-N` page (`build/linkcheck_initial.json`) |

Screenshots (generated, gitignored): `build/eval/screens/live-ranking.png`, `live-lunar.png`, `live-lunar-mobile.png`.

## 2. Requirement status

| # | Requirement | Before | After | What changed | Evidence |
|---|---|---|---|---|---|
| R1 | Scientific intent extraction | Not implemented | **Implemented & tested** | `science/intent.py`: curated synonym vocabulary (ventilation → airflow, acrylic → PMMA, lunar ≠ microgravity) | AT `test_facets.py`; PR; LV (interpretation shown in cards) |
| R2 | Scientific ranking | Partial | **Implemented & tested** | Facet-agreement reranking over the curated facet layer. Benchmark gains in §3 | AT, PR, LV |
| R3 | Selection explanation | Fail | **Implemented & tested** | Per-result "Study type / Matches / Partly matches / Differs / Not recorded" plus matching report pages | AT, UI screenshot |
| R4 | 0–100 Scientific Relevance Score | Fail | **Implemented & tested** | Integer score, labeled in UI and payload as "Not a probability, evidence strength or fire risk" | AT, UI assertion |
| R5 | Missing metadata vs mismatch | Not implemented | **Implemented & tested** | `unknown` ("not confirmed absent") is distinct from `differs` | AT `test_unrecorded_parameter_is_unknown_not_mismatch` |
| R6 | Out-of-domain rejection | Pass | Pass | unchanged | AT (existing) |
| R7 | Investigation facet metadata | Partial | **Implemented & tested** | `curation/investigation_facets.yaml` for all 34 investigations; every value's NASA-text basis verified | AT `test_every_facet_has_verifiable_nasa_basis` |
| R8 | Real data, nulls preserved | Pass | **Pass (bug fixed)** | Found in live D: `get_investigation` summarized FLEX extinction diameter as n=196, min 0 mm by pooling 8 non-extinction zeros. Now n=188, 0.12–4.6 mm, with the exclusion disclosed in `transform_steps`. The assessment only reads measured rows | AT `test_investigation_summary_excludes_non_extinction_zero_diameters`, PR |
| R9 | Airflow → flame-spread data coverage | Partial | **Partial (data limit, disclosed)** | Only Saffire-II has curated microgravity spread rate, with n=2 values at a fixed 20 cm/s. BASS spread results exist only in reports. The assessment states this explicitly | PR, LV B/E |
| R10 | Structured export | Pass | Pass | `list_datasets` now exposes `descriptor_fields`, which removed 3 failed agent calls in Scenario E | LV E |
| R11 | Comparison engine | Pass (run-level) | Pass | Unchanged; the prompt now forbids guessing table IDs | LV D |
| R12 | Direct / Indirect / Insufficient evidence | Not implemented | **Implemented & tested** | `assess_evidence` tool, `/api/evidence-assessment`, inline block with condition table and evidence gaps | AT (4 tests), LV C/F, UI |
| R13 | No fabricated risk numbers | Pass | Pass | UI test asserts no "% chance/probability/risk" text | UI |
| R14 | Agent orchestration | Pass | **Implemented & tested** | The agent combined search, documents, assessment, measurements, charts and media without user tool-switching | LV A–H |
| R15 | Multi-turn context | Partial | **Implemented & tested** | Each turn stores the ordered cited investigations, ranking order and assessment classes; replayed to the model | AT `test_follow_up_turn_receives_ordered_research_context`, LV D, UI |
| R16 | Inline typed blocks | Partial | **Implemented & tested** | `InlineBlocks.tsx`: ranking, evidence assessment, chart, comparison, envelope, table and media render in the thread. History reloads them; an error boundary handles malformed payloads; schema contract extended | AT (schema validation, ordering), UI |
| R17 | Clickable NASA links | Partial | **Implemented & tested** | Cards and assessment rows link to the NASA page and DOI (`target=_blank`); the inspector DOI is now a link | UI `href` assertion, link check |
| R18 | Claim → source provenance | Pass (evidence level) | Pass | New blocks register ledger evidence (metadata SHA-256, source URL). Typed claim binding is unchanged | AT |
| R19 | Numeric-audit false positives | Fail | **Implemented & tested** | Rank cells, list ordinals and page locators are no longer flagged; genuine unsupported quantities still are | AT; LV A (0 warnings after fix) |
| R20 | NASA images/video inline | Pass (panel) | **Implemented & tested** | `find_media` emits an inline `media` block with association, credit and "not SI-generated" label | LV H |
| R21 | Predictive model | Not implemented | **Not implemented (deliberate)** | See §5 | — |
| R22 | Failure handling | Pass | **Implemented & tested** | Fixed: multi-tool turns were aborted by a cumulative-token cost reservation (Scenario E, $0.083 spent → "spending limit reached") | AT `test_multi_round_turn_not_aborted…`; LV E rerun succeeded at $0.071 |
| R23 | Browser E2E | Blocked (hang) | **Implemented & tested** | 12/12 keyless plus 2 new live specs | UI |
| R24 | Security | Pass | Pass | No secrets in frontend or logs. The new API route is Pydantic-validated (422 on bad enums). The links are fixed-pattern NASA/DOI URLs from curated metadata | AT |

## 3. Retrieval quality (architect benchmark `retrieval_v1.yaml`)

| Mode | Split | Recall@5 | MRR | nDCG@10 |
|---|---|---|---|---|
| Hybrid (live config) | dev, 20 q | 0.615 → **0.748** | 0.818 → **0.879** | 0.777 → **0.832** |
| Hybrid | test, 10 q | 0.741 → 0.738 | 0.900 → 0.875 | 0.654 → **0.724** |
| Lexical only | test | 0.674 → **0.721** | 0.933 → 0.925 | 0.682 → **0.743** |

Interpretation:

- The gain is moderate and consistent on nDCG.
- Hybrid MRR on test fell slightly (0.90 → 0.875).
- The facets and the benchmark share an author, so the test split is not fully independent.
- Hybrid `evidence_hit_at_8` was 0 at every weight (lexical: 1.0). This page-level regression in hybrid passage retrieval **predates this change and remains open**.

Qualitative probe results:

- "Flame extinction" no longer ranks the SAME-R smoke study second.
- Lunar acrylic surfaces GRC centrifuge, LUCI and FM2 marked as simulated or planned.
- The pizza query still abstains.

## 4. End-to-end scenarios (live model unless noted)

| Scenario | Outcome | Notes |
|---|---|---|
| A Ranking | **Pass** | Ranking block plus answer; BASS/BASS-II on top, with explanations and links |
| B Airflow comparison | **Pass with data limit** | Correct opposed vs concurrent trends from BASS reports (cited pages). States that no curated spread-rate comparison exists; assessment Indirect |
| C Lunar acrylic | **Pass** | "Indirect evidence"; LUCI/GRC labeled simulated, FM2 planned; no probability; asks for O₂/pressure |
| D Multi-turn | **Pass** | Turn 2: "By 'the first two,' I take you to mean ACME / Flame Design (PSI-10) and FLEX (PSI-69)". Matches the ranking cards. After the prompt fix it reused IDs without re-searching. Turn 3 kept the same pair |
| E Data extraction | **Pass after fix** | First attempt aborted (budget bug, fixed). Rerun: Saffire-I/II/III rows with source rows, units, quality flags and nulls preserved, plus a chart. The LLM also typed a CSV in prose; the authoritative export remains the table artifact ZIP |
| F Insufficient (Ultem, Mars, 2 bar, 40 % O₂) | **Pass** | "No measured flame-spread rate is available"; Indirect, with the gaps listed; no invented value |
| G Source navigation | **Pass** (link-level) | 59/59 URLs resolve; UI anchors verified. Clicking through in a visible browser was not performed (Chrome extension unavailable) |
| H Visual media | **Pass** | Original BASS-II image and videos inline. The model refused to invent captions or test associations |
| I Failure handling | **Partly tested** | Tested: budget limits, tool errors returned as `ok:false`, LLM unavailable, cancellation and bad API enums (422) via AT; malformed blocks via the error boundary (build only). **Not reproduced this session:** a live LLM timeout and an unreachable NASA link |

## 5. Predictive modeling readiness (R21)

No model was trained, and this is deliberate.

- **Solids:** microgravity flame-spread data in curated form is n=2 at a single flow (Saffire-II). That is not modelable.
- **FLEX (PSI-69):** the only homogeneous candidate, with 274 measured runs. Inputs: O₂ mole fraction, pressure, CO₂/He dilution, initial diameter. Outputs: burning-rate constant K and extinction diameter. A narrowly scoped, droplet-only regression with grouped cross-validation by fuel and campaign would be defensible.
  - It would not transfer to solids, habitats or partial gravity.
  - Its prerequisites are outcome-aware eligibility (completion vs extinction), per-run uncertainty, and duplicate and correlated-run handling.
  - The existing `/api/export/model-ready` ZIP with data card is the supported path today.

## 6. Known limitations and remaining blockers

1. Facet curation is keyword-verified, but its scientific completeness is reviewer judgment. Unlisted facets show as "not recorded".
2. Evidence classification is rule-based. "Direct" needs only one matching measured run (Saffire-II case: n=1), and run counts are shown so users can judge.
3. Typed claim-to-measurement binding, CFI composite identity, the hybrid passage-retrieval regression and dependency upgrades remain open from the prior audit.
4. The pre-existing server on port 8000, of unknown revision, was left running. All validation used fresh servers on :8020 and :8011.
5. Deployment and public URL: not touched or verified.
6. The model may still write long prose tables. Ranking duplication is reduced by prompt, not enforced.

## 7. Changed files

- **New:** `backend/src/embernova/science/{intent,assessment}.py`, `curation/investigation_facets.yaml`, `backend/tests/{test_facets,test_research_blocks}.py`, `frontend/src/artifacts/InlineBlocks{.tsx,.test.tsx}`, `docs/full-system-audit/*`.
- **Modified:** `retrieval.py`, `tools.py`, `config.py`, `main.py`, `science/bundle.py`, `agent/{loop,registry,citations}.py`, `agent/prompts/system.md`, `tests/test_review_fixes.py`, `docs/architecture/{AGENT_TOOLS,RETRIEVAL_ARCHITECTURE,API_CONTRACTS}.md`, `contracts/artifact.schema.json`, `frontend/src/{pages/Workspace.tsx,state.ts,state.test.ts,components/EvidenceInspector.tsx,styles.css,api/generated/Artifact.ts}`, `frontend/e2e/live.spec.ts`, `.env.example`.
- **Not committed.**
