# Alternative container deployment. Production (embernova.khedmetak.com) uses systemd + nginx instead;
# see docs/DEPLOYMENT.md. This image was not exercised for the judging release.
#
# The backend resolves repository files (curation/, docs/architecture/contracts/, frontend/dist/)
# relative to its source tree, so it is installed editable from /app, never into site-packages.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/ /app/backend/
COPY curation/ /app/curation/
COPY docs/architecture/contracts/ /app/docs/architecture/contracts/
RUN pip install --no-cache-dir uv && \
    uv export --frozen --no-dev --no-hashes --no-emit-project --project /app/backend -o /tmp/req.txt && \
    pip install --no-cache-dir -r /tmp/req.txt && \
    pip install --no-cache-dir --no-deps -e /app/backend && \
    useradd --create-home --uid 10001 embernova && \
    mkdir -p /app/build /var/lib/embernova && \
    chown 10001:10001 /var/lib/embernova
COPY frontend/dist/ /app/frontend/dist/
USER 10001:10001
EXPOSE 8000
CMD ["uvicorn", "embernova.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--proxy-headers", "--forwarded-allow-ips", "*"]
