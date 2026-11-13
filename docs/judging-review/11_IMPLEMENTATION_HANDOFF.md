# 11 — Implementation handoff

For the engineering agent (Codex) and the team. This is a specification of changes, not an implementation. Priorities, effort and order are in [09_IMPROVEMENT_MASTER_PLAN.md](09_IMPROVEMENT_MASTER_PLAN.md); evidence is in reports 04–06.

Ground rules that still apply: never modify `data/`; every new number needs a source locator; unit conversion only through `embernova.science.units`; a test with every change; no new frameworks. Several items below change documented behavior (ranking formula, envelope output, session listing). Under AGENTS.md §6 those need the architect's doc/ADR update; treat this file as the approved proposal and note each deviation in `docs/implementation/PROGRESS_LOG.md`.

Line numbers refer to the working tree on 2026-11-13.

---

## A. Correctness fixes (do first)

### A6. Relevance floor and scope notice — `backend/src/embernova/retrieval.py`, `backend/src/embernova/dense.py`

- `dense_ranks` must return similarity scores with IDs, not IDs only. Drop dense candidates below a floor. Choose the floor empirically: compute top-1 cosine for the 30 benchmark questions and for 10 nonsense strings, and set it between the two distributions; put it in config (`RETRIEVAL_DENSE_MIN_SIM`).
- In `search_investigations`: if there is no lexical profile hit, no lexical passage hit, and no dense candidate above the floor, return `{"results": [], "no_match": true}`.
- Replace the min-max normalization at lines 189-192. Report the fused score on a fixed scale (e.g. divide by the maximum attainable RRF sum) so that the top result is not always 1.00.
- Scope: if the query contains propulsion terms (rocket, propellant, engine, thruster, launch vehicle) add `notes: ["Rocket and propellant combustion is outside the PSI fire-safety scope of this challenge."]` and show it above the results.
- Front end (`frontend/src/pages/Explorers.tsx`): render the empty state and the note.
- Tests: nonsense query → empty; "rocket engine propellant combustion" → note present; benchmark recall@5 and MRR not lower than `build/eval/retrieval.json` (dev 0.607 / 0.757).

### A7. Curated objective tags — new `curation/investigation_tags.yaml`

- One entry per investigation ID: `fire_safety_objectives: [prevention|detection|suppression|fundamental]`, `fuel_classes`, `facility` (CIR-ACME, CIR-MDCA, MSG, Cygnus, ground, planned), each with `evidence: {field: objectives|approach, quote: "<≤20 words from NASA metadata>"}`. Human-reviewed; do not let the model fill it unreviewed.
- Minimum expected content: SAME, SAME-R, PSI-115, DAFT → detection; Saffire I–VI → prevention and detection; BASS, BASS-II, SoFIE, FM2, LUCI, partial-g reports → prevention; FLEX, FLEX-2 → suppression; CFI, CFI-G, ACME set, SPICE, SLICE → fundamental (BRE also prevention, per the challenge text).
- Load during catalog ingest into the investigation record. Replace the substring logic at `retrieval.py:185-187` and `main.py:226-232` with tag membership.
- Test: `objectives=["detection"]` with query "smoke detection" → SAME and SAME-R in the top two; BASS-II absent or below them.

### C1. Availability is a badge, not relevance — `retrieval.py:188, 216-218`

- Remove `availability` from the score (set `RETRIEVAL_AVAILABILITY_WEIGHT=0` by default and renormalize text/facet weights). Keep `datasets` in the result for a "numeric data available" badge. Optional tie-break only.
- Test: "highest oxygen concentration microgravity tests" should surface CFI-G (PSI-159) in the top five once B1 curates its table; record the before/after.

### A8. Comparison validity — `backend/src/embernova/science/analyses.py`

- Lines 56-64: compute sample size per quantity from non-null counts. Status: any quantity n = 0 → fail; n < 3 → warn; else pass. Detail string lists n per quantity per group.
- Extinction diameter: before statistics, for tables that have `outcome_raw`, set aside rows where `extinction_diameter == 0` and outcome is not "Extinction". Report them as `no_extinction_observed` counts in each group summary; exclude from D_ext median/quartiles. Add `outcome_counts` (Extinction / Disruption / Completion) to each group.
- Do not change stored values in the bundle.
- Test (FLEX n-heptane, group A O₂ 0.205–0.215 & 740–780 mmHg, group B O₂ 0.30–0.34 & 520–560 mmHg): group B D_ext n is not reported as a 0.0 mm median; sample-size check is `warn`.

### C4. d²-law guard — `analyses.py:306-376`

- After `dropna`, if no rows remain raise `ValueError("This dataset has no complete droplet diameter, burning-rate and burn-time rows")` → 422.
- Build the title from the dataset title instead of the hard-coded "FLEX d²-law consistency".
- Test: `POST /api/checks/d2law {"table_id":"PSI-25:bass2"}` → 422.

### C3. Plausibility warnings — `backend/src/embernova/ingest/tables.py` and mapping files

- Add optional row-level rules to mapping YAML, evaluated after column parsing, producing `quality_flags` with severity `warn` (not in the exclusion list in `science/bundle.py:99`):
  - `composition_sum`: |ΣX − 1| > 0.015 over the listed mole-fraction columns (FLEX tests 69, 75, 76, 79, 80, 81 should flag).
  - `final_exceeds_initial`: `o2_final > o2_mole_fraction + 0.01` (BASS-II P22b, T28b).
  - `extinction_exceeds_initial`: `extinction_diameter > droplet_initial_diameter` (FLEX test 129).
- Show flags in the dataset explorer; never alter or drop the values.

### C7. Labels — front end

- `frontend/src/pages/Explorers.tsx:114`: caption from `/api/meta.retrieval_mode` ("hybrid lexical + semantic" vs "lexical only").
- Replay banner (`frontend/src/pages/Workspace.tsx`): use replay `origin`; for `recorded_live` say "Recorded SI session from <date> (<model>). Replayed without a live request."

---

## B. Deployment safety

### A3. Budget — `backend/src/embernova/agent/loop.py:460-467`, `agent/budget.py`, `main.py:551-556`

- In `finally`, always settle: `budget.settle(turn_id, max(cost, 0.01))` for failed turns instead of keeping the full reservation. Keep the conservative reservation only while the turn is running.
- Client address: add config `TRUSTED_PROXY: bool`; when true take the first address from `X-Forwarded-For`, else `request.client.host`.
- When reserve fails with the daily budget, return 429 with a body the UI turns into "Live research is paused for today — open a recorded session" with a link to `/featured`.
- Set `DAILY_BUDGET_USD` for the judging period deliberately (observed cost about $0.05 per turn; decide how many turns per day the team will fund) and set a provider-side spending limit as the real backstop.
- Test: ten simulated failed turns do not block an eleventh.

### A4. Session privacy — `main.py:484-498`, `frontend/src/App.tsx`

- Remove the global listing from public use: keep visited session IDs and titles in `localStorage` and render "Recent research" from that. Either delete `GET /api/sessions` or put it behind the admin token.
- Test: a second browser profile shows no sessions from the first.

### A2. Deployment (spec only; human provides host and keys)

- Ship: `frontend/dist`, backend package, `build/knowledge.db`, `build/bundle/`, `build/embeddings.*`, `build/media/`, `build/pdf/`, `build/replays/`, `curation/`, `docs/architecture/contracts/` (if read at runtime). Do not ship `data/**/raw`, `build/python`, `build/uv-cache`, `build/eval`, `build/state`.
- Process: `uvicorn embernova.main:app --host 0.0.0.0 --port 8000` behind an HTTPS reverse proxy with SSE buffering off; persistent writable `STATE_DIR`; `OPENAI_API_KEY` from the host's secret store; `ANALYSIS_LAB=false` in production unless the team accepts the per-turn container cost.
- Verify after deploy: `/api/health` ok; home page loads on mobile data; `/s/replay:live-lunar` plays; one live question completes; a media video streams with range requests; PDF citation opens the page.
- Delete the stray `.env.txt` in the repository root (human action; rotate the key if either env file was ever shared).

---

## C. Formatting pass — `frontend/src/artifacts/ArtifactView.tsx`, `toPlotly.ts`, `pages/Explorers.tsx`

- Numbers: 3 significant figures for statistics and condition values; integers stay integers. No value with more than 6 characters of digits on screen.
- Group summaries: one row per group × quantity with columns n, median, Q1–Q3, min–max, unit. No JSON strings in cells.
- Condition differences: one column per group; "differs" as a badge (Yes / No), not `true/false`; null as "unknown".
- Units: a display map — `mm**2/s` → mm²/s; `dimensionless` → "mole fraction" for `*_mole_fraction`, blank otherwise; `percent` → %; `degC` → °C.
- Names: wherever `investigation_id` is shown (legends, envelope cards, dataset tabs), use the acronym with the ID as secondary text ("FLEX · PSI-69"). Dataset tabs use dataset titles.
- Dataset explorer: show only columns that have at least one non-null value in the selected table.
- Run identifiers in tables: show the NASA test label with the dataset name ("FLEX test 37"), keeping `run_uid` for the link.

---

## D. Coverage and insight features

### B1. Curate existing experiment tables — `curation/tables/*.yaml`

Add mappings (same schema as the existing five; one golden test each against two or three raw rows). Suggested order, with the columns observed in the raw files:

| File (under `data/investigations/…/raw/datasets/`) | Table ID | Notes |
| --- | --- | --- |
| `PSI-100_Experimental table_SAFFIRE-3.csv` | `PSI-100:saffire3` | Material, thickness (cm), length, width, airflow (cm/s → `flow_velocity`), direction. 2 rows. `fuel_class: solid_fabric`, platform Cygnus, `gravity_regime: microgravity_cygnus` |
| `PSI-98_…SAFFIRE-1.csv`, `PSI-99_…SAFFIRE-2.csv` | `PSI-98:saffire1`, `PSI-99:saffire2` | Inspect headers first; same pattern expected |
| `PSI-101_Experimental table_SAME-R.csv` | `PSI-101:same_r` | Sample type, test #, inlet velocity (cm/s), Rt/R0 (dimensionless), duration and aging times (s). 109 rows. `fuel_class: aerosol_smoke_source`. Blank cells stay null |
| `PSI-159_…CFI-G_Inverse Flames.csv`, `…Normal Flames.csv` | `PSI-159:cfig_inverse`, `PSI-159:cfig_normal` | Inspect headers; capture O₂ fraction of the burner flow as a **separate variable** (e.g. `burner_o2_mole_fraction`), not `o2_mole_fraction` of the ambient — in inverse flames the oxidizer flows from the burner into a fuel/N₂ ambient. Getting this distinction right matters for the envelope |
| `PSI-26_Experimental table_BASS.csv` | `PSI-26:bass` | Date, test #, sample #, material. Run-field only; still useful for counts by material |
| `PSI-20_Experimental table_ACME BRE.csv` | `PSI-20:bre` | Inspect headers |

Rules: units only where the header or a cited document states them; otherwise `unit: null` and the value stays unnormalized (as done for CFI "HF Burn Time"). Record each interpretation in the mapping's `evidence` block. Add `fuel_class`, `platform`, `hardware`, `gravity_regime` defaults from NASA metadata.

Also extend `curation/vocab.yaml` use: BASS-II `sample_material` free text can be given a coarse `material_family` (PMMA, SIBAL, Nomex, other) via a `canonical_map`, keeping the raw string.

### B6. Envelope revisions — `analyses.py:175-303`, `frontend/src/pages/ResearchTools.tsx`

- Coverage by fuel class: return `coverage_by_fuel_class: [{fuel_class, n_runs_in_range, n_runs_with_known_conditions, investigations}]`. Headline text is generated from it, e.g. "Liquid droplets: 17 tests in range (FLEX). Solid materials: 0 tests with both O₂ and pressure known."
- Keep the top-level `coverage` value but rename the display of `inside_tested_envelope` to "atmosphere tested for: <fuel classes>".
- Runs without pressure: return an `o2_only` series (per investigation: O₂ values and count) and render it as a strip below the scatter, labeled "pressure not recorded per test".
- Replace `distance` with explicit offsets: `delta_o2_points` and `delta_pressure` (in the user's unit) from the nearest edge of the requested band (0 when inside). Rename `bracketing_runs` to `nearest_runs` in the payload and UI; keep the old key for recorded replays.
- Units: one selector (psi / mmHg / atm / kPa) used for inputs, chart axis and tables; O₂ entered and plotted in percent, converted at the API boundary.
- Tests: strict lunar preset → droplets 0 in range, nearest FLEX runs at +0.14 to +0.3 psi above 10.2 psi (534–543 mmHg vs 527.5 mmHg); loose preset → 17.

### B3. Evidence-gap map — new deterministic tool + page

- Backend: `science/analyses.py::coverage_grid(bundle, o2_edges, pressure_edges)` → for each fuel class and gravity regime, a matrix of measured-run counts by O₂ band (suggest 12–18, 18–22, 22–30, 30–36, 36–50, 50–100 %) and pressure band (≤8, 8–10.2, 10.2–12, 12–15.5, >15.5 psi, plus "pressure unknown"). Each cell carries run UIDs and evidence IDs. Design matrices excluded. Expose as `POST /api/coverage` and as an agent tool `map_evidence_coverage`.
- Front end: heat-map per fuel class; empty cells drawn distinctly and labeled "no NASA test in this local snapshot"; click → run list. Overlay the three habitat presets. Rows for gravity regimes with zero data ("lunar 1/6 g", "Mars 3/8 g") shown empty with a pointer to LUCI/FM2 supplemental entries.
- Copy must say "in this local PSI snapshot", not "NASA has never tested".
- Test: cell counts sum to measured runs; the 30–36 % × 10.2–12 psi droplet cell equals 17.

### B4. FLEX suppressant view

- Extend `make_spec`/`Chart` to accept a categorical `color_by: outcome_raw` (already a run field) and a filter on `co2_mole_fraction > 0` or `he_mole_fraction > 0`.
- Page section "Suppression: dilution with CO₂ and He" with two charts per fuel: extinction diameter vs diluent fraction (true extinctions only), and outcome counts by diluent band. Notes: O₂ fraction and pressure vary across these tests; associations only; visible-flame extinction may be followed by cool-flame burning (cite the FLEX report passage already used in the recorded session).
- Test: points with CO₂ > 0 = 123 source rows; He > 0 = 50; none with both.

### B2. Fire-safety systems page

- Route `/systems`. Three columns from the A7 tags. Each investigation card: acronym, one-line "what it measured" (from NASA `approach`, truncated, not rewritten by SI unless reviewed and badged), badges for numeric data / documents / media, top two passages from `search_documents` with a fixed query per column (stored evidence IDs, cited). Link to B4 from Suppression and to the envelope from Prevention.

### B7. Model-ready export

- `GET /api/export/model-ready?fuel_class=liquid_droplet` → zip with: `runs.csv` (one row per valid run; conditions and outcomes in SI columns with unit suffixes, e.g. `total_pressure_Pa`, `burning_rate_constant_m2_s`; `investigation`, `test_label`, `fuel`, `outcome`, `quality_flags`, `source_sha256`, `source_row`), `DATA_CARD.md` (column definitions, units, exclusions applied and counts, known anomalies from C3, what the data does not cover, DOIs, CC0 licence, SI-assistance statement), and `manifest.json` (bundle hash).
- Link it from the dataset explorer and the systems page as "Download for modeling".

### B8. Home overview strip — `frontend/src/pages/Workspace.tsx`

- From `/api/meta` and A7 tags: "34 investigations · 93 documents · N numeric datasets · 39 NASA media", then three chips Prevention / Detection / Suppression with investigation counts linking to `/systems`.

### C5 (only if all above are done). Bounded interpolation of K

- Deterministic backend fit per fuel on FLEX valid rows: K ~ O₂ fraction, ln(pressure), D₀, CO₂ fraction, He fraction. Report leave-one-out MAE and R² (my quick check: methanol R² 0.87, MAE 0.027 mm²/s; heptane R² 0.56, MAE 0.072 mm²/s — recompute, do not copy).
- Prediction endpoint refuses inputs outside the convex range of each predictor in the training rows and returns the nearest tested runs instead. Output labeled "exploratory interpolation of NASA droplet data; not a fire-safety prediction". No lunar or solid-material use.
- Needs an ADR update (ADR-008 currently rules predictive models out); the architect must sign off first.

---

## E. Verification checklist before submission

Run from a clean shell:

1. Backend tests, ruff, frontend tests, lint, typecheck, build — all pass. New tests exist for A6, A7, A8, C3, C4, B1 tables, B3, B6.
2. Golden numbers unchanged: FLEX n=274; K medians 0.46 (n=150) and 0.54 (n=107) mm²/s; 17 rows in 0.30–0.34 O₂ & 520–560 mmHg; 0 rows at ≤10.2 psi with O₂ ≥ 0.30; d² median ratio 0.951, 7 flagged.
3. Retrieval benchmark re-run; record new figures in `docs/implementation/CODEX_PROGRESS.md` whatever they are.
4. Probes: nonsense search → empty state; detection filter → SAME first; rocket query → scope note; d² on BASS-II → 422.
5. Re-record the featured sessions on the final build (older recordings contain `bracketing_runs` and old labels).
6. On the deployed URL: private window, mobile data, no login; replay, one live turn, a citation click, a video, the CSV export.
7. `git status`: no `.env*`, no `data/**/raw`, no `build/`.
8. Demo ≤ 30.0 s or ≤ 7 slides; English subtitles; no NASA logo; SI disclosure on the page; every link opens signed-out.

## Open questions for the team (not blockers for A-items)

- Which host and budget for the judging period (affects A2/A3)?
- Video or slides? The 2025 rules allowed either; confirm in the 2026 guide.
- Is a combustion-knowledgeable reviewer available to check the new mappings in B1, especially CFI-G burner vs ambient composition?
- Does the local event use a live pitch?
