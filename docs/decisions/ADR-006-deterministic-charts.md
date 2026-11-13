# ADR-006: Backend-built ChartSpec rendered by Plotly

- **Status:** Accepted (2026-11-13)
- **Problem:** Visualize measured data interactively without SI-authored charts that can't be verified.
- **Options:** SI writes plotting code; SI writes a Vega-Lite or Plotly spec; **a backend tool builds a constrained ChartSpec and the frontend maps it to Plotly**.
- **Decision:** the last option. Plotly.js is lazy-loaded, with scattergl for telemetry. The schema lives in `contracts/artifact.schema.json`.
- **Reasons:**
  - Data and units come from the bundle with provenance.
  - Plotly provides scientific axes, hover, zoom, error bars and export.
  - A constrained spec can be validated.
- **Consequences:** a new chart type needs code, not a prompt change. Analysis Lab charts are re-rendered from validated CSVs.
- **Reverse if:** never for measured data. Vega-Lite may replace Plotly if bundle size becomes critical.
