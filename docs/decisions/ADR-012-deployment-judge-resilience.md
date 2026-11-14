# ADR-012: Single container on the team VPS, with Judge Mode

- **Status:** Accepted (2026-11-13). The team chose the host. **Partly superseded by [ADR-016](ADR-016-systemd-deployment.md):** production runs as a systemd service, not a container.
- **Problem:** Keep a public, responsive demo alive until Jan 26 2027 on a small shared VPS while keeping API cost bounded.
- **Decision:**
  - One lean Docker image behind the VPS reverse proxy at `embernova.khedmetak.com`. It needs at most 768 MB RAM and runs no local ML models. Data comes from a read-only deploy volume of about 600 MB.
  - **Judge Mode:** recorded featured sessions replay without any API calls, and every explorer works without an API key.
  - A budget guard (default $5/day), per-IP limits, a fallback model, and a cache for first-turn answers.
  - A Hugging Face Docker Space as the fallback host.
- **Alternatives:** a new paid VM, a PaaS free tier (these sleep), or a local-only demo.
- **Consequences:** a preflight checklist ([DEPLOYMENT.md §2](../architecture/DEPLOYMENT.md)) and a lean profile for when resources are short.
- **Reverse if:** the VPS lacks the resources. Then use the Hugging Face Space or a small dedicated VM.
