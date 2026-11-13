# Dataset audit (verified)

**Audited:** Nov 13 2026, by Claude Code. The corpus root is `data/`, which is read-only.

**Method:**
- Read the GPT Work manifests, indexes and logs.
- Profiled representative CSVs directly with `python -I`.
- Computed physical consistency checks.
- Searched the extracted page text of NASA/TP-2015-216046.

Every figure below names its source. No binary payloads were bulk-read.

## 1. Corpus inventory

| Fact | Value | Source |
| --- | --- | --- |
| Investigations in scope | 34 (25 PSI, including PSI-179 as aerosol support; 9 supplemental) | `data/logs/VALIDATION.json`, `SOURCE_CATALOG.csv` (`source_type`) |
| PSI search total at snapshot | 133 investigations; all 23 Combustion Science records included | `data/README.md`, `logs/ACQUISITION_NOTES.txt` |
| Catalog rows | 138 (73 NTRS publications, 25 PSI, 18 references, 10 challenge resources, 9 supplemental, …) | `SOURCE_CATALOG.csv` |
| PSI file records / inventory | 62,832 files, 13.50 TB | `CORPUS_SUMMARY.md` |
| Verified local originals | 274 files, 849.8 MB (238 PSI, 27 NTRS, 9 NASA) | `logs/VALIDATION.json` |
| Deferred | 49,273 `deferred_scope`, 13,353 `deferred_size`, 10 `unavailable`, 1 `failed` | `logs/VALIDATION.json` |
| Local size by type | PDFs 220 MB, videos 314 MB, raw datasets 174 MB, archives 41 MB, processed 8 MB | `du`, measured Nov 13 |
| Text index | 93 documents, **3,187 page/part records, 5.14 M characters** (~1.3 M tokens); **433 parts near-empty** (<20 chars: scanned, image-only or blank) | `indexes/DOCUMENT_TEXT.jsonl` plus derived JSON, measured |
| Tabular profiles | 91 files, profiled with header units and type counts | `indexes/TABULAR_PROFILES.jsonl` |
| Media | 39 local items (21 video, of which 3 `.ts`; 18 image), plus 240 image members in local ZIPs | `indexes/LOCAL_MEDIA.jsonl`, `CORPUS_SUMMARY.md` |
| Relationships | 377 edges: 286 `psi_lists_publication`, 36 `ntrs_topic_search_match`, 33 `ntrs_publication_about`, 21 `psi_related_investigation` | `indexes/SOURCE_RELATIONSHIPS.csv` |
| Licenses | PSI investigations are CC0-1.0, per their metadata | e.g. `investigations/PSI-25_BASS_II/metadata.json` |
| Processing limitations logged | 0. The empty-page count above shows the log is incomplete | `indexes/PROCESSING_LIMITATIONS.jsonl` |

**Partial gravity:** PSI holds **no** partial-gravity combustion data, as the challenge page also states. The supplemental LUCI (NTRS 20250010653), KC-135 (NTRS 20010059376), GRC-PARTIAL-G and FM2 documents report *simulated* or *planned* reduced-gravity work. They are document-only. **There is no run-level dataset.**

## 2. Usability tiers per investigation

The tiers drive build priority:
- **T1:** structured numeric data, analysis-ready after curation.
- **T2:** structured conditions, but outcomes only in documents.
- **T3:** document-only or metadata-only.

| ID | Investigation | Key local numeric files (rows) | Tier | Notes |
| --- | --- | --- | --- | --- |
| PSI-69 | FLEX | Experimental table (274) | **T1** | 90 condition groups. Methanol (157) and heptane (117). O₂ 0.12–0.34. P 526–2,320 mmHg (one row reads 0, which needs a flag). CO₂ ≤ 0.7. **He in 50 rows.** Measured D₀, D_ext, K, t_b. Test end: Extinction 186, Disruption 61, Completion 27. NASA/TP-2015-216046 is local |
| PSI-39 | CFI | Experimental table (87); `CFI_DataSummary_Spreadsheet_Jan2021.xlsx` (DATA sheet: D₀, D_ext hot, k_hot [mm²/s], k_cool, D_ext cool, P [atm]) | **T1** | n-dodecane and iso-dodecane blends, 0.75–3 atm, O₂ 0.17/0.21, He. Join on `Flex Number`. Pressure is a string ("1 atm ") and needs parsing |
| PSI-159 | CFI-G | Normal flames (179), Inverse flames (1,015) | **T1** | X_O₂ up to 0.85 (burner side), p in bar, Tad, Z_st, ignition, burn time, self-extinction vs flow-terminated |
| PSI-10 | ACME Flame Design | Normal (207), Inverse (120), MFC setpoints | **T1** | X_O₂, flows in mg/s, p in atm, Z_st, Tad. "RAMPED" sentinels |
| PSI-107 | SPICE | Experimental table (469), flame-length workbook | **T1** | Fuel, nozzle mm, fuel rate sccm and mg/s, air velocity cm/s. Rows duplicate per GMT and need dedup analysis |
| PSI-100 | Saffire-III | Telemetry workbooks (1 Hz; up to 330k rows/sheet), sensors, conditions (2 samples) | **T1** (time series) | **Cygnus smoke-detector obscuration and scatter**, radiometers, anemometers, cabin pressure and temperature |
| PSI-98 / 99 | Saffire-I / II | Conditions (4 / 15 rows), sensor data (32.6k rows/sample), image-merge workbooks | T1 (sensors) / T2 | Units are embedded in cells ("0.27 mm", "20 cm/s", "~ 21.5"). The PSI-99 header shows `?-g` (μ-g mojibake) |
| PSI-25 | BASS-II | Experimental table (129), test matrices (6 PI sheets), **fan calibration** (34) | **T2** | O₂/CO₂ in %vol and CO in ppm (initial/final). Flow is only "Fan display" / "Air display"; converting to cm/s needs the calibration workbook plus documentation. Spread rates are in publications |
| PSI-26 | BASS | Experimental table (122: IDs, material); as-run matrix (5 sheets) | T2 | As-run matrix headers are multi-row and need curated parsing |
| PSI-101 | SAME-R | Experimental table (109): inlet velocity cm/s, Rt/R0, durations; analyzed workbooks | T1 (conditions) / T2 | Aerosol bins are in workbooks with complex sheets. Defer beyond the conditions table |
| PSI-102 | SAME | Experimental table (8), test logs (6) | T2 | Some rows say "same conditions as 1-4", which needs explicit expansion with a qualifier |
| PSI-68 | FLEX-2 | Design-condition table (8), radiometer readings (125) | T2 | **Design ranges, not as-run values.** Label them `qualifier=design` |
| PSI-117 | Cool-flame CFD | D_ext vs P (6), K_avg (19), D_ext (9) | T1 (small) | Mixed experiment and model columns. Label `value_kind` |
| PSI-142 | Counterflow cool flame | Data summary (8) plus workbook (9 sheets) | T2 | Workbook headers are blank in the profile, so manual mapping is needed |
| PSI-20/21/22/23 | ACME BRE / CLD / E-FIELD / s-Flame | Day-level summary tables (18–32) | T2 | Day-level summaries (fuel %, O₂ list, flames ignited), not run-level |
| PSI-106 | SLICE | Test-date table (12), small CSVs | T3 | |
| PSI-47 | DAFT / DAFT-2 | Table (2), workbook | T3 | Dust aerosol, linked to SAME instruments |
| PSI-179 | ASE | Image-analysis summaries | T3 | Aerosol support only |
| PSI-115 | SAME modeling | DAT simulation grids (230k values) | T3 | Modeled data. Interpreting the arrays needs the investigator doc |
| PSI-60, PSI-62 | SPICE / BASS analysis | Metadata only | T3 | |
| SAFFIRE-IV/V/VI, SOFIE-GEL/MIST, LUCI, FM2, KC135-PARTIAL-G, GRC-PARTIAL-G | Supplemental | Reports and outreach media only | T3 | Not PSI, so they are labeled "supplemental". No run-level data |

## 3. Verified data facts and corrections

| # | Finding | Evidence | Required handling |
| --- | --- | --- | --- |
| D1 | FLEX "Burning rate; mm" is the **burning-rate constant K in mm²/s**. The CSV dropped the superscript | NASA/TP-2015-216046 tables pp. 26–34 (PDF page numbers) list "Burning rate, mm2/s". Independently, (D₀²−D_ext²)/(K·t_b) has median **0.95** over 188 complete rows | Curated mapping: `burning_rate_constant`, unit `mm**2/s`, evidence = TP page plus check |
| D2 | FLEX "O/N/CO/He initial ambient composition" means **O₂/N₂/CO₂/He mole fractions** | TP tables pp. 26–34 header "O2 N2 C[O2] He". The TP text discusses CO₂ dilution (p. 19) | Curated mapping with evidence |
| D3 | FLEX pressure is in **mmHg**. The minimum plausible value is ~526 mmHg, and **one row reads 0** | CSV header; measured | Flag `implausible_value`, exclude from analyses by default |
| D4 | FLEX d²-ratio outliers range from −0.37 to 3.87 | Measured | Flag `d2_inconsistent` when the ratio is outside [0.6, 1.4]. Inconsistency may be physical (disruption, extrapolated D_ext per the TP per-test notes), so it is not automatically an error |
| D5 | Mojibake cells (`�`) in FLEX row 24 and PSI-99 headers (`?-g` = μg) | CSV, cp1252 | Parse `�` as null with flag `encoding_artifact`. Map headers via curation |
| D6 | Mixed units and approximations inside cells (Saffire "0.27 mm", "~ 21.5", ranges "21.5 - 21.7") | CSV | Cell parser yields `value`, `unit`, `qualifier ∈ {exact, approx, range, design}` |
| D7 | FLEX-2 table is a **design matrix** (ranges, semicolon lists) | CSV and DATA_DICTIONARY | Store as `conditions` with `qualifier=design`. Never treat it as measured |
| D8 | BASS-II flow is a fan setting, not a velocity | CSV; `Reference Data_Fan calibration data.xlsx` exists | Keep the raw setting. Derive velocity only if the calibration mapping is documented; otherwise null |
| D9 | Workbook first-row headers are provisional; some are multi-row | `TABULAR_PROFILES.jsonl` | Curated per-sheet header row index and column map |
| D10 | No media is linked to a run, but filenames often embed run IDs | `LOCAL_MEDIA.jsonl` | Regex rules (`curation/media_rules.yaml`) produce `association=inferred_from_filename` |
| D11 | Some NASA outreach captions conflict with filenames (Saffire-IV vs VI) | `MEDIA_CAPTIONS.json` | Show both, labeled "representative" and "attribution unverified" |
| D12 | 433 near-empty pages are not reflected in the processing-limitations log | Measured | `pages.is_empty` flag. OCR is P2 |
| D13 | `data/` is untracked and was not gitignored | `git status` | Raw payloads and large indexes are now gitignored (root `.gitignore`) |
| D14 | The FLEX `FLEX Identifier` is not unique: `193F001` appears twice. `FLEX Test #` is unique (1–274) | Measured | Run key = `FLEX Test #`, with the identifier kept as an alternate label |
| D15 | 17 FLEX runs at X_O₂ 0.30/0.34 and 520–560 mmHg (≈10.1–10.8 psi), with no diluent: methanol and heptane | Measured | Demo "exploration atmosphere" group; golden test |

## 4. Recommendations to the data-acquisition owner (GPT Work)

These are optional. EmberNova works with the current snapshot.

1. Record empty and scanned pages in `PROCESSING_LIMITATIONS.jsonl`.
2. If storage allows, fetch the **FLEX per-test comment files** for the demo tests. A few are already local (`C039H01_Comments.txt` and others). Also fetch any **FLEX video** for tests in the 0.34 O₂ / ~540 mmHg group (IDs 19xF/R…, e.g. `192F001`), so the demo can show an exploration-atmosphere flame. Use `tools/download.py --file-id <id>` with the manifest IDs.
3. Fetch the **BASS-II publications' flame-spread tables**, if PSI lists them as data files. They would raise BASS-II from T2 to T1.
4. Do not re-download. Use the deferred list.
