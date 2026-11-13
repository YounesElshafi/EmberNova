# 09 — Improvement master plan

Every item traces to an observed finding in reports 03–08. Effort figures are **estimates** for one implementer working with an SI coding agent. "Before deadline" assumes Sun Nov 15 23:59 local, about two working days from this review. Nothing here guarantees a particular official score.

Criteria codes: I Impact, C Creativity, V Validity, R Relevance, P Presentation.

## P0 — Critical

| ID | Criteria | Problem (evidence) | Proposed solution | Benefit | Difficulty / effort | Depends on | Validation | Before deadline? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | all | Code is untracked; repository has 4 files (05 §5) | Commit code, docs and curation to a branch and push; keep `data/**/raw`, `build/`, `.env*` out (already ignored) | Backup; a repository link judges can open | Low / 0.5 h | — | `git ls-files` shows source; `git status` shows no secrets or raw data staged | Yes — do first |
| A2 | P, V, I | No public deployment; `deploy/` does not exist (05 §5, 08 §2) | Host the built app with its `build/` outputs (knowledge DB, bundle, media, PDFs) on a small VPS or container host; HTTPS; health check | Meets the accessible-link minimum requirement | Medium / 4–6 h | A1, A3, A4 | Open the link from a phone on mobile data; run the lunar replay and one live question | Yes — essential |
| A3 | V | Shared $2/day budget; failed turns keep a $0.30 reservation; per-IP limit breaks behind a proxy (05 T4) | Settle failed turns at metered cost; trusted-proxy client address; raise daily budget for judging weeks; when budget is exhausted, route the composer to recorded sessions with a clear message | Chat stays available to judges | Low / 1–2 h | — | Simulate 10 failed turns, confirm the 11th still runs | Yes |
| A4 | V | `GET /api/sessions` exposes every visitor's threads (05 T5) | Track own session IDs in browser storage; drop the global list endpoint or restrict it to admin | No cross-visitor leakage | Low / 1 h | — | Two browsers do not see each other's threads | Yes |
| A5 | P | No demo, no project description (06 §5, 08 §2) | Record the ≤30 s video (or ≤7 slides) from the deployed build following 06 §6; write the project page per 06 §7; include SI disclosure and NASA data table | Meets minimum requirement; drives Presentation | Medium / 4–5 h (human) | A2 | Stopwatch ≤ 30.0 s; links open in a private window | Yes — essential |
| A6 | V, R | Ranking returns confident results for nonsense and out-of-scope queries (05 T1) | Similarity floor on dense scores and require at least one lexical hit; show "no strong match"; scope notice for propulsion terms; stop min-max normalizing to 1.00 | Objective 1 becomes trustworthy under judge probing | Low–medium / 2 h | — | "asdfqwer zzzz" → empty state; rocket query → scope notice; benchmark recall not lower | Yes |
| A7 | V, R | "Detection" facet ranks BASS-II above SAME (05 T2) | Curated `fire_safety_objective` tags per investigation in a curation file with source locators; use them for the filter and the facet score | Filter buttons give correct results | Low / 2 h (34 records) | — | Detection filter → SAME, SAME-R, Saffire, DAFT first | Yes |
| A8 | V | Comparison: zero extinction diameters pooled; sample size ignores missing values (04 S1-1, S1-2) | Per-quantity n in the sample-size check; treat D_ext = 0 with non-extinction outcome as "no extinction observed"; show outcome counts | Removes the one result I found that could mislead | Low / 1.5 h | — | Heptane air vs 0.30–0.34 O₂ comparison shows "n=2: warn" and no "0.0 mm" median | Yes |

## P1 — High impact

| ID | Criteria | Problem (evidence) | Proposed solution | Benefit | Difficulty / effort | Depends on | Validation | Before deadline? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B1 | R, I, V | Only 5 tables curated; ~20 experiment tables on disk unparsed, including Saffire I–III, SAME-R, BASS, CFI-G, BRE, SPICE (03, 04) | Add mapping files for the small, clean ones first: Saffire-I/II/III (material, thickness, size, airflow, direction), SAME-R (sample, inlet velocity, aging times), BASS (material), CFI-G normal/inverse (O₂ up to 85%), ACME BRE | Detection and solid-material prevention gain real data; CFI-G answers the challenge's own "highest oxygen" example | Medium / 30–45 min per table once the pattern is set; 4–5 h for six | — | Each new table has a golden test against 2–3 raw rows; "highest oxygen" query returns CFI-G with a chartable O₂ value | Yes for 4–6 tables |
| B2 | R, C, I | Objective 3 has no surface; no cross-investigation view (03) | "Fire-safety systems" page: Prevention / Detection / Suppression columns listing investigations, what each measured, available data, and two cited source passages; reuse tags from A7 | Direct, visible answer to Objective 3 | Medium / 3–4 h | A7 | Each entry links to a real investigation page and evidence | Yes |
| B3 | C, R, I | No overview of what NASA has and has not tested (07 §6) | Evidence-gap map: fuel class × O₂ band × pressure band (× gravity regime) grid with test counts; empty cells highlighted; click-through to runs | The project's signature insight and the demo's closing image | Medium / 4 h | B1 improves it | Counts equal independent recount from the bundle (e.g. 17 FLEX tests in the 30–34% / ~540 mmHg cell) | Yes if B1 is trimmed |
| B4 | R, C | 123 CO₂ and 50 He dilution tests unused for a suppression view (07 §6) | FLEX suppressant chart: outcome and extinction diameter vs diluent fraction per fuel, built by the existing chart tool with a categorical outcome series | Suppression shown with data, matching the challenge text on FLEX | Low–medium / 2–3 h | A8 | Point counts match raw (CO₂>0: 123; He>0: 50) | Yes |
| B5 | P, V | Result tables show JSON, long floats, `mm**2/s`, internal IDs (05 T8–T10) | Formatting pass (see report 11 §C) | Removes the most visible roughness in screenshots and video | Low / 2–3 h | — | Screenshot review of compare, envelope, dataset pages | Yes |
| B6 | V, R | Envelope headline not fuel-aware; solids absent; distance unexplained; mixed units (04 S2-1…3, 06) | Per-fuel-class coverage sentence; O₂-only strip for tables without pressure; replace distance with ΔO₂ and ΔP; single unit selector | The flagship tool says something precise and defensible | Medium / 3 h | — | Lunar preset reads "Liquid droplets: 0 tests in band, 17 within +0.4 psi; solids: 0 tests ≥30% O₂" | Yes |
| B7 | R, V | No model-ready export or data card (03) | One download: tidy CSV per fuel class with SI and display units, quality flags, source hashes, plus a README data card (definitions, exclusions, known anomalies, licence, DOIs) | Concrete answer to Objective 2 | Low / 2 h | — | File opens in pandas; row counts match the bundle | Yes |
| B8 | I, P | Home page hides corpus scope (06 §1) | Overview strip: counts of investigations, documents, numeric datasets and media by fire-safety area, linking to B2 | Judges grasp scope in seconds | Low / 1.5 h | A7 | — | Yes |

## P2 — Valuable

| ID | Criteria | Problem | Proposed solution | Effort (est.) | Before deadline? |
| --- | --- | --- | --- | --- | --- |
| C1 | V | Availability bonus distorts relevance (05 T3) | Remove from score; show as badge; re-run benchmark | 1 h | Yes |
| C2 | V | SI prose numbers unchecked (04 S2-6) | Match numbers in cited sentences against evidence previews; surface an "unmatched numbers" count | 3 h | Maybe |
| C3 | V | Missing plausibility flags (04 S2-4) | Rules for final O₂ > initial, composition sum, D_ext > D₀; show as warnings, never alter values | 1.5 h | Yes |
| C4 | V | d²-law on unsupported table returns empty ok chart (04 S2-5) | Validate non-empty complete rows; 422 otherwise; dynamic title | 0.5 h | Yes |
| C5 | C, R | Objective 2 lacks a model (04 §4) | Bounded interpolation of K for FLEX per fuel with leave-one-out error, shown only inside the tested envelope, labeled exploratory and SI-assisted | 4–5 h | Only if B-items are done; otherwise mention as future work |
| C6 | R | Hardware relationships not shown | Group investigations by facility (CIR/ACME, CIR/MDCA, MSG, Cygnus) on the investigations page | 1.5 h | Maybe |
| C7 | P | Wrong labels (05 T9) | Use `retrieval_mode` from `/api/meta`; distinct banner text for SI recordings | 0.5 h | Yes |
| C8 | V | Recall@5 0.61 vs 0.85 target | After A6/A7/C1 re-run benchmark; add acronym/alias boosts (e.g. "Saffire", "CFI-G") | 2 h | Maybe |
| C9 | V | Security hygiene | Delete `.env.txt`; rotate key if shared; rate-limit search endpoints | 0.5 h | Yes |

## P3 — Optional

| ID | Item | Note |
| --- | --- | --- |
| D1 | Saffire telemetry time series (radiometers, smoke detectors) | High scientific value for detection, but parsing ~11k-row telemetry with channel semantics is a day's work. Not before the deadline |
| D2 | Earth-application section from the three NASA spinoff resources | One static cited panel; do only if time remains |
| D3 | Light theme, accessibility audit, bundle size | Post-submission |
| D4 | Hermetic tests with a small fixture corpus | Post-submission |
| D5 | Synthesized investigation summaries with review status | Useful for "summarizes"; risk of unreviewed SI text. Post-submission unless a human reviews each |

## Items I recommend against

- A fire-risk score or lunar flammability predictor. The data cannot support it and it would cost the project its main credibility.
- Conceptual SI illustrations. They add watermark and branding compliance work for no scientific value.
- Further work on the hosted Analysis Lab, schema contracts or the replay recorder. They already work.

## Three plans

**Plan A — Essential corrections** (A1–A8). About 16–20 h estimated, of which 4–5 h is human demo/page work. Outcome: an eligible, safe, scientifically clean submission. Expected effect: Presentation from 2 to about 3–4; Validity a firmer 4.

**Plan B — Maximum judging improvement** (Plan A + B1 trimmed to four tables, B2, B5, B6, B7, B8, C1, C3, C4, C7, C9). About 16–18 h more. Outcome: Relevance toward 4, Impact toward 4, a cleaner Validity story.

**Plan C — Competitive differentiation** (Plan B + B3 evidence-gap map, B4 suppressant view; C5 only if everything else is finished). About 6–7 h more (10–12 h with C5). Outcome: a memorable, defensible insight; Creativity toward 4; strongest case for Best Use of Science and Best Use of Data.

## Recommended sequence

With two days and, realistically, one implementer plus the team:

1. **Now:** A1 (commit and push). 30 minutes that removes the worst risk.
2. **Day 1 morning:** A6, A7, A8, C1, C4, C7, C9 — the correctness fixes, all small. Then B5 formatting.
3. **Day 1 afternoon:** A3, A4, then A2 deployment. Get a public URL working early, even if imperfect.
4. **Day 1 evening:** B1 (Saffire-I/II/III, SAME-R, CFI-G, BASS) and B6.
5. **Day 2 morning:** B3 evidence-gap map, then B2 or B4 (pick B4 if short; it is smaller and data-backed), B7, B8.
6. **Day 2 midday — feature freeze.** Redeploy, re-record the lunar session on the deployed build, re-run tests.
7. **Day 2 afternoon:** A5 — video, project page, disclosure, links checked from a clean browser. Submit with hours to spare, not minutes.

If time collapses, the order of sacrifice is: C5, B2, B4, B3, B1. Never sacrifice A1–A5.
