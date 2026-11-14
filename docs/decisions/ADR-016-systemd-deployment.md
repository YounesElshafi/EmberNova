# ADR-016: systemd service behind the shared nginx, not a container

- **Status:** Accepted (2026-11-14). Supersedes the "one lean Docker image" part of [ADR-012](ADR-012-deployment-judge-resilience.md). Judge Mode, the budget guard and the per-visitor limits from ADR-012 still apply.
- **Problem:** The team VPS (Ubuntu 24.04, 2 vCPU, 7.8 GB RAM, shared with about 20 other production sites) has no Docker engine. Every other Python app on it runs as a systemd unit with a venv behind the host's nginx and certbot.
- **Decision:**
  - Run EmberNova as the `embernova.service` systemd unit: uvicorn, one worker, `127.0.0.1:8020`, a dedicated `embernova` system user, `ProtectSystem=strict`, and only the state directory writable. Memory is capped at 1.6 GB and CPU at 150%.
  - Use release directories at `/var/www/embernova/releases/<git-sha>`, each with its own venv installed from `backend/uv.lock`, and an atomic `current` symlink. Rollback means pointing `current` at the previous release and restarting.
  - The corpus build (`knowledge.db`, Analysis Bundle, PDFs, media, replays) sits once in `shared/build` and is read-only to the service. Mutable state is in `shared/state/app.db`. Secrets are in `shared/.env` (mode 640).
  - The existing nginx terminates TLS with a Let's Encrypt certificate (certbot webroot, plus a per-certificate reload hook). It serves hashed assets directly, overwrites `X-Forwarded-For`, and applies request and turn rate limits.
- **Alternatives:** installing Docker on a shared production host (rejected: new daemon, firewall interaction with ufw, and no benefit for one Python process) and the Hugging Face Space (kept as the fallback).
- **Consequences:** `deploy/systemd/`, `deploy/nginx/` and `deploy/deploy.sh` are the production path, documented in [docs/DEPLOYMENT.md](../DEPLOYMENT.md). `deploy/Dockerfile` and `deploy/compose.yaml` stay as an unverified alternative.
- **Reverse if:** Docker becomes standard on the host or the app moves to a dedicated VM.
