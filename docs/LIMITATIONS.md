# Known limitations

## Scientific

- **No partial-gravity data.** The PSI snapshot contains no lunar or Martian run data. Lunar and Martian questions get atmosphere (O₂ and pressure) coverage only, and the app states that atmosphere overlap is not gravity coverage or safety evidence. LUCI, KC-135 and GRC sources are ground or simulated partial-g, and they are labeled supplemental.
- **Droplets are not solids.** FLEX and CFI droplet results do not establish solid-material flammability. The app says so when it uses them for habitat questions.
- **Numeric coverage.** 13 tables (1,161 runs) are curated. ACME, SPICE, SLICE and other investigations are searchable as documents and metadata but have no normalized measurements. Saffire-III telemetry is not parsed. Saffire-II provides only two microgravity spread-rate values, at a fixed 20 cm/s.
- **FLEX-2 is a design matrix.** It is shown as planned conditions, never as measurements.
- **No predictive model.** EmberNova does not estimate fire risk or extrapolate beyond tested conditions. The Applicability Envelope shows coverage instead ([ADR-008](decisions/ADR-008-predictive-modeling.md)).

## SI and evidence checks

- Citation validation proves that a cited evidence ID was retrieved in that turn. It does **not** prove that the sentence is entailed by the source.
- The numeric-grounding audit is conservative and has false positives (page numbers, user-supplied filter values). It flags rather than blocks.
- Answers are model-generated and can vary between runs. Occasionally the model cites an ID it never retrieved; the citation is then removed and marked visibly. Expert review is still required.
- On the held-out retrieval benchmark split, recall@5 is 0.74. Relevant investigations can rank below the top five.
- Semantic (embedding) search shares a global hourly allowance. Beyond it, retrieval degrades to lexical search instead of failing.

## Operational

- Live SI is capped at $2/day and 20 turns per visitor per hour. The explorers and recorded demos have no cap.
- One uvicorn worker. Concurrency comes from async I/O. A single session runs one turn at a time.
- The live site depends on the OpenAI API for chat. Everything else runs without it.
- A fresh clone cannot rebuild the corpus from scratch: raw NASA payloads (~1 GB) and the download manifest are not in git. The prebuilt runtime corpus (~530 MB) is needed to run the app locally.
- Frontend: the 3D intro scene (three.js, about 120 KB gzipped) and the Plotly chart bundle (about 470 KB gzipped) load lazily. Very slow connections see delays the first time a chart opens.
- `react-router` 6 has two moderate advisories: a backslash open redirect and an SSR deserialization issue. Every link target in this client-only app is a fixed internal path, so neither is reachable. Upgrading to v7 is a breaking change, deferred until after judging.
- No software license has been chosen for the source code yet.
