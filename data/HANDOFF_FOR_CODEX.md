# Handoff for Codex

Corpus root `C:\Users\USIF\usif\programming\EmberNova\data`. Run the tools from that directory or invoke them by absolute path.

- `SOURCE_CATALOG.csv` is the entry point for investigation metadata, availability, and resources. `DOWNLOAD_MANIFEST.csv` is authoritative for file state.
- `investigations/<accession>_<name>/metadata.json` holds the normalized investigation record. Supplemental research uses a descriptive local slug. The raw PSI metadata, version history, and file trees are in `logs/psi/`.
- `indexes/DOCUMENT_TEXT.jsonl`, `TABULAR_PROFILES.jsonl`, `LOCAL_MEDIA.jsonl`, and `ARCHIVE_MEMBERS.jsonl` locate parsed content and exact source originals. `PROCESSING_LIMITATIONS.jsonl` tracks parse exceptions and legacy formats. `DUPLICATE_CONTENT.jsonl` groups matching verified bytes. `DEFERRED_DOWNLOADS.csv` records every nonlocal payload and its disposition.
- `indexes/SOURCE_RELATIONSHIPS.csv` links PSI related investigations, source-listed publication DOIs, curated NTRS associations, and topic-search candidates. Relationship predicates distinguish the evidence.
- `schemas/investigation.schema.json` and `schemas/file_record.schema.json` describe the normalized records. CSV uses empty strings where source values are missing.
- `tools/audit.py` rechecks local sizes, SHA-256, manifest references, payload coverage, and orphaned or partial downloads. The saved audit lives in `logs/VALIDATION.json`.
- Install Python packages listed in `tools/requirements.txt` in an environment of your choice. FFprobe is required for video verification. Run `python tools/prepare.py` after downloads finish to regenerate extraction and indexes. Run `python tools/audit.py` after preparation.
- `python tools/download.py --help` lists transfer options. PSI links are resolved through its ordinary public download endpoint. For a larger batch use NASA's email ZIP workflow when the selection requires it. See [NASA's large download instructions](https://science.nasa.gov/uncategorized/new-file-download-process-for-large-requestspsi-new-file-download-process/).

CSV text can use UTF-8 or legacy encoding. Workbook first-row labels are provisional. PSI paths and file revisions are independent of the locally safe path. Scanned PDF pages have no embedded text and image-only data remains in the original. Preserve the raw field and unit before interpreting any ambiguous label. Keep the DOI or NTRS ID, original file digest, page or run locator, and experiment context with extracted evidence.

For a specific deferred object, pass its manifest ID as `--file-id`. The byte budget is the total allowance for original files including files already present. After additional downloads, run preparation, audit, and `python tools/summarize.py` to refresh the report. `indexes/MEDIA_INVENTORY.csv` lists candidate media across all availability states. FFmpeg is optional for preview frame extraction.
