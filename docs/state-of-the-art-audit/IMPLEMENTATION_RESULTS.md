# EmberNova implementation results

Date: November 13, 2026. This batch implements the highest-priority confirmed findings from [FINAL_AUDIT.md](FINAL_AUDIT.md). No deployment, paid model call, corpus mutation, commit or push was performed.

## Completed fixes

| Issue | Change | Verification |
|---|---|---|
| Non-extinction zero in generic summaries | `backend/src/embernova/tools.py` excludes a zero extinction diameter with a known non-extinction outcome from that statistic; raw records and total run counts remain available. | Existing science suite and full backend suite pass. A dedicated generic-summary regression is still needed. |
| Missing joint oxygen/pressure data | `backend/src/embernova/science/analyses.py` permits an empty chart in an otherwise valid envelope, retaining the per-dimension coverage response. | Existing envelope tests pass; BASS-only probe should be rerun against this revision. |
| Cross-session artifact access | `storage.py` adds a backward-compatible `artifact_owners` table; `tools.py` associates newly created artifacts with the visitor; `main.py` enforces ownership on artifact, data and ZIP routes. Explicit admin replay recording marks included artifacts public. | New second-visitor test returns 404 on all three routes and owner ZIP remains available. Historical artifacts lacking owner records become inaccessible until republished. |
| Point citations | `tools.py` records individual point evidence for charts up to 500 points; `ArtifactView.tsx` resolves the selected trace/point to its evidence. Charts without point evidence give an explicit unavailable message instead of opening unrelated evidence. | New API regression checks point/evidence cardinality and locators; frontend typecheck passes. Plotly click was not retested in a browser. |
| Misleading numeric audit | `agent/citations.py` rejects sign reversals, user-question and unrelated-tool number laundering, and explicit mismatched units where cited preview units exist. `Workspace.tsx` now describes a clean scan as a limited diagnostic. | New sign/unit/irrelevant-number regression passes; full backend suite passes. Quantity, run and semantic entailment are not fully validated. |
| Derived oxygen evidence | `tools.py` labels row evidence containing derived oxygen partial pressure as mixed measured and derived. | Existing source/contract tests pass. Field-level provenance remains needed. |
| Misleading unknown comparison | `ArtifactView.tsx` shows Unknown when a compared condition is missing. | Frontend typecheck/build pass. |
| Readiness status | `/api/health` returns 503 if knowledge DB, bundle manifest or frontend build is missing, with component checks. | Focused healthy-route test passes. Missing-frontend probe and deeper DB/hash validation remain. |
| Excess tool calls | `agent/loop.py` processes every returned call ID and raises a bounded error after ten calls instead of silently dropping responses. | Existing scripted agent tests pass; an explicit >10-call fixture remains needed. |
| Mobile overlap | `styles.css` reserves bottom conversation space and raises small mobile helper text sizes. | Frontend build passes; responsive screenshot review remains. |

## Verification and before/after

Backend: **58 passed, one Starlette/httpx deprecation warning** after changes; Ruff lint and formatting pass. Frontend: **8 tests passed**, ESLint, TypeScript typecheck and production Vite build pass. A focused health test passed after the last readiness edit. The Plotly bundle remains large (4,674 KB minified); this was already a known performance issue. Browser end-to-end tests were not rerun after the edits; the audit's earlier run had 12 passing cases but hung during teardown, so no clean E2E pass is claimed.

Before, another visitor could retrieve a known artifact and ZIP with HTTP 200; the new regression expects HTTP 404. Before, any chart point opened the first evidence ID; new charts with up to 500 points carry one evidence ID per selected point. Before, a missing corpus returned readiness HTTP 200 with `not_ready`; it now returns 503. The prior numeric fixture accepted wrong sign and units; focused tests now reject them. These are targeted improvements, not proof that all generated scientific claims are correct.

## Remaining issues and disposition

| Audit recommendation | Status and next step |
|---|---|
| Typed numeric claims, variable/run/condition binding and citation entailment | **Deferred, high priority.** Current check is still heuristic; build typed claim records from deterministic tools and test scientific assertions. |
| Field-level measured/derived/1g provenance | **Partial.** Replace row-level label with per-value origin, formula and gravity metadata; test Saffire and derived pressure. |
| CFI 158 rows/79 labels | **Deferred.** Determine composite observation identity from the source, preserve both rows and experiment counts, correct data-card text. |
| Relevance rejection, exact identifiers, scoped dense top-K, page-level retrieval evaluation | **Deferred.** Keep hybrid baseline and run the existing held-out benchmark after any ranking edit. |
| Evidence-strength badges | **Deferred.** Replace strong/moderate heuristics with factual coverage labels. |
| Context pagination, cancellation-safe tools, bounded SSE/concurrency, semantic argument validation | **Partial.** Excess calls addressed; remaining lifecycle/resource paths need tests and fixes. |
| Deployment config/proxy/container/CI and public live smoke | **Blocked by unimplemented repository deployment work.** Align actual config paths, add tested deployment assets and CI, then verify the public endpoint and replay. No live infrastructure was touched. |
| Dependency advisories | **Deferred.** Update tested lockfiles, prioritizing production exposure; do not force upgrades. |
| Full mobile/accessibility, chart keyboard access, dataset filters, Plotly bundle reduction | **Partial.** Recheck responsive screenshots, keyboard and screen reader paths; benchmark a narrower Plotly bundle. |
| New models, learned sparse/late-interaction retrieval, video metrology, graph infrastructure | **Rejected for submission; benchmark or research later.** No local evidence justifies replacement now. |

## Deployment readiness

**Not yet ready to claim a public NASA demonstration.** Local tests and production frontend build pass, but public smoke tests, clean browser-suite teardown and several scientific assurance issues remain. The immediate next engineering batch should finish field-level provenance and semantic numeric claim validation, resolve CFI experiment identity, and run a clean browser and public smoke test.

## Final update (supersedes earlier counts and statuses)

Final checks passed: **62 backend tests** with one Starlette/httpx deprecation warning, Ruff lint and formatting, **8 frontend tests**, ESLint, TypeScript typecheck and Vite production build. Browser end-to-end tests were not rerun. The Plotly bundle remains large.

Exports and coverage now describe **source records**, acknowledging that linked CFI tables can represent one experiment more than once. Saffire-II ground comparison fields and derived oxygen are disclosed; partial-gravity claims are limited to this local snapshot. The UI no longer displays unsupported evidence-strength badges. The document-page tool now retrieves bounded windows with offset and `has_more`. Replay publication is explicit storage metadata, preserving the artifact response contract.

The keyless retrieval benchmark after the relevance gate reproduced the audit baseline: dev Recall@5 **0.60833**, MRR **0.84667**, nDCG@10 **0.79106**; test **0.67381**, **0.93333**, **0.68170**. The pizza query now abstains. Exact identifier routing and scoped dense retrieval remain to be improved. No semantic retrieval or answer-quality gain is claimed.

Dockerfile, Compose, `.dockerignore` and deployment instructions now match the actual config paths. Compose syntax validated; the local Docker daemon was unavailable, so image and public endpoint were not tested. `.env.example` ranking defaults now match the application.

One built-in evaluation unexpectedly loaded a local API key despite an attempted blank shell override and made embedding requests. No secret was printed. A new explicit `--offline` option prevents this on future lexical benchmarks; the subsequent benchmark used an explicitly keyless settings object. The charge, if any, was not verified.
