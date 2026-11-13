# Judging and award strategy

## 1. Confirmed 2026 judging rules

Source: the 2026 Judging & Awards Guide, retrieved Nov 13 2026.

At every level (Local, Global and Executive), projects are scored **1–5 on each of five criteria**: **Impact, Creativity, Validity, Relevance and Presentation**. The guide publishes **no weights and no formula**. Anything below about relative importance is our own judgment.

| Criterion | What a "5" requires (from the 2026 guide) |
| --- | --- |
| Impact | Addresses a significant problem with a broad, inspiring reach |
| Creativity | A novel approach, or a meaningful improvement on existing ideas |
| Validity | Scientifically sound and technically feasible, fully developed, highly usable |
| Relevance | Fully addresses the challenge, with **NASA data integral rather than superficial** |
| Presentation | Clear, engaging storytelling. Judges score the demo *and* the full project page |

The **10 Global Awards in 2026** are the same categories as in 2025:
- Best Use of Science
- Best Use of Data
- Best Use of Technology
- Galactic Impact
- Best Mission Concept
- Most Inspirational
- Best Storytelling
- Global Connection
- Art & Technology
- Local Impact

Executive judges nominate Global Finalists for these awards.

**Local awards:** none are published for the team's event (see [NASA_CHALLENGE_ANALYSIS.md §5](NASA_CHALLENGE_ANALYSIS.md)).

## 2. Strategic assessment

**Primary targets, which we endorse:**
- **Best Use of Data.** The corpus is fragmented: 34 investigations, CSV and workbook tables with lossy headers, and 13.5 TB on PSI. Making it navigable, comparable and *correctly interpreted* is the core value. Examples include the recovered FLEX units and normalized O₂ and pressure.
- **Best Use of Science.** This is the strongest differentiator against other teams' chatbots: provenance, comparison validity, envelope reasoning, the d²-law consistency check, explicit claim types, and refusing unsupported extrapolation.

**Secondary target: Best Use of Technology.** This is credible because of the evidence-ledger agent, the deterministic artifacts and the sandboxed Analysis Lab. It is crowded, though. Many teams will show "an AI agent". The technology story must be *verifiable correctness*, not agent theatrics.

**Tertiary:** Galactic Impact (lunar habitat design and Earth fire-safety spin-offs) and Best Mission Concept (Habitat Envelope as a design-support concept). These come for free from the demo story, so we add **no features** to chase them.

**Rejected:** adding a game, art features or global-connection features to mention more categories. They are out of scope (P3) and dilute Validity.

## 3. Award-alignment matrix

| Criterion / award | Feature | Scientific or technical value | Evidence judges can inspect | How it's demonstrated | Priority | Risks / weaknesses |
| --- | --- | --- | --- | --- | --- | --- |
| Relevance; Best Use of Data | Investigation ranking with score breakdown | Directly answers Objective 1; ranking is explainable | The score-breakdown popover: text relevance, facet matches, data availability | Query → ranked list → expand "why ranked" | P0 | Curated facets could look subjective, so each facet links to source text |
| Best Use of Data | Dataset Explorer with normalized conditions | Turns lossy CSVs into typed, unit-aware tables; raw kept beside normalized | "Raw vs normalized" toggle; mapping YAML with source page | Open FLEX table → toggle raw → see "Burning rate; mm" → K [mm²/s] with TP p.26 citation | P0 | Mapping errors, so we need golden tests |
| Best Use of Science; Validity | Applicability Envelope | Shows which tests bracket a target atmosphere and keeps O₂ fraction distinct from O₂ partial pressure | Plot with every test point, linked to rows | Enter 34% O₂ / 10.2 psi → FLEX points at 0.34 / 540 mmHg highlighted | P0 | Must not imply "safe/unsafe". The copy is reviewed |
| Best Use of Science | Comparison validity panel | Flags confounders: O₂ and pressure change together; different fuels; different hardware | Validity checklist with each factor sourced | Compare FLEX air @1 atm vs 0.34/0.71 atm | P0 | Too many warnings can annoy users, so they are tiered |
| Best Use of Science | d²-law consistency check | Physics-based verification of NASA table values; flags suspect rows | Scatter of (D₀²−D_ext²)/K vs t_b with a 1:1 line; outlier list | One click from a FLEX answer | P0 | Some departures are physical (disruption), so the label says "inconsistency ≠ error" |
| Validity; Best Use of Technology | Evidence ledger and validated citations | Every claim is traceable and fabricated citations are stripped | Click `[1]` → page text and PDF page, or table rows | Live during the demo | P0 | The model may under-cite; we show an "uncited statements" counter |
| Relevance | Original NASA media | Authentic experiment visuals, linked to investigations and runs | Media card with source file, SHA-256 and the "inferred from filename" label | FLEX MDCA video plays in the panel | P0 | Few run-linked media files exist |
| Best Use of Technology | Analysis Lab (sandboxed Python) | Reproducible custom analyses on the same bundle | Code, logs, result schema, SI-code badge | "Fit K vs X_O₂ per fuel" → validated chart | P1 | API cost and latency. It's behind a flag |
| Impact; Galactic Impact | Habitat presets and engineering-implications section | Connects lab data to lunar-base design questions without overclaiming | The "not certified" label; implications cite evidence | Demo narrative | P0 (copy) | Must avoid a safety-certification tone |
| Presentation | Judge Mode featured sessions | Reliable demo regardless of API availability | `/featured` page that replays the real recorded session | Judges click a featured question | P0 | Replays must be labeled as recordings |
| Presentation | 30 s video and 7-slide deck | Required by the rules | Public links | — | P0 | Hard limits. Exceeding them disqualifies the entry |
| Best Use of Science | Research-gap view | Shows untested condition regions (e.g. no O₂ > 0.34 at reduced P for solids) | Envelope with gap shading | Follow-up question | P1 | Gaps can only be computed over the *local* corpus, so the caveat says so |
| Galactic Impact (Earth) | Earth-application notes | Mist suppression, smoke detection spin-offs | Cited NASA spinoff pages (challenge resources) | One answer section | P2 | Secondary objective only |

## 4. Presentation plan

See [DEMO_STRATEGY.md](../product/DEMO_STRATEGY.md). The project page carries most of the evaluation, so it must contain:
- the high-level summary
- the NASA datasets used, with DOIs
- an SI-usage statement
- the references, including OSS libraries
- the live link and the repository link
- screenshots with alt text
