# Data architecture

Canonical for: storage layout, schemas, identifiers, controlled vocabularies, provenance and evidence IDs, ingestion and curation. Rationale: [ADR-004](../decisions/ADR-004-storage.md), [ADR-005](../decisions/ADR-005-provenance-evidence.md).

## 1. Stores

| Store | Format | Mutability | Contents | Consumers |
| --- | --- | --- | --- | --- |
| `data/` | NASA originals plus GPT Work indexes | **Read-only, never written** | Corpus snapshot | Ingestion only |
| `build/knowledge.db` | SQLite (FTS5) | Read-only at runtime | Catalog, profiles, facets, documents, pages, chunks, FTS, embeddings, publications, relations, hardware, media, source files, evidence-source registry | Retrieval, explorers, evidence resolution |
| `build/bundle/` | Parquet + `bundle_manifest.json` | Read-only at runtime | Normalized runs, conditions, measurements, time series, quality findings, provenance | Science tools (via DuckDB), Code Interpreter uploads, exports |
| `build/media/` | mp4 / jpg / webp | Read-only | Web derivatives: H.264 720p, posters, thumbnails | Media service |
| `build/pdf/` | Copies of cited PDFs, by `file_id` | Read-only | For the evidence inspector (`#page=N`) | Evidence inspector |
| `build/replays/` | JSONL event logs | Read-only (written by the admin recorder) | Featured sessions | Judge Mode |
| `var/app.db` | SQLite (WAL) | Read-write | Sessions, messages, turns, tool calls, evidence ledger per turn, artifacts, usage and cost, uploaded-file cache | Agent, API |

`build/` and `var/` are gitignored. `embernova-build all` regenerates `build/` from `data/` plus `curation/`. The build must be **deterministic**: the same inputs and curation produce the same IDs and the same bundle hashes. Embeddings are the exception, since the API may vary; they are cached by content hash in `build/cache/embeddings.sqlite` so rebuilds reuse them.

## 2. Repository layout for data artifacts

```text
curation/
  investigations/<SOURCE_ID>.yaml     # profile + facets (with evidence locators); Codex drafts, humans/Claude review
  tables/<SOURCE_ID>__<table_key>.yaml # column mappings, units, parsing rules per source table/sheet
  media_rules.yaml                     # filename → run/test association regexes
  vocab.yaml                           # controlled vocabularies (§4) — single source for backend + frontend enums
  benchmark/retrieval_v1.yaml          # architect-owned retrieval benchmark
build/                                 # generated (gitignored)
var/                                   # runtime state (gitignored)
```

## 3. Identifiers

| ID | Format | Example | Stability rule |
| --- | --- | --- | --- |
| `investigation_id` | `SOURCE_CATALOG.source_id` | `PSI-69`, `SAFFIRE-IV` | From the catalog |
| `file_id` | The manifest `file_id` (PSI object ID / `NTRS-…-n`) | `6792be99b7b6ff8e65037e3a` | From the manifest |
| `document_id` | `doc:` + `file_id` | `doc:NTRS-20150023456-1` | Derived |
| `page_id` | `{document_id}#p{n}` (one-based physical page) | `doc:NTRS-20150023456-1#p26` | Derived |
| `chunk_id` | `{page_id}:c{k}`, or `{document_id}:s{k}` for DOCX/PPTX parts | `doc:…#p26:c0` | Deterministic chunking |
| `table_id` | `{investigation_id}:{table_key}` (`table_key` from the curation file name) | `PSI-69:flex_experimental` | Curated |
| `run_uid` | `{table_id}:{source_run_label}` (label as in the source, whitespace-normalized) | `PSI-69:flex_experimental:1` (alt label `20CAL08`) | Curated key column; **must be unique within the table, or the build fails**. Alternate labels are searchable |
| `series_id` | `{investigation_id}:{series_key}` | `PSI-100:telemetry_1hz_saffire` | Curated |
| `media_id` | `media:` + `file_id` (or `file_id/member_path` for archive members) | `media:684344d49e44646b7402718d` | Derived |
| `evidence_id` | `ev_` + first 12 chars of base32(sha256(kind + "\|" + canonical_locator)), lowercase | `ev_k3j9x0p2m4qa` | **Deterministic.** The same source span gets the same ID in every session and replay |
| `artifact_id` | `art_` + ULID | `art_01JD…` | Random, per creation |
| `session_id` / `turn_id` | `ses_` / `turn_` + ULID | | Random |

**Canonical locator formats (inputs to `evidence_id`):**
- `page|{page_id}|{char_start}-{char_end}`: a chunk span.
- `rows|{table_id}|{sorted run_uids or row filter hash}|{quantities}`: a measurement query result.
- `record|{investigation_id}|{field}`: an investigation metadata field.
- `media|{media_id}`
- `artifact|{artifact_id}`: a derived analysis.

## 4. Controlled vocabularies (`curation/vocab.yaml`)

- `fire_safety_objective`: `prevention`, `detection`, `suppression`, `fundamental`.
- `habitat_context`: `spacecraft_cabin`, `space_station`, `lunar_surface_habitat`, `martian_surface_habitat`, `pressurized_rover`, `spacesuit`.
- `fuel_class`: `solid_thin`, `solid_thick`, `solid_fabric`, `liquid_droplet`, `gaseous_jet_coflow`, `gaseous_spherical_burner`, `gaseous_porous_burner`, `aerosol_smoke_source`, `dust`.
- `gravity_regime`: `microgravity_iss`, `microgravity_cygnus`, `microgravity_drop_tower`, `simulated_partial_g_centrifuge`, `simulated_partial_g_aircraft`, `simulated_partial_g_rotating_flight`, `normal_gravity_ground`, `lunar_surface`, `martian_surface`, `modeled`.
- `platform`: `ISS`, `Cygnus`, `ground`, `aircraft`, `suborbital`, `drop_tower`, `simulation`.
- `hardware`: `CIR`, `MDCA`, `ACME`, `MSG`, `SPICE_flow_duct`, `Saffire_flow_unit`, `SAME_hardware`, `other`.
- `value_kind`: `measured`, `design`, `derived`, `modeled`, `reported_in_publication`.
- `qualifier`: `exact`, `approx`, `range`, `list`, `lower_bound`, `upper_bound`.
- `quality_flag`: `encoding_artifact`, `implausible_value`, `missing_unit`, `unit_inferred_from_source_doc`, `d2_inconsistent`, `duplicate_row`, `sentinel_value`, `header_ambiguous`, `expanded_from_reference_row`.
- **Condition variables (canonical, with SI unit):**
  - `o2_mole_fraction` [1], `n2_mole_fraction` [1], `co2_mole_fraction` [1], `he_mole_fraction` [1]
  - `total_pressure` [Pa], `o2_partial_pressure` [Pa] (derived only)
  - `flow_velocity` [m/s], `ambient_temperature` [K]
  - `sample_thickness` [m], `sample_width` [m], `sample_length` [m]
  - `droplet_initial_diameter` [m], `fuel_flow_rate_mass` [kg/s], `oxidizer_flow_rate_mass` [kg/s]
  - `burner_diameter` [m], `ignition_power` [W], `ignition_time` [s], `aging_time` [s]
  - `fuel_mole_fraction` [1], `stoichiometric_mixture_fraction` [1], `adiabatic_flame_temperature` [K] (`value_kind=derived`, as reported)
- **Measured quantities:**
  - `burning_rate_constant` [m²/s], `extinction_diameter` [m], `burn_time` [s]
  - `cool_flame_burning_rate_constant` [m²/s], `cool_flame_extinction_diameter` [m]
  - `flame_spread_rate` [m/s], `flame_length` [m]
  - `o2_initial`/`o2_final` [1], `co2_initial`/`co2_final` [1], `co_initial`/`co_final` [1]
  - `weight_loss_rate` [kg/s], `resistance_ratio_rt_r0` [1], `peak_burner_temperature` [K]
  - `flames_ignited_count` [1], `test_outcome` (categorical: `extinction`, `disruption`, `completion`, `self_extinguished`, `flow_terminated`, `failed_ignition`)

**Display units.** Each variable defines a display unit: cm/s, mm, mm²/s, kPa plus psi, %, °C. The backend returns both SI and display values.

## 5. Provenance and evidence

**Provenance record** (`bundle/provenance.parquet` and `knowledge.db.source_files`):

| Field | Type | Null | Description |
| --- | --- | --- | --- |
| `provenance_id` | str | no | `prov_` + sha256(file_id + curation file hash + parser version)[:12] |
| `investigation_id` | str | no | |
| `file_id` | str | no | Manifest file ID |
| `relative_local_path` | str | no | Path under `data/` |
| `sha256` | str | no | Original file digest, from the manifest; verified at build time |
| `source_url` / `source_record_url` | str | yes | From the manifest |
| `doi` | str | yes | Investigation DOI |
| `ntrs_id` | str | yes | |
| `source_version` / `file_version` | str | yes | PSI release and file revision |
| `curation_file` | str | yes | e.g. `curation/tables/PSI-69__flex_experimental.yaml` |
| `curation_sha256` | str | yes | |
| `parser` | str | no | e.g. `embernova.ingest.tables.flex@1` |
| `built_at` | str (ISO) | no | |

**Evidence record** (registered in the per-turn ledger in `app.db.evidence`, resolvable through `GET /api/evidence/{id}`):

```json
{
  "evidence_id": "ev_k3j9x0p2m4qa",
  "kind": "document_span | data_rows | investigation_record | media | derived_artifact",
  "investigation_ids": ["PSI-69"],
  "title": "NASA/TP-2015-216046, p. 26",
  "locator": {"type": "page_span", "document_id": "doc:NTRS-20150023456-1", "page": 26, "page_end": null, "char_start": 120, "char_end": 980},
  "excerpt": "… Burning rate, mm2/s …",
  "source": {"file_id": "...", "sha256": "...", "doi": null, "ntrs_id": "20150023456",
             "source_url": "https://ntrs.nasa.gov/citations/20150023456", "local_url": "/api/files/NTRS-20150023456-1/original#page=26",
             "is_psi": false},
  "value_kind": "reported_in_publication",
  "transform": null
}
```

`data_rows` evidence carries `{table_id, run_uids[], quantities[], query_hash}` and a preview of up to 20 rows, raw and normalized. The canonical schema is [contracts/evidence.schema.json](contracts/evidence.schema.json).

## 6. `knowledge.db` schema (SQLite)

All text is UTF-8. `*_json` columns hold JSON text.

```sql
CREATE TABLE investigations (
  investigation_id TEXT PRIMARY KEY, acronym TEXT, title TEXT NOT NULL,
  source_type TEXT NOT NULL,            -- psi_investigation | supplemental_investigation
  is_psi INTEGER NOT NULL,              -- 1/0 (supplemental sources are labeled in UI)
  priority TEXT, scientific_category TEXT, subcategory TEXT,
  objectives TEXT, approach TEXT, platform TEXT, project_type TEXT,
  hardware_raw TEXT, nasa_center TEXT, investigation_start TEXT, investigation_end TEXT,
  doi TEXT, license TEXT, source_url TEXT, source_version TEXT,
  file_count INTEGER, inventoried_bytes INTEGER, local_file_count INTEGER,
  usability_tier TEXT,                  -- T1|T2|T3 (DATASET_AUDIT §2)
  relevance_note TEXT, availability_notes TEXT, metadata_path TEXT NOT NULL
);
CREATE TABLE investigation_profiles (   -- from curation/investigations/*.yaml
  investigation_id TEXT PRIMARY KEY REFERENCES investigations,
  summary TEXT NOT NULL,                -- ≤120 words, factual, curated
  fire_safety_relevance TEXT NOT NULL,  -- ≤80 words
  variables_varied_json TEXT NOT NULL,  -- [{variable, range_text, evidence_locator}]
  variables_fixed_json TEXT NOT NULL,
  measurements_json TEXT NOT NULL,      -- [{quantity|label, instrument, evidence_locator}]
  key_findings_json TEXT NOT NULL,      -- [{statement, evidence_locator, value_kind:"reported_in_publication"}]
  limitations_json TEXT NOT NULL,
  profile_text TEXT NOT NULL,           -- concatenation used for FTS + embedding (deterministic template)
  curation_status TEXT NOT NULL         -- draft_si | reviewed
);
CREATE TABLE investigation_facets (     -- multi-valued facets
  investigation_id TEXT, facet TEXT, value TEXT, weight REAL DEFAULT 1.0, evidence_locator TEXT,
  PRIMARY KEY (investigation_id, facet, value)
);                                      -- facet ∈ fire_safety_objective|habitat_context|fuel_class|gravity_regime|platform|hardware|variable|quantity
CREATE TABLE hardware (hardware_id TEXT PRIMARY KEY, name TEXT, description TEXT, url TEXT);
CREATE TABLE relations (subject TEXT, predicate TEXT, object TEXT, evidence_url TEXT, origin TEXT);
  -- predicates: uses_hardware, related_investigation, lists_publication, publication_about, topic_search_match(weak), shares_instrument
CREATE TABLE publications (pub_id TEXT PRIMARY KEY, investigation_id TEXT, title TEXT, authors TEXT, doi TEXT, ntrs_id TEXT, year INTEGER, local_document_id TEXT);
CREATE TABLE source_files (file_id TEXT PRIMARY KEY, investigation_id TEXT, filename TEXT, relative_local_path TEXT,
  sha256 TEXT, size_bytes INTEGER, category TEXT, source_url TEXT, source_record_url TEXT, doi TEXT,
  source_version TEXT, file_version TEXT, download_status TEXT, deployable INTEGER);
CREATE TABLE documents (document_id TEXT PRIMARY KEY, file_id TEXT, investigation_id TEXT, title TEXT,
  doc_type TEXT,      -- report|publication|science_doc|engineering_doc|readme|test_plan|proof_sheet|other
  ntrs_id TEXT, page_count INTEGER, empty_page_count INTEGER, method TEXT);
CREATE TABLE pages (page_id TEXT PRIMARY KEY, document_id TEXT, page_number INTEGER, page_label TEXT,
  text TEXT, char_count INTEGER, is_empty INTEGER, headings_json TEXT);
CREATE TABLE chunks (chunk_id TEXT PRIMARY KEY, document_id TEXT, page_id TEXT, investigation_id TEXT,
  ordinal INTEGER, char_start INTEGER, char_end INTEGER, section TEXT,
  context_header TEXT NOT NULL,         -- "[PSI-69 FLEX] NASA/TP-2015-216046 — §Results — p.26"
  text TEXT NOT NULL, token_count INTEGER, evidence_id TEXT NOT NULL);
CREATE VIRTUAL TABLE chunks_fts USING fts5(context_header, text, content='chunks', content_rowid='rowid', tokenize='porter unicode61');
CREATE VIRTUAL TABLE profiles_fts USING fts5(investigation_id UNINDEXED, profile_text, tokenize='porter unicode61');
CREATE TABLE embeddings (owner_type TEXT, owner_id TEXT, model TEXT, dims INTEGER, vector BLOB, content_sha256 TEXT,
  PRIMARY KEY (owner_type, owner_id));  -- owner_type: chunk|profile; vector = float32 little-endian, L2-normalized
CREATE TABLE media (media_id TEXT PRIMARY KEY, file_id TEXT, investigation_id TEXT, media_type TEXT,
  filename TEXT, archive_member TEXT, caption TEXT, credit TEXT, is_representative INTEGER,
  duration_s REAL, width INTEGER, height INTEGER, derivative_path TEXT, poster_path TEXT, thumb_path TEXT,
  sha256 TEXT, source_url TEXT, attribution_note TEXT);
CREATE TABLE media_associations (media_id TEXT, run_uid TEXT, source_run_label TEXT,
  association TEXT,  -- from_metadata | inferred_from_filename | none
  rule_id TEXT, PRIMARY KEY (media_id, source_run_label));
CREATE TABLE datasets (table_id TEXT PRIMARY KEY, investigation_id TEXT, title TEXT, file_id TEXT, sheet TEXT,
  row_count INTEGER, kind TEXT,  -- runs|conditions_design|timeseries|summary
  quantities_json TEXT, conditions_json TEXT, curation_file TEXT);
CREATE TABLE build_info (key TEXT PRIMARY KEY, value TEXT);  -- build_version, git_sha, built_at, embedding_model, bundle_sha
```

## 7. Analysis Bundle schema (Parquet, long format)

| File | Grain | Columns (type, nullability) |
| --- | --- | --- |
| `runs.parquet` | One row per run / test / sample | `run_uid` str!, `investigation_id` str!, `table_id` str!, `source_run_label` str!, `alt_labels` list<str>, `test_date` date?, `fuel_raw` str?, `fuel_canonical` str?, `fuel_class` str?, `sample_material` str?, `geometry` str?, `configuration` str? (e.g. `opposed`/`concurrent`/`normal`/`inverse`), `hardware` str?, `platform` str?, `gravity_regime` str!, `outcome_raw` str?, `outcome` str?, `notes` str?, `source_row` int!, `provenance_id` str!, `quality_flags` list<str>! |
| `conditions.parquet` | One row per run × variable | `run_uid`!, `variable`!, `value_si` f64?, `unit_si` str?, `value_min_si` f64?, `value_max_si` f64?, `value_list_si` list<f64>?, `display_value` f64?, `display_unit` str?, `value_raw` str!, `unit_raw` str?, `qualifier`!, `value_kind`!, `source_column` str!, `derivation` str? (e.g. `o2_mole_fraction*total_pressure`), `quality_flags` list<str>! |
| `measurements.parquet` | One row per run × quantity | Same columns as `conditions`, but `quantity` replaces `variable`, plus `method` str?, `instrument` str?, `uncertainty_si` f64?, `uncertainty_kind` str? |
| `series_index.parquet` | One row per channel | `series_id`!, `investigation_id`!, `run_uid` str?, `channel`!, `channel_label_raw`!, `unit_si` str?, `unit_raw` str?, `time_basis` (`relative_s`/`epoch`), `n_samples` int, `file` (path to series parquet), `provenance_id`! |
| `series/{series_id}.parquet` | Time series | `t_s` f64!, one f64 column per channel |
| `quality_findings.parquet` | One row per finding | `finding_id`, `table_id`, `run_uid`?, `check` (`d2_law`/`range`/`encoding`/`duplicate`/…), `severity` (`info`/`warn`/`error`), `message`, `details_json` |
| `bundle_manifest.json` | — | `bundle_version` (semver), `built_at`, `git_sha`, `files: [{name, sha256, rows}]`, `vocab_sha256`, `curation_sha256` |

DuckDB registers views at startup: `runs`, `conditions`, `measurements` and a convenience wide view `run_wide`, pivoted on canonical names with display units.

## 8. Curation file formats

### 8.1 Table mapping (`curation/tables/PSI-69__flex_experimental.yaml`)

This is a normative example; Codex writes the rest following the same pattern.

```yaml
table_id: PSI-69:flex_experimental
investigation_id: PSI-69
file_id: 6792be99b7b6ff8e65037e3a
sheet: null
encoding: cp1252
header_row: 0
run_label_column: "FLEX Test #"          # unique; "FLEX Identifier" repeats once (193F001) → alt label only
alt_label_columns: ["FLEX Identifier"]
defaults: {gravity_regime: microgravity_iss, platform: ISS, hardware: MDCA, fuel_class: liquid_droplet, value_kind: measured}
columns:
  "Test Date":            {role: run_field, field: test_date, parse: date_mdy}
  "Fuel":                 {role: run_field, field: fuel_raw, canonical_map: {Methanol: methanol, Heptane: n-heptane}}
  "Ambient pressure; mmHg": {role: condition, variable: total_pressure, unit: mmHg, value_kind: measured,
                              plausible_si: [5.0e4, 4.0e5]}
  "O initial ambient composition; mole fraction":  {role: condition, variable: o2_mole_fraction, unit: dimensionless,
      evidence: {document_id: "doc:NTRS-20150023456-1", page: 26, note: "Table header 'O2 N2 CO2 He' mole fraction"}}
  "N initial ambient composition; mole fraction":  {role: condition, variable: n2_mole_fraction, unit: dimensionless, evidence: {document_id: "doc:NTRS-20150023456-1", page: 26}}
  "CO initial ambient composition; mole fraction": {role: condition, variable: co2_mole_fraction, unit: dimensionless,
      evidence: {document_id: "doc:NTRS-20150023456-1", page: 26, note: "Subscript lost in CSV; CO2 per TP header and FLEX CO2-dilution design"}}
  "He initial ambient composition; mole fraction": {role: condition, variable: he_mole_fraction, unit: dimensionless}
  "Droplet initial diameter; mm":  {role: condition, variable: droplet_initial_diameter, unit: mm}
  "Visible flame extinction diameter; mm": {role: measurement, quantity: extinction_diameter, unit: mm}
  "Burning rate; mm":     {role: measurement, quantity: burning_rate_constant, unit: "mm**2/s",
      quality_flags: [unit_inferred_from_source_doc],
      evidence: {document_id: "doc:NTRS-20150023456-1", page: 26, note: "TP tables list 'Burning rate, mm2/s'; d2-law check median ratio 0.95"}}
  "Burn time; s":         {role: measurement, quantity: burn_time, unit: s}
  "Test end":             {role: run_field, field: outcome_raw, canonical_map: {Extinction: extinction, Disruption: disruption, Completion: completion}}
derived_conditions:
  - {variable: o2_partial_pressure, expr: "o2_mole_fraction * total_pressure"}
null_tokens: ["", "�", "n/a", "N/A", "none", "-"]
checks: [d2_law, plausible_range, encoding]
```

**Cell-parser rules,** which apply to every table: strip whitespace; detect a leading `~` or `≈` → `approx`; detect `a - b` / `a–b` → `range`; detect `a; b; c` → `list`; detect a trailing unit token (`0.27 mm`, `20 cm/s`, `80 W`) → it must match or convert to the declared unit, or raise `header_ambiguous`. Sentinels (`RAMPED`) → null plus `sentinel_value`. Rows that reference other rows ("same conditions as 1-4") are expanded with `expanded_from_reference_row`.

### 8.2 Investigation profile (`curation/investigations/PSI-69.yaml`)

```yaml
investigation_id: PSI-69
curation_status: draft_si        # draft_si → reviewed (by a human or Claude); UI shows "SI-drafted profile" badge until reviewed
summary: "..."                   # ≤120 words, every sentence supported by evidence below
fire_safety_relevance: "..."
facets:
  fire_safety_objective: [suppression, fundamental]
  habitat_context: [spacecraft_cabin, space_station, lunar_surface_habitat]
  fuel_class: [liquid_droplet]
  gravity_regime: [microgravity_iss]
  hardware: [CIR, MDCA]
  variable: [o2_mole_fraction, total_pressure, co2_mole_fraction, he_mole_fraction, droplet_initial_diameter]
  quantity: [burning_rate_constant, extinction_diameter, burn_time]
variables_varied: [{variable: o2_mole_fraction, range_text: "0.12–0.34", evidence: {table_id: "PSI-69:flex_experimental"}}]
key_findings: [{statement: "...", evidence: {document_id: "...", page: 19}}]
limitations: ["Droplet (liquid fuel) results do not directly transfer to solid materials."]
```

Profiles are drafted at build time by `gpt-6-luna` from `metadata.json` objectives and approach plus the top retrieved pages. The **drafts are written to YAML files** and committed, so they're reviewable, and they are never regenerated silently. Every `key_findings` statement needs an evidence locator that resolves at build time, or the build fails. The 10 priority investigations (PSI-69, 68, 39, 159, 25, 26, 98, 99, 100, 101/102) must be `reviewed` before the demo.

## 9. Ingestion pipeline (`embernova-build`)

| Step | Command | Input | Output | Notes |
| --- | --- | --- | --- | --- |
| 1 | `catalog` | `SOURCE_CATALOG.csv`, `investigations/*/metadata.json`, `DOWNLOAD_MANIFEST.csv` (verified rows only), `SOURCE_RELATIONSHIPS.csv` | investigations, source_files, publications, relations, hardware | Verify sha256 for every file used later. Mismatch → abort |
| 2 | `documents` | `DOCUMENT_TEXT.jsonl` plus derived JSON | documents, pages | Reuse GPT Work's extraction (PyMuPDF). Mark `is_empty` (<20 chars). No re-parsing of PDFs |
| 3 | `chunks` | pages | chunks, chunks_fts | ~800 tokens (`tiktoken` `o200k_base`), 15% overlap, never across documents. Page-bounded: split at paragraph boundaries; a chunk may span at most 2 pages and records both |
| 4 | `profiles` | curation YAML (or `--draft` to create drafts via `gpt-6-luna`) | investigation_profiles, facets, profiles_fts | |
| 5 | `embed` | chunks and profiles | embeddings | `text-embedding-3-small`, `dimensions=512`, batches of 256, cached by content hash. Est. 1.5M tokens ≈ $0.03 |
| 6 | `tables` | curation/tables YAML plus originals | bundle Parquet, datasets, quality_findings | Order: FLEX → CFI (+ DataSummary join on `Flex Number`) → Saffire-III telemetry → BASS-II → SAME-R → FLEX-2 (design) → CFI-G → ACME FD → SPICE → others |
| 7 | `quality` | bundle | quality_findings | d²-law (FLEX, CFI), plausible ranges, duplicates, encoding |
| 8 | `media` | `LOCAL_MEDIA.jsonl`, `MEDIA_CAPTIONS.json`, archive members (images only), `media_rules.yaml` | `build/media/*`, media, media_associations | ffmpeg: `.ts`/large mp4 → H.264 720p CRF 28, `+faststart`, AAC or no audio; poster at 10% duration; 320 px webp thumbs. Skip anything over 400 MB |
| 9 | `pdf` | PDFs referenced by documents | `build/pdf/{file_id}.pdf` | Copy (not link) for deploy |
| 10 | `deploy-bundle` | build | `build/deploy/` (knowledge.db, bundle, media, pdf, replays) plus `DEPLOY_MANIFEST.json` with sha256 | Target ≤ 600 MB |

`embernova-build all` runs steps 1–10. Each step is idempotent and logs counts. The build fails loudly on schema violations.
