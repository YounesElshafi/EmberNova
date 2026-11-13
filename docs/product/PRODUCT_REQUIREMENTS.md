# Product requirements

## 1. Users and jobs

| User | Job to be done | Primary objective |
| --- | --- | --- |
| Spacecraft / habitat fire-safety engineer | "Which NASA tests are relevant to my atmosphere, materials and ventilation, and what did they find?" | O1, O3 |
| Combustion researcher / grad student | "Give me the measured data, its conditions and provenance, so I can compare or model it" | O2 |
| Professor / student | "Explain what happened in this experiment and show me the evidence" | O1 (education is P3) |
| Hackathon judge | "Within 3 minutes: is this real, correct and useful NASA-data work?" | All |

## 2. Critique of the original vision

These are our answers to the 10 questions in the brief.

1. **Highest scientific value:** provenance-linked measured data with unit normalization; comparison validity; the Applicability Envelope; page-level citations. These are what make answers *checkable*.
2. **Best fit to NASA's objectives:**
   - investigation ranking with explanations (O1)
   - a normalized, exportable Analysis Bundle and the Envelope (O2)
   - the prevention/detection/suppression facets and an evidence-separated "engineering implications" section (O3)
3. **What distinguishes us from a chatbot:**
   - deterministic charts from real rows
   - the validity panel
   - the envelope
   - the d²-law physics check that *verifies NASA's own table*
   - original video next to the data
   - citations that are validated, not generated
4. **Expensive with little added value:**
   - multi-agent orchestration
   - GraphRAG
   - visual embeddings
   - SI-generated "flame simulations"
   - a universal fire predictor
   - free-form SI-authored charts
5. **Unlikely to work reliably in the hackathon:**
   - a general predictive model
   - OCR of 433 pages
   - run-level media linkage beyond filename IDs
   - BASS-II flow-velocity reconstruction
   - generated video
6. **Depends on data that may not exist:**
   - lunar or Martian measurements: none in PSI
   - flame-spread-rate tables for BASS and BASS-II: only in papers
   - run-linked images for most investigations
   - FLEX video for the exploration-atmosphere tests: not local (see [DATASET_AUDIT.md §4](../research/DATASET_AUDIT.md))
7. **Overlooked risks:**
   - lossy CSV headers, where a wrong unit means a wrong science claim
   - design-vs-as-run confusion in FLEX-2
   - pressure and O₂ confounded in exploration-atmosphere tests
   - "extinguished" vs cool-flame persistence
   - API cost during the 10-week judging window
   - 2026 SI labeling rules
   - shared-VPS limits
8. **UX improvements worth the cost:**
   - an evidence inspector that opens the exact PDF page or table rows
   - claim-type badges
   - a "why ranked" breakdown
   - raw ⇄ normalized toggle
   - habitat presets
   - featured sessions for judges
9. **What NASA researchers would expect that wasn't listed:**
   - data export (CSV/Parquet) with a provenance manifest
   - DOI and citation export
   - visibility of within-investigation variable ranges ("what changed between tests")
   - hardware-family context
   - data-quality flags
10. **Simpler without losing quality:** one agent; SQLite and Parquet; deterministic tools; no graph DB; no vector DB; no local ML models; one container.

**Evaluation of the proposed additions:**

| Proposal | Verdict | Priority |
| --- | --- | --- |
| Experimental condition matching (Envelope) | Adopt. Directly answers the lunar question honestly | P0 |
| Automated dataset quality checks | Adopt. Low cost; flags feed the UI and the agent | P0 |
| Comparison validity scoring | Adopt as a **validity checklist**, not a single score | P0 |
| Research-gap identification | Adopt as envelope gap shading over the *local* corpus | P1 |
| Source-linked experiment timelines | Adopt for Saffire-III telemetry | P1 |
| Evidence-based hypothesis generation | Restricted to a "Hypotheses / open questions" section; never presented as findings | P0 (copy only) |
| Literature-to-data alignment | Partial: link TP pages to FLEX rows via test IDs | P1 |
| Reproducible analysis artifacts | Adopt. Every artifact has a reproducibility record | P0 |

## 3. Feature catalog

Effort is Codex-hours (estimates).

| ID | Feature | Pri | Depends on | Effort | Data | Risk | Fallback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F1 | Knowledge build (catalog, profiles, chunks, FTS, embeddings, media index) | P0 | `data/` | 5 | all text | Med | BM25-only if embeddings fail |
| F2 | Analysis Bundle and quality checks (FLEX → CFI → Saffire-III → BASS-II → SAME-R → CFI-G → ACME → SPICE) | P0 | F1 catalog | 6 (FLEX 2) | T1 tables | **High** (mappings) | Ship FLEX+CFI only |
| F3 | Investigation discovery and ranking with explanation | P0 | F1 | 3 | profiles | Med | Text-only ranking |
| F4 | Research chat (streaming agent, tools, evidence ledger, citations) | P0 | F1–F3, F5 | 8 | — | High | Judge Mode replays |
| F5 | Deterministic charts (ChartSpec → Plotly) | P0 | F2 | 3 | bundle | Low | Table view |
| F6 | Investigation Explorer (overview, variables, datasets, docs, media, related) | P0 | F1, F2 | 4 | — | Low | — |
| F7 | Dataset Explorer (raw/normalized, filters, export) | P0 | F2 | 3 | — | Low | — |
| F8 | Evidence inspector (page text plus PDF page, table rows) | P0 | F1, F2 | 3 | PDFs | Low | Page text only |
| F9 | Run comparison with validity panel | P0 | F2 | 4 | — | Med | Side-by-side table only |
| F10 | Applicability Envelope / Habitat presets | P0 | F2 | 3 | conditions | Low | Static plot |
| F11 | d²-law consistency check | P0 | F2 FLEX/CFI | 1.5 | — | Low | — |
| F12 | Media viewer (video, image, poster; association labels) | P0 | F1 media | 2.5 | derivatives | Low | Images only |
| F13 | SI labeling (badges, metadata, watermark utility) | P0 | — | 1 | — | Low | — |
| F14 | Judge Mode (featured replays), budget guard, rate limit | P0 | F4 | 3 | — | Low | Static screenshots |
| F15 | Deployment (Docker, VPS, HF fallback) | P0 | all | 3 | — | Med | HF Space |
| F16 | Evaluation harness (retrieval benchmark, golden extraction, agent scenarios) | P0 min / P1 full | F1–F4 | 3 | benchmark YAML | Low | Manual checklist |
| F17 | Analysis Lab (Code Interpreter) | P1 | F2, F4 | 5 | bundle upload | Med | Feature off |
| F18 | Saffire-III telemetry timeline (radiometer vs smoke detector) | P1 | F2 | 2.5 | telemetry | Med | Static chart |
| F19 | Research-gap view | P1 | F10 | 1.5 | — | Low | — |
| F20 | Relationship view (investigation, hardware, publication) | P1 | F1 | 2 | relations | Low | List view |
| F21 | Numeric-grounding audit of answers | P1 | F4 | 2 | — | Med | Citation check only |
| F22 | Gated empirical droplet model | P2 | F2, F16 | 5 | FLEX+CFI | High | Not shipped |
| F23 | SI conceptual illustrations (watermarked) | P2 | F13 | 2 | — | Low | Static SVG diagrams |
| F24 | OCR of empty pages | P2 | F1 | 3 | 433 pages | Med | — |
| F25 | University and children's experiences | P3 | — | — | — | — | Module boundary only |

## 4. Acceptance criteria (product level)

Task-level criteria live in [CODEX_MASTER_PLAN.md](../implementation/CODEX_MASTER_PLAN.md).

- **F3:** for the 30-question benchmark, investigation-level Recall@5 ≥ 0.85 and MRR ≥ 0.7. Every ranked item shows a score breakdown.
- **F4:**
  - First token ≤ 4 s p50 and a complete answer ≤ 45 s p90 on the demo questions. These are targets, not measurements.
  - 100% of `[[ev:…]]` markers resolve.
  - Every answer has the sections defined in [AI_ARCHITECTURE.md §5](../architecture/AI_ARCHITECTURE.md).
  - The agent refuses lunar-g numerical predictions.
- **F2:** golden tests pass for FLEX (K unit, O₂/N₂/CO₂/He mapping, mmHg), CFI join, Saffire cell parsing and FLEX-2 `design` qualifier. A quality-flag summary is generated.
- **F9:** comparing FLEX 1 atm air vs 0.34 O₂ / ~540 mmHg shows ≥ 2 confounders (O₂ fraction and pressure both differ) and states that no causal attribution is possible.
- **F10:** the preset "Lunar habitat (30% O₂, 10.2 psi)" highlights the FLEX tests in the 0.30 and 0.34 O₂ groups near ~540 mmHg, and lists the investigations with no tests in range.
- **F12:** the FLEX MDCA video plays in Chrome and Firefox with range requests. Every media card shows source file, investigation and association type.
- **F13:** every SI-generated artifact shows the SI badge and has `si_generated: true`. Image artifacts carry a visible watermark.
- **F14:** with `OPENAI_API_KEY` unset, the app loads, the Explorers, charts and Envelope work, and featured replays play.

## 5. User journeys

**J1: Engineer, lunar habitat (primary demo).**
1. The engineer asks a question.
2. They see the agent's tool activity: "Searching investigations…", "Querying FLEX measurements…".
3. They get an answer with sections and citations.
4. They click a citation, and the TP page opens in the right panel.
5. They click the Envelope artifact and hover a FLEX point to see its run row.
6. They ask a follow-up: "Compare burning rate at air vs the 34% O₂ case." A comparison artifact appears with a validity panel.
7. They open the FLEX video.
8. They export the CSV, which comes with provenance.

**J2: Researcher, data-first.**
1. Investigations → FLEX → Variables tab ("what changed between tests").
2. Datasets → FLEX table with the raw ⇄ normalized toggle.
3. Quick chart: K vs X_O₂, colored by diluent.
4. Run the d²-law check.
5. Export.

**J3: Detection.**
1. "How did spacecraft smoke detectors respond during Saffire-III?"
2. A timeline artifact shows radiometers and smoke-detector obscuration, with citations to the Saffire README and ICES papers.

**J4: Judge, no API.** `/featured` → pick a featured question → the real recorded session replays → open artifacts → Explorer.

**J5: Unsupported question.** "Predict whether Nomex ignites on Mars." The agent explains:
- no PSI partial-g data exists;
- it shows the closest evidence: Saffire, BASS-II, KC-135 simulated Mars g (supplemental);
- it lists the experiments that would be needed.

There is no number.
