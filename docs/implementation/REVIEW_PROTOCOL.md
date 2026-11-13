# Review protocol (Claude Code reviewing Codex)

## 1. When

- After each milestone report, Claude Code writes a light review.
- At the **checkpoint** after M5, the review is full.
- Before submission (after M8), Claude Code does a release review.

## 2. Procedure

1. Read the PROGRESS_LOG entry and the milestone's acceptance criteria.
2. **Reproduce.** Run the backend and frontend tests, the build, the eval commands and the relevant Playwright flows. Don't rely on the reported output.
3. Inspect the diff against the canonical docs: module layout, contracts, names and vocabulary.
4. Run a scientific spot-check:
   - pick 5 random runs from each new bundle table and compare them with the raw source rows;
   - verify the units and qualifiers;
   - check one comparison and one envelope output by hand.
5. Run the agent on A1 and A4 (when live). Read the full answer and click every citation.
6. Check security:
   - secrets handling;
   - file-serving by ID only;
   - no model code executed locally;
   - Code Interpreter inputs limited to bundle files.
7. Check performance: the latency of the key endpoints, and the memory footprint.
8. Check UX: can a judge complete flows 1–8 (TESTING §6) unaided?
9. Write `docs/implementation/reviews/<MILESTONE>-review.md`.

## 3. Review dimensions

Architectural compliance · functional correctness · scientific correctness · data provenance · security · performance · maintainability · UX and judge-readiness · SI-rule compliance.

## 4. Severity scale

| Severity | Meaning | Fix by |
| --- | --- | --- |
| **S1 Critical** | Wrong science shown as fact; fabricated or broken citations; secret exposure; model code runs on the VPS; data/ modified; the demo flow is broken | Before any further feature work |
| **S2 Major** | Contract violation; missing provenance or SI label; a failing acceptance criterion; a crash on a common path | Before the next milestone |
| **S3 Minor** | Degraded UX; missing tests on edge cases; performance below target but usable | When convenient, before release |
| **S4 Nit** | Style and naming | Optional |

## 5. Finding template

```markdown
### [S2] <short title>
- **Component:** backend/src/embernova/tools/compare.py (compare_runs)
- **Evidence:** `uv run pytest tests/science/test_compare.py::test_flex_confounded -q` → FAILED (verdict "comparable"); or file:line.
- **Expected:** verdict `comparable_with_caveats` with the n_differing_conditions warning naming o2_mole_fraction, total_pressure (SCIENTIFIC_ANALYSIS §4).
- **Actual:** pressure tolerance applied in mmHg instead of relative %, so the groups are treated as equal.
- **Fix:** compute relative difference on SI values; tolerance 3%.
- **Verification:** the test above passes; Playwright flow 6 shows the warning.
```

## 6. Outcomes

Each review ends with one of these verdicts:
- **Approved:** proceed.
- **Approved with fixes:** S1 and S2 items listed, then proceed.
- **Blocked:** an architectural failure. Claude updates the spec, then Codex reworks.

Claude does not rewrite Codex's code. Corrective instructions go through the review file and, if needed, through an updated spec or ADR.
