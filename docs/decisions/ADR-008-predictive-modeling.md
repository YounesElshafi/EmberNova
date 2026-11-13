# ADR-008: No general fire-risk predictor; Applicability Envelope and gated droplet model

- **Status:** Accepted (2026-11-13)
- **Problem:** Objective 2 asks for "data that supports predictive modeling". Should EmberNova predict flammability?
- **Evidence:**
  - Structured outcomes are heterogeneous across droplet, gas and solid experiments.
  - Solid flame-spread outcomes are mostly in papers, not tables.
  - PSI holds no partial-gravity data.
  - FLEX gives about 200 usable runs across 90 condition groups for droplet K and D_ext ([DATASET_AUDIT.md](../research/DATASET_AUDIT.md)).
- **Options:** a universal ML risk model; a physics-informed NN; per-domain empirical models; **no model plus an envelope**.
- **Decision:**
  - **P0:** the Applicability Envelope, the d²-law consistency check, descriptive statistics, and an exportable Analysis Bundle for external modelers.
  - **P2:** a FLEX-only droplet K/D_ext model, shipped **only if** it passes the gate in [SCIENTIFIC_ANALYSIS.md §6](../architecture/SCIENTIFIC_ANALYSIS.md): grouped cross-validation, a ≥15% improvement over the baseline, calibrated intervals, and refusal on out-of-distribution input.
- **Reasons:** scientific validity is a judging criterion, and a wrong prediction does more harm than an honest map of what has been tested.
- **Consequences:** the demo story is "what is tested vs untested", not "risk = 73%".
- **Reverse if:** PSI publishes LUCI or FM2 run data, or solid-material spread tables become available. Revisit per domain at that point.
