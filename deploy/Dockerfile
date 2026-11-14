FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/ /app/backend/
RUN pip install --no-cache-dir /app/backend && \
    useradd --create-home --uid 10001 embernova && \
    mkdir -p /app/build /app/data /var/lib/embernova && \
    chown 10001:10001 /var/lib/embernova
COPY frontend/dist/ /app/frontend/dist/
USER 10001:10001
EXPOSE 8000
CMD ["uvicorn", "embernova.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
