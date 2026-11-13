# 12 — Review update and implementation status (2026-11-13, afternoon)

At the team's request, Claude Code implemented the review's fixes directly. This departs from the role in CLAUDE.md (architect, no application code) by explicit user instruction. Codex had started on the same items and was stopped by the user to avoid conflicting edits; its finished work was kept.

## Done and verified

| ID | Item | Evidence |
| --- | --- | --- |
| A4 | Session privacy (per-visitor cookie, cross-origin write block) | Codex; `test_visitor_thread_isolation` |
| A8 | Comparison: per-quantity n; zero extinction diameter with non-extinction outcome excluded; outcome counts | Codex; `test_non_extinction_zero_excluded_from_comparison` |
| C4 | d²-law rejects non-droplet tables; title names the dataset | Codex + `test_d2_title_names_dataset` |
| A6 | Relevance floor (cosine 0.35 profile / 0.45 passage, measured: benchmark ≥0.46/0.58, unrelated ≤0.23/0.36); propulsion scope notice; fixed-scale scores | `test_nonsense_query_returns_no_match`, e2e "unrelated search" |
| A7 | Curated fire-safety tags for all 34 investigations, each with a challenge quote or metadata keyword (`curation/investigation_tags.yaml`) | `test_every_investigation_has_tags_with_checkable_basis` |
| C1 | Data availability shown as a badge, not scored | `test_scores_are_not_min_max_normalized…` |
| A3 | Failed turns settle at metered cost + one worst-case request (cap 0.30) instead of holding 0.30; `TRUSTED_PROXY` for client address; clearer 429 | `test_failed_turn_settles_below_reservation` |
| B1 | 8 new curated tables: Saffire-I/II/III, SAME, SAME-R, CFI-G normal + inverse, BASS (13 datasets, 1,161 records) | `test_new_tables_counts_and_definitions` |
| C3 | Plausibility warnings (composition sum, final O₂ anomalies, D_ext > D₀); values never altered | `test_plausibility_flags` |
| B6 | Envelope: per-fuel-class headline, explicit ΔO₂/Δpressure offsets, O₂-only strip, unit selector, names instead of PSI IDs | `test_envelope_headline_and_offsets`, e2e |
| B3 | Evidence map page + `map_evidence_coverage` agent tool | `test_coverage_grid_counts`, e2e |
| B4 | FLEX CO₂/He suppression view + agent tool (122 valid CO₂, 50 He tests) | `test_suppression_view_matches_raw_counts` |
| B2 | Fire-safety systems page (prevention / detection / suppression / fundamental) | e2e |
| B7 | Model-ready export with data card | `test_model_ready_export` |
| B5, B8, C7, T10 | Table formatting, home corpus strip, correct retrieval and replay labels, dataset shows only its own columns | `format.test.ts`, e2e |
| C2 | Numeric audit of SI answers against cited evidence and the turn's tool outputs | unit test; live turn: 0 ungrounded numbers on a correct answer |

Checks at stop time: backend 56 tests pass, ruff clean; frontend 8 unit tests, ESLint, tsc, build pass; Playwright keyless 12/12 pass. Two live SI turns: about $0.07 each; correct answers using the new tools.

## Not done (needs the team or more time)

- **A2 deployment and A5 demo video / project page** — need a host, keys and human work.
- **Push to GitHub** — not authorized; committed locally on branch `review-fixes` only. `data/` was not committed.
- **Recorded replays** were made before these changes; re-record them on the final build.
- **Live tool errors:** in both live runs the agent made one invalid `query_measurements` and one invalid `make_chart` call before recovering. A warning log line was just added in `agent/loop.py` to capture the arguments. Next step: run one live turn, read the server log, then fix the prompt or tool schema.
- **Retrieval benchmark** not re-run after the ranking changes (`python -m embernova.evaluation retrieval`).
- `.env.txt` (stray key copy) still present; delete it and rotate the key if it was ever shared.
- C5 (bounded K model) and D1 (Saffire telemetry) not started.

## Updated diagnostic scores (my estimate, not an official score)

| Criterion | Before | Now | What still blocks a higher score |
| --- | --- | --- | --- |
| Impact | 3 | 3.5 | Not public; no outside users |
| Creativity | 3 | 4 | The evidence map is a distinctive, defensible output |
| Validity | 4 (low) | 4 | Benchmark not re-measured; live tool-call errors; no outside scientific review |
| Relevance | 3 | 4 | All three objectives now have a working surface; detection numbers are still conditions only |
| Presentation | 2 | 2 | Unchanged until a demo, project page and public link exist (minimum requirements) |

Submission eligibility is unchanged: without a public link and a demo, the 2025 rules score the project 1.
