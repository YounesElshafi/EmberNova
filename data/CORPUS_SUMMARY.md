# Corpus summary

Snapshot November 13, 2026. See [validation results](logs/VALIDATION.json) and [acquisition notes](logs/ACQUISITION_NOTES.txt).

| Metric | Count |
| --- | ---: |
| Investigations discovered | 34 |
| PSI investigations in scope | 25 |
| Investigations with at least one verified original or associated report | 34 |
| Unique PSI file records | 62,832 |
| Total PSI inventory | 13,500,983,894,752 bytes (13.50 TB) |
| Verified downloaded originals | 274 |
| Verified original size | 849,758,989 bytes (849.8 MB) |
| Verified locally generated derivatives | 254 |
| Documents indexed for text | 93 |
| Tabular files profiled | 91 |
| Local images | 18 |
| Local videos | 21 |
| Image members in local archives | 240 |
| Identical local byte groups | 5 |
| Processing limitations logged | 0 |

## Original file disposition

| Status | Count |
| --- | ---: |
| deferred_scope | 49,273 |
| deferred_size | 13,353 |
| verified | 274 |
| unavailable | 10 |
| failed | 1 |

## Original file types

| Type | Count |
| --- | ---: |
| pdf | 83 |
| zip | 46 |
| csv | 40 |
| xlsx | 37 |
| mp4 | 18 |
| dat | 10 |
| docx | 9 |
| jpg | 9 |
| png | 6 |
| txt | 5 |
| xls | 4 |
| tif | 3 |
| ts | 3 |
| pptx | 1 |

## Investigation coverage

[Investigation coverage CSV](indexes/INVESTIGATION_COVERAGE.csv) shows local and listed categories per investigation, including image members in local archives.

Counts below use the primary association on the file row. Shared publications can also support the secondary investigation listed on the manifest.

| ID | Investigation | Primary originals |
| --- | --- | ---: |
| PSI-25 | Burning and Suppression of Solids - II | 22 |
| PSI-26 | Burning and Suppression of Solids | 16 |
| PSI-62 | Concurrent Flame Spread Modeling using Flamelet Generated Manifolds in Microgravity with Comparison to BASS Experiments using Two-Color Tomography | 1 |
| PSI-68 | Flame Extinguishment Experiment - 2 | 16 |
| PSI-69 | Flame Extinguishment Experiment | 16 |
| PSI-98 | Spacecraft Fire Safety Experiment-I | 11 |
| PSI-99 | Spacecraft Fire Experiment-II | 15 |
| PSI-100 | Spacecraft Fire Experiment-III | 15 |
| PSI-101 | Smoke Aerosol Measurement Experiment-Reflight | 20 |
| PSI-102 | Smoke and Aerosol Measurement Experiment | 12 |
| PSI-115 | Utilization of the Smoke Aerosol Measurement Experiment Data for Advanced Modeling and Simulation of Smoke Generation in Micro-Gravity | 12 |
| PSI-10 | Advanced Combustion via Microgravity Experiments / Flame Design | 10 |
| PSI-20 | Advanced Combustion via Microgravity Experiments - Burning Rate Emulator | 8 |
| PSI-21 | Advanced Combustion via Microgravity Experiments / Coflow Laminar Diffusion Flame | 9 |
| PSI-22 | Advanced Combustion via Microgravity Experiments Electric-Field Effects on Laminar Diffusion Flames | 9 |
| PSI-23 | Advanced Combustion via Microgravity Experiments-Structure and Response of Spherical Diffusion Flames | 9 |
| PSI-39 | Cool Flames Investigation | 7 |
| PSI-60 | Computational and Experimental Analysis of SPICE Data Sets | 1 |
| PSI-106 | Structure and Liftoff In Combustion Experiment | 8 |
| PSI-107 | Smoke Point In Co-flow Experiment | 7 |
| PSI-117 | Effect of External Thermo-Convective Perturbation on Cool Flame Dynamics: A Multidimensional Multi-Physics CFD Analysis | 5 |
| PSI-142 | Quantitative Studies of Cool Flame Transitions at Radiation / Stretch Extinction Using Counterflow Flames | 3 |
| PSI-159 | Advanced Combustion via Microgravity Experiments / Cool Flames Investigation with Gases | 8 |
| PSI-47 | Dust and Aerosol Measurement Feasibility Test / Dust and Aerosol Measurement Feasibility Test-2 | 5 |
| PSI-179 | Aerosol Sampling Experiment | 7 |
| SAFFIRE-IV | Spacecraft Fire Experiment IV | 4 |
| SAFFIRE-V | Spacecraft Fire Experiment V | 1 |
| SAFFIRE-VI | Spacecraft Fire Experiment VI | 5 |
| SOFIE-GEL | Solid Fuel Ignition and Extinction – Growth and Extinction Limit | 1 |
| SOFIE-MIST | Solid Fuel Ignition and Extinction – Material Ignition and Suppression Test | 0 |
| LUCI | Lunar-g Combustion Investigation | 2 |
| FM2 | Flammability of Materials on the Moon | 6 |
| KC135-PARTIAL-G | Upward Flame Spread Over Thin Solids in Partial Gravity | 1 |
| GRC-PARTIAL-G | Solid Fuel Ignition Testing for Lunar Applications | 1 |

## Numerical and visual material

- The BASS and BASS-II tables preserve source sample and test identifiers. BASS-II includes instrument gas measurements. BASS as-run and planned test matrices are indexed as separate originals where available.
- Saffire experiment tables preserve sample and camera identifiers. Locally acquired Saffire sensor and telemetry files contain experiment readings. Consult the original workbooks for worksheet conventions.
- SAME and SAME-R include experiment-condition tables and selected numerical workbooks. FLEX contains a test-level extinction table. FLEX-2 includes design conditions and radiometer readings where verified.
- ACME, CFI, DAFT/DAFT-2, SPICE, SLICE, and related investigation payloads can be located by their accession and verified file state.
- The media index identifies local experiment and representative images and clips. NASA editorial media can have an edited time scale or a caption/filename mismatch. The source caption and attribution remain part of provenance.
- NTRS publishes LUCI and KC-135 measured results from simulated partial gravity. A standalone LUCI run-data release and a lunar-surface FM² dataset were not located. The KC-135 study includes simulated Martian gravity. See [LUCI results](https://ntrs.nasa.gov/citations/20250010653) and [KC-135 results](https://ntrs.nasa.gov/citations/20010059376).

## Outstanding acquisition

- [Deferred downloads](indexes/DEFERRED_DOWNLOADS.csv) preserves the status, listed size, precise file identifier, and stable source route for each nonlocal file. Large raw video, image sequences, instrument streams, and archives account for much of the remaining volume.
- Some PSI legacy objects return HTTP 404 after resolving through the public site. Examples include the BASS final report, selected SAME XML files, and some Saffire I telemetry workbooks. The manifest records the individual affected files.
- The project drive cannot hold the full collection. This pass used storage reserves and a ranked per-investigation selection. NASA handles large selected ZIP requests through email. No email request was submitted. See [PSI download policy](https://science.nasa.gov/uncategorized/new-file-download-process-for-large-requestspsi-new-file-download-process/).
- Saffire IV–VI public reports and media are available. The Glenn payload operations site marks its data and console logs as authorized access. No public PSI accession for these three flights appeared in the search snapshot. See [Glenn Saffire payload operations](https://gipoc.grc.nasa.gov/wp/other-iss/saffire/).
- Raw source objects may appear more than once in a PSI file tree. Inventory de-duplicates matching investigation, file ID, revision, and key, with the original file-tree response retained. Some local files also share a checksum and are documented in the duplicate index.
- Format validation covers structure, readable representative samples, and SHA-256. It does not certify individual scientific measurements. Several workbooks need explicit header and unit mapping, and scanned PDF content needs OCR if required.
- Available project-drive space at summary generation was 2.84 GB.
