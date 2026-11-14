# Handoff for Claude Code

Use `C:\Users\USIF\usif\programming\EmberNova\data` as the corpus root. Start with [CORPUS_SUMMARY.md](CORPUS_SUMMARY.md), the [source catalog](SOURCE_CATALOG.csv), and the [download manifest](DOWNLOAD_MANIFEST.csv). The manifests include both locally verified files and deferred resources.

## Evidence by challenge objective

| Objective | First investigations to open | Supporting evidence |
| --- | --- | --- |
| Fire prevention and material flammability | BASS PSI-26, BASS-II PSI-25, Saffire I–III PSI-98/99/100 | Saffire IV–VI publications and NASA media, SoFIE GEL/MIST, LUCI, partial-gravity references |
| Fire detection | SAME PSI-102 and SAME-R PSI-101 | DAFT/DAFT-2 PSI-47, ASE PSI-179, SAME-derived ground modeling PSI-115 |
| Fire suppression and extinction | FLEX PSI-69 and FLEX-2 PSI-68 | Cool Flames Investigation PSI-39, ACME, Saffire and BASS observations |

## What is ready

- For text retrieval, start with `indexes/DOCUMENT_TEXT.jsonl`. Each entry points to an original, derived text, and the source URL. Keep the page number with evidence. Review plots and tables in the PDFs when text alone omits a measurement or condition.
- For charts and numerical analysis, start with the experimental CSVs and use `indexes/TABULAR_PROFILES.jsonl` to locate them. The FLEX table provides test identifiers, initial and extinction diameters, ambient pressure, and burn time. The BASS-II table includes source test identifiers and gas measurements. SAME/SAME-R and Saffire tables describe test conditions. Some FLEX-2 entries are design ranges.
- For authentic visuals, use `indexes/LOCAL_MEDIA.jsonl`. Treat NASA outreach clips and stills as representative media. Preserve captions, source credit, and the reported experiment phase when available.
- Join manifest `investigation_id` to `SOURCE_CATALOG.source_id`. Use `file_id` with investigation/file versions for file lineage. Keep run identifiers scoped to the investigation and source table. Link a sample, test, camera, or archive member only when metadata provides that link.

## Next actions

1. Read the verified experiment tables and supporting documentation together. Define a run key for each table before joining measurements.
2. Build chart inputs for a single investigation first. Keep raw values, normalized values, and the unit conversion evidence alongside each other.
3. Use `indexes/SOURCE_RELATIONSHIPS.csv` and PSI publication metadata for evidence navigation. Treat search-topic matches as discovery leads until the document confirms a relationship.
4. Use the deferred list to select the next scientifically useful files when storage is available. Treat missing PSI objects, unpublished run data, and documented access restrictions separately.
5. Use the NASA partial-gravity publications for measured results within their reported conditions. LUCI and KC-135 measurements simulate reduced gravity, and FM² has no verified lunar-surface dataset in this snapshot.

Further processing is needed for instrument-specific streams, ambiguous workbook headers, scanned text, media-to-run associations, and cross-investigation comparability. Consult [DATA_DICTIONARY.md](DATA_DICTIONARY.md) for specific issues.
