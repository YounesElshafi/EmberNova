# 04 — Scientific audit

Method: I read the curation mappings and analysis code, then recomputed the key results directly from the original NASA CSV files with my own script (pandas only, no project code) and compared them with what the running application returned.

## 1. Reproduced results

Source: `data/investigations/PSI-69_FLEX/raw/datasets/PSI-69_Experimental table_FLEX.csv` (cp1252, 274 rows).

| Quantity | My recomputation from raw | Application output | Match |
| --- | --- | --- | --- |
| Row count; fuels | 274; methanol 157, heptane 117 | 274 | Yes |
| Median K, methanol (pressure-zero row excluded) | 0.46 mm²/s, n=150 | 0.46, n=150 | Yes |
| Median K, n-heptane | 0.54 mm²/s, n=107 | 0.54, n=107 | Yes |
| Tests with O₂ 0.30–0.34 and 520–560 mmHg | 17 (9 methanol, 8 heptane); 16 with K | 17 rows, 16-point chart | Yes |
| Tests with O₂ ≥ 0.30 and P ≤ 10.2 psi (527.5 mmHg) | 0 | 0 ("partial", no joint rows) | Yes |
| d²-law rows complete | 196 (195 without the P=0 row) | 195 | Yes |
| d²-law ratio median; quartiles | 0.951; 0.916–0.975 | 0.951; 0.916–0.975 | Yes |
| Tests flagged (ratio <0.6 or >1.4) | 7: tests 55, 120, 129, 130, 171, 213, 261 | same 7 | Yes |
| Test 20CAL10 (primary label 2) | K 0.60, D_ext 0.94 mm | 0.6 | Yes |
| O₂ partial pressure in the 17-row band | 160–185 mmHg (air at 1 atm: 160) | derived field present | Consistent |

The recorded SI answer's specific claims also check out against the raw rows: the 17 tests are 19–28 and 37–43; their outcomes are all "Completion" or "Disruption"; methanol test 20 has K 0.53, D_ext 1.56 mm, outcome "Completion".

**Conclusion:** the numeric pipeline for FLEX is correct. This is the project's strongest asset.

## 2. Unit and definition checks

| Item | Finding |
| --- | --- |
| FLEX "Burning rate; mm" | Mapped to K in mm²/s with flag `unit_inferred_from_source_doc`, raw header preserved. Correct per NASA/TP-2015-216046. My d² ratio of 0.95 independently confirms the unit: with any other unit the ratio would be off by orders of magnitude |
| FLEX "O/N/CO/He" columns | Mapped to O₂, N₂, CO₂, He mole fractions. Correct |
| FLEX pressure | mmHg with 133.322 Pa definition. Correct. Max 2319.9 mmHg ≈ 3.05 atm |
| CFI pressure cells ("1 atm", "0.75 atm ") | Parsed with embedded unit. Correct |
| BASS-II O₂ "% by vol" | Converted from percent. Correct |
| O₂ partial pressure | Derived as fraction × total pressure, stored as a separate `derived` variable. Correct and distinct |
| Approximate cells ("~6", "~9" s) | Kept with qualifier `approx`. Good |
| En dash cells ("–") | Treated as missing. Correct |

## 3. Scientific findings

Severity: S1 could mislead a user on a scientific point; S2 weakens rigor; S3 minor.

### S1-1. Extinction diameter of zero is pooled with real extinctions

- **Data:** FLEX has 8 rows with `Visible flame extinction diameter` = 0; their outcomes are Disruption (4) and Completion (4), i.e. no extinction was observed.
- **Behavior:** `compare()` in `backend/src/embernova/science/analyses.py:36-48` takes medians over all non-null values. Comparing n-heptane at air/1 atm against 0.30–0.34 O₂/~540 mmHg returned "extinction diameter median 0.0 mm (n=2)".
- **Why it matters:** a reader sees "extinction diameter fell to zero at higher oxygen". The honest statement is "no extinction observed in 2 tests; 6 have no value".
- **Fix:** treat D_ext = 0 with outcome ≠ Extinction as "no extinction observed" (a category), exclude from D_ext statistics, and report counts by outcome.

### S1-2. Sample-size check ignores missing values

- **Location:** `analyses.py:56-64` uses `len(rows)`, not the per-quantity non-null count.
- **Reproduction:** same comparison as above. Check shows "sample size: pass (19, 8)" while the extinction-diameter statistic rests on n=2.
- **Fix:** evaluate sample size per quantity; warn below 3, fail at 0.

### S2-1. Coverage verdict is not fuel-aware

- **Behavior:** `envelope()` returns `inside_tested_envelope` whenever any investigation has rows in range and gravity is microgravity (`analyses.py:236-243`). For "O₂ 30–36%, ≤10.5 psi, microgravity" the verdict is "inside tested envelope" on the strength of liquid droplets only.
- **Why it matters:** habitat flammability is mostly a solid-materials question. The per-investigation list shows which data matched, but the headline does not say "droplets only".
- **Fix:** report coverage per fuel class ("liquid droplets: 17 tests; solid materials: no tests with known pressure").

### S2-2. Solid-material data never appears on the habitat envelope

BASS-II has no pressure column, so it is dropped from the O₂–pressure chart (`dropna` at `analyses.py:244`). The chart therefore shows only PSI-39 and PSI-69. That is correct handling of an unknown, but the result is that the envelope — the flagship habitat tool — contains no materials-flammability data. BASS-II ran in the ISS Microgravity Science Glovebox with cabin-derived atmosphere; if a NASA document in the corpus states the working pressure, cite it and show BASS-II as "pressure from document, not per-test". Otherwise add an O₂-only strip so solids are at least visible.

### S2-3. "Nearest runs" distance is an undocumented, arbitrary metric

`analyses.py:274-293` computes distance to the **midpoint** of the requested range using fixed scales (0.05 in O₂ fraction, 0.1 in log₁₀ pressure). Consequences: runs inside the requested band show non-zero distance (0.40 in the recorded session); the result key is `bracketing_runs` but they are nearest, not bracketing; the UI shows "distance 0.61658" with no unit or explanation. Either document it on screen as a dimensionless ranking aid, or replace it with plain differences ("ΔO₂ = +0 pts, ΔP = +7 mmHg above the band").

### S2-4. Plausibility checks miss obvious anomalies

| Data | Anomaly | Flagged? |
| --- | --- | --- |
| BASS-II P22b, T28b | Final O₂ 39.1% and 40.4% with initial 20–20.7% | No |
| BASS-II B2, P22a, T28a | Final O₂ 1.6%, 0.6%, 0.9% | No |
| FLEX tests 69, 75, 76, 79, 80, 81 | Mole fractions sum to 0.98 | No |
| FLEX test 129 | D_ext 3.34 mm > D₀ 3.33 mm | Only via d² check |
| FLEX test 114 | Pressure 0 | Yes (`implausible_value`) |

These are source-data oddities, not project errors, and the project must not "correct" them. It should flag them. Add rules: final O₂ > initial + tolerance; composition sum outside 1 ± 0.015; D_ext > D₀.

### S2-5. d²-law check accepts tables it cannot analyze

`d2law()` tests for required columns on the wide frame, where every column exists for every table (`analyses.py:314`). Calling it on `PSI-25:bass2` returns HTTP 200, an empty chart titled "FLEX d²-law consistency" (title hard-coded at line 326), n=0. It should return a 422 explaining that the table has no droplet quantities. CFI's hot/cool-flame quantities are not supported either, though they would be the more interesting case.

### S2-6. SI prose numbers are not checked against evidence

`agent/citations.py` verifies that cited IDs exist and that "Measured/Published/Derived" labels match evidence kinds. It does not check that a number in a sentence appears in the cited rows; `ungrounded_numbers` is always `null`. In my two samples (recorded and live) every number was correct, so this is a risk, not an observed error. AGENTS.md rule 4 ("every displayed number traces to a source") is therefore enforced for charts and tables but not for prose. A cheap check: extract numbers from each cited sentence and confirm each appears (after rounding) in the cited evidence preview; show a count of unmatched numbers.

### S3-1. Evidence-strength labels are heuristic

"strong / moderate / limited coverage" is computed from the count of rows and distinct documents cited (`citations.py`), not from scientific strength. The label reads as a scientific judgment. Rename to "citation breadth" or explain it in a tooltip.

### S3-2. Pooled descriptive statistics

Fuel medians pool every atmosphere, pressure and droplet size. The app labels them descriptive and confounded, which is adequate.

## 4. Predictive-modeling feasibility (Objective 2)

The team's position is that no validated predictive model is justified. I tested how far the data goes. A plain linear fit of K on O₂ fraction, ln(pressure), initial diameter, CO₂ and He fractions, with leave-one-out validation:

| Fuel | n | LOO R² | LOO mean abs. error |
| --- | --- | --- | --- |
| Methanol | 150 | 0.87 | 0.027 mm²/s |
| n-Heptane | 107 | 0.56 | 0.072 mm²/s |

This is my own quick check, not a result to publish as is (no physical model form, no uncertainty treatment, heptane clearly needs more than a linear term). It does show that an **interpolative, clearly bounded** model of droplet burning rate inside the tested FLEX envelope is scientifically defensible, and would answer Objective 2 far more directly than "export a CSV". It must stay inside tested conditions, carry the envelope check, and never be presented as a habitat fire prediction.

## 5. Claims discipline

| Rule | Observed |
| --- | --- |
| Microgravity never presented as lunar/Martian | Held in every output I saw; gravity note always attached for non-microgravity scenarios |
| Partial-gravity sources labeled | LUCI, FM2, KC-135 and GRC reports are "Supplemental", `is_psi: false` |
| No risk scores or probabilities | None found |
| O₂ fraction vs total pressure vs partial pressure | Kept distinct throughout |
| FLEX-2 design not treated as measured | Excluded from envelope and charts |
| Droplets vs solids | Stated in SI answers and About; not in the envelope headline (S2-1) |
| SI labeling | SI badge on answers; `si_generated` metadata on artifacts; no generated images |

## 6. Not verified

- The CFI workbook mapping (hot/cool flame constants). Bundle values look plausible (k_hot median 0.25 mm²/s), but a minimum of 0.001 mm²/s deserves a look and I did not trace it to the sheet.
- Page-level accuracy of document citations beyond the samples shown.
- The claim that physical PDF pages 25–26 of NASA/TP-2015-216046 define the FLEX units. I confirmed the unit by the d² consistency argument instead.
