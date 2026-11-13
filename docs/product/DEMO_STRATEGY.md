# Demo strategy

**Constraints from the 2026 rules:**
- The demo is a **≤30 s video OR ≤7 slides**. Exceeding either is disqualifying.
- A video may be narrated in another language, but it needs English subtitles.
- The live link must be public with no login, and it must stay up until Jan 26 2027.

**Recommendation:** use a **30 s video** (strongest for Presentation), and also link a 7-slide deck in the project description as a supplementary resource. The team decides.

## 1. Primary scenario: "Lunar habitat atmosphere"

**Question, typed live:**
> "We're designing a lunar habitat at about 30–34% oxygen and ~10 psi. What do NASA microgravity experiments tell us about flammability and fire suppression in that atmosphere?"

**Expected flow.** These are all real data; see [DATASET_AUDIT.md](../research/DATASET_AUDIT.md).

1. **Ranked investigations** with "why ranked":
   - FLEX (suppression; tests at 0.30 and 0.34 O₂ near 540 mmHg)
   - CFI-G (highest O₂ in µg, inverse flames up to 0.85)
   - FLEX-2 (design conditions include 0.30 O₂ and 0.5–3 atm)
   - BASS-II and Saffire (solid materials, O₂ ≤ ~22%)
2. **Applicability Envelope:**
   - X_O₂ vs total pressure (psi), with the lunar preset band.
   - FLEX points light up at 0.30 and 0.34 O₂ near 10.2–10.4 psi.
   - Solid-material investigations sit outside the band. That gap is itself a finding: no PSI solid-material tests at lunar-habitat O₂ in this local corpus.
3. **Comparison artifact:**
   - FLEX methanol and heptane K and D_ext at 1 atm air vs ~0.71 atm / 0.34 O₂.
   - Validity panel: same hardware (MDCA/CIR), same fuels; **O₂ fraction and pressure both differ, so the effects are confounded**. O₂ partial pressure is shown (≈184 vs ≈160 mmHg).
4. **d²-law check** confirms the K values are internally consistent (ratio ≈ 1 for most tests) and lists flagged tests.
5. **Media:** FLEX MDCA view video, labeled "FLEX raw data video; run association: none / inferred".
6. **Citations** to NASA/TP-2015-216046 pages and FLEX table rows.
7. **What this cannot tell you:**
   - droplets ≠ fabrics or plastics
   - microgravity ≠ lunar 1/6 g
   - no PSI partial-gravity data
   - LUCI and KC-135 are simulated reduced-gravity supplemental reports
   - next experiments needed (FM2, LUCI data release)

## 2. Backup scenario: "Detection" (Saffire-III)

> "How did spacecraft smoke detectors respond during the Saffire-III large-scale fire?"

Show:
- a timeline with radiometer channels and Cygnus FIZ smoke-detector obscuration and scatter;
- context from SAME and SAME-R on particle-size effects;
- citations to the Saffire README, telemetry files and ICES papers.

## 3. Fallback scenario: "Ventilation and solids"

> "How does ventilation airflow affect solid-material flame spread in microgravity?"

This one is document-led. It uses the BASS-II publications (opposed-flow thermal regime, critical flow velocity for radiative extinction) and the Saffire flow conditions table.

## 4. Featured sessions (Judge Mode)

Record **three real sessions**, one for each scenario above, from the production build. Store their event logs as replays. The UI labels them "Recorded session — replayed without live SI calls (recorded <date>, model <id>)".

## 5. Thirty-second video script

The draft is for the team to adapt. Burn in English subtitles.

| Time | Visual | Line |
| --- | --- | --- |
| 0:00–0:03 | Team name over the EmberNova logo (no NASA logo) | "We're team EmberNova." |
| 0:03–0:07 | Mir / Apollo 1 reference text, then a flame in microgravity (FLEX video) | "Fire in a spacecraft has nowhere to go, and in microgravity flames behave differently." |
| 0:07–0:12 | Typing the lunar-habitat question; ranked investigations appear | "EmberNova is an SI research workspace over NASA's PSI combustion data." |
| 0:12–0:20 | Envelope plot lights up FLEX points; comparison with validity warning; citation opens the NASA report page | "It finds the experiments that match your habitat atmosphere, compares real measurements, checks them with physics, and cites every number." |
| 0:20–0:30 | Lunar base illustration labeled "SI-generated illustration" with watermark, or a plain UI shot | "So the next giant leap is a safer one, built on evidence, not guesses." |

## 6. Seven-slide outline

1. **Title:** EmberNova, team members, challenge name.
2. **Problem:** fire in crewed spacecraft; 13.5 TB of PSI data that is hard to find, compare and interpret.
3. **Solution:** a screenshot of the three-pane workspace.
4. **How it works:** the agent plus deterministic tools, the Analysis Bundle and the evidence ledger (diagram).
5. **Science we can defend:** Envelope; validity panel; d²-law check; claim types.
6. **NASA data used:** FLEX, CFI, CFI-G, BASS-II, Saffire, SAME-R, plus DOIs; the SI-usage disclosure.
7. **Impact and future:** lunar habitat design support; adding LUCI and FM2 data when PSI publishes it; an education mode.

## 7. Likely judge questions

| Question | Answer |
| --- | --- |
| "Is this just ChatGPT over PDFs?" | No. Numbers come from normalized NASA tables through deterministic tools. Citations are validated against an evidence ledger, and charts never come from the model. |
| "Can it predict lunar fire behavior?" | No, and it says so. PSI has no partial-g data. We show which tests bracket the atmosphere and what experiments are missing. |
| "How do you know the units are right?" | Curated mappings, each tied to source pages (e.g. FLEX K in mm²/s per the TP tables), plus a physics consistency check and golden tests. |
| "What did SI generate?" | The agent's prose and the analysis code in Analysis Lab, both badged. The architecture and code were SI-assisted, and the submission discloses this. |
| "How much NASA data?" | 34 investigations, 274 verified original files, 93 documents and 3.2k pages locally, out of a 13.5 TB PSI inventory. The deferred items are tracked in the manifest. |

## 8. Required disclosures (project page and About page)

- The SI-usage statement: which parts used SI, and how.
- The data snapshot date and the local-subset limitation.
- Not certified engineering guidance.
- No partial-gravity PSI data.
- Media labeled "representative" where applicable.
