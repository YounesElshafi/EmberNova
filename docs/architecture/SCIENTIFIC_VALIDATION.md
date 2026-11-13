# Scientific reliability architecture

Canonical for: how EmberNova avoids confidently wrong science. Each risk maps to concrete mechanisms and to a test. We don't build a compliance bureaucracy; these safeguards are targeted.

## 1. Risk → safeguard → test

| # | Risk | Safeguards | Verified by |
| --- | --- | --- | --- |
| R1 | Unsupported scientific claims | Answer template with claim-type sections; uncited-sentence audit; "Limits of the evidence" section required | Agent scenario tests: audit `uncited_sentences` = 0 on demo questions |
| R2 | Fabricated citations | Deterministic evidence IDs issued only by tools; validator strips unknown IDs; the UI resolves every citation via `/api/evidence/{id}` | Unit test: injected fake marker removed; e2e: every footnote opens |
| R3 | Invented experimental conditions | The model can only state numbers obtained through `query_measurements` and similar tools; numeric-grounding audit (P1); curation YAML is the only path to column semantics | Golden extraction tests; numeric-grounding test |
| R4 | Mixing data from different runs | `run_uid` scoped to table; every row-set evidence lists its run_uids; joins only on curated keys (CFI `Flex Number`) | Join tests (CFI 87 tests ↔ DataSummary) |
| R5 | Missing units | `value_si` null unless the unit is declared or parsed; `missing_unit` flag; charts refuse unitless numeric axes unless the quantity is dimensionless | Test: Saffire cells with embedded units parse; a unitless column refuses to chart |
| R6 | Incorrect unit conversion | pint only; mmHg constant defined; round-trip tests | `tests/science/test_units.py`: 760 mmHg = 101,325 Pa ± 0.01%; 540 mmHg ≈ 10.44 psi |
| R7 | Comparing incompatible experiments | `compare_runs` validity rules; the agent must quote the verdict | Test: FLEX vs CFI K comparison → `comparable_with_caveats` (definition note); FLEX-2 design vs FLEX measured → `not_comparable` |
| R8 | Correlation presented as causation | Fixed association sentence on comparison artifacts; confounder rule; system-prompt rule | Scenario test on the demo comparison: answer text contains "confounded" or the equivalent verdict |
| R9 | Misreading O₂ concentration | Three separate variables (X_O₂, P, p_O₂); envelope shows p_O₂ isolines; CFI-G burner-side O₂ labeled as such | Envelope test: CFI-G points carry the `burner_side_o2` label |
| R10 | Pretending lunar or Martian measurements exist | `gravity_regime` on every run; the envelope always marks gravity `outside` for non-µg scenarios; supplemental NTRS sources labeled simulated | Scenario J5 ("Mars Nomex") test: no numeric prediction; contains the gravity note |
| R11 | Generated images used as evidence | SI images are a separate artifact type (`si_illustration`) that cannot be cited as evidence (no evidence ID is issued); watermark; badge | Unit test: `si_illustration` has no evidence ID; the validator rejects citations to it |
| R12 | Model used outside its validated scope | The P2 model refuses outside the hull, with an explicit scope label; there is no model at all if the gate fails | Model tests (P2) |
| R13 | Visible-flame extinction misread as combustion end | Profile limitation for FLEX and CFI (cool flames); system-prompt rule | Profile review |
| R14 | Design ranges treated as measured (FLEX-2) | `value_kind=design`; separate plotting style; comparison fail rule | Golden test |
| R15 | Over-trusting SI-drafted investigation profiles | `curation_status` badge "SI-drafted" until reviewed; every key finding needs an evidence locator that resolves at build time | Build fails on an unresolved locator |

## 2. Uncertainty communication

- **Measured values** show the source qualifier (approx, range) and the source uncertainty where it is provided.
- **Group statistics** show n, median and IQR rather than mean ± SD. The samples are small and non-normal.
- **Evidence strength** for the agent's findings is a categorical badge computed deterministically from cited evidence. It is not chosen by the model.
  - **Strong:** at least one `data_rows` evidence with n ≥ 3 per group, plus a corroborating `document_span`.
  - **Moderate:** either one, but not both.
  - **Limited:** document-only from a single source, or n < 3.

  The badge is rendered next to each Evidence bullet.

## 3. What the system refuses

The system refuses these outright, explaining why and pointing to the closest evidence:
- numerical fire-risk scores or percentages;
- partial-gravity numerical predictions;
- certification statements ("material X is safe for the lunar habitat");
- outcomes for materials or atmospheres outside the envelope.

Refusal copy is constructive: what *is* known, what experiments would close the gap (e.g. FM2, LUCI data releases), and which investigations are the nearest analogues.

## 4. Human review points

Before the demo, these need a team member's or Claude's review:
- the 10 priority investigation profiles;
- the FLEX, CFI, Saffire-III and BASS-II mapping YAML;
- the three featured replays, read in full for factual accuracy.
