#!/usr/bin/env bash
# Deploy the committed HEAD of this repository to the EmberNova VPS as a new release.
# Usage (from the repo root, Git Bash or Linux):  deploy/deploy.sh [ssh-host]      default host: vps
# Prerequisites: a clean working tree, `npm ci && npm run build` already run in frontend/, and the
# corpus build already present on the server in /var/www/embernova/shared/build (see docs/DEPLOYMENT.md).
set -euo pipefail
HOST="${1:-vps}"
APP=/var/www/embernova
SHA=$(git rev-parse --short HEAD)

if [ -n "$(git status --porcelain)" ]; then
  echo "Refusing to deploy: working tree has uncommitted changes." >&2; exit 1
fi
[ -f frontend/dist/index.html ] || { echo "Build the frontend first (cd frontend && npm run build)." >&2; exit 1; }

echo "==> Uploading release $SHA to $HOST"
git archive --format=tar HEAD -- . ':(exclude)data/investigations' \
  | ssh "$HOST" "mkdir -p $APP/releases/$SHA && tar -xf - -C $APP/releases/$SHA"
tar -cf - frontend/dist | ssh "$HOST" "tar -xf - -C $APP/releases/$SHA"

echo "==> Installing locked dependencies"
ssh "$HOST" "set -e; cd $APP/releases/$SHA
  [ -x .venv/bin/python ] || python3 -m venv .venv
  .venv/bin/pip install -q --upgrade pip uv
  .venv/bin/uv export --frozen --no-dev --no-hashes --no-emit-project --project backend -o .requirements.txt -q
  .venv/bin/uv pip install -q --python .venv/bin/python -r .requirements.txt
  .venv/bin/uv pip install -q --python .venv/bin/python --no-deps -e backend"

echo "==> Backing up state and switching current -> $SHA"
ssh "$HOST" "set -e
  sqlite3 $APP/shared/state/app.db \".backup '$APP/shared/backups/app-\$(date +%Y%m%d-%H%M%S).db'\" 2>/dev/null || true
  ls -1t $APP/shared/backups/app-*.db 2>/dev/null | tail -n +15 | xargs -r rm -f
  readlink $APP/current > $APP/previous_release 2>/dev/null || true
  ln -sfn $APP/releases/$SHA $APP/current.new && mv -Tf $APP/current.new $APP/current
  systemctl restart embernova
  for i in \$(seq 1 30); do curl -fs http://127.0.0.1:8020/api/health >/dev/null 2>&1 && break; sleep 1; done
  curl -fsS http://127.0.0.1:8020/api/health"
echo
echo "==> Deployed $SHA. Previous release recorded in $APP/previous_release (rollback: docs/DEPLOYMENT.md)."
