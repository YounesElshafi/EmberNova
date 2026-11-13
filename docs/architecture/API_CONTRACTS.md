# API contracts

Canonical for: HTTP endpoints, the SSE protocol, errors and pagination. The JSON Schemas in [contracts/](contracts/) are canonical for event, artifact, evidence and analysis-result *shapes*. The FastAPI-generated OpenAPI (`/api/openapi.json`) must match this document, and Codex adds a test that checks every route listed here exists.

The base path is `/api`. All responses are JSON (UTF-8) unless noted. There is no authentication except `X-Admin-Token` on `/api/admin/*`.

## 1. Conventions

- **Errors:** `HTTP 4xx/5xx` with `{"error": {"code": "not_found|invalid_argument|unit_error|rate_limited|budget_exceeded|llm_unavailable|payload_too_large|internal", "message": "…", "details": {…}|null, "request_id": "…"}}`. A `429` carries `Retry-After`.
- **Pagination:** list endpoints accept `?limit=` (default 25, max 100) and `?cursor=`. The response is `{"items": [...], "next_cursor": "…"|null, "total": int|null}`.
- **Units:** request numeric filters always carry a `unit`. Responses carry `value_si`, `unit_si`, `display_value` and `display_unit`.
- **IDs:** as defined in [DATA_ARCHITECTURE.md §3](DATA_ARCHITECTURE.md). IDs containing `:` or `#` are URL-encoded in paths.
- Every response sets an `X-Request-Id` header.

## 2. Read endpoints (no LLM needed)

| Method and path | Request | Response |
| --- | --- | --- |
| `GET /api/health` | — | `{status:"ok", checks:{knowledge_db, bundle, embeddings}}` |
| `GET /api/meta` | — | `{build_version, bundle_version, snapshot_date, corpus:{investigations, documents, pages, runs, media}, features:{analysis_lab, illustrations}, llm_available, budget_used_pct, models:{agent}}` |
| `GET /api/vocab` | — | Controlled vocabularies, with labels and display units |
| `GET /api/investigations` | `?q&objective&fuel_class&hardware&platform&tier&is_psi&limit&cursor` | Paginated `InvestigationSummary` (id, acronym, title, is_psi, tier, facets, dataset_count, media_count, curation_status) |
| `GET /api/investigations/{id}` | `?sections=` | `InvestigationDetail`: profile, variables (bundle-derived ranges), datasets, documents, publications, media, related, hardware, limitations, evidence IDs |
| `POST /api/search/investigations` | `search_investigations` input schema | Same as the tool's `data` |
| `POST /api/search/documents` | `search_documents` input | Same as the tool's `data` |
| `GET /api/documents/{document_id}` | — | Document metadata and its pages list (number, is_empty, char_count) |
| `GET /api/documents/{document_id}/pages/{n}` | — | `{page_id, text, is_empty, evidence_id, local_pdf_url}` |
| `GET /api/files/{file_id}/original` | — | The PDF (`application/pdf`), only for deployable files. 404 otherwise |
| `GET /api/datasets` | `?investigation_id` | `DatasetSummary[]` |
| `GET /api/datasets/{table_id}` | `?view=normalized|raw&limit&cursor&filters=<json>` | Columns (name, kind, units, qualifiers) and rows, plus quality findings |
| `GET /api/datasets/{table_id}/export` | `?format=csv|parquet` | File with a provenance header comment (CSV) or a sidecar JSON in a zip |
| `POST /api/measurements/query` | `query_measurements` input | Tool `data`, plus `evidence` and `artifact_ids` |
| `POST /api/charts` | `make_chart` input | `{artifact: Artifact}` |
| `POST /api/compare` | `compare_runs` input | `{artifact: Artifact}` |
| `POST /api/envelope` | `check_applicability_envelope` input | `{artifact: Artifact, coverage, gaps, bracketing_runs}` |
| `POST /api/checks/d2law` | `check_d2_law` input | `{artifact: Artifact, stats, flagged_runs}` |
| `GET /api/timeseries/{series_id}` | `?channels&t_start&t_end&max_points` | `{artifact: Artifact}` |
| `GET /api/media` | `?investigation_id&type&run_label` | `Media[]` |
| `GET /api/media/{media_id}` | — | `Media` (with association, caption, credit, representative flag, source) |
| `GET /api/media/{media_id}/stream` | `Range` header | `206 Partial Content`: video/mp4 or image |
| `GET /api/media/{media_id}/thumb` | — | image/webp |
| `GET /api/evidence/{evidence_id}` | — | `Evidence` ([contracts/evidence.schema.json](contracts/evidence.schema.json)) |
| `GET /api/artifacts/{artifact_id}` | — | `Artifact` ([contracts/artifact.schema.json](contracts/artifact.schema.json)) |
| `GET /api/artifacts/{artifact_id}/data` | `?format=csv|json` | Underlying data |
| `GET /api/artifacts/{artifact_id}/bundle` | — | zip (artifact.json, data, code, README, SI note) |
| `GET /api/replays` | — | `[{replay_id, title, question, recorded_at, model, scenario}]` |
| `GET /api/replays/{replay_id}` | `Accept: text/event-stream` | The recorded SSE stream (same event schema; `meta.replay=true`) |

## 3. Session and agent endpoints

| Method and path | Request | Response |
| --- | --- | --- |
| `POST /api/sessions` | `{title?: string}` | `{session_id}` |
| `GET /api/sessions/{id}` | — | `{session, turns:[{turn_id, user_text, answer: ValidatedAnswer, artifacts:[id], tool_calls:[…]}]}` |
| `PATCH /api/sessions/{id}` | `{analysis_lab: bool}` | `{session}` (errors if the feature is off) |
| `POST /api/sessions/{id}/messages` | `{text: string (1–4000), options: {effort: "chat"|"analysis", habitat_preset: string|null, viewing: {artifact_ids: string[], evidence_ids: string[]}}}` | **`text/event-stream`** (§4). Errors before streaming come back as JSON 4xx |
| `POST /api/sessions/{id}/cancel` | — | `{cancelled: bool}` |
| `GET /api/sessions/{id}/turns/{turn_id}/events` | `?after_seq=` | Missed SSE events, used to reconnect |
| `POST /api/illustrations` (P2) | `{prompt, session_id}` | `{artifact}` (`si_illustration`) |
| `POST /api/admin/replays/record` | `{session_id, title, scenario}` + `X-Admin-Token` | `{replay_id}` |
| `POST /api/admin/cache/purge` | `X-Admin-Token` | `{purged}` |

## 4. SSE protocol

**Wire format:**

```text
event: <name>\n
id: <turn_id>:<seq>\n
data: <json>\n\n
```

A heartbeat comment `: ping` is sent every 15 s. Every `data` object has `{"seq": int, "turn_id": "…", "t_ms": int}` plus the event fields. The full schema is [contracts/sse_events.schema.json](contracts/sse_events.schema.json).

| Event | Payload (beyond the common fields) | When |
| --- | --- | --- |
| `turn.started` | `session_id`, `model`, `replay: bool` | First event |
| `status` | `phase: "thinking"|"searching"|"querying"|"analyzing"|"writing"`, `message` | Phase changes |
| `tool.started` | `call_id`, `tool`, `label` (friendly), `args_summary` | Before a tool runs |
| `tool.completed` | `call_id`, `tool`, `status: "ok"|"error"`, `latency_ms`, `summary`, `evidence_ids[]`, `artifact_ids[]`, `error_code?` | After a tool runs |
| `evidence.added` | `evidence: Evidence` | On ledger registration |
| `artifact.created` | `artifact: Artifact` (full; payloads over 512 KB are sent as a stub with `fetch_url`) | On artifact creation |
| `text.delta` | `delta: string` | Streaming model text |
| `text.completed` | `answer: ValidatedAnswer {validated_markdown, citations:[{n, evidence_id}], sections_present[], audit:{invalid_citations, kind_mismatches, uncited_sentences, ungrounded_numbers}, evidence_strength:{bullet_index: "strong"|"moderate"|"limited"}, followups: string[]}` | After validation |
| `turn.completed` | `usage: {input_tokens, cached_tokens, output_tokens}`, `cost_usd`, `latency_ms` | Last event on success |
| `error` | `code`, `message`, `retryable: bool` | Terminal on failure |

**Ordering guarantees:**
- `evidence.added` for an ID always precedes any text that cites it, either in `text.completed` (validated) or as a raw marker in `text.delta`.
- `tool.completed` precedes `artifact.created` for the artifacts that tool made.
- The stream ends after `turn.completed` or `error`.

## 5. Core response shapes (summary)

The canonical definitions are the JSON Schemas.
- `Evidence`: [contracts/evidence.schema.json](contracts/evidence.schema.json)
- `Artifact` (with `ChartSpec`): [contracts/artifact.schema.json](contracts/artifact.schema.json)
- `AnalysisResult`: [contracts/analysis_result.schema.json](contracts/analysis_result.schema.json)
- SSE events: [contracts/sse_events.schema.json](contracts/sse_events.schema.json)
