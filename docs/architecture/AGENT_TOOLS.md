# Agent tools: contracts

Canonical for: the agent tool set, input and output schemas, permissions, failures, validation and logging. The implementation lives in `backend/src/embernova/tools/` as pure functions, and the REST API exposes them too (see [API_CONTRACTS.md](API_CONTRACTS.md)).

## 0. Conventions (all tools)

- **Responses API function tools** use `strict: true`. Because strict mode requires every property to be listed in `required` and `additionalProperties: false`, **optional parameters are typed as `[T, "null"]`** and the model passes `null`. The schemas below follow this. Write them as Pydantic models and generate the JSON Schema; `Field(description=...)` text is part of the contract.
- **Output envelope.** The JSON string returned to the model has this shape:
  ```json
  {"ok": true, "data": {...}, "evidence": [{"evidence_id": "...", "kind": "...", "title": "...", "excerpt": "..."}],
   "artifacts": [{"artifact_id": "...", "type": "...", "title": "..."}], "notes": ["..."], "truncated": false}
  ```
  On failure it is `{"ok": false, "error": {"code": "...", "message": "...", "hint": "..."}}`, and the loop also emits `tool.completed{status:"error"}`.
  Error codes: `not_found`, `invalid_argument`, `unit_error`, `no_data`, `too_many_rows`, `incompatible_comparison`, `out_of_scope`, `timeout`, `internal`.
- **Size limit.** Model-facing output is at most ~6k tokens. Larger data stays server-side in artifacts; the model gets a summary and the artifact ID.
- **Permissions.** Every tool is read-only over `knowledge.db` and the bundle. Tools that create artifacts write only to `app.db.artifacts`. None of them touches the filesystem outside `build/` (read) or `var/` (write), and none makes network calls except the embedding call in search.
- **Logging.** Each call gets a row in `app.db.tool_calls`: `turn_id`, `tool`, `args_json`, `status`, `latency_ms`, `result_summary` (≤ 2 KB), `evidence_ids`, `artifact_ids`, `error_code`.
- **Evidence.** Every passage, row set, record or media item a tool returns is registered in the ledger with a deterministic `evidence_id` ([DATA_ARCHITECTURE.md §3](DATA_ARCHITECTURE.md)).

## 1. `search_investigations`

**Purpose:** rank investigations for a research question (Objective 1).

```json
{"type":"object","additionalProperties":false,
 "required":["query","objectives","fuel_classes","variables","quantities","habitat_contexts","gravity_regimes","limit"],
 "properties":{
  "query":{"type":"string","description":"The research question or keywords, in English."},
  "objectives":{"type":["array","null"],"items":{"enum":["prevention","detection","suppression","fundamental"]}},
  "fuel_classes":{"type":["array","null"],"items":{"type":"string","description":"vocab fuel_class"}},
  "variables":{"type":["array","null"],"items":{"type":"string","description":"vocab condition variable, e.g. o2_mole_fraction, flow_velocity"}},
  "quantities":{"type":["array","null"],"items":{"type":"string"}},
  "habitat_contexts":{"type":["array","null"],"items":{"type":"string"}},
  "gravity_regimes":{"type":["array","null"],"items":{"type":"string"}},
  "limit":{"type":["integer","null"],"minimum":1,"maximum":15}}}
```

**Output `data.results[]`:**
- `investigation_id`, `acronym`, `title`, `is_psi`, `usability_tier`, `score`
- `components{text_rrf, facet, availability}`
- `matched_facets[{facet,value,evidence_id}]`
- `supporting_passages[{evidence_id, excerpt}]`
- `datasets[{table_id, kind, row_count}]`
- `degraded` (e.g. `"bm25_only"`)

Validation: unknown facet values → `invalid_argument`, listing the valid values. Defaults: limit 8.

## 2. `get_investigation`

**Input:** `investigation_id: string` and `sections: array|null` of `overview|variables|datasets|documents|publications|media|related|limitations`.

**Output:** the profile fields (with evidence IDs per finding), the variables varied and fixed with ranges (computed from the bundle when available, else from the profile), the dataset list, top documents, publications with DOIs, related investigations with predicates, hardware, and `curation_status`.

Errors: `not_found` (with the 3 closest IDs by acronym).

## 3. `search_documents`

**Input:** `query: string`, `investigation_ids: string[]|null`, `doc_types: string[]|null`, `limit: integer|null` (default 8, max 20).

**Output `data.passages[]`:** `evidence_id`, `document_id`, `title`, `page`, `context_header`, `text` (≤ 1,200 chars), `score`.

## 4. `get_document_page`

**Input:** `document_id: string`, `page: integer`.

**Output:** the full page text (≤ 8k chars, truncated with a note), `is_empty`, the evidence ID for the whole page, and `local_pdf_url`. If the page is empty, the output says "scanned or image-only; open the PDF".

## 5. `list_datasets`

**Input:** `investigation_ids: string[]|null`, `quantities: string[]|null`, `variables: string[]|null`.

**Output `data.datasets[]`:**
- `table_id`, `investigation_id`, `title`, `kind`, `row_count`
- `variables[{name, n_non_null, min_display, max_display, display_unit, qualifiers}]`
- `quantities[...]` (same shape)
- `quality_summary{warn, error}`

## 6. `query_measurements`

**Purpose:** the only way the agent obtains numbers from data.

```json
{"type":"object","additionalProperties":false,
 "required":["table_ids","quantities","variables","filters","group_by","aggregate","limit"],
 "properties":{
  "table_ids":{"type":"array","items":{"type":"string"},"minItems":1},
  "quantities":{"type":"array","items":{"type":"string"}},
  "variables":{"type":"array","items":{"type":"string"},"description":"condition variables to include as columns"},
  "filters":{"type":["array","null"],"items":{"type":"object","additionalProperties":false,
     "required":["field","op","values","unit"],
     "properties":{"field":{"type":"string"},"op":{"enum":["eq","ne","lt","lte","gt","gte","between","in"]},
       "values":{"type":"array","minItems":1,"items":{"type":["number","string"]},
                 "description":"1 value for eq/ne/lt/lte/gt/gte, 2 for between, ≥1 for in"},
       "unit":{"type":["string","null"],"description":"unit of values, e.g. 'mmHg', 'psi', '%'; null for categorical"}}}},
  "group_by":{"type":["array","null"],"items":{"type":"string"}},
  "aggregate":{"type":["string","null"],"enum":["none","summary",null],"description":"summary → n, median, q1, q3, min, max per group"},
  "limit":{"type":["integer","null"],"maximum":500}}}
```

**Output:**
- `data.columns[{name, display_unit, kind: variable|quantity|run_field}]`
- `data.rows[]` in display units (≤ 50 rows to the model; the full result goes into a `table` artifact when there are more than 50)
- `data.excluded{n, reasons}`. Rows with `implausible_value` or `encoding_artifact` are excluded by default and reported.
- `qualifier_counts`

Every row-set gets one `data_rows` evidence ID.

Validation:
- Filter units are converted with pint. An incompatible unit → `unit_error`.
- Fields must exist in the selected tables, else `invalid_argument` listing the available fields.
- Mixing `design` and `measured` values in one aggregate → a note plus separate groups.

## 7. `make_chart`

```json
{"type":"object","additionalProperties":false,
 "required":["title","chart_type","table_ids","x","y","color_by","symbol_by","filters","x_scale","y_scale","reference_lines"],
 "properties":{
  "title":{"type":"string"},
  "chart_type":{"enum":["scatter","line","box","bar","histogram"]},
  "table_ids":{"type":"array","items":{"type":"string"}},
  "x":{"type":"string"},"y":{"type":"string"},
  "color_by":{"type":["string","null"]},"symbol_by":{"type":["string","null"]},
  "filters":{"description":"identical schema to query_measurements.filters (reuse the same Pydantic model)"},
  "x_scale":{"enum":["linear","log",null]},"y_scale":{"enum":["linear","log",null]},
  "reference_lines":{"type":["array","null"],"items":{"type":"object","additionalProperties":false,
     "required":["axis","value","unit","label"],"properties":{"axis":{"enum":["x","y"]},"value":{"type":"number"},"unit":{"type":["string","null"]},"label":{"type":"string"}}}}}}
```

**Output:** a `chart` artifact (ChartSpec, [ARTIFACT_SYSTEM.md §3](ARTIFACT_SYSTEM.md)) and, for the model, a summary with n points per series, axis ranges and excluded counts.

Validation: x and y must be numeric fields (or categorical x for box and bar). At most 50k points; above that, deterministic stride downsampling with a note.

## 8. `compare_runs`

**Input:**
- `groups`: an array of 2–4 group objects. Each has `{label: string, table_id: string, filters: filters|null, run_uids: string[]|null}`.
- `quantities: string[]`

**Output:** a `comparison` artifact containing:
- a per-group summary table;
- the condition differences (each variable: per-group values and whether they differ);
- an overlaid chart;
- `validity{verdict: comparable|comparable_with_caveats|not_comparable, checks[{rule, status: pass|warn|fail, detail, evidence_ids}]}`.

The rules are in [SCIENTIFIC_ANALYSIS.md §4](SCIENTIFIC_ANALYSIS.md). The model receives the verdict and checks verbatim and **must** reflect them in its answer.

Errors: `incompatible_comparison` when a quantity's definitions differ (e.g. K_hot vs FLEX K without the same-definition mapping).

## 9. `check_applicability_envelope`

```json
{"type":"object","additionalProperties":false,
 "required":["scenario_label","o2_mole_fraction","total_pressure","flow_velocity","gravity","fuel_classes","investigation_ids"],
 "properties":{
  "scenario_label":{"type":"string"},
  "o2_mole_fraction":{"type":["object","null"],"additionalProperties":false,"required":["min","max"],"properties":{"min":{"type":"number"},"max":{"type":"number"}},"description":"fraction 0-1 (not percent)"},
  "total_pressure":{"type":["object","null"],"additionalProperties":false,"required":["min","max","unit"],"properties":{"min":{"type":"number"},"max":{"type":"number"},"unit":{"enum":["Pa","kPa","psi","atm","mmHg","bar"]}}},
  "flow_velocity":{"type":["object","null"],"additionalProperties":false,"required":["min","max","unit"],"properties":{"min":{"type":"number"},"max":{"type":"number"},"unit":{"enum":["m/s","cm/s"]}}},
  "gravity":{"type":["string","null"],"enum":["microgravity","lunar","martian","earth",null]},
  "fuel_classes":{"type":["array","null"],"items":{"type":"string"}},
  "investigation_ids":{"type":["array","null"],"items":{"type":"string"}}}}
```

**Output:**
- An `envelope` artifact: an X_O₂ vs P scatter of all runs with those conditions, colored by investigation, with the scenario box overlaid and O₂ partial-pressure isolines.
- `data.coverage`: `inside_tested_envelope | partially_covered | outside_envelope`, given per investigation and overall.
- `bracketing_runs[{run_uid, distance, conditions}]` (≤ 10).
- `gaps[]`, e.g. "no solid-fuel tests with X_O₂ > 0.25", "no gravity-regime match: lunar".
- `gravity_note`: always present when `gravity ≠ microgravity`; states that PSI has no partial-g data.

Distance is computed on normalized axes (X_O₂ / 0.05; log10 P / 0.1; flow / 5 cm/s).

## 10. `check_d2_law`

**Input:** `table_id` (one of `PSI-69:flex_experimental` or `PSI-39:cfi_datasummary`), `filters|null`.

**Output:** a `chart` artifact plotting (D₀² − D_ext²)/K against t_b with a 1:1 line and a ±40% band; `data.stats{n, median_ratio, iqr, n_flagged}`; and `flagged_runs[]` (≤ 20) with reasons. Rows missing D_ext are excluded and counted.

## 11. `get_timeseries` (P1)

**Input:** `series_id`, `channels: string[]`, `t_start_s|null`, `t_end_s|null`, `max_points|null` (default 5,000; LTTB downsampling).

**Output:** a `timeseries` chart artifact. Its provenance lists the channels, units and the downsampling note.

## 12. `find_media`

**Input:** `investigation_ids: string[]|null`, `run_labels: string[]|null`, `media_types: ["video","image"]|null`, `limit|null`.

**Output `data.media[]`:**
- `media_id`, `media_type`, `title`, `investigation_id`
- `association` (`from_metadata | inferred_from_filename | none`), `run_label`
- `is_representative`, `caption`, `credit`
- `duration_s`, `thumb_url`, `stream_url`
- `evidence_id`

A `media` artifact is created for the top item.

## 12a. `assess_evidence` (added 2026-11-13, full-system audit)

Input: `scenario_label`, `phenomena[]` (facet vocabulary), `fuel_class` (`solid|liquid_droplet|gaseous`), `materials[]` (`PMMA|cotton_fiberglass|Nomex|silicone|Ultem`), `gravity` (`microgravity|lunar|martian|earth`), optional `o2_mole_fraction {min,max}` (mole fraction), `total_pressure`/`flow_velocity {min,max,unit}`, optional `investigation_ids`.

Deterministic (`science/assessment.py`). For every investigation whose curated fuel class or phenomenon relates to the scenario, it reports per-condition status: `match`, `differs`, `unknown`, `simulated` or `planned`. Gravity, fuel class, material and phenomenon come from `curation/investigation_facets.yaml`. Numeric conditions come from measured runs in the Analysis Bundle, and a "Measured outcome" check uses curated outcome quantities.

Classification:

- **direct**: a flight or ground test with matching gravity, fuel/material and phenomenon, a curated outcome measurement, and measured runs inside every requested range.
- **indirect**: anything related but not direct.
- Overall **insufficient** when nothing is related.

Simulated partial gravity (aircraft, centrifuge, rotating capsule) and planned lunar experiments are never direct for lunar or Martian scenarios. Microgravity is never treated as planetary gravity. The output carries evidence gaps and the tests needed to close them. Creates an `evidence_assessment` artifact. It is independent of search relevance and never produces a risk score or probability. HTTP: `POST /api/evidence-assessment`.

`search_investigations` additions:

- The response includes an `interpretation` (deterministic facet extraction, `science/intent.py`).
- Each result carries `scientific_relevance_score` (0–100), `relevance_explanation` (matches / partly matches / differs / not recorded) and `facet_checks`.
- In agent turns it also creates an `investigation_ranking` artifact rendered as inline cards with NASA source and DOI links.

When agent turns call `find_media`, it creates a `media` artifact. `list_datasets` exposes `descriptor_fields` (e.g. `sample_material`, `flow_direction`).

## 13. Analysis Lab: `code_interpreter` (hosted, P1)

This is not a function tool. It's the Responses API built-in `{"type":"code_interpreter","container":"<container_id>"}`, included only when the session's Analysis Lab is on. Its contract is the **result-file contract** in [CODE_EXECUTION_SECURITY.md §4](CODE_EXECUTION_SECURITY.md). The backend post-processes container outputs into an `analysis_run` artifact.

## 14. Tools deliberately not provided

- Web search: answers must come from the NASA corpus.
- Arbitrary SQL from the model: injection and unbounded-query risk. `query_measurements` covers the need.
- File writes, and email or other side effects.
- Image generation inside the agent loop. P2 illustrations are a separate user-initiated endpoint with watermarking.
