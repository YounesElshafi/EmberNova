# Post-judging remediation tracker

SI-assisted engineering record. No publication, commits, or deployment authorized. Review IDs retain report 09 numbering. All entries require verification before closure.

## A1
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, A1; implementation details in report 11.
- Review finding and planned work: all | Code is untracked; repository has 4 files (05 §5) | Commit code, docs and curation to a branch and push; keep `data/**/raw`, `build/`, `.env*` out (already ignored) | Backup; a repository link judges can open | Low / 0.5 h | — | `git ls-files` shows source; `git status` shows no secrets or raw data staged | Yes — do first
- Category / priority: Mandatory corrections / P0
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: DEFERRED_WITH_REASON ? commits and publication explicitly prohibited
- Verification: none in this remediation run.

## A2
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, A2; implementation details in report 11.
- Review finding and planned work: P, V, I | No public deployment; `deploy/` does not exist (05 §5, 08 §2) | Host the built app with its `build/` outputs (knowledge DB, bundle, media, PDFs) on a small VPS or container host; HTTPS; health check | Meets the accessible-link minimum requirement | Medium / 4–6 h | A1, A3, A4 | Open the link from a phone on mobile data; run the lunar replay and one live question | Yes — essential
- Category / priority: Mandatory corrections / P0
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## A3
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, A3; implementation details in report 11.
- Review finding and planned work: V | Shared $2/day budget; failed turns keep a $0.30 reservation; per-IP limit breaks behind a proxy (05 T4) | Settle failed turns at metered cost; trusted-proxy client address; raise daily budget for judging weeks; when budget is exhausted, route the composer to recorded sessions with a clear message | Chat stays available to judges | Low / 1–2 h | — | Simulate 10 failed turns, confirm the 11th still runs | Yes
- Category / priority: Mandatory corrections / P0
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## A4
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, A4; implementation details in report 11.
- Review finding and planned work: V | `GET /api/sessions` exposes every visitor's threads (05 T5) | Track own session IDs in browser storage; drop the global list endpoint or restrict it to admin | No cross-visitor leakage | Low / 1 h | — | Two browsers do not see each other's threads | Yes
- Category / priority: Mandatory corrections / P0
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## A5
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, A5; implementation details in report 11.
- Review finding and planned work: P | No demo, no project description (06 §5, 08 §2) | Record the ≤30 s video (or ≤7 slides) from the deployed build following 06 §6; write the project page per 06 §7; include SI disclosure and NASA data table | Meets minimum requirement; drives Presentation | Medium / 4–5 h (human) | A2 | Stopwatch ≤ 30.0 s; links open in a private window | Yes — essential
- Category / priority: Mandatory corrections / P0
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## A6
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, A6; implementation details in report 11.
- Review finding and planned work: V, R | Ranking returns confident results for nonsense and out-of-scope queries (05 T1) | Similarity floor on dense scores and require at least one lexical hit; show "no strong match"; scope notice for propulsion terms; stop min-max normalizing to 1.00 | Objective 1 becomes trustworthy under judge probing | Low–medium / 2 h | — | "asdfqwer zzzz" → empty state; rocket query → scope notice; benchmark recall not lower | Yes
- Category / priority: Mandatory corrections / P0
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## A7
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, A7; implementation details in report 11.
- Review finding and planned work: V, R | "Detection" facet ranks BASS-II above SAME (05 T2) | Curated `fire_safety_objective` tags per investigation in a curation file with source locators; use them for the filter and the facet score | Filter buttons give correct results | Low / 2 h (34 records) | — | Detection filter → SAME, SAME-R, Saffire, DAFT first | Yes
- Category / priority: Mandatory corrections / P0
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## A8
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, A8; implementation details in report 11.
- Review finding and planned work: V | Comparison: zero extinction diameters pooled; sample size ignores missing values (04 S1-1, S1-2) | Per-quantity n in the sample-size check; treat D_ext = 0 with non-extinction outcome as "no extinction observed"; show outcome counts | Removes the one result I found that could mislead | Low / 1.5 h | — | Heptane air vs 0.30–0.34 O₂ comparison shows "n=2: warn" and no "0.0 mm" median | Yes
- Category / priority: Mandatory corrections / P0
- Component / likely files: backend/src/embernova/science/analyses.py; backend/tests/test_science.py
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## B1
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, B1; implementation details in report 11.
- Review finding and planned work: R, I, V | Only 5 tables curated; ~20 experiment tables on disk unparsed, including Saffire I–III, SAME-R, BASS, CFI-G, BRE, SPICE (03, 04) | Add mapping files for the small, clean ones first: Saffire-I/II/III (material, thickness, size, airflow, direction), SAME-R (sample, inlet velocity, aging times), BASS (material), CFI-G normal/inverse (O₂ up to 85%), ACME BRE | Detection and solid-material prevention gain real data; CFI-G answers the challenge's own "highest oxygen" example | Medium / 30–45 min per table once the pattern is set; 4–5 h for six | — | Each new table has a golden test against 2–3 raw rows; "highest oxygen" query returns CFI-G with a chartable O₂ value | Yes for 4–6 tables
- Category / priority: High-value improvements / P1
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## B2
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, B2; implementation details in report 11.
- Review finding and planned work: R, C, I | Objective 3 has no surface; no cross-investigation view (03) | "Fire-safety systems" page: Prevention / Detection / Suppression columns listing investigations, what each measured, available data, and two cited source passages; reuse tags from A7 | Direct, visible answer to Objective 3 | Medium / 3–4 h | A7 | Each entry links to a real investigation page and evidence | Yes
- Category / priority: High-value improvements / P1
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## B3
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, B3; implementation details in report 11.
- Review finding and planned work: C, R, I | No overview of what NASA has and has not tested (07 §6) | Evidence-gap map: fuel class × O₂ band × pressure band (× gravity regime) grid with test counts; empty cells highlighted; click-through to runs | The project's signature insight and the demo's closing image | Medium / 4 h | B1 improves it | Counts equal independent recount from the bundle (e.g. 17 FLEX tests in the 30–34% / ~540 mmHg cell) | Yes if B1 is trimmed
- Category / priority: High-value improvements / P1
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## B4
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, B4; implementation details in report 11.
- Review finding and planned work: R, C | 123 CO₂ and 50 He dilution tests unused for a suppression view (07 §6) | FLEX suppressant chart: outcome and extinction diameter vs diluent fraction per fuel, built by the existing chart tool with a categorical outcome series | Suppression shown with data, matching the challenge text on FLEX | Low–medium / 2–3 h | A8 | Point counts match raw (CO₂>0: 123; He>0: 50) | Yes
- Category / priority: High-value improvements / P1
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## B5
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, B5; implementation details in report 11.
- Review finding and planned work: P, V | Result tables show JSON, long floats, `mm**2/s`, internal IDs (05 T8–T10) | Formatting pass (see report 11 §C) | Removes the most visible roughness in screenshots and video | Low / 2–3 h | — | Screenshot review of compare, envelope, dataset pages | Yes
- Category / priority: High-value improvements / P1
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## B6
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, B6; implementation details in report 11.
- Review finding and planned work: V, R | Envelope headline not fuel-aware; solids absent; distance unexplained; mixed units (04 S2-1…3, 06) | Per-fuel-class coverage sentence; O₂-only strip for tables without pressure; replace distance with ΔO₂ and ΔP; single unit selector | The flagship tool says something precise and defensible | Medium / 3 h | — | Lunar preset reads "Liquid droplets: 0 tests in band, 17 within +0.4 psi; solids: 0 tests ≥30% O₂" | Yes
- Category / priority: High-value improvements / P1
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## B7
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, B7; implementation details in report 11.
- Review finding and planned work: R, V | No model-ready export or data card (03) | One download: tidy CSV per fuel class with SI and display units, quality flags, source hashes, plus a README data card (definitions, exclusions, known anomalies, licence, DOIs) | Concrete answer to Objective 2 | Low / 2 h | — | File opens in pandas; row counts match the bundle | Yes
- Category / priority: High-value improvements / P1
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## B8
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, B8; implementation details in report 11.
- Review finding and planned work: I, P | Home page hides corpus scope (06 §1) | Overview strip: counts of investigations, documents, numeric datasets and media by fire-safety area, linking to B2 | Judges grasp scope in seconds | Low / 1.5 h | A7 | — | Yes
- Category / priority: High-value improvements / P1
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## C1
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, C1; implementation details in report 11.
- Review finding and planned work: V | Availability bonus distorts relevance (05 T3) | Remove from score; show as badge; re-run benchmark | 1 h | Yes
- Category / priority: Differentiation and rigor / P2
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## C2
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, C2; implementation details in report 11.
- Review finding and planned work: V | SI prose numbers unchecked (04 S2-6) | Match numbers in cited sentences against evidence previews; surface an "unmatched numbers" count | 3 h | Maybe
- Category / priority: Differentiation and rigor / P2
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## C3
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, C3; implementation details in report 11.
- Review finding and planned work: V | Missing plausibility flags (04 S2-4) | Rules for final O₂ > initial, composition sum, D_ext > D₀; show as warnings, never alter values | 1.5 h | Yes
- Category / priority: Differentiation and rigor / P2
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## C4
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, C4; implementation details in report 11.
- Review finding and planned work: V | d²-law on unsupported table returns empty ok chart (04 S2-5) | Validate non-empty complete rows; 422 otherwise; dynamic title | 0.5 h | Yes
- Category / priority: Differentiation and rigor / P2
- Component / likely files: backend/src/embernova/science/analyses.py; backend/tests/test_science.py
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## C5
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, C5; implementation details in report 11.
- Review finding and planned work: C, R | Objective 2 lacks a model (04 §4) | Bounded interpolation of K for FLEX per fuel with leave-one-out error, shown only inside the tested envelope, labeled exploratory and SI-assisted | 4–5 h | Only if B-items are done; otherwise mention as future work
- Category / priority: Differentiation and rigor / P2
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## C6
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, C6; implementation details in report 11.
- Review finding and planned work: R | Hardware relationships not shown | Group investigations by facility (CIR/ACME, CIR/MDCA, MSG, Cygnus) on the investigations page | 1.5 h | Maybe
- Category / priority: Differentiation and rigor / P2
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## C7
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, C7; implementation details in report 11.
- Review finding and planned work: P | Wrong labels (05 T9) | Use `retrieval_mode` from `/api/meta`; distinct banner text for SI recordings | 0.5 h | Yes
- Category / priority: Differentiation and rigor / P2
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## C8
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, C8; implementation details in report 11.
- Review finding and planned work: V | Recall@5 0.61 vs 0.85 target | After A6/A7/C1 re-run benchmark; add acronym/alias boosts (e.g. "Saffire", "CFI-G") | 2 h | Maybe
- Category / priority: Differentiation and rigor / P2
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## C9
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, C9; implementation details in report 11.
- Review finding and planned work: V | Security hygiene | Delete `.env.txt`; rotate key if shared; rate-limit search endpoints | 0.5 h | Yes
- Category / priority: Differentiation and rigor / P2
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## D1
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, D1; implementation details in report 11.
- Review finding and planned work: Saffire telemetry time series (radiometers, smoke detectors) | High scientific value for detection, but parsing ~11k-row telemetry with channel semantics is a day's work. Not before the deadline
- Category / priority: Optional enhancements / P3
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## D2
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, D2; implementation details in report 11.
- Review finding and planned work: Earth-application section from the three NASA spinoff resources | One static cited panel; do only if time remains
- Category / priority: Optional enhancements / P3
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## D3
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, D3; implementation details in report 11.
- Review finding and planned work: Light theme, accessibility audit, bundle size | Post-submission
- Category / priority: Optional enhancements / P3
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## D4
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, D4; implementation details in report 11.
- Review finding and planned work: Hermetic tests with a small fixture corpus | Post-submission
- Category / priority: Optional enhancements / P3
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## D5
- Reference: `docs/judging-review/09_IMPROVEMENT_MASTER_PLAN.md`, D5; implementation details in report 11.
- Review finding and planned work: Synthesized investigation summaries with review status | Useful for "summarizes"; risk of unreviewed SI text. Post-submission unless a human reviews each
- Category / priority: Optional enhancements / P3
- Component / likely files: Determine exact files during component audit; report 11 provides starting locations.
- Dependencies and required tests: retain report 09 dependencies and validation above; add regression coverage and relevant integration checks.
- Status: NOT_STARTED
- Verification: none in this remediation run.

## Additional findings outside the numbered master plan

NOT_STARTED: citation-breadth labeling (04 S3-1); CFI workbook source validation (04 ?6); habitat facets, sensor metadata, cross-investigation relationships and E-FIELD bounds (03); accessible form names, unknown-session error, disabled-key composer and mobile chart legends (06); outside-user study and timed task protocol (02,10); official 2026 rules and local-event verification, supplemental attribution and link checks (08); restart/cancellation-safe budget accounting and backend ownership enforcement required by the user beyond report 11 suggestions. Each needs an individually scoped implementation and verification record before closure.

## Verified first checkpoint

A8: VERIFIED for zero/non-extinction exclusion, outcome counts, per-quantity sample thresholds and source preservation. C4: IMPLEMENTED; unsupported-table guard verified; chart title uses table ID, further dataset-title polish remains. Backend 39 passed (7.84 s); Ruff lint and formatting passed. Original scientific regression tests remain passing.

This tracker is preliminary: additional findings listed above still require individual expansion. It is not a completion claim.


## Visitor isolation checkpoint

Implemented anonymous 256-bit visitor credentials in HttpOnly SameSite=Strict cookies, hashed ownership in stored sessions, owner-filtered listing, and backend ownership enforcement for every /api/sessions/{id} path (read, update, message, cancel and events). Cross-origin writes are rejected. SECURE_COOKIES must be true under production HTTPS. Legacy ownerless sessions are inaccessible through public thread routes; no automatic adoption is permitted.

Verification: 40 backend tests passed in 7.83 s, including two visitor contexts, guessed thread IDs, event retrieval, cancellation, mutation, listing, cookie persistence and cross-origin rejection. Ruff import ordering corrected after initial lint failure; formatting passed.

A4 remains IN_PROGRESS: artifact/evidence download ownership and browser end-to-end behavior still require audit. This is not a claim of complete privacy remediation. Budget accounting and retrieval remain unchanged. No publication, commits or original NASA data changes.
