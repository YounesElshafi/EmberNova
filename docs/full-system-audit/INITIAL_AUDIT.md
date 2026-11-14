# EmberNova — Initial full-system audit

Date: 2026-11-13. Branch `review-fixes` (uncommitted work from the earlier state-of-the-art audit is present and was audited as-is). Auditor: Claude Code, acting under the user's explicit instruction to audit **and implement** (this overrides the usual architect-only role for this task).

Evidence types used below:

- **CI**: code inspection only.
- **AT**: automated tests (pytest, vitest).
- **PR**: executed keyless probe against the real tools and corpus, with no LLM.
- **LV**: live end-to-end run through the HTTP API with the real OpenAI model (paid; user-approved budget of about $2).
- **UI**: real browser rendering.

**Browser automation (Claude in Chrome) was not connected.** UI verification therefore relies on the project's Playwright suite (headless Chrome). Nothing in this report is marked PASS from code inspection alone.

## 1. Baseline facts

| Item | Result | How established |
|---|---|---|
| Backend tests | **62 passed**, 1 deprecation warning (`pytest --basetemp` inside the sandbox; the default system temp is not writable here) | AT |
| Frontend build | Vite production build succeeds; Plotly chunk is about 4.6 MB | AT |
| Corpus | 34 investigations (25 PSI and 9 supplemental NASA), 93 documents, 3,187 pages, 13 curated tables | PR |
| Readiness | `/api/health` returns `ok` with knowledge DB, bundle, frontend and embeddings | PR |
| NASA links | **59/59 URLs return HTTP 200**: 34 investigation `source_url` values plus 25 PSI DOIs. Every DOI resolves to the matching `psi.nasa.gov/.../PSI-N` page. Saved to `build/linkcheck_initial.json` | PR (network) |
| Live agent | Scenario A completed with 3 tool calls, $0.054 and no error | LV |
| Port 8000 | Already owned by a pre-existing server process of unknown revision; it was left untouched and the audit server ran on 8020 | PR |

## 2. Requirement audit

Severity scale: S1 = critical/P0, S2 = essential/P1, S3 = important/P2, S4 = optional/P3.

| # | Requirement | Current implementation | Evidence / test | Result | Sci. | Func. | UX | Sev | Recommended repair → acceptance |
|---|---|---|---|---|---|---|---|---|---|
| R1 | Understand scientific intent (phenomenon, environment, fuel, parameter) | None. The query goes verbatim to FTS5 plus dense retrieval; there is no entity extraction | `retrieval.py:187` (CI); probe of 7 queries (PR) | **NOT IMPLEMENTED** | — | — | — | S2 | Deterministic, curated query interpreter → the interpretation is returned with every search, and unit tests cover the 4 challenge facets |
| R2 | Rank investigations by *scientific* relevance | RRF of BM25, dense and passage support. No scientific facets; objective tags only | Keyless probe: "flame extinction" ranks SAME-R smoke (PSI-101) #2 and PSI-117 #1, above FLEX (PSI-69 #6). "Ventilation effects" ranks the cool-flame CFD study #1 and misses Saffire | **PARTIAL** | Weak | OK | — | S2 | Facet-aware reranking over curated per-investigation facets, measured on `retrieval_v1` dev before and after, then test once |
| R3 | Explain why each investigation was selected | Only `components` (text_rrf, facet, availability) and up to two passages; no human-readable reason | PR | **FAIL** | — | — | Poor | S2 | Per-result matched / differing / unknown facet explanation |
| R4 | 0–100 score labeled "Scientific Relevance Score" | `score` 0–1 with a fixed RRF scale. Scores are compressed: 7 of 8 results fall in 0.83–0.99 for most queries, so the score barely discriminates | PR | **FAIL** | — | — | Misleading | S2 | Integer 0–100 labeled *Scientific Relevance Score — not a probability or risk* |
| R5 | Distinguish missing metadata from confirmed mismatch | Not represented | CI | **NOT IMPLEMENTED** | — | — | — | S2 | Facet status `match` / `differs` / `unknown` |
| R6 | Out-of-domain rejection | A domain-term gate plus a dense similarity floor. The pizza query abstains | PR | **PASS** | | | | | Keep |
| R7 | NASA metadata integration with provenance | Investigations carry IDs, objectives, approach, PSI DOI, source URL, metadata SHA-256 and license. **No fuel, gravity or condition facets per investigation.** 9 supplemental investigations have empty objectives and are document-only | PR, DB dump | **PARTIAL** | OK | OK | — | S2 | Curated facet layer whose every value has a keyword basis checked by a test against NASA text |
| R8 | Real measured data, missing stays missing | `value_raw`/`unit_raw` kept beside display values, pint units, nulls preserved, `quality_flags`, design vs measured flagged. Covered by the existing 62 tests | AT, PR | **PASS** (within curated tables) | Good | Good | | | Keep |
| R9 | Coverage of airflow → flame-spread measurements | Only **Saffire-II (PSI-99, 9 rows)** has microgravity spread rate together with flow velocity. BASS (121 rows) has **no curated variables**. BASS-II has O₂ and gas composition but neither spread rate nor flow | PR (`list_datasets`) | **PARTIAL** (a data limitation, not a code fault) | Honest | | | S3 | Surface this gap explicitly in the evidence assessment; do not fabricate |
| R10 | Structured export (CSV/JSON) | `/api/datasets/{id}/export`, `/api/export/model-ready` (ZIP with data card) and artifact ZIP bundles | Existing tests (AT) | **PASS** | | | | | Keep |
| R11 | Comparison engine with comparability verdict | `compare_runs` produces a verdict (comparable / with caveats / not comparable), condition diffs, confounders and an association note. The UI shows "Unknown" for missing conditions | AT (`test_comparison_confounds`) | **PASS** (run-level) | Good | | | | Keep; investigation-level comparison goes through the evidence assessment |
| R12 | Evidence classification Direct / Indirect / Insufficient, independent of relevance | Absent. The previous strength badges were removed for overstating evidence. `check_applicability_envelope` gives atmosphere coverage only | CI | **NOT IMPLEMENTED** | — | — | — | **S1** (a core challenge capability; lunar answers currently rely on LLM prose alone) | New deterministic `assess_evidence` tool and artifact; gravity regimes never interchangeable; simulated partial-g is never Direct for lunar |
| R13 | No fabricated probabilities or certification | System prompt forbids them; envelope says "coverage, not safety" | CI, LV | **PASS** | | | | | Keep |
| R14 | Agent orchestrates multiple capabilities | Single agent with 13 deterministic tools. Scenario A used search plus 2 document searches | LV | **PASS** (tool use) | | | | | Add `assess_evidence` to the toolset and prompt |
| R15 | Multi-turn context ("compare the first two") | The transcript keeps only the last 6 `validated_markdown` answers. **No structured list of what was ranked or compared.** "First two" resolves only if the prose happens to enumerate the items | `loop.py:96` (CI) | **PARTIAL** | | Fragile | | S2 | Persist a per-turn research context (ordered investigation IDs and artifact summaries) and feed it to the next turn |
| R16 | Typed, adaptive response blocks rendered inline | Artifacts exist (chart, comparison, envelope, table, media) but show only as buttons that open a side panel. Ranking is LLM-written markdown, not a system block. There are no ranking, assessment or evidence-gap block types | LV + CI (`Workspace.tsx`) | **PARTIAL** | | | Weak | S2 | Inline typed blocks: `investigation_ranking`, `evidence_assessment` (with gaps), plus inline charts, comparisons and media; schema-validated |
| R17 | Direct, clickable NASA links for cited claims | Citations open the Evidence Inspector, which links `source_url`. **DOI is shown as plain text**, and ranking text in answers has no links | CI; links verified 200 (PR) | **PARTIAL** | | | | S2 | Ranking and assessment blocks carry NASA page and DOI links; inspector DOI becomes a link to `https://doi.org/…` |
| R18 | Claim → observation → investigation → source provenance | The ledger has an evidence ID, investigation IDs, locator (page/row), SHA-256, source URL and transformation | AT | **PASS** (evidence level); typed claim binding is still heuristic | | | | S3 | Out of scope for this batch (documented) |
| R19 | Numeric audit accuracy | Live Scenario A raised **3 false "ungrounded number" warnings** for table rank numbers 1/3/4, producing a noisy notice | LV | **FAIL** (false positives) | | | Confusing | S3 | Ignore ordinal rank cells and list markers |
| R20 | Scientific images, labeled | `find_media` serves original NASA media with association (`from_metadata` / `inferred` / `none`); SI illustrations are watermarked and disabled by default | AT | **PASS** | | | | | Render media inline |
| R21 | Predictive modeling, conditional | Not trained. Only FLEX (274 measured rows; O₂, pressure, diluent → K and extinction diameter) is homogeneous enough; solids flow-spread data has n=9 | PR | **NOT IMPLEMENTED** (correctly, so far) | | | | S4 | Model-readiness assessment in docs; no model this batch |
| R22 | Failure handling | Typed SSE errors (LLM unavailable, timeout, budget, cancellation, tool errors); tool errors are passed to the model as `ok:false` | AT (`test_review_fixes`, agent fixtures) | **PASS** (as tested) | | | | | Add tests for the new tools |
| R23 | E2E UI suite | 12 Playwright cases exist; per the earlier audit, teardown hung | Prior report; rerun pending | **BLOCKED → retest** | | | | S3 | Rerun after changes |
| R24 | Security (secrets, ownership, CSRF, sizes) | Key only in `.env` (gitignored); artifact ownership enforced; origin checks; body limit | AT | **PASS** | | | | | Keep |

## 3. Traceability matrix (current state)

| User need | Frontend | API | Backend service | Data | Tests |
|---|---|---|---|---|---|
| Find & rank | `Workspace.tsx` (LLM markdown), `Explorers.tsx` | `POST /api/search/investigations`, agent `search_investigations` | `retrieval.search_investigations` | profiles FTS5, `embeddings.npy`, `investigation_tags.yaml` | `test_retrieval*`, benchmark `retrieval_v1.yaml` |
| Summaries & sources | `EvidenceInspector.tsx` | `/api/documents/*`, `/api/evidence/{id}` | `retrieval.search_documents`, `evidence.Ledger` | pages and chunks | `test_api`, `test_citation_formats` |
| Extraction / export | `Explorers.tsx` data pages | `/api/measurements/query`, `/api/datasets/*/export`, `/api/export/model-ready` | `tools.query`, `export.py` | `build/bundle/*.parquet`, `curation/tables/*.yaml` | `test_science`, `test_api` |
| Compare | `ArtifactView` `ComparisonTables` | `/api/compare`, agent `compare_runs` | `analyses.compare` | bundle | `test_comparison_confounds` |
| Safety evidence | `ArtifactView` envelope | `/api/envelope`, `/api/coverage` | `analyses.envelope`, `coverage_grid` | bundle | envelope tests |
| Evidence classification | — | — | — | — | — (**missing**) |
| Assistant | `Workspace.tsx`, `state.ts` | `/api/sessions/*/messages` (SSE) | `agent/loop.py`, `citations.validate` | session store | agent fixture tests |

## 4. Live baseline, Scenario A (LV)

Prompt: "Find and rank NASA investigations on ventilation effects in microgravity combustion."

The tools called were `search_investigations` and `search_documents` ×2. The answer ranked BASS (PSI-26), BASS-II (PSI-25), Saffire-IV, FLEX (PSI-69) and SLICE (PSI-106), with sensible reasons and correct droplet and gas caveats. It carried 8 citations and passed the citation validation. Weaknesses:

1. The ranking is authored by the LLM, with no system score or explanation.
2. No inline ranking block and no direct NASA links in the text.
3. 3 false numeric-audit warnings.

## 5. Priority summary (feeds IMPLEMENTATION_PLAN.md)

- **P0/S1:** evidence classification is absent (R12).
- **P1/S2:** query interpretation, scientific ranking and explanation (R1–R5); facet curation (R7); inline typed blocks (R16); multi-turn context (R15); clickable DOI and ranking links (R17).
- **P2/S3:** numeric-audit false positives (R19), media and charts inline, E2E rerun (R23), dataset gap disclosure (R9).
- **P3/S4:** predictive model (R21): readiness assessment only.
