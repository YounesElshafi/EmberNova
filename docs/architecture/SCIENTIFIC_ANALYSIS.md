# Scientific analysis specification

Canonical for: unit handling, normalization, quality checks, comparison validity rules, the Applicability Envelope, the d²-law check, and the predictive-modeling decision. Background: [SCIENCE_NOTES.md](../research/SCIENCE_NOTES.md). Rationale: [ADR-008](../decisions/ADR-008-predictive-modeling.md).

## 1. Libraries

- **pandas** handles tabular transforms.
- **DuckDB** queries the bundle in-process: `duckdb.connect()` plus `read_parquet` views, read-only.
- **pint** handles units, through one module-level `UnitRegistry` in `embernova.science.units`. Required definitions:
  - `mmHg = 133.322387415 Pa`, `psi`, `atm`, `bar`, `torr`
  - percent as `0.01` (for O₂ %vol)
  - `ppm = 1e-6` (mole basis)
  - `sccm`: convert to mass flow only with a gas-specific density, and only where the source gives mg/s. Otherwise keep it as-is.
- **numpy** for the statistics. **scipy** is used only in the P2 model.

## 2. Normalization rules

1. Every value keeps `value_raw` (string as in the source) and `unit_raw`.
2. `value_si` is computed only when the unit is **declared in curation** or **parsed from the cell**. Otherwise it stays null with `missing_unit`.
3. Percent O₂ (BASS-II "% by vol", Saffire "Percent O2") → mole fraction ÷ 100, with `qualifier` preserved.
4. Pressure is stored in Pa. Display it in kPa and psi, and also in mmHg or atm when the source used them.
5. `o2_partial_pressure` is **derived only** (`value_kind=derived`, `derivation` recorded). Never take it from a source unless the source states it.
6. Ranges go to `value_min_si`/`value_max_si`, with `value_si` set to the midpoint **only for plotting**. A plotted midpoint gets error bars spanning the range.
7. Lists ("0.17; 0.21; 0.25; 0.3") go to `value_list_si`, and `value_si` stays null. Design tables explode into "design points" only for the envelope, flagged `design`.

## 3. Quality checks (build time, step 7)

| Check | Rule | Severity |
| --- | --- | --- |
| `plausible_range` | Per-variable bounds in `vocab.yaml`: X ∈ [0,1]; P ∈ [1e3, 1e6] Pa; diameters ∈ [1e-5, 1e-1] m; K ∈ [1e-9, 1e-5] m²/s; flow ∈ [0, 5] m/s | error → excluded from analyses by default |
| `mole_fraction_sum` | Σ(O₂, N₂, CO₂, He) ∈ [0.97, 1.03] where all are present | warn |
| `d2_law` | r = (D₀² − D_ext²)/(K·t_b) ∉ [0.6, 1.4] | warn: "inconsistent with d²-law; may be physical (disruption, extrapolated D_ext)" |
| `encoding` | Replacement characters or mojibake | warn |
| `duplicate_row` | Identical rows within a table (e.g. SPICE) | info; keep the first and mark the rest |
| `design_vs_measured` | A table marked design | info |

The findings are visible in the Dataset Explorer and are exposed through `list_datasets` and `query_measurements`.

## 4. Comparison validity rules (`compare_runs`)

The verdict is the worst status across these rules: any `fail` → `not_comparable`; any `warn` → `comparable_with_caveats`.

| Rule ID | Check | pass | warn | fail |
| --- | --- | --- | --- | --- |
| `same_quantity_definition` | Quantity canonical names identical, and the definition notes match | identical | related definitions (K vs K_hot) with a mapping note | different quantities |
| `same_units_convertible` | pint-compatible | yes | — | no |
| `value_kind_match` | measured vs measured | same | measured vs reported_in_publication | design vs measured |
| `gravity_regime` | Same regime | same | µg vs simulated partial g | µg vs 1 g ground for flame metrics *(warn if the user explicitly wants a g-effect comparison)* |
| `hardware_family` | Same hardware | same | different, same platform | different platform and hardware |
| `fuel_or_material` | Same canonical fuel or material | same | same class | different class |
| `n_differing_conditions` | Count of condition variables whose group medians differ by more than tolerance (X ±0.01, P ±3%, D₀ ±10%, flow ±10%) | 1 → isolates that variable | ≥ 2 → **"confounded: X and Y both differ; differences cannot be attributed to either alone"** | — |
| `sample_size` | n per group | ≥ 3 | 1–2 | 0 |
| `qualifier_quality` | Share of approx, range or flagged values | < 20% | ≥ 20% | — |

The comparison artifact always states: **"Observed differences are associations between test groups, not causal effects, unless exactly one controlled variable differs."**

## 5. Applicability Envelope

- **Inputs:** a scenario of X_O₂ range, P range, optional flow, gravity, fuel classes. Presets come from the challenge page:
  - `earth_sea_level` {X_O₂ 0.209, 14.7 psi}
  - `spacesuit` {1.0, 4.3 psi}
  - `lunar_habitat_challenge` {X_O₂ ≥ 0.30 shown as 0.30–0.36, P ≤ 10.2 psi shown as 8.0–10.2 psi; label "challenge reference: ≥30% O₂, ≤10.2 psi"}
  - `iss_cabin` {≈0.21, 14.7 psi}
- **Data:** every run with both `o2_mole_fraction` and `total_pressure`, measured or design (design shown hollow). CFI-G inverse flames use **burner-side O₂**, labeled differently because it's not ambient O₂. Runs with only one of the two variables appear in 1-D coverage strips.
- **Coverage per investigation:**
  - `inside`: at least one run with all specified scenario variables within range.
  - `partial`: some variables covered, but not jointly.
  - `outside`: neither.
- **Gaps:** the scenario axes with no runs, listed per fuel class.
- **Gravity:** if the scenario gravity is not microgravity, coverage is `outside` for gravity, always, with the note "PSI contains no partial-gravity combustion data; see supplemental simulated reduced-gravity reports (LUCI, KC-135, GRC) — not run-level data."
- **No outcome prediction is computed.** Nearest runs' measured outcomes may be listed as evidence.

## 6. Predictive modeling decision

**Decision:** there is **no general flammability or fire-risk prediction model**.

**Justification:**
- The structured outcome data are heterogeneous: droplets, gas jets, burners and solids.
- Solid-material flammability outcomes (spread rates, limits) are mostly in publications, not tables.
- Sample counts per configuration are small, and partial-gravity data is absent.
- Any cross-investigation model would mix incompatible definitions.

**What we ship instead:**
- **P0:** the Applicability Envelope (§5), the d²-law check (§7) and grouped descriptive statistics.
- **P2 (gated): an "Empirical droplet-burning model".**
  - **Task:** regression of `burning_rate_constant` K [mm²/s], and separately `extinction_diameter` [mm], for FLEX tests.
  - **Inputs:** fuel (one-hot), X_O₂, X_CO₂, X_He, log P, D₀.
  - **Data:** FLEX runs with `test_end ∈ {extinction, completion}` and non-null targets, about 200 for K. CFI runs are evaluated **only as an external test** because their fuels differ, and are reported separately.
  - **Leakage control:** grouped K-fold (k = 5) with groups = condition group (fuel × rounded X_O₂ × X_CO₂ × X_He × P bucket), so no condition group appears in both train and test.
  - **Baselines:** (a) per-fuel median; (b) per-fuel linear model on X_O₂ only.
  - **Candidates:** ridge regression on the inputs, and a Gaussian process (RBF + white noise) per fuel.
  - **Metrics:** RMSE and MAE in mm²/s; 90% interval coverage (GP).
  - **Ship gate:** the candidate beats baseline (b) RMSE by ≥ 15% on grouped CV **and** GP 90% interval coverage is between 0.8 and 0.97. Otherwise it is not shipped, and that decision is recorded in PROGRESS_LOG.
  - **Serving:** inputs must lie inside the training convex hull per fuel (Mahalanobis distance ≤ the 95th percentile of training distances). Outside the hull, refuse with `out_of_envelope`. Output is a prediction ± 90% interval, labeled "Empirical within-envelope estimate for FLEX-like droplet combustion in microgravity; not applicable to solids or partial gravity."
  - **Limitations,** always shown: droplet only, ISS µg only, MDCA geometry, fiber-supported vs free droplets differ, and the extinction definition is "visible flame".

## 7. d²-law check

For each run with D₀, D_ext, K and t_b:

r = (D₀² − D_ext²)/(K · t_b)

The output is the distribution of r, the scatter of (D₀²−D_ext²)/K vs t_b with a 1:1 line, and the flagged runs listed with their `outcome` and the TP note page where available.

Interpretation copy (fixed text): "Values near 1 indicate internal consistency of reported diameters, burning-rate constant and burn time under the quasi-steady d²-law. Deviations can arise from ignition transients, disruption, droplet drift or extrapolated extinction diameters reported in NASA/TP-2015-216046; they do not by themselves indicate data errors."

Golden expectation from the corpus audit: FLEX median r ≈ 0.95 over ~188 complete rows. The test asserts 0.85–1.05.
