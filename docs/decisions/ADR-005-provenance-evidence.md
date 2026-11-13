# ADR-005: Deterministic evidence IDs and server-side citation validation

- **Status:** Accepted (2026-11-13)
- **Problem:** Make every scientific claim traceable and prevent fabricated citations.
- **Options:** model free-text citations; provider-native citation features; **tool-issued evidence IDs, cited by marker and validated server-side**.
- **Decision:**
  - Tools register evidence with deterministic IDs derived from canonical locators. The model cites them as `[[ev:ID]]`.
  - The backend strips unknown IDs, checks claim-kind consistency, counts uncited factual sentences and, in P1, checks numeric grounding.
  - Provenance carries the file sha256, PSI/NTRS IDs, versions, page or row locators, and the transforms applied.
- **Reasons:**
  - It is provider-independent and testable.
  - It behaves identically in replays.
  - The UI can resolve any citation instantly.
- **Consequences:** the prompt must teach the marker format, and the validator is a P0 component with unit tests.
- **Reverse if:** the model systematically ignores markers (more than 20% uncited sentences on the demo questions). Then add a constrained structured-output step that produces "evidence bullets".
