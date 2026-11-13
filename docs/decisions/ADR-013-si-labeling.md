# ADR-013: SI labeling, watermarking and no NASA marks

- **Status:** Accepted (2026-11-13)
- **Problem:** The 2026 Space Apps rules require:
  - visible watermarks on SI-generated images and video;
  - acknowledgment of SI-generated code and data, in text and in metadata;
  - no NASA branding in generated content.
- **Decision:**
  - Every artifact carries `labels.si_generated`.
  - An "SI" badge appears on SI prose, SI code, SI-drafted profiles and illustrations.
  - The server applies a Pillow watermark to images and writes PNG metadata.
  - SI illustrations can never be cited as evidence.
  - The UI and copy say "SI".
  - No NASA insignia appears anywhere.
  - The About page includes the SI-usage statement.
- **Consequences:** small additions to the UI and the data model, plus a disclosure text for the submission.
- **Reverse if:** the rules change. Labeling stays good practice regardless.
