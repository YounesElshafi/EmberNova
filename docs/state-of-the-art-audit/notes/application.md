# Application, visualization, security and operations research

## What is implemented, and what did execution establish?

### Takeaway

This is a substantive, working local scientific application, not an empty scaffold. The principal weaknesses are deployment reproducibility, incomplete authorization boundaries for derived artifacts, misleading point-level source navigation, accessibility and evaluation depth. React/FastAPI/SQLite/Plotly remain reasonable technologies for this dataset. Replacing the stack is not justified by any measured result.

### Cited Findings

Audit baseline: local HEAD `cc3d701` (Implement judging-review fixes and add new NASA evidence views), preceded by `f8d0501` (Name the team workspace EmberNova) and `678876e` (Prepare NASA Space Apps 2026 hackathon workspace). Initial `git status --short` was only `?? data/`; corpus contents were not modified. `git ls-files` enumerated source, curation and documentation, but neither `deploy/` nor `.github/` exists. README explicitly describes local-only operation. Deployment prescriptions in `docs/architecture/DEPLOYMENT.md` therefore describe a target, not delivered infrastructure. Prior review update reports many fixes that really are in source; it is stale about the remaining retrieval benchmark and numerical coverage in README. Sources: [README](../../../README.md), [prior review](../../judging-review/12_REVIEW_UPDATE.md), [deployment design](../../architecture/DEPLOYMENT.md).

Executed on this audit run:

| Command | Actual result | Scope limitation |
|---|---|---|
| `npm.cmd run test` | 4 files, 8 tests passed; 4.35 s | Reducer, parser, formatting, chart adapter only |
| `npm.cmd run lint` | Passed | Explicit `any` is disabled as a lint rule |
| `npm.cmd run typecheck` | Passed | Many API responses and artifact payloads remain `any` |
| `npm.cmd run build` | Passed; Vite reported 25.71 s | Large-chunk warning |
| `npm.cmd exec playwright -- test research.spec.ts` | All 12 individual cases reported `ok` | Process final shutdown initially remained pending; see follow-up results; keyless, not live provider |
| `npm.cmd audit --json` | Exit 1 with registry advisory report, 16 affected packages | Advisory counts are dependency paths, not proven exploitable application bugs; see follow-up triage |

Build sizes reported by Vite: CSS 37.74 kB / 9.39 kB gzip; main JS 457.02 kB / 141.68 kB gzip; lazy Plotly JS 4,674.20 kB / 1,416.56 kB gzip. The application already dynamically imports Plotly, so recommending lazy loading as if absent would be wrong. [ScientificChart](../../../frontend/src/artifacts/ArtifactView.tsx:13).

Existing keyless browser suite exercises recorded hosted Lab output, home, FLEX discovery and variable citations, raw/normalized tables, chart and CSV export, atmosphere/gravity envelope, evidence map, suppression systems, irrelevant-query abstention, comparison confounders, recorded citation opening, media byte ranges, and mobile home. Screenshots from this run are `build/eval/screens/{workspace,mobile,dataset,envelope,evidence-map,systems,compare,research-evidence,recorded-lab}.png`. I visually inspected workspace, mobile and comparison screenshots. Desktop is consistent and readable, with an explicit association-not-causation statement above comparison results. Mobile 390×844 home fits horizontally, but its composer overlays the lower corpus/navigation area and typography is extremely small; absence of horizontal overflow does not establish usable mobile workflows. Browser server also logged a Windows `ConnectionResetError [WinError 10054]` during video test; the range test still passed. [Browser tests](../../../frontend/e2e/research.spec.ts:3).

### Feature coverage and recommendations

| Feature / exact implementation | Internals and dependencies | Quality and limitation | Decision / priority / effort |
|---|---|---|---|
| Navigation and recent research; `App.tsx:44` | React Router, query cache, cookie-owned sessions | Skip link, labeled icons, 404 exist. All routes eagerly imported; mobile icons lack visible labels | KEEP routing; IMPROVE mobile discoverability, medium/low |
| Assistant workspace; `Workspace.tsx:141` | fetch POST SSE, Zustand events, React Query session history, AbortController | Cancel, errors, saved threads, SI badge and replay identity exist. No reconnect/idempotency strategy; event reducer not duplicate-safe | IMPROVE high/medium |
| Answer renderer; `Workspace.tsx:39` | react-markdown/GFM, local citation buttons, automated audit warnings | Raw HTML disabled; citation presence not semantic entailment. Positive numeric banner overstates validation | IMPROVE high/low |
| Investigation discovery; `Explorers.tsx:62` | Submit-on-search query plus objective filter, relevance component display | Good no-match state and labels; no evidence-level relevance explanations beyond numeric match | KEEP, optional explanation medium/low |
| Investigation detail; `Explorers.tsx:248` | Six tabs: overview, variables, datasets, documents, media, publications | Raw/normalized summary provenance exposed. Documents always initially open page 1; navigation uses buttons with aria-pressed rather than complete tabs semantics | IMPROVE medium/low |
| Dataset explorer; `Explorers.tsx:509` | 50-row pages, source columns, dataset switch, chart axes, CSV/model-ready links | Distinguishes design matrices; no interactive scientific filters, sorting or per-row source action; server has filters | IMPROVE high/medium |
| Comparison; `ResearchTools.tsx:200` | Two atmosphere groups for one selected FLEX fuel | Named caveats, sample counts, source chart. UI narrower than backend; unknown flow appears as 'Differs: No' despite unknown values | IMPROVE high/low |
| Applicability envelope; `ResearchTools.tsx:19` | Presets, oxygen/pressure/gravity selection, deterministic artifact | Explicit partial gravity limits; front-end pressure conversion deserves unit-policy review by science owner | KEEP concept, IMPROVE evidence precision |
| Fire-safety systems; `Systems.tsx:62` | Curated tags grouped prevention/detection/suppression, fundamental remainder | Explicit detection data gap, dilution tool. No loading skeleton on initial cards | KEEP; low/low polish |
| Evidence map; `Systems.tsx:176` | Oxygen-pressure bins, fuel classes, source IDs | Valuable gap communication; selected cell only lists first 40 run IDs, no evidence inspector/CSV for cell | IMPROVE medium/low |
| NASA media; `Explorers.tsx:197`, `ResearchTools.tsx:391` | Native image/video, metadata preload, byte ranges, attribution/hash | 100-item cap adequate for 39 current assets; no lazy image loading, no verified transcripts | KEEP; accessibility medium/medium |
| Recorded research; `ResearchTools.tsx:331` | Public event replay through same reducer, scripted/live labels | Strong keyless resilience, actual replay tests pass. Bundle does not automatically prove recordings match latest code/data | KEEP; IMPROVE version/freshness validation high/low |
| Methods/disclosure; `ResearchTools.tsx:413` | Metadata/corpus counts, limits, source catalog | Clear limits, but model access and numeric coverage wording can overpromise | KEEP; copy audit medium/low |
| ScientificChart; `ArtifactView.tsx:13` | Lazy Plotly, ResizeObserver cleanup, backend ChartSpec adapter | Error bars supported, source data never model-authored. Click handler always opens first evidence ID, irrespective of point/trace | IMPROVE high/low |
| Artifact types; `ArtifactView.tsx:272` | Chart/table/comparison/envelope/analysis_run rendering; zip export | Provenance and SI-code visible. Render-time payload trust depends on server; no runtime schema validation | IMPROVE medium/medium |
| DataTable; `ArtifactView.tsx:85` | Semantic HTML, formatted units, overflow container | Suitable for 50 rows. No caption or keyboard-linked chart counterpart; no need for virtualization at current size | KEEP with accessibility improvements |
| Evidence inspector; `EvidenceInspector.tsx:8` | Query by evidence ID, page text, row previews, original link, copy citation | Excellent source traceability. Clipboard failure unhandled, copied state not reset per evidence, page-fetch error hidden | IMPROVE medium/low |
| API client and SSE parser; `api/client.ts:1` | fetch, JSON error messages, incremental parser | Detects missing terminal event. No ordinary request timeout, schema validation, resume or retry policy for streams | IMPROVE medium/medium |
| REST and SSE server; `main.py:50` | FastAPI routes, validated input classes, 15-second heartbeat, 64 KiB write bodies | Appropriate monolith; `/health` tests file existence and returns HTTP 200 even not_ready | IMPROVE critical deployment check/low |
| Storage; `storage.py:8` | SQLite WAL mutable state; immutable read-only knowledge DB, short transactions | Appropriate single-host design. Events/session JSON queries lack supporting indexes, retention/cleanup absent | KEEP; IMPROVE medium/low |
| Metadata/health; `main.py:199` | Build counts, model config, budget pct, feature availability | Feature availability can depend on old local smoke/livecheck file rather than current provider; readiness shallow | IMPROVE high/low |
| Exports; `main.py:337,439` | CSV and in-memory ZIP of source/analysis provenance | Useful reproducibility. Artifacts public-by-ID, zip generation not rate-limited | IMPROVE high/medium |
| Session ownership; `main.py:95` | 256-bit random HttpOnly Strict cookie; SHA256 owner, path middleware | Session routes owner-protected and cross-origin writes blocked. Artifacts/evidence not owner-protected | IMPROVE high/medium |
| Admin record/purge; `main.py:708` | constant-time token compare; record completed events; cache purge no-op | Admin disabled without token; typed model absent for record body, replay public publication semantics | KEEP token gate; IMPROVE low/low |
| Deferred endpoints; `main.py` timeseries/illustrations | Explicit 404/409 | Correctly unavailable; no telemetry or illustrations should be counted as delivered | KEEP honest disabled state |
| Build/dev/verification scripts | PowerShell, uv/pip lock, npm lock, local Uvicorn | Reproducible local commands; no CI or container assets in tree | IMPROVE critical/medium |

### Inferences

The correct near-term design is the existing modular monolith with stronger contracts and evidence navigation, not microservices or a frontend rewrite. Treat chart selection as a provenance join: Plotly `points[0].customdata` supplies `run_uid`; maintain series evidence mapping, resolve matching row evidence, and show exact original row/normalized transform. A chart whose points come from multiple source tables must not route every click to its first table.

### Gaps

No live paid calls were made. No production URL, TLS, memory budget, load test, full screen-reader audit or comprehensive contrast measurement was verified. Existing e2e screenshots are visual evidence, not exhaustive manual inspection of every interactive state. Full point-click reproduction is pending; source-level deterministic fault is established. No claim of November 2026 best-in-class is supported.

## What security and operational defects need action?

### Takeaway

Session isolation was improved since prior reviews, but it is narrower than full research-artifact privacy. Deployment must be implemented against actual Settings names and file layout; copying the canonical example verbatim would misconfigure the current application.

### Cited Findings

1. `main.py:106–115` checks ownership only for `/api/sessions/{id}` paths. `/api/artifacts/{id}`, `/data`, and `/bundle` retrieve records without owner checks. Artifact records have no ownership column (`storage.py:21`). Their unguessable IDs reduce enumeration but are not authorization; a leaked/shared ID can expose user-selected data or generated code. Public NASA evidence and deliberately published replay artifacts can remain public, but private derived artifacts should inherit session owner and explicit publication status. [Main](../../../backend/src/embernova/main.py:106), [storage](../../../backend/src/embernova/storage.py:21).
2. `/api/sessions` creation, charts, compare, export and evidence-generating reads have no general rate limit, global concurrency semaphore, or state retention policy. Live agent budget protects provider spend, not public CPU/disk availability. SSE uses an unbounded queue (`main.py:631`); current bounded turn size reduces immediate risk but backpressure should be explicit. [Main](../../../backend/src/embernova/main.py:631).
3. `trusted_proxy=true` accepts the first supplied X-Forwarded-For without checking connecting peer (`main.py:53`); deploy must restrict origin port and overwrite incoming forwarded headers at trusted proxy. `secure_cookies` defaults false (`config.py:40`), appropriate for localhost but must be true for HTTPS. [FastAPI proxy documentation](https://fastapi.tiangolo.com/advanced/behind-a-proxy/).
4. `health()` (`main.py:200`) does not open/validate SQLite, verify bundle hash or check required replay assets, and not_ready still returns 200. The documented HTTP-only health probe can mark unusable application healthy. Separate liveness (process) and readiness (validated bundle/store/static/replay) with 503 when not ready.
5. CSP exists but script policy permits unsafe-inline and blob; no exploitable XSS demonstrated. Markdown raw HTML stays disabled, SQL values are parameterized, catalog table names allowlisted, and source paths use safe_path. Keep these protections; remove script unsafe-inline only after testing Plotly compatibility. API error request IDs exist but no comprehensive structured operational telemetry is evident. [Main](../../../backend/src/embernova/main.py:140).
6. `.env.txt` exists (filename/existence check only; contents deliberately not read), independently confirming prior review's stray-secret-copy warning. Do not claim confirmed secret value or exposure. User should consolidate secrets and rotate if disclosure occurred; no deletion performed. [Prior review](../../judging-review/12_REVIEW_UPDATE.md).
7. Deployment design expects `/app/static`, `EMBERNOVA_BUILD_DIR`, `EMBERNOVA_VAR_DIR`, optional build-only dependencies. Actual `main.py` serves `ROOT/frontend/dist`, Settings has `build_dir/state_dir` with no prefix/aliases, and PyMuPDF/tiktoken/openpyxl are runtime dependencies in pyproject. Prepare a tested artifact layout, correct env names, split build dependencies when verified, then build frozen lockfiles and run non-root read-only process with writable state separate. [Config](../../../backend/src/embernova/config.py:10), [dependency declarations](../../../backend/pyproject.toml:7), [deployment plan](../../architecture/DEPLOYMENT.md).

### Inferences

Before submission: deployment/replay verification is a blocker; chart source correction, accurate numeric validation copy and artifact authorization are high-value small changes. A single worker is currently an explicit operational requirement because active session cancellation is in-process. PostgreSQL or Redis would add migration risk without demonstrated load need. Add bounded concurrent live turns and generated-artifact quotas before scaling.

### Gaps

No exploit was attempted on a live deployment. Dependency advisories require date/exposure triage, not blind `npm audit fix --force`. Python vulnerability audit is not yet executed. Browser cookies are anonymous capability ownership, not recoverable user accounts; account system not necessary for hackathon.

### Executed follow-up probes and advisory triage

`build/state-of-the-art-audit/application_probe.py` ran with `python -I`, no API key, and isolated mutable state beneath the audit build directory. It created a harmless chart, then used a second anonymous visitor. Actual results: other visitor's session GET 404; chart artifact GET 200; chart ZIP GET 200; 65,537-byte body 413; cross-origin session POST 403; missing-build `/api/health` HTTP 200 with `status: not_ready`. Raw results are `build/state-of-the-art-audit/application-probe.json`. Thus session ownership/body/origin protection work, artifact authorization is absent, and readiness HTTP semantics are demonstrably insufficient. The public chart fixture contains NASA data only; private generated artifacts are a source-supported risk, not a demonstrated disclosure of another person's real research.

The Playwright run reported all 12 individual browser cases `ok`, but did not exit after the final case and repeated waits. The audit interrupted the runner with Ctrl+C (exit 1), so report **12 successful cases with teardown hang**, not a clean suite exit. Newly generated screenshots were visually reviewed; workspace/mobile/compare copies are also in `build/state-of-the-art-audit/`. The two live tests were not run. Existing tests write to `build/eval/` by their configured paths, a non-destructive generated-output exception to the audit-specific folder preference.

`npm audit` returned 13 moderate, 1 high, 2 critical affected packages (16 total). Exact dependency graph advisory output is retained. Primary advisory verification confirms these pre-audit-date issues:

- Tinypool prototype-pollution worker-options RCE, published August 30 2026, patched 2.1.1 for this advisory; a separate follow-up advisory in registry requires 2.1.2. Exploitation needs the relevant prototype pollution/input path; this app does not run Tinypool in its browser or FastAPI production process. [Maintainer advisory](https://github.com/tinylibs/tinypool/security/advisories/GHSA-5gmw-xhrv-c9v3).
- Vitest UI server arbitrary file read/execution, published May 19 2026, affected <3.2.6 and 4.0.0–<4.1.0. Repository test command is `vitest run`, not network-exposed UI; production static deployment should exclude dev dependencies. Upgrade in a tested maintenance change, do not label this a demonstrated public RCE. [Maintainer advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp).
- React Router backslash open redirect, published July 22 2026, affected >=6.0.0 <7.18.0. Current route destinations are application-constructed internal paths; attacker-controlled destinations were not demonstrated. SSR deserializeErrors advisory also appears in npm results, but this is a client-rendered SPA without SSR hydration. Triage exposure, then supported upgrade with route regression tests. [Maintainer advisory](https://github.com/remix-run/react-router/security/advisories/GHSA-wrjc-x8rr-h8h6).

The Vite high advisory and other transitive advisories remain scanner findings without exploit confirmation. Keep development servers bound to loopback and out of production. Do not run forced dependency upgrades during the audit.

## Which alternatives and primary sources justify the recommended architecture?

### Takeaway

The strongest justified upgrades are contract fidelity, reproducibility, provenance-aware interactions, accessibility and controlled deployment. Novel visualization frameworks or distributed services have no demonstrated advantage here.

### Cited Findings

| Area | Current and three alternatives | Recommendation and evidence |
|---|---|---|
| Visualization | Full lazy Plotly; custom Plotly bundle; Vega-Lite; ECharts/custom D3 | KEEP Plotly, EXPERIMENT with a bundle containing only scatter/bar/box/histogram. Official Plotly distribution supports partial/custom bundles; basic bundle does not necessarily include every required trace. Measured full payload is large, but actual savings require building selected bundle. [Plotly distributions](https://github.com/plotly/plotly.js/blob/main/dist/README.md) |
| Frontend | React18 SPA; upgrade React without rewriting; SSR framework; framework-free static tool pages | KEEP SPA. Existing mostly interactive local-data app has no measured SEO/SSR need. Fix schemas, route errors, keyboard/source exploration first. Version novelty alone is not evidence of better science or UX |
| Mutable storage | SQLite WAL; PostgreSQL; Redis; managed serverless database | KEEP SQLite until measured write contention/multiple-host requirement. WAL permits concurrent readers and one writer, with same-host constraints. Add event session/turn/seq index, owner index, retention and SQLite backup API. [SQLite WAL](https://sqlite.org/wal.html) |
| Streaming | POST fetch SSE; native EventSource with POST job creation; WebSocket; polling job results | KEEP fetch SSE for immediate deadline. Add persisted event resume/idempotent reducer only if reconnection tests justify; WebSocket unnecessary for one-way progress. Existing stream detects truncation but cannot recover automatically |
| API organization | Existing FastAPI monolith; typed domain routers/services; microservices; serverless functions | IMPROVE into routers when maintenance warrants; keep shared deterministic Tools interface and single source bundle. Splitting deployment adds no demonstrated benefit. Explicit trusted proxy settings required. [FastAPI proxy guidance](https://fastapi.tiangolo.com/advanced/behind-a-proxy/) |
| Chart accessibility | Current title-only role=img; adjacent accessible data table/summary; sonification; bespoke keyboard chart | Add table/summary and keyboard source selection first; no experimental sonification deadline work. W3C requires text alternatives serving equivalent purpose; a title alone does not convey plotted values/trends. [WCAG non-text content](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html) |
| Mobile evidence panel | Fixed aside; Radix dialog sheet; full evidence route; resizable split panel | Use existing Radix dialog dependency for narrow-screen modal with focus restoration, Escape and named title, or navigable full evidence route. Current aside is not a focus-managed dialog. W3C focus and target-size requirements guide tests, not aesthetic judgment. [WCAG target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) |

Engineering estimates are judgments: low roughly hours, medium days, high weeks; confidence high on source-level faults, medium on usability impact, low on unbenchmarked alternative performance. No replacement of React, FastAPI, SQLite or Plotly is justified before the deadline. Long term: runtime API validation/generated response contracts, mobile/keyboard workflows, evidence-specific citations, modest observability, reproducible container and benchmark fixtures, and measured load capacity.

### Inferences

Recommended flow: browser → same-origin reverse proxy → single FastAPI process → immutable knowledge/Analysis Bundle + SQLite state; deterministic tools own charts/numbers; agent uses the same tools; user-owned artifacts are explicitly published only for reviewed replays. Add readiness gate, proxy limits, structured logs, deployment smoke tests and local/offline browser CI. Keep corpus construction offline. This improves several failure modes without replacing scientific code.

### Gaps

Primary engineering documentation was verified, but no controlled experiment compared Vega-Lite/ECharts against Plotly or PostgreSQL against SQLite. These alternatives therefore remain experiments, not empirically superior choices. No claim is made that every dependency's latest November 2026 release was exhaustively researched.
