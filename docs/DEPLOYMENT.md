# Deployment and operations runbook

Production: **https://embernova.khedmetak.com**. The design rationale is in [ADR-016](decisions/ADR-016-systemd-deployment.md).

## Layout on the VPS

```
/var/www/embernova/
├── current -> releases/<git-sha>     # active release (atomic symlink)
├── previous_release                  # path of the release before the last deploy
├── releases/<git-sha>/               # git archive of that commit + frontend/dist + .venv (from uv.lock)
├── shared/build/                     # corpus build: knowledge.db, bundle/, embeddings, pdf/, media/, replays/ (read-only to the app)
├── shared/state/app.db               # sessions, evidence ledger, budget (the only writable path)
├── shared/.env                       # secrets and production settings (root:embernova, mode 640)
├── shared/backups/                   # app.db snapshots taken on each deploy (14 kept), previous nginx configs
└── acme/                             # Let's Encrypt webroot
```

| Component | Location |
| --- | --- |
| systemd unit | `/etc/systemd/system/embernova.service` ([source](../deploy/systemd/embernova.service)): user `embernova`, `127.0.0.1:8020`, `Restart=always`, `MemoryMax=1600M`, `ProtectSystem=strict` |
| nginx site | `/etc/nginx/sites-available/embernova.khedmetak.com` ([source](../deploy/nginx/embernova.khedmetak.com)): TLS, HSTS, gzip, immutable caching of `/assets/`, SSE without buffering, media streamed without spooling |
| nginx rate limits | `/etc/nginx/conf.d/embernova-limits.conf` ([source](../deploy/nginx/embernova-limits.conf)): 20 req/s with burst 150 per IP; 6 research turns per minute with burst 4 |
| TLS | Let's Encrypt `embernova.khedmetak.com`, auto-renewed by certbot's timer, with a per-certificate `systemctl reload nginx` hook |
| Logs | `journalctl -u embernova` (rotated by journald); `/var/log/nginx/embernova-{access,error}.log` (rotated by the system nginx logrotate) |

## Everyday commands (on the VPS)

```bash
systemctl status embernova                       # status
curl -s http://127.0.0.1:8020/api/health         # health: knowledge_db, bundle, frontend, embeddings
curl -s https://embernova.khedmetak.com/api/meta # corpus counts, llm_available, budget_used_pct
journalctl -u embernova -f                       # live application log
journalctl -u embernova --since "1 hour ago" -p warning
tail -f /var/log/nginx/embernova-error.log
systemctl restart embernova                      # restart only EmberNova (about 6 s)
```

`/api/health` returns 503 if the corpus or frontend build is missing.

## Deploy an update

From a clean, committed working tree on a machine with the `vps` SSH alias:

```bash
cd frontend && npm ci && npm run build && cd ..
bash deploy/deploy.sh vps
```

The script uploads `git archive HEAD` plus `frontend/dist` into `releases/<sha>`, installs the locked dependencies into that release's venv, snapshots `app.db`, records the previous release, switches `current` atomically, restarts the service, and waits for `/api/health`.

If the corpus itself changes (a new `build/`), stream it with mtimes preserved. `dense.py` compares the `knowledge.db` and `embeddings.json` mtimes:

```bash
cd build && tar -cf - knowledge.db bundle embeddings.json embeddings.npy pdf media replays sandbox_inputs \
  eval/livecheck.json eval/sandbox_smoke.json build_report.json | ssh vps "tar -xf - -C /var/www/embernova/shared/build"
ssh vps systemctl restart embernova
```

## Roll back

```bash
ssh vps 'P=$(cat /var/www/embernova/previous_release) && ln -sfn "$P" /var/www/embernova/current.new \
  && mv -Tf /var/www/embernova/current.new /var/www/embernova/current && systemctl restart embernova \
  && readlink /var/www/embernova/current'
```

Any release under `releases/` can be targeted the same way. To restore state, stop the service, copy a snapshot from `shared/backups/app-*.db` to `shared/state/app.db` (owner `embernova`), and start the service. Previous nginx configs are kept in `shared/backups/`. Validate with `nginx -t` before `systemctl reload nginx`.

## Backups

- `app.db` (sessions, evidence ledger, budget) is snapshotted on every deploy with `sqlite3 .backup`, and the newest 14 are kept. It holds no secrets or personal data beyond hashed visitor tokens and hashed client IPs.
- `shared/build` is reproducible from the corpus and is also held on the team's build machine.
- `shared/.env` holds the only secrets. Keep a copy in the team's password manager, not in git.

## Cost controls

`DAILY_BUDGET_USD=2`, `MAX_TURN_COST_USD=0.30` and `PER_IP_TURNS_PER_HOUR=20` are enforced by the app before every turn, and the budget is reserved up front. `GET /api/meta` reports `budget_used_pct`. Also set a hard monthly limit in the OpenAI dashboard. When the budget is exhausted or the key fails, live chat explains this and the explorers and recorded demos keep working.

## Alternative: container

`deploy/Dockerfile` and `deploy/compose.yaml` describe an equivalent container. They are not used in production and were not exercised for this release.
