# ADR-011: Media derivatives and filename-inferred run association

- **Status:** Accepted (2026-11-13)
- **Problem:** Serve 21 videos (314 MB, including `.ts` files) and 18 images efficiently, and link them to runs when there's no association metadata.
- **Decision:**
  - At build time, ffmpeg writes H.264 720p `+faststart` derivatives, posters and webp thumbnails to `build/media/`. The originals are left untouched.
  - Curated regex rules over filenames (e.g. `TEST_T21`, `LCTF030`, `F146A05`) infer run association. Each match is stored as `association=inferred_from_filename` with its `rule_id`.
  - NASA outreach media is labeled "representative", and any conflict between caption and filename is shown.
- **Rejected:**
  - Visual embeddings: too few items to justify them.
  - Serving originals: `.ts` files don't play in browsers, and the files are large.
- **Consequences:** media cards always show the association type. Videos stream with Range support.
- **Reverse if:** PSI metadata provides explicit run links. Then prefer `from_metadata`.
