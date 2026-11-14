# Data dictionary

## Manifests and identifiers

| Field | Meaning |
| --- | --- |
| `source_id` | PSI accession, NTRS citation ID with NTRS prefix, or corpus-local slug for an external investigation or resource. |
| `investigation_id` | Parent accession or slug on a file row. Some shared reference files use a reference source ID. |
| `related_investigation_ids` | Semicolon-separated secondary associations. Consult the relationship index for the type of evidence. |
| `file_id` | PSI file ID, locally scoped NTRS attachment ID, or an ID based on a parent file for a processed record. |
| `source_version` / `file_version` | PSI investigation release and PSI individual file revision. NTRS has no universal release number. |
| `source_url` | Public file route. The PSI route returns a temporary HTTPS object link. `source_record_url` identifies the stable record page. |
| `doi` | PSI investigation DOI for files inherited from that investigation. Consult the publication record for any separate publication DOI. |
| `source_key` | Exact PSI repository path. Local names preserve the original basename with adjustments for Windows path limits, reserved characters, or collisions. |
| `source_size_bytes` / `size_bytes` | Listed upstream bytes and verified local bytes, respectively. |
| `origin_status` | Original downloaded payload or locally processed derivative. |
| `download_status` | `verified` means the local file passed the checks in `verification`. `deferred_size` covers objects above local limits. `deferred_scope` covers unattempted lower-ranked items. `unavailable` includes confirmed upstream 404/410. `failed` means the last attempted transfer or validation failed. `access_restricted` applies when PSI requires authorization. `metadata_only` is an inventory row awaiting disposition. |
| `sha256` | Local content digest. A matching digest identifies exact bytes. An upstream checksum is recorded separately if listed. |
| `parent_file_id` | Original manifest file ID for a derivative. Use the original row for scientific provenance. |
| `downloaded_timestamp` | UTC time of verification after transfer for original rows. |
| `source_updated` | Source-provided file modification field, preserved as given. |
| `reported_dataset_bytes` / `inventoried_bytes` | PSI's own size total and the sum of distinct latest-release leaves. Upstream duplicate tree entries can cause a difference. |

## Verified source fields and units

| Investigation | Fields as observed | Interpretation |
| --- | --- | --- |
| BASS PSI-26 | `As Run Test #`, `Test #`, `Sample #`, `Fuel Sample Material`, `Date`, `GMT` | Keep both test IDs. The GMT field includes compact source values and needs investigation-specific interpretation. |
| BASS-II PSI-25 | `Test #`, `Sample #`, fuel material, initial/final O₂ and CO₂ in percent by volume, initial/final CO in ppm | Preserve the calibration qualifier for O₂. Fan and air display fields do not establish an airflow unit. |
| Saffire I PSI-98 | Sample and material, thickness/length/width in cm, airflow in cm/s, O₂ percent, ignition power in W, times in s, flow direction and camera labels | Oxygen may be a range. The camera columns are source labels. |
| Saffire II and III PSI-99/100 | Sample number, material, dimensions, airflow, direction and camera labels | Some cells carry their own units or approximate values. The PSI-99 header uses characters rendered as `?` in places. Preserve those labels and check the source document before interpretation. |
| SAME PSI-102 | Sample number and material, airflow in cm/s, weight loss rate in mg/min, aging duration in minutes | The experiment table gives conditions. Use supporting measurement workbooks and reports for aerosol diagnostics. |
| SAME-R PSI-101 | SAME test number, material/type, inlet velocity in cm/s, Rt/R0, duration and aging/mixing times in seconds | Keep the original test number and time definition. |
| FLEX PSI-69 | FLEX identifier and test number, pressure in mmHg, gas mole fractions, initial and extinction diameters in mm, burn time in s, test-end classification | Preserve source labels for gas columns and the stated unit for burning rate. Check the technical report before assigning a normalized dimension. |
| FLEX-2 PSI-68 | Fuel, initial diameter in mm, gas mixture, oxygen mole fraction, pressure in atm, temperature in C, velocity in cm/s | Entries include ranges and semicolon-delimited design values. Treat this table as experiment conditions. |
| LUCI, KC-135, Glenn tests | Gravity regime, method, and measurement definitions in the cited reports | Distinguish rotating suborbital flight, centrifuge tests, reduced-gravity aircraft, normal gravity, and modeled values. |

A measurement value can be observed, computed, or modeled. The corpus does not assign a global classification where the source gives insufficient context. Retain instrument, uncertainty, calibration, gravity level, atmosphere, pressure, ventilation, sample geometry, orientation, and extinction criterion when the source provides them. Preserve missing or ambiguous values.

## File preparation

- CSV/TSV profiles report encoding, delimiter, literal headers, row counts, per-column type counts, blank counts, possible missing-value markers, and recognized literal header units. The inferred type describes the source tokens. It leaves identifier strings and measurements unchanged.
- XLS and XLSX profiles use the first worksheet row provisionally and read cached cell values. Multirow headers, formulas, merged cells, and layout-sensitive units need source review. No recalculation or normalization was applied.
- PDF text stores one-based physical page numbers, PDF labels where provided, detected headings, and figure/table references. An empty page may be scanned, image-only, or blank. Figures, tables, and equation typography should be checked in the original.
- DOCX and PPTX text uses paragraph and slide-part locators. Legacy DOC, PPT, and RTF originals are retained where acquired. Open them in compatible desktop software.
- ZIP retains the original byte stream. The archive index lists member paths, sizes, and CRCs. Selected small PSI metadata files are copied into processed storage with their original member path recorded.
- PNG, JPEG, TIFF, and other recognized images have dimensions where acquired. Video profiles report container, video codec, frame dimensions, duration, and source frame-rate fields. Missing test association or caption remains null.
- DAT, TXT, ASC, MDIPSUG, PX(P), and other investigator-specific files may contain headered records, simulations, instrument streams, or auxiliary metadata. Use the experiment-specific documentation before parsing. The extension alone gives insufficient evidence of units or record structure.

Selected PSI-115 DAT profiles preserve raw numeric header records and count non-finite tokens such as `-Infinity`. A header containing integers does not establish grid orientation or units. Use the original investigator documentation before interpreting the arrays.
