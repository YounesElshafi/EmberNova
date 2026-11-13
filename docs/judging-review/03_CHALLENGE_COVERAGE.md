# 03 — Challenge coverage

Source for requirements: the team's Nov 13 capture of the official challenge page (`build/eval/official_challenge_full.txt`). I could not re-fetch the live page (certificate failure; see report 08), so this is a secondary copy of the official text. It matches the wording quoted in the review brief.

The challenge's one hard requirement is: *an SI-powered, web-based dashboard that summarizes, ranks and interprets combustion investigations to deliver fire-safety insights.* The three objectives are introduced with "you may consider enabling users to", so they are strongly suggested, not mandatory. Judges will still score Relevance against them.

## The core sentence

| Verb | Status | Evidence |
| --- | --- | --- |
| SI-powered | Yes | Live turn ran: 6 tool calls, 27.9 s, valid citations |
| Web-based | Built, **not hosted** | Runs on 127.0.0.1 only; no deployment files exist (`deploy/` absent) |
| Dashboard | Partly | It is a research workspace with tool pages. There is no at-a-glance overview of the corpus |
| Summarizes | Weak | Investigation pages show NASA's own objective text; per-variable statistics exist for 4 investigations; no synthesized summaries |
| Ranks | Implemented, unreliable | See report 05, T1–T3; recall@5 0.61 |
| Interprets | Good where data exists | Envelope, comparison validity, d²-law check, SI answers with limits |

## Objective matrix

| NASA objective | Observed implementation | Evidence | Coverage | Gaps | Improvements |
| --- | --- | --- | --- | --- | --- |
| 1. Identify investigations most relevant to fire-safety needs of crewed environments (spacecraft, stations, lunar/Martian bases, rovers) | `/investigations` search with hybrid ranking and a score breakdown; SI agent calls `search_investigations`; objective filter buttons | Ran 10 queries. "Smoke detection" → SAME, SAME-R, Saffire (good). "Partial gravity lunar" → LUCI, FM2, KC-135 report, labeled supplemental (good) | **Partial** | Gibberish query returns confident list; rocket query not rejected; "detection" filter ranks BASS-II first; "highest oxygen" misses CFI-G; no habitat-type facet; facet component was 0.00 on every unfiltered query; recall@5 0.61 | Relevance floor and out-of-scope notice; curated objective tags per investigation; habitat presets that drive ranking; show "why relevant" in fire-safety terms |
| 2. Extract data that supports predictive modeling | Dataset explorer with raw/normalized toggle; CSV export with source hash header; `/api/measurements/query`; optional hosted Analysis Lab | Export works; normalized values match raw file; live Lab recording reproduces fuel medians | **Partial** | 5 tables, 577 rows, of which only FLEX (274) and CFI (79+79) carry outcomes; no combined model-ready export; no data dictionary in the download; no example model; Saffire telemetry (≈11k rows on disk) unparsed | "Model-ready dataset" download (one tidy table per fuel class, SI units, quality flags, data card); a transparent baseline with cross-validation labeled exploratory; parse the small experiment tables |
| 3. Highlight research that informs next-generation controls and equipment | Only through SI answers ("Engineering implications" section) and the About page | Live answer correctly pointed to SAME/SAME-R for detector design | **Weak** | No page organizes evidence by prevention / detection / suppression; no suppressant view despite 123 CO₂ and 50 He dilution tests in FLEX; detection has no numbers | A "Fire-safety systems" view: three columns, each listing investigations, what was measured, key source passages; a FLEX suppressant chart (outcome and extinction diameter vs diluent fraction) |
| Optional: Earth applications | None | — | None | — | One short cited section from the three NASA spinoff resources; low priority |

## Potential considerations the challenge lists

| Consideration | Status |
| --- | --- |
| Experimental objectives | Shown verbatim from PSI metadata |
| Fuels, sample/burner shape and size | Fuel for FLEX/CFI; BASS-II material kept as free text (thickness and width not parsed); nothing for others |
| Oxygen concentration, airflow | O₂ for FLEX, CFI, BASS-II; airflow nowhere (BASS-II fan setting correctly not treated as velocity; Saffire's 20/30 cm/s is on disk, unparsed) |
| How tests within an investigation differ | Comparison tool, FLEX only in the UI |
| Sensors and measurement types | Not structured |
| Similarities and differences between investigations | Not implemented. No cross-investigation matrix |
| Hardware relationships (CIR/ACME, MDCA, MSG) | `hardware` field exists in metadata; no grouping view |
| Spacesuit / lunar atmosphere values | Envelope presets implement them correctly |
| Partial-gravity caveat | Handled well and consistently |
| E-FIELD Flames as a partial-gravity mimic; µg and 1g as bounds | Not mentioned in the product |

## Scope check

The system prompt declares rocket propulsion out of scope, but the search endpoint does not: a rocket query returns FLEX-2 as the top hit with no notice. Minor, but a judge may try it.

## Mandatory vs self-imposed

Mandatory by the challenge: web-based, SI-powered, uses PSI data, summarizes/ranks/interprets. Self-imposed by the team: evidence ledger, hosted sandbox, replay system, schema contracts. The self-imposed items are sound, but time spent there is part of why coverage is narrow.
