# EmberNova local container deployment

Build the immutable corpus into `build/` and run `npm ci && npm run build` in `frontend/` before building the image. `data/` stays read-only; the compose file mounts `build/` and `data/` read-only and keeps mutable application state in a named volume. Set secrets in the host environment or a private environment file, never in source control.

From `deploy/`, run `docker compose config`, then `docker compose up --build`. The service binds only to host loopback port 8000. Put an HTTPS reverse proxy in front of it that **overwrites** `X-Forwarded-For`; the API is configured to trust that header. Check `/api/health` for HTTP 200 before routing public traffic. HTTP 503 means the corpus or frontend build is unavailable. This compose file does not configure the external proxy or certificates.
