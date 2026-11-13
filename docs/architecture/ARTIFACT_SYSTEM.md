# Artifact system

Canonical for: artifact types, the ChartSpec, reproducibility records and SI labeling. JSON Schema: [contracts/artifact.schema.json](contracts/artifact.schema.json). Rationale: [ADR-006](../decisions/ADR-006-deterministic-charts.md), [ADR-013](../decisions/ADR-013-si-labeling.md).

## 1. Concept

An **artifact** is a typed, persisted, inspectable result. Tools create artifacts, and the user opens them in the right-hand panel. They show inline in chat as cards with a title, a type icon and a provenance chip. Artifacts are immutable. A changed request creates a new artifact with `parent_artifact_id` set.

## 2. Types

| `type` | Created by | Payload | Evidence ID? | SI-generated? |
| --- | --- | --- | --- | --- |
| `table` | `query_measurements` (>50 rows), Dataset Explorer export | columns, rows (≤ 10k), display units, excluded summary | yes (`derived_artifact`) | no (deterministic) |
| `chart` | `make_chart`, `check_d2_law` | ChartSpec | yes | no; `selected_by_si: true` when the agent requested it |
| `timeseries` | `get_timeseries` | ChartSpec (line, `scattergl`) | yes | no |
| `comparison` | `compare_runs` | group summaries, condition diff, validity, embedded ChartSpec | yes | no |
| `envelope` | `check_applicability_envelope` | scenario, coverage, gaps, bracketing runs, ChartSpec | yes | no |
| `media` | `find_media` | media IDs, stream and thumbnail URLs, association labels | yes (`media`) | no |
| `analysis_run` | Analysis Lab | code cells, stdout/stderr, result.json (validated), files, environment, inputs | yes (`derived_artifact`, `value_kind=derived`) | **yes** (code is SI-generated) |
| `si_illustration` (P2) | Illustration endpoint | watermarked PNG, prompt, model | **no**: never citable as evidence | **yes** |
| `answer` | Agent turn | validated text, citations, audit | no | **yes** (prose) |

## 3. ChartSpec (deterministic charts)

Built only by `embernova.science.charts` from bundle queries. The frontend maps it to Plotly in `frontend/src/artifacts/chart/toPlotly.ts`. There is no `eval` and no model-authored traces.

```json
{
  "spec_version": "1",
  "chart_type": "scatter | line | box | bar | histogram | envelope",
  "title": "FLEX burning-rate constant vs O₂ mole fraction",
  "subtitle": "PSI-69 · measured · n=241 (17 excluded: implausible/encoding)",
  "x": {"field": "o2_mole_fraction", "label": "O₂ mole fraction", "unit": "1", "display_unit": "%", "scale": "linear"},
  "y": {"field": "burning_rate_constant", "label": "Burning-rate constant K", "unit": "m**2/s", "display_unit": "mm²/s", "scale": "linear"},
  "series": [
    {"name": "methanol", "style": {"color_token": "series-1", "symbol": "circle", "hollow": false},
     "points": {"x": [0.21, 0.30], "y": [0.52, 0.65], "run_uid": ["PSI-69:flex_experimental:1", "…"],
                "error_y": null, "error_x": null}}
  ],
  "annotations": [{"kind": "reference_line", "axis": "y", "value": 1.0, "label": "d²-law ratio = 1"},
                  {"kind": "region", "x": [0.30, 0.36], "y_axis_field": "total_pressure", "y": [55158, 70327], "label": "Lunar habitat (challenge reference)"}],
  "notes": ["Pressure differs between groups; see comparison art_…"],
  "provenance": {
    "bundle_version": "1.0.0", "query": {"tool": "make_chart", "args": {"…": "…"}}, "query_hash": "sha256:…",
    "table_ids": ["PSI-69:flex_experimental"], "evidence_ids": ["ev_…"], "transform_steps": ["unit:mm**2/s→m**2/s", "exclude:quality_flags∋implausible_value"]
  },
  "labels": {"selected_by_si": true, "si_generated": false, "data_origin": "NASA PSI measured data"}
}
```

**Rendering rules:**
- Axis titles always include the display unit.
- Hover shows the run label, the investigation and all plotted values in display units, raw values included.
- Clicking a point opens its run row in the evidence panel.
- Hollow markers mean design values. Error bars show ranges.
- The modebar offers PNG export plus "Download data (CSV)" from the artifact endpoint.
- Colors come from theme tokens and are colorblind-safe: Okabe-Ito order. Symbols are used in addition to color.

## 4. Reproducibility record (every artifact)

```json
"reproducibility": {
  "created_at": "2026-11-14T10:22:31Z", "build_version": "…", "bundle_version": "1.0.0", "bundle_sha256": "…",
  "git_sha": "…", "tool": "compare_runs", "tool_version": "1", "args": {…},
  "input_files": [{"file_id": "…", "sha256": "…"}],
  "environment": {"python": "3.12.x", "pandas": "…", "duckdb": "…", "pint": "…"},
  "llm": null | {"model": "gpt-6.1-sol", "prompt_version": "…", "response_id": "…"}
}
```

`GET /api/artifacts/{id}/bundle` returns a zip with `artifact.json`, `data.csv` and, for `analysis_run`, the code `.py` and logs. Its README.txt names the sources and DOIs, plus the SI note where applicable.

## 5. SI labeling (2026 Space Apps rules)

- Every artifact carries `labels.si_generated` (bool), and also `labels.selected_by_si` for charts the agent requested.
- **Visible UI:**
  - An "SI" pill badge (tooltip: "Generated by Super Intelligence (SI)") on agent answers, `analysis_run` code, SI-drafted profiles and illustrations.
  - Deterministic charts show "Computed from NASA data" plus "Requested by SI" when applicable.
- **Images** (`si_illustration`): the server composites a **visible watermark** with Pillow: bottom-right, "SI-GENERATED ILLUSTRATION — NOT EXPERIMENTAL DATA", ≥ 3% of image height, 80% opacity, on a semi-opaque band. It is also embedded as PNG `tEXt` metadata (`si_generated=true`, `model=…`). The prompt template forbids logos, flags, insignia and text. Images are never shown in the evidence panel.
- **Code and data:** `analysis_run` artifacts have the header comment `# SI-generated code (EmberNova Analysis Lab, model=…)`, and exports include an `SI_GENERATED.txt` note.
- **No NASA branding** appears anywhere in SI content. Real NASA images keep their original credit line ("NASA") and are never altered.
