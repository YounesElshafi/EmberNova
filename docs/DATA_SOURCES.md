# Data sources and provenance

Snapshot date **2026-11-13**. Every original file is recorded with its upstream identifier, version and **SHA-256**. The application cites those hashes in its evidence records.

## What is in the corpus

| Source | Count | Origin |
| --- | --- | --- |
| PSI combustion investigations | 25 | [NASA Physical Sciences Informatics](https://psi.nasa.gov/), the public repository and investigation metadata |
| Supplemental investigations (Saffire IV–VI, SoFIE-GEL, SoFIE-MIST, LUCI, FM², simulated partial-gravity work) | 9 | NASA references and NTRS. **Labeled supplemental, not PSI data** |
| NTRS publications | 73 | [NASA Technical Reports Server](https://ntrs.nasa.gov/) |
| Other NASA references and challenge resources | 31 | Space Apps challenge page and NASA sites |
| Indexed documents in the app | 93 documents, 3,187 pages or extracted parts | Text extracted page by page with PyMuPDF |
| Original NASA media | 39 items | Investigation archives; browser derivatives are made by the build |

The full catalog, with a DOI, URL, retrieval date and license field per source, is [data/SOURCE_CATALOG.csv](../data/SOURCE_CATALOG.csv). Corpus statistics are in [data/CORPUS_SUMMARY.md](../data/CORPUS_SUMMARY.md), and field conventions in [data/DATA_DICTIONARY.md](../data/DATA_DICTIONARY.md).

## Curated numeric tables (Analysis Bundle)

There are 1,161 runs across 13 tables. Each table has a mapping file in `curation/tables/` that records column meanings, units and an evidence locator.

| Table | Content | Rows |
| --- | --- | --- |
| `PSI-69:flex_experimental` | FLEX droplet combustion results | 274 |
| `PSI-68:flex2_design` | FLEX-2 **design matrix, not measured runs** | 8 |
| `PSI-39:cfi` / `PSI-39:cfi_datasummary` | CFI droplet test conditions / hot and cool flame measurements | 87 / 79 |
| `PSI-159:cfig_normal` / `cfig_inverse` | CFI-G normal and inverse spherical flames | 179 / 154 |
| `PSI-26:bass` / `PSI-25:bass2` | BASS solid-sample test log / BASS-II material and gas conditions | 121 / 129 |
| `PSI-98:saffire1` / `PSI-99:saffire2` / `PSI-100:saffire3` | Saffire large-scale fabric burns | 2 / 9 / 2 |
| `PSI-102:same` / `PSI-101:same_r` | SAME / SAME-R smoke source and aging conditions | 8 / 109 |

CFI's 87 CSV records include 8 duplicate rows, so 79 distinct test identifiers are kept for analysis.

## Licensing and attribution

- **PSI investigation data:** the catalog records **CC0-1.0** for 24 of the 25 PSI investigations. Cite each investigation's DOI (for example FLEX PSI-69, `10.60555/…`, listed in the catalog).
- **NTRS reports and other NASA references:** the catalog records no license for these. They are NASA technical reports and pages, linked and cited by NTRS ID and page. Check each document's own notice before redistributing it.
- **NASA media:** shown with its source investigation and credit. EmberNova shows no NASA logos, flags or mission insignia.
- **This repository** contains catalogs, metadata, page-level text and table extracts (`data/**/processed/`), and curation files. Raw NASA payloads (~1 GB), the download manifest and the generated `build/` are not committed ([ADR-014](decisions/ADR-014-repo-data-hygiene.md)).

## How the data was collected

The PSI public repository provided the investigation metadata and files. NTRS provided the reports and attachments. Downloads used HTTPS with certificate verification. The single exception, the challenge Resources page, is documented in [data/README.md](../data/README.md). Files are kept byte-for-byte and verified by SHA-256 during the build. The tools are in `data/tools/` (`download.py`, `prepare.py`, `audit.py`).
