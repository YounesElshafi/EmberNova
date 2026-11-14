# Deployment and operations

Canonical for: hosting, container, data shipping, Judge Mode operations, and the fallback. Rationale: [ADR-012](../decisions/ADR-012-deployment-judge-resilience.md).

> **As deployed (2026-11-14):** the VPS has no Docker engine. Production runs as a systemd service behind the host's nginx ([ADR-016](../decisions/ADR-016-systemd-deployment.md)). The operations runbook is [docs/DEPLOYMENT.md](../DEPLOYMENT.md). §3–§4 and §7 below describe the original container plan and are kept as the alternative path. §5 (Judge Mode) and §6 (budget) still apply.

## 1. Target

- **Primary:** the team's VPS at **`https://embernova.khedmetak.com`**. It is small and shared with other sites. TLS is terminated by the VPS's existing reverse proxy (nginx or Caddy).
- **Fallback:** a Hugging Face Docker Space running the same image, with the data volume baked into the image because Spaces have no rsync volume. It sleeps when idle, which is acceptable only as a fallback.
- **Uptime window:** from submission (Nov 15 2026) until **at least Jan 31 2027**, after the Global Winners are announced on Jan 26.

## 2. VPS preflight checklist

The team runs this before M8.

| Check | Minimum | Command |
| --- | --- | --- |
| Free RAM | ≥ 1 GB available (the container is limited to 768 MB) | `free -m` |
| Free disk | ≥ 3 GB (image ~0.6 GB, data ~0.6 GB, logs, headroom) | `df -h` |
| Docker + Compose | Docker ≥ 24, Compose v2 | `docker version; docker compose version` |
| Reverse proxy | Can add a vhost for `embernova.khedmetak.com` → `127.0.0.1:8080` with TLS | Existing config |
| DNS | A or AAAA record for `embernova.khedmetak.com` points to the VPS | `dig embernova.khedmetak.com` |
| Outbound HTTPS | Reaches `api.openai.com` | `curl -I https://api.openai.com` |

If RAM or disk is short, use the **lean profile**: no PDFs (link out to NTRS and PSI instead), video at 480p, `FEATURE_ANALYSIS_LAB=false`. Or switch to the Hugging Face fallback.

## 3. Container

- **Image:** a multi-stage `deploy/Dockerfile`.
  1. `node:20-alpine` builds `frontend/dist`.
  2. `ghcr.io/astral-sh/uv:python3.12-bookworm-slim` installs the backend with `uv sync --frozen --no-dev`.
  3. The final image is `python:3.12-slim`, a non-root user `embernova`, with `frontend/dist` copied to `/app/static`.

  **There is no build tooling in the runtime image: no PyMuPDF, ffmpeg, tiktoken or openpyxl** (an optional `build` dependency group). The target image size is ≤ 400 MB.
- **Run:** `uvicorn embernova.main:app --host 0.0.0.0 --port 8080 --workers 1 --proxy-headers --forwarded-allow-ips=<proxy ip>`.
- **`deploy/compose.yaml`:**
  ```yaml
  services:
    embernova:
      image: embernova:latest
      restart: unless-stopped
      ports: ["127.0.0.1:8080:8080"]
      env_file: .env            # OPENAI_API_KEY, DAILY_BUDGET_USD, ADMIN_TOKEN, PUBLIC_BASE_URL
      environment: {EMBERNOVA_BUILD_DIR: /data/build, EMBERNOVA_VAR_DIR: /data/var}
      volumes: ["./deploy-data/build:/data/build:ro", "./deploy-data/var:/data/var"]
      mem_limit: 768m
      cpus: "1.0"
      read_only: true
      tmpfs: ["/tmp"]
      logging: {driver: json-file, options: {max-size: "10m", max-file: "3"}}
      healthcheck: {test: ["CMD", "python", "-c", "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8080/api/health')"], interval: 30s}
  ```
- **The proxy vhost** passes `X-Forwarded-For` and `X-Forwarded-Proto`, sets `client_max_body_size 64k` for `/api/sessions`, **disables buffering for SSE** (`proxy_buffering off; proxy_read_timeout 300s;` under nginx), and allows Range requests for `/api/media`.

## 4. Shipping data

1. On the dev machine: `uv run embernova-build all`, then `uv run embernova-build deploy-bundle`. This produces `build/deploy/` with `DEPLOY_MANIFEST.json` (sha256 per file). The target is ≤ 600 MB.
2. `rsync -av --checksum build/deploy/ vps:/srv/embernova/deploy-data/build/`
3. On the VPS: `docker compose up -d`, then `curl https://embernova.khedmetak.com/api/health`.
4. Record the featured replays (§5). They are written to `var/` and copied into `build/replays/` in the next bundle, so they survive restarts.

## 5. Judge Mode operations

1. With the production config, run the three demo questions live ([DEMO_STRATEGY.md](../product/DEMO_STRATEGY.md)) and review the answers for accuracy (the human review point in [SCIENTIFIC_VALIDATION.md §4](SCIENTIFIC_VALIDATION.md)).
2. `POST /api/admin/replays/record` for each session, with `X-Admin-Token`.
3. Check `/featured` in a private browser window with the API key temporarily unset. Everything must still work.

## 6. Budget and monitoring through January

- Set `DAILY_BUDGET_USD=5` and a hard monthly limit in the OpenAI dashboard: the project budget is the team's decision.
- A weekly check covers `GET /api/meta` (`budget_used_pct`), `docker compose logs --since 168h | grep ERROR`, and disk usage.
- A hard limit of $5/day means at most ~$380 over the window in the worst case. Expected usage is far lower. **Set the dashboard cap to whatever the team can afford.**
- If the key is exhausted or revoked, the app degrades to Explorers plus replays automatically (`llm_available=false`).

## 7. Rollback

Image tags are `embernova:<git-sha>`. To roll back, change the tag in `compose.yaml` and run `docker compose up -d`. Data bundles are versioned by `bundle_version`, and the previous bundle directory is kept until the next release passes its health check.
