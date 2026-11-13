# 10 — Path to exceptional scores

Item IDs (A1, B3, …) refer to [09_IMPROVEMENT_MASTER_PLAN.md](09_IMPROVEMENT_MASTER_PLAN.md). Scores are my diagnostic estimates on the 2025 guideline wording; they do not predict official results.

## Summary

| Criterion | Now | After Plan A | After Plans B+C | 5/5 realistic by Nov 15? |
| --- | --- | --- | --- | --- |
| Impact | 3 | 3 | 4 | No |
| Creativity | 3 | 3 | 4 | Unlikely |
| Validity | 4 (low) | 4 | 4 (high) | Unlikely; possible with outside review |
| Relevance | 3 | 3 | 4, possibly 4+ | Possible but demanding |
| Presentation | 2 | 3–4 | 4 | Possible; depends on the humans |

---

## Impact

1. **Demonstrated now.** A working tool that answers one class of question (droplet combustion vs atmosphere) correctly and quickly. No users, no public access.
2. **Score:** 3.
3. **Why not 5.** Benefit is not demonstrated on anyone; numeric coverage reaches 4 of 34 investigations; detection and materials engineers find text only.
4. **Most important improvements.** A2 (public), B1 (data for detection and solids), B2 (systems view), B3 (gap map that tells NASA-style stakeholders something), B7 (export a modeler can use).
5. **Evidence that would show it.** A timed task comparison ("all microgravity tests within a lunar atmosphere band: about N minutes by hand from PSI files vs seconds here"), stated honestly with how it was measured; two or three short quotes from outside users (a combustion or aerospace student or lecturer at the team's university can be reached in a day).
6. **Smallest set for a real gain.** A2 + B1 (four tables) + one timed comparison + one outside quote → 4.
7. **What 5 requires.** Evidence of extensive reach: many users, an endorsement from a PSI or combustion researcher, coverage across all three fire-safety areas with data.
8. **Realistic?** No. Aim for a well-supported 4.

## Creativity

1. **Demonstrated now.** Thoughtful combination: evidence ledger, envelope, validity checklist, d² audit.
2. **Score:** 3.
3. **Why not 5.** The pattern is familiar; no single new idea a judge will retell.
4. **Most important improvements.** B3 evidence-gap map (signature idea); B4 suppressant view; C5 bounded model shown with its validity envelope ("a model that knows where it stops").
5. **Evidence.** A one-line comparison in the project page: what PSI search, a generic chatbot and EmberNova each return for the lunar habitat question. Keep it factual.
6. **Smallest set.** B3 alone, featured as the closing image of the demo → 4.
7. **What 5 requires.** A method not attempted before that an expert finds non-obvious — for example a validated cross-investigation flammability map joining solids, droplets and gases with normal-gravity bounds. That needs data and review beyond a weekend.
8. **Realistic?** Unlikely. 4 is achievable.

## Validity

1. **Demonstrated now.** Reproducible FLEX numbers, correct units, strict claim discipline, passing tests, clean error handling, working live SI.
2. **Score:** 4 (low).
3. **Why not 5.** Ranking defects; comparison sample-size and zero-extinction flaws; unflagged anomalies; prose numbers unchecked; not deployed; rough tables.
4. **Most important improvements.** A6, A7, A8, C1, C3, C4 (correctness); A2–A4 (real-world operation); B5 (usability); C2 (numeric grounding of prose).
5. **Evidence.** A short "Verification" section on the About page and project page with three reproducible checks a judge can run: (a) FLEX test 2 → K 0.60, D_ext 0.94 mm, open the source row; (b) 17 tests at 30–34% O₂ / 520–560 mmHg, none at ≤10.2 psi; (c) d² median ratio 0.95, 7 flagged tests. Add the retrieval benchmark numbers before and after the fixes, whatever they are.
6. **Smallest set.** A6 + A7 + A8 + B5 + deployment → a firm 4.
7. **What 5 requires.** "Fully developed and ready for real-world implementation": all numeric datasets under golden tests, numeric-claim checking, retrieval at target, an accessibility pass, and ideally a combustion scientist's review of the curation mappings.
8. **Realistic?** Unlikely by Nov 15. If a university combustion researcher will review the FLEX and CFI mappings and let you say so, a 5 becomes arguable.

## Relevance

1. **Demonstrated now.** NASA data is the product. Depth on FLEX; shallow elsewhere. Objective 1 partial, Objective 2 partial, Objective 3 weak.
2. **Score:** 3.
3. **Why not 5.** Narrow numeric slice; ranking weak; no Objective 3 surface; no cross-investigation similarity or hardware view; CFI-G and Saffire — named in the challenge — are text only.
4. **Most important improvements.** B1 (curate Saffire I–III, SAME-R, BASS, CFI-G, BRE), A6/A7 (ranking), B2 (systems view), B7 (model-ready export), B3/B4, C6 (hardware grouping).
5. **Evidence.** An objective-by-objective table on the project page with a link into the app for each ("Objective 1 → try this search", "Objective 2 → download this dataset", "Objective 3 → open this view"). A coverage figure: "N of the investigations named in the challenge have numeric data here".
6. **Smallest set.** A6 + A7 + B1 (four to six tables) + B2 + B7 → 4.
7. **What 5 requires.** Every investigation named in the challenge represented with at least its experiment table; all three objectives each backed by a working feature; Saffire telemetry or SAME particle data usable for detection; the µg/1g bounding idea and E-FIELD partial-gravity mimic at least surfaced from documents.
8. **Realistic?** Possible only if B1 goes fast and nothing else slips. Plan for 4.

## Presentation

1. **Demonstrated now.** A good-looking app; a written demo plan; no deliverables.
2. **Score:** 2, not fully assessable.
3. **Why not 5.** There is nothing to present yet; app tables are rough; internal IDs leak into charts.
4. **Most important improvements.** A5 (video or slides and project page), A2 (link), B5 (formatting), B8 (overview strip), C7 (labels).
5. **Evidence.** The deliverables themselves, checked in a private browser window: video ≤ 30 s with burned-in English subtitles; page with pitch, link, screenshot, NASA data table with DOIs, verification facts, limits, SI disclosure, references.
6. **Smallest set.** A2 + A5 + B5 → 3–4.
7. **What 5 requires.** A video whose story lands without narration: stakes → question → evidence → the gap NASA must still fill; a page a judge can absorb in two minutes; no visible rough edges in any frame. Rehearse and re-record; show it to someone outside the team and ask what they understood.
8. **Realistic?** Yes, in principle — this is the one criterion fully in the team's hands — but only if the feature freeze on day 2 midday is respected.

---

## The single most valuable sentence

If the project can truthfully say, on screen, **"NASA's microgravity data includes N tests at lunar-habitat oxygen levels for liquid fuels and none for solid materials at a known pressure — here is each one, here is its source, and here is what has not been tested"**, it serves Impact, Creativity, Relevance and Presentation at once. A6–A8, B1, B3 and B6 are the items that make that sentence exact.
