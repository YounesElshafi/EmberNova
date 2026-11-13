# 02 — Criteria scorecard

Scale: 1 poor, 3 moderate, 5 exceptional. Criterion wording is from the **2025** Space Apps judging guidelines, which I read directly. I could not open the 2026 guide (see report 08), so treat the definitions as historical guidance. NASA's guidance asks for one holistic 1–5 rating; the five separate scores below are my own diagnostic breakdown.

| Criterion | Score | Confidence |
| --- | --- | --- |
| Impact | 3 | Medium |
| Creativity | 3 | Medium |
| Validity | 4 (low) | High |
| Relevance | 3 | High |
| Presentation | 2, not fully assessable | High that materials are missing |

---

## Impact — 3/5

**Evidence.** The problem (PSI data is hard to find, compare, interpret) is the challenge's own. The app does reduce that effort for FLEX, CFI and BASS-II: a lunar-atmosphere question that would take hours of manual CSV work returns in under a second through `/api/envelope` (measured 300–430 ms) with source rows attached.

**Positive.** Clear audience (researchers, engineers, students). Refusing to over-claim makes the output usable by a professional, which most hackathon chatbots are not.

**Weaknesses.** No one outside this machine can reach it. No user has tried it; there is no before/after evidence, no testimonial, no usage scenario worked end to end for a named persona. Numeric reach is 4 of 34 investigations. The terrestrial angle the challenge invites is absent.

**Why not higher.** The 2025 "5" asks for extensive reach and benefit to a large audience. Benefit here is plausible but asserted.

**To raise it.** Deploy; add one worked case study with a measurable saving (for example "find every microgravity test within a lunar atmosphere band: manual vs EmberNova"); get two or three outside users (a combustion student, a professor) to try a task and quote them; broaden the numeric slice so a detection or materials engineer also finds data.

**What 5 looks like.** A public tool that several outside people have used on real questions, covering prevention, detection and suppression with data, plus a credible path to adoption (for example a note from a PSI or combustion researcher). Not realistic by Nov 15; 4 is.

---

## Creativity — 3/5

**Evidence.** Distinctive pieces: the per-turn evidence ledger that strips citations not returned by tools (`agent/citations.py`); the Applicability Envelope that maps a habitat atmosphere onto tested conditions; the comparison validity checklist that names confounders; the d²-law internal consistency check. I found no existing PSI-specific tool that does these (PSI itself offers dataset search; see report 07).

**Weaknesses.** The architecture (LLM agent, retrieval, deterministic tools, chart artifacts) is now a standard pattern. The envelope is a filtered scatter plot with a rectangle. Nothing here is a new scientific method.

**Why not higher.** "Groundbreaking… never attempted" does not describe a well-built RAG-plus-tools workspace.

**To raise it.** Turn the existing ingredients into one idea nobody else will show: an **evidence-gap map** (which fuel class × O₂ × pressure × gravity cells have NASA data, and which are empty), framed as "what experiment should fly next". The data and envelope code already exist. A suppressant map from FLEX's 123 CO₂ and 50 He dilution tests is a second candidate.

**What 5 looks like.** A new way of seeing the corpus that a NASA combustion scientist would call non-obvious and useful. A 4 is reachable; 5 is unlikely.

---

## Validity — 4/5 (low 4)

**Evidence (all reproduced by me).**
- FLEX medians, counts, the 17-row atmosphere band and d²-law statistics match my independent recomputation from the raw CSV (report 04).
- FLEX "Burning rate; mm" is correctly treated as K in mm²/s; "CO" column as CO₂; pressure in mmHg.
- Strict lunar preset returns zero joint matches; gravity mismatch always produces the partial-gravity warning.
- Tests: backend 37 pass, frontend 5 pass, ruff/eslint/tsc clean. Error paths return proper 4xx.
- Live turn completed with valid citations and an accurate statement of missing data.

**Weaknesses.**
- Ranking defects (report 05, T1–T3) and recall@5 0.61 vs target 0.85.
- Comparison "sample size: pass" counts rows, not non-missing values; I got a median extinction diameter of 0.0 mm from n=2 marked as passing.
- Extinction diameter 0 (burned to completion or disrupted) is pooled with true extinctions.
- d²-law check on a non-droplet table returns an empty chart titled "FLEX d²-law consistency" with status ok.
- Implausible BASS-II final O₂ values (39.1%, 40.4%, 0.6–1.6%) pass unflagged.
- Citation validation checks IDs, not whether the number in the sentence matches the evidence (`ungrounded_numbers` is always null).
- Not deployed, so "ready for real-world use" is unproven.

**Why not higher.** A 5 needs "fully developed… highly usable". Usability has visible rough edges and the ranking feature is not trustworthy.

**To raise it.** Fix the ranking and comparison defects, add numeric-claim checking for SI prose, clean the tables, deploy. That makes a solid 4; 5 would need outside scientific review.

---

## Relevance — 3/5

**Evidence.** NASA data is the product; remove it and nothing remains. All 34 investigations carry PSI metadata and DOIs; 93 documents are searchable with page-level citations; 39 original media items play.

**Weaknesses.**
- Objective 1 (identify relevant investigations): implemented, but ranking quality is weak and habitat type (rover, station, lunar base) is not a facet.
- Objective 2 (extract data for predictive modeling): CSV export with provenance exists for 5 tables. No model-ready combined export, no data card, no example model. Roughly 20 other local experiment tables are unparsed, including CFI-G, which the challenge names for its 85% O₂ tests.
- Objective 3 (research informing next-generation controls and equipment): no dedicated view; detection has no numeric data at all.
- "Summarize": investigation pages show NASA's own text; there is no synthesized summary or cross-investigation similarity view, which the challenge's considerations list asks about.

**Why not higher.** The 2025 "5" requires thorough engagement with the challenge. Depth is excellent on FLEX and shallow elsewhere.

**To raise it.** Curate the small experiment tables already on disk (Saffire I–III, SAME-R, BASS, CFI-G, BRE), add a prevention/detection/suppression "what this informs" view, and a hardware/relationship view (CIR–MDCA–MSG groupings are spelled out in the challenge). See report 03.

---

## Presentation — 2/5, not fully assessable

**Evidence.** `docs/submission.md` is an unchecked template. No video, no slides, no project description. README says "No deployment has been performed". The repository has four tracked files.

**Positive.** The application itself presents well: coherent dark theme, clear home page with four example questions, visible SI badges, recorded sessions for judges, honest limits page. `docs/product/DEMO_STRATEGY.md` contains a sound 30-second script and 7-slide outline — but it is a plan, not a deliverable.

**Weaknesses in the app.** Result tables show raw JSON and long floats; investigations appear as `PSI-39` in charts; the envelope takes psi and plots atm; the recorded-session banner says "no live SI" even for recorded SI sessions; search results are captioned "lexical relevance" while hybrid retrieval is active.

**To raise it.** Produce the demo and project page (report 06 says what judges should see first), fix the table formatting, record the lunar scenario from the deployed build.

**What 5 looks like.** A 30-second video that shows question → ranked investigations → envelope → cited number → "what NASA has not tested", plus a project page a judge can skim in two minutes. A 4 is realistic; 5 depends on storytelling skill.
