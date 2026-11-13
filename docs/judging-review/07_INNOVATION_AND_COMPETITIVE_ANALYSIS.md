# 07 — Innovation and competitive analysis

Research depth was limited: one web search round plus what I know of the field. Access to spaceappschallenge.org (where other teams' 2026 projects would be listed) failed on this machine, so I could not survey competing submissions. Treat the competitor section as informed expectation, not observation.

## 1. Existing approaches

| Approach | What it does | Limits relevant here |
| --- | --- | --- |
| **NASA PSI repository** (psi.nasa.gov) | Dataset search by investigation, metadata pages, file downloads; a "Microgravity Analysis Platform" is listed on the site | Files arrive as heterogeneous CSV/XLS with lossy headers (e.g. FLEX "Burning rate; mm"); no cross-investigation comparison; no unit normalization; no question answering. I could not inspect the analysis platform's features |
| **NASA Technical Reports Server** | Full-text reports such as NASA/TP-2015-216046 | Tables locked in PDFs; no link from a number to a dataset row |
| **General SI assistants with file upload or web search** | Summarize documents, write analysis code on uploaded CSVs | No provenance guarantee; will happily compute on mis-read units; no built-in notion of comparability or gravity regime |
| **Generic "chat with your documents" RAG apps** | Retrieval plus generation with citations | Citations are to text chunks; numbers are model-generated; no deterministic computation |
| **Scientific literature tools** (Elicit, Consensus, Semantic Scholar style) | Rank and summarize papers | Paper-level, not run-level; not tied to PSI data |
| **Combustion research practice** | Hand-built spreadsheets and plots per paper; flammability maps (O₂ vs pressure, O₂ vs flow) in the literature | Not interactive, not linked to PSI rows |

## 2. What EmberNova does that these do not

| Feature | Novel? | Defensible claim |
| --- | --- | --- |
| Run-level normalized data with raw value kept beside it and a source hash per row | Uncommon in hackathon work; standard in good data engineering | "We recovered the correct units for FLEX and can prove it" — backed by the d² check |
| Evidence ledger: SI answers may cite only what tools returned this turn; other citations are stripped | A known pattern, cleanly executed | "No invented citations" — true as far as IDs go; it does not verify the sentence content |
| Applicability Envelope | The idea is a flammability-map overlay, familiar to combustion scientists; applying it as an interactive "does NASA data reach my habitat?" query over PSI is new as a product | "Shows which tests fall in a habitat atmosphere and refuses to equate that with safety" |
| Comparison validity checklist | Genuinely unusual for a dashboard | "Tells you when a comparison is confounded" |
| d²-law consistency check | A neat use of physics as a data-quality test | "Uses combustion theory to audit the table" |
| Refusal to predict lunar/Martian outcomes | A stance, not a feature, but one that subject-matter judges will respect | — |

## 3. What it does worse than alternatives

- **Breadth:** PSI itself exposes all files for all investigations; EmberNova gives numeric access to four.
- **Ad-hoc analysis:** a general assistant with the CSVs uploaded can fit a curve in one prompt; EmberNova's equivalent (Analysis Lab) is off by default and limited to five tables.
- **Ranking:** plain keyword search on PSI will not return results for gibberish; EmberNova does (report 05, T1).

## 4. Expected competition

Most teams on this challenge will likely ship one of: (a) a chatbot over PSI PDFs, (b) a dashboard of investigation cards with filters, (c) a flammability "risk predictor" trained on little or synthetic data. Against (a) and (b), EmberNova's verified numbers and source tracing are a real edge. Against (c), EmberNova is more defensible scientifically but less eye-catching; a judge without combustion background may be more impressed by a prediction slider than by a refusal to predict. The demo has to make the refusal look like a result ("here is the gap NASA still has to fill"), not like a missing feature.

## 5. Are the innovation claims defensible?

- "Not just ChatGPT over PDFs" — **yes**, demonstrably.
- "Cites every number back to NASA sources" (README pitch) — **overstated**. Chart points and table values trace to rows. Numbers in SI prose are not checked against evidence (report 04, S2-6). Say "every chart point and table value", or add the check.
- "Finds the NASA experiments relevant to a question" — **partly**; ranking quality does not yet support a strong claim.
- "Explicit validity checks" — **yes**, with the sample-size flaw noted.

## 6. A more effective approach?

Not a different architecture. The better use of the remaining time is to point the existing machinery at a sharper output:

1. **Evidence-gap map.** A grid of fuel class × O₂ band × pressure band × gravity regime, each cell showing the number of NASA tests and linking to them; empty cells are the finding. It answers Objectives 1 and 3 in one picture and is something neither PSI nor a chatbot offers. All required data is already in the bundle.
2. **FLEX suppressant view.** Outcome (extinction / disruption / completion) and extinction diameter against CO₂ and He fraction, per fuel. 123 CO₂ and 50 He tests exist. This is the suppression story the challenge text describes, shown with real data.
3. **Bounded interpolation model for K** (report 04 §4), displayed with its validity envelope. This turns "we declined to model" into "we modeled exactly as far as the data allows".

Each is a modest build on existing code. Any one of them moves Creativity from 3 toward 4.

## Sources

- [NASA combustion science overview](https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science)
- [PSI Researcher's Guide (NASA)](https://www.nasa.gov/sites/default/files/atoms/files/psi_researchers_guide-tagged.pdf)
- [UCI: NASA funds E-FIELD Flames simulation project using PSI data](https://engineering.uci.edu/news/2021/9/nasa-funds-e-fields-flames-simulation-project)
