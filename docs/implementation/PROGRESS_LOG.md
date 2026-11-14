# Progress log

Codex appends one entry per milestone, newest at the bottom. Report actual results only.

## Template

```markdown
## M<N> — <title> — <YYYY-MM-DD HH:MM local>
**Status:** done | partial | blocked
**Branch / commits:** m<N>-<slug> @ <sha>
**Acceptance criteria:**
- [x] <criterion> — evidence: <command + key output / screenshot path>
- [ ] <criterion> — why not: …
**Test output (pasted, trimmed):**
    uv run pytest -q → …
    npm run test → …
**Measured numbers:** (counts, latencies, eval metrics, cost)
**Deviations:** none | PROPOSAL: <problem, evidence, proposed change, affected docs>
**BLOCKED:** none | <exact error, attempts, decision needed, fallback taken>
**Next:** …
```

---

## Architecture phase — 2026-11-13 (Claude Code)

**Status:** done. The architecture docs, ADRs, contracts, benchmark and this plan were created. No application code was written, and `data/` was not modified. `.gitignore` was extended to exclude raw payloads, `build/`, `var/` and databases.

**Next:** Codex starts with M0 ([HANDOFF_TO_CODEX.md](HANDOFF_TO_CODEX.md)).

## Independent audit and local implementation — 2026-11-13
**Status:** partial; runtime verification in progress.
**Branch / commits:** unchanged; user explicitly prohibits commits, branch churn, remote operations and deployment.
**Evidence:** `build/eval/corpus_audit.json`: 274 original-file hashes match; FLEX 274 rows; 17 elevated-O₂/reduced-pressure tests; duplicated alternate ID; pressure-zero test 114. Raw d² calculation: n=196, median 0.9511842477375565.
**Test output:** frontend Vitest 3 files / 5 tests passed; TypeScript passed; production build passed; ESLint passed. Backend source compilation passed; backend runtime tests have not yet run while dependency installation finishes.
**PROPOSAL:** retain the architecture with corrections described in CODEX_ARCHITECTURE_AUDIT.md: distinguish atmosphere overlap from gravity coverage, retain unknown BASS pressure, do not pad chunks to inconsistent expected counts, and do not manufacture FLEX-2 measured design combinations. Preserve source metadata instead of claiming SI profiles were independently reviewed. Canonical architecture/ADR files are unchanged pending Claude review.
**BLOCKED:** package downloads initially failed DNS/timeout; larger uv timeout and reduced concurrency are progressing. Full official challenge-page retrieval failed HTTP 502/TLS verification; official indexed summary was independently available. Details in CODEX_PROGRESS.md.
**Next:** run real corpus build, backend tests, provider verification, evaluation and local browser workflows. No deployment tasks will run.

## M0 — Local scaffold — 2026-11-13
**Status:** done for the local scaffold.
**Branch / commits:** unchanged; none created, per explicit user restriction.
**Acceptance criteria:** Python 3.12 uv environment, FastAPI startup, Vite/React/TypeScript/Tailwind, generated contract types, dependency locks and ignored environment configuration are present. Backend and frontend checks pass. No original data writes.
**Test output:** backend `36 passed, 1 warning`; Ruff check/format pass. Frontend `3 files / 5 tests passed`; ESLint/typecheck/build pass.
**BLOCKED:** initial DNS/timeouts resolved with uv retry settings; Windows npm.ps1 policy handled by npm.cmd. ENOSPC browser download resolved by deleting only verified generated caches and using installed Chrome. No remaining local setup blocker.
**Next:** independent scientific/security review; see review handoff.

## M1 — Knowledge build and retrieval — 2026-11-13
**Status:** partial against the entire canonical milestone; functional catalog/index/media core implemented and tested.
**Acceptance criteria:** 274 verified original hashes match, including final rerun; 34 investigations, 93 documents, 3,187 page/part records, 3,495 chunks and 39 media. FTS + real OpenAI embeddings and lexical fallback work. Original metadata is indexed; reviewed synthesized profiles and complete facets are not delivered.
**Measured numbers:** initial embedding build used 1,225,618 input tokens, estimated $0.02451236; cached rebuild needed zero additional source tokens. Query embedding usage is estimated separately.
**PROPOSAL:** count actual page-bounded chunks rather than padding to 5k–12k; replace unsafe assumptions about reviewed profiles with explicitly labeled original metadata until reviewed curation exists. The current character chunker is an implementation subset of the token-boundary design. Affected canonical topics: DATA_ARCHITECTURE, RETRIEVAL_ARCHITECTURE and M1. Architect-owned documents remain unchanged for review.
**BLOCKED:** no infrastructure blocker. Ranking quality remains an acceptance gap, not an unavailable-data excuse.

## M2 — Scientific Analysis Bundle — 2026-11-13
**Status:** FLEX and five-table foundation implemented/tested; additional parser roadmap partial.
**Acceptance criteria:** raw/SI long-format Parquet, pint units, physical source rows, source hashes, quality flags and build manifest work. Five tables / 577 source records, including designs and preserved duplicates. Golden tests pass for FLEX, BASS-II, CFI conditions/workbook and FLEX-2 design. Saffire telemetry and other numeric extensions are not implemented.
**Scientific findings:** FLEX 274 rows; 17 atmosphere matches but only 16 K values; raw d² n=196 median 0.9511842477375565; pressure-zero test 114 excluded; alternate 193F001 returns both primary tests. CFI CSV 87 rows / 79 unique Flex Numbers, eight exact duplicates. Workbook supplies 79 matched source rows; hot/cool definitions distinct and unspecified HF time unit stays null.
**PROPOSAL:** fix architecture golden assumption for FLEX test 24: original cp1252 U+2013 en dash is missing, not U+FFFD corruption. Preserve CFI duplicate rows using locator suffixes instead of assuming unique source labels. Use separate workbook records without inventing unverified condition joins. Startup rejects a hash-mismatched bundle (regression tested).

## M3 — Read API and shared scientific tools — 2026-11-13
**Status:** functional core implemented/tested; full canonical schema/option parity partial.
**Acceptance criteria:** discovery, pages/PDFs, datasets/raw-normalized rows, deterministic queries/charts/exports, investigations/variables, original media Range, evidence/artifacts and sessions work through the backend and browser. Invalid fields/units/paths/body sizes are tested. Time-series endpoint has an honest unavailable state.
**Test output:** API/scientific/schema tests included in 36 passing backend tests; nine keyless browser flows pass. Video returns HTTP 206 for 1,024 requested bytes and rejects out-of-range requests.
**PROPOSAL:** pragmatic JSON-record catalog with relational keys and short SQLite connections, rather than full normalized canonical SQL/migration schema; tool/API inputs cover a strict subset. Formal migrations, dedicated tool-call tables and all planned filters/options remain review work. Exclusion counts now apply after the user's selection, preventing unrelated flagged rows from being attributed to a named test.

## M4 — Research agent and OpenAI integration — 2026-11-13
**Status:** live core implemented/tested; full A1–A8 evaluation/cache/semantic audit partial.
**Acceptance criteria:** actual account authentication and gpt-6.1-sol access, strict function calls, structured JSON, streamed answers, tool recovery, cancellation, ledger citations, budgets, persisted SSE and configured fallback implemented. Offline tests cover fallback, ordering, schema contracts, cancellation and spending refusal. No fallback model replacement was necessary.
**Measured numbers:** latest direct A1 habitat flow 37.764 s, estimated $0.0451759; nine tools, one recovered argument error, two artifacts; invalid IDs/type mismatches/heuristically uncited statements all zero. This does not prove numerical entailment or aggregate >=95% tool success. Initial livecheck citation warnings remain as historical evidence; subsequent fixes/tests supersede them.
**PROPOSAL:** allow one final tools-disabled synthesis response after six tool rounds, avoiding failure after successful analysis. Preserve correct SI=true and canonical lowercase answer section keys in events. Never interpret citation-marker validity as a semantic scientific certification. No host generated-code execution path.

## M5 — Connected research workspace — 2026-11-13
**Status:** functional dark research UI implemented/tested; complete UX/accessibility/theme criteria partial.
**Acceptance criteria:** live conversation, activity/cancel, citations, evidence/PDF panel, interactive Plotly artifacts, raw/SI explorer, recent/persisted threads, comparisons, envelope, original media, disclosures and labeled recordings work. Desktop/mobile walkthrough completed. Light theme and a full accessibility/cross-browser audit remain open.
**Test output:** five frontend tests pass; TypeScript/lint/build pass. Nine keyless browser tests pass (25.0 s), two explicit live-only tests skipped. Live FLEX measurement browser test passes with citation/reload persistence. Live habitat browser test passes (29.5 s plus startup): 17 matches, exactly 16 chart run IDs matching available K measurements. Screenshots under build/eval/screens/.
**PROPOSAL:** generic HTTP response typing remains partial (`any`), though canonical artifact/evidence/SSE types are generated. No placeholder educational/game screens were added.

## M6 — Comparison and Applicability Envelope — 2026-11-13
**Status:** implemented and tested for current curated datasets.
**Acceptance criteria:** unit-aware groups, confounder checklist, quantity-definition checks, atmosphere ranges, unknown conditions and separate gravity caveat. No arbitrary fire-risk score or lunar/Martian prediction. Browser comparison/envelope charts and controls pass; scientific tests verify quality exclusions and missing pressure behavior.
**Measured numbers:** strict 8–10.2 psi / 30–36% lunar reference has zero joint FLEX matches; 520–560 mmHg / 30–34% reference has 17. No count was forced to fit a preset.

## M7 — Evaluation — 2026-11-13
**Status:** partial; quality gaps measured and disclosed.
**Acceptance criteria:** architect benchmark unchanged; real dev/test ranking evaluated; source-row/scientific/security/API tests and live A1/A5 workflows exercised. Full A1–A8 and load/cross-browser evaluation remain open.
**Measured numbers:** dev R@5=0.6067, MRR=0.7567, nDCG@10=0.7084, mean 978 ms; test R@5=0.6238, MRR=0.8083, nDCG@10=0.6337, mean 1,155 ms. Recall>=0.85 and nDCG>=0.75 are missed; MRR>=0.7 passes. Gold-page hit@8=0/1 dev; no test gold-page labels. No weights were tuned against test.
**PROPOSAL:** corrected passage L3 fusion to one investigation rank list before RRF; direct per-chunk votes violated canonical intent. Add reviewed profiles/facets and improve passage coverage before strong retrieval-quality claims. Add more gold pages without changing existing labels merely to pass a score.

## M8 — Local Judge Mode and hardening — 2026-11-13
**Status:** local portions implemented/tested; deployment excluded by user.
**Acceptance criteria:** five schema-validated recordings: three explicitly scripted deterministic walkthroughs, actual live habitat research and a verified hosted-code workflow. Keyless playback, citations, charts, code/tables and media pass. No live activity is misrepresented during playback. Security headers, body bounds, path confinement, budget/rate protections and secret-safe errors exist. No public URL/proxy/container-size acceptance claim is made.
**Test output:** final raw-file hash audit has zero mismatches; configured-secret scan has zero matches across deliverables/frontend/app state; recording event/evidence/artifact schemas pass. `git diff --check` passes (Windows LF/CRLF notices only).
**Known limits:** Windows asyncio can log WinError 10054 when Chrome closes a media connection; media tests pass. Some original TS clips produce decoder warnings. Production auth, monitoring, load/memory, deployment bundles and proxy testing were not performed.
**Next:** Claude review; no publishing/deployment authorization.

## M9 — Optional hosted Analysis Lab — 2026-11-13
**Status:** implemented and tested, with documented isolation/format corrections.
**Acceptance criteria:** actual hosted Python in an explicit 1 GB/network-disabled container; no host API key; only verified Analysis Bundle exports uploaded; output file/size/row/unit/finite/schema checks, logs/code and reproducibility ZIP. Pre-container budget refusal and provider-side built-in tool-call bound supplement 120 s turn timeout and three-call cap. Invalid/empty results remain invalid. No arbitrary Python executes in the backend process.
**Measured numbers:** smoke verified execution/policy/key absence and deletion; latest successful scientific run estimated $0.084622. Independent raw-source medians: methanol n=150, 4.6e-7 m²/s; n-heptane n=107, 5.4e-7 m²/s. Earlier failures (missing Parquet reader, empty result and provider-prefixed filenames) were diagnosed rather than represented as successful science.
**PROPOSAL:** CSV fallback because hosted environment has no Parquet reader; preserve list/raw/unit strings and 17-digit floats, with source/export hashes. Use per-turn container teardown instead of session reuse for stronger isolation. Cleanup failure is suppressed with expiry fallback; add observability before public use. Canonical security/AI docs need architect review, not silent edits.
## Final local verification — 2026-11-13
**Status:** core ready for independent review; remaining gates disclosed, no public-release claim.
**Test output:** final backend `37 passed, 1 warning` (6.74 s), Ruff lint/format pass; frontend lint/TypeScript/build pass after adding summary provenance. Investigation variable statistics now exclude flagged rows and link to contributing source rows, source hashes and transformation steps. FLEX pressure summary uses 273 accepted source values; invalid zero pressure is not a scientific minimum.
**Additional verification:** final hosted artifact ZIP contains 11 files (149,807 bytes), including SI-generated analysis.py and source CSV inputs, with no configured secret. Final hosted run with provider-side tool-call bound and pre-container spending check succeeded ($0.084622 estimate) and independently matches raw FLEX medians. Latest recording passed offline browser playback (1 test / 9.0 s). Final live habitat browser test passed; its report is saved separately from keyless results.
**Local runtime:** FastAPI serves the built frontend at http://127.0.0.1:8000; health reported knowledge_db=true, bundle=true and embeddings=ready. Five recordings available. No commit, push, remote change, production connection or deployment occurred. All 274 verified original hashes match; data/ was never written by implementation code.

## Post-judging first checkpoint
Comparison and unsupported d2 corrections implemented under review 11 authorization. 39 backend tests passed; Ruff lint/format passed. See POST_JUDGING_IMPLEMENTATION_REPORT.md. Full remediation remains incomplete; no publication or commits.


## Visitor isolation checkpoint

Implemented anonymous 256-bit visitor credentials in HttpOnly SameSite=Strict cookies, hashed ownership in stored sessions, owner-filtered listing, and backend ownership enforcement for every /api/sessions/{id} path (read, update, message, cancel and events). Cross-origin writes are rejected. SECURE_COOKIES must be true under production HTTPS. Legacy ownerless sessions are inaccessible through public thread routes; no automatic adoption is permitted.

Verification: 40 backend tests passed in 7.83 s, including two visitor contexts, guessed thread IDs, event retrieval, cancellation, mutation, listing, cookie persistence and cross-origin rejection. Ruff import ordering corrected after initial lint failure; formatting passed.

A4 remains IN_PROGRESS: artifact/evidence download ownership and browser end-to-end behavior still require audit. This is not a claim of complete privacy remediation. Budget accounting and retrieval remain unchanged. No publication, commits or original NASA data changes.

## Frontend experience refresh � partial implementation (2026-11-13)

Implemented research entry links on the home page, opt-in cinematic introduction, and shared observatory surface/typography/interaction refinements. Preserved backend contracts and corpus. This is an initial pass, not completion of the requested full transformation.

Validation: initial production build, lint, typecheck and 9 unit tests passed. Browser suite: 14 passed, 1 failed (obsolete automatic-intro expectation), 4 live-provider tests skipped. Updated intro expectation; targeted browser test passed. Build retry required escalation after esbuild filesystem permission denial. Large bundle warning remains.

Deployment discovery: documented SSH alias vps succeeds; current release /var/www/embernova/releases/67a617d. Direct root IP authentication fails. No production files changed. No commit or push performed, respecting requested deployment-before-commit order.

Outstanding: complete route-by-route visual review and redesign, accessibility/performance verification, final production build verification, safe deployment with rollback, public verification, commit and push.

## Frontend refresh deployment � 2026-11-14 UTC

Published the current frontend build at the user's explicit request. Created rollback archive `/var/www/embernova/shared/backups/frontend-20261114T052858Z.tar.gz`. Uploaded hashed assets first (preserving old assets for existing clients), then atomically replaced index.html in release 67a617d. No backend restart, environment edits, or database/corpus changes.

Public HTTPS index SHA-256 matches local build: a4bd4aa032c6c3c26bcb4db380662e71542bbe43bf422320af918769b4b166e9. Public /api/health reports status ok with knowledge_db, bundle and frontend true. Final production build passed after permission escalation. Full redesign and comprehensive accessibility/performance review remain outside this initial pass.
`nProduction browser verification: npm exec playwright -- test -c playwright.prod.config.ts e2e/research.spec.ts � 15 passed (1.5m). Live-model tests were not run. Desktop/mobile disclosure checks, original-media byte ranges, citations, intro, dataset charts, comparison and envelope flows passed.

## Observatory frontend redesign � 2026-11-14

Rebuilt the landing experience with a split original-NASA-image hero, immediate question entry, research pathways, contrasting process section, original footage and suggested-question links. Introduced a lime/forest observatory design system across workspace, catalogs, datasets, comparison, envelope, media, recordings, capabilities and methods. Desktop data navigation is a fixed side rail; mobile retains scrollable tool navigation. Reworked explorer title/description hierarchy and capability layouts. No backend/data/architecture changes.

Lazy-loaded the cinematic introduction: initial JS fell from 525.91 kB to 504.93 kB (gzip 162.06 to 155.26 kB). Large Plotly chunk warning remains; it is deferred. Browser test asserts introduction, space scene and Plotly are absent from initial landing resource requests.

Validation: build/TypeScript and lint passed; 9 unit tests passed. 19 local interaction/responsive tests passed, followed by 5 final responsive/keyboard/deferred-loading tests after fixing header overlap found in screenshot review. Screenshots: build/eval/screens/observatory-{1440,768,390}-{0..12}.png. Reviewed desktop landing, catalog, workspace, envelope, tablet capabilities, mobile landing. This is basic accessibility verification, not a comprehensive WCAG audit. No live-provider calls in this run.

Deployment: published hashed assets then atomically replaced index.html without restarting backend. Rollback archive: /var/www/embernova/shared/backups/frontend-20261114T055037Z.tar.gz. Public HTTPS index matches local SHA-256 53608558c049a0ecdd57ab626128f8b8abe3c6b9e5d765b009d739eca52d7cc3. Public API health is ok; databases, corpus and secrets untouched.
Public production verification: 20 passed (3.3m), including all 13 routes at 1440/768/390px, no application page errors, keyboard skip link, original image loading and all existing research judge flows.
