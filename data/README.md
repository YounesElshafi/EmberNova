# EmberNova scientific corpus

Snapshot date **November 13, 2026**. The corpus lives at `C:\Users\USIF\usif\programming\EmberNova\data`.

- [Corpus summary](CORPUS_SUMMARY.md) gives validated totals, coverage, and outstanding items.
- [Source catalog](SOURCE_CATALOG.csv) lists PSI investigations, supplemental investigations, challenge resources, NASA references, and NTRS publications. Filter `source_type` to count investigations. Blank CSV fields and JSON nulls indicate unreported or unmapped metadata.
- [Download manifest](DOWNLOAD_MANIFEST.csv) tracks each file by identifier, upstream version, size, local path, state, and SHA-256 where present. For local NASA originals filter on `origin_status=original` and `download_status=verified`.
- [Challenge resources](challenge_resources/RESOURCE_LINKS.csv) contains ten Resources-tab links and the separate Details-tab video. The NASA combustion guide is stored beside the link list.
- [Investigation coverage](indexes/INVESTIGATION_COVERAGE.csv) compares local and listed file categories by investigation and counts image and video members inside local archives.
- [Data dictionary](DATA_DICTIONARY.md) describes the scientific fields and parsing conventions.
- [Claude Code handoff](HANDOFF_FOR_CLAUDE_CODE.md) and [Codex handoff](HANDOFF_FOR_CODEX.md) describe the files available for engineering.

Each investigation has a stable accession or local slug and a `metadata.json`. Original NASA payloads live in `raw/` under each investigation, with a shared reference area for general publications. `processed/` contains page-aware text, table profiles, and selected archive metadata. Empty data categories may have no directory. PSI detail records, release histories, public file-tree responses, and NTRS citation/search responses are under `logs/`. They are source evidence for the normalized metadata.

The latest PSI public search returned 133 investigations. The scope includes all 23 explicitly classified as Combustion Science and PSI-179 Aerosol Sampling Experiment as supporting evidence. DAFT and DAFT-2 share PSI-47. Coverage includes BASS, BASS-II, Saffire I–III, SAME, SAME-R, FLEX, FLEX-2, ACME and its six repository investigations, CFI, SPICE, SLICE, and related ground or analysis work. NASA references supplement PSI with Saffire IV–VI, SoFIE-GEL, SoFIE-MIST, LUCI, FM², and simulated partial-gravity investigations.

The public AWS bucket was listed anonymously. The root exposed DSI, OASIS, and PK-4 prefixes. None matched the PSI combustion investigation tree. NASA's general API catalog does not advertise that tree. The PSI public repository provided the investigation metadata and files. NTRS provided publicly listed reports and attachments. The challenge Resources tab links came from the page response retrieved with certificate verification disabled for that one request after Windows rejected its certificate chain. Scientific file transfers retained HTTPS certificate verification.

Keep original files and archives byte-for-byte. Cite the investigation DOI and file version when available, or the NTRS citation ID for publications. Use the actual PDF page, table, run label, or archive member as the evidence locator. Distinguish representative NASA media from run-level data. Preserve quoted source units and test conditions. Mark assumptions and any cross-study comparisons explicitly.

