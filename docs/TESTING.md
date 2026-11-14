# Testing

## Commands

```bash
# Backend (from backend/)
uv run pytest -q                       # unit, API, science, citation, retrieval-facet tests on the real corpus build
uv run ruff check . && uv run ruff format --check .

# Frontend (from frontend/)
npm run test && npm run lint && npm run typecheck && npm run build
npx playwright test e2e/research.spec.ts                       # 15 judge flows, local server, no API key
EMBERNOVA_LIVE_E2E=1 npx playwright test e2e/live.spec.ts      # 4 live-model flows (uses OPENAI_API_KEY, costs money)
npx playwright test -c playwright.prod.config.ts e2e/research.spec.ts   # the same judge flows against the live site
```

Backend tests need the built corpus (`build/knowledge.db` and the Analysis Bundle). On Windows, pass `--basetemp` with a writable folder if the default pytest temp directory is locked.

## Results for the judging release (2026-11-14)

| Check | Result |
| --- | --- |
| Backend tests | **80 passed** (1 Starlette deprecation warning) |
| ruff check / format | Pass |
| Frontend unit tests (Vitest) | **9 passed** |
| ESLint (`--max-warnings 0`), `tsc --noEmit`, production build | Pass |
| Browser judge flows, local, fresh state | **15/15** |
| Browser judge flows, **against https://embernova.khedmetak.com** | **15/15** |
| Live-model browser flows **against production** | **4/4**: streamed research with persisted citations; habitat chart (0 invalid citations, 17 matching FLEX rows, chart holds exactly the 16 runs with measured K); ranking cards plus "compare the first two"; lunar evidence classification on desktop and mobile |
| TLS | Let's Encrypt, TLS 1.3, chain verifies; HTTP → HTTPS 301; HSTS |
| Crash recovery | SIGKILL of the service → systemd restart in about 6 s → public health 200 |
| Rollback | Switch to the previous release and back; health 200 both times |
| Corpus integrity on server | All 171 runtime files byte-identical to the build machine (SHA-256) |

## Regression tests added in this release

- `test_replay_citations_resolve_on_fresh_state`: recorded demonstrations open every cited evidence record and artifact on an empty state database. This failed before the fix, when replay citations returned 404 on a fresh deployment.
- `test_web_server_does_not_load_build_only_libraries`: the API process imports neither Pillow, openpyxl nor PyMuPDF.
- `e2e/live.spec.ts`: the habitat test now asserts the inline chart from the redesigned thread instead of the removed artifact-card list.

## Security checks

- Secret scan of every tracked and committable file, and of git history, for API-key, token and private-key patterns: **none found**. `.env` files are gitignored, and production secrets exist only in `/var/www/embernova/shared/.env` (mode 640).
- `npm audit`: 2 moderate advisories in `react-router` 6, not reachable in this client-only app (see [LIMITATIONS.md](LIMITATIONS.md)).
- `pip-audit` on the deployed lockfile: 42 advisories, all in Pillow 12.3.0. Pillow is used only by the offline corpus build on trusted NASA files, and the web process does not load it (verified in `/proc/<pid>/maps` and by the test above).
- Rate limiting: nginx limits requests and research turns per IP. The app enforces a daily budget, a per-turn cost cap and per-visitor hourly turns, and rejects cross-origin writes and bodies over 64 KB.

## Judgment calls

- Answers from the live model vary between runs. In one of the four production runs of the habitat test, the model cited an evidence ID it had not retrieved. The validator removed it and showed "[unverified citation removed]", which is the intended behavior. The test treats any invalid citation as a failure so that such runs stay visible.
- The production browser config allows 30 s per assertion, because it measures real internet transfer rather than a loopback server.
