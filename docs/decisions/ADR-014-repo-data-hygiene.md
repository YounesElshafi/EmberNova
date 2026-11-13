# ADR-014: Read-only corpus, reproducible build, gitignored payloads

- **Status:** Accepted (2026-11-13)
- **Problem:** `data/` (1 GB) was untracked and not ignored, and the originals must never be modified.
- **Decision:**
  - `data/` is read-only by policy, as stated in AGENTS.md.
  - Raw payloads, large manifests and indexes, `build/`, `var/` and `*.db` are gitignored. Small metadata, docs and curation YAML stay tracked.
  - `embernova-build all` regenerates all outputs from `data/` and `curation/`, verifying sha256 as it goes.
- **Consequences:** new contributors must copy the corpus snapshot separately. `data/DOWNLOAD_MANIFEST.csv` and `tools/download.py` can reproduce it.
- **Reverse if:** a shared artifact store exists, such as a release asset containing the deploy bundle.
