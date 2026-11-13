# Codex implementation progress

Updated 2026-11-13. Current stage: local core implemented and verified; independent review and remaining acceptance gaps are open. Everything is local and uncommitted. No deployment work was performed.

## Feature status

| Component | Status | Evidence / limits |
|---|---|---|
| Independent architecture and challenge audit | Implemented and tested | Official scientific challenge text retrieved independently; original NASA report and tables checked; CODEX_ARCHITECTURE_AUDIT.md |
| Corpus safety and catalog | Implemented and tested | All 274 verified original hashes match, including final rerun; data/ read only |
| Document discovery and semantic/keyword ranking | Implemented but partially tested | 34 investigations, 93 documents, 3,187 page/part records, 3,495 chunks; real cached embeddings; ranking targets missed |
| Scientific data foundation | Implemented and tested for five tables | FLEX, BASS-II, CFI CSV, matched CFI workbook, FLEX-2 design; 577 source records, not independent experiment count |
| Unit-aware queries and charts | Implemented and tested | pint only; raw/SI preservation; invalid/missing/duplicate flags; verified chart points; CSV exports |
| Comparison, d² consistency, Applicability Envelope | Implemented and tested | Named confounders, separate atmosphere/gravity coverage, missing conditions remain unknown; no risk probability |
| Live OpenAI research | Implemented and tested | gpt-6.1-sol accessible; Responses streaming, strict tools, JSON structured output and real research; fallback regression tested offline |
| Scientific citations and reproducibility | Implemented but partially tested | Turn ledger, source/row/page/hash links, artifact ZIPs and schema tests pass; semantic numerical entailment remains unimplemented |
| Research frontend | Implemented and tested | Streaming research, recent/persisted threads, explorers, chart/evidence panel, comparison, envelope, original media, recordings and disclosure; desktop/mobile checks |
| Original media | Implemented and tested | 39 items; TIFF/TS derivatives retain original attribution; browser byte ranges pass; some original TS clips decode with warnings |
| Hosted Analysis Lab | Implemented and tested | 1 GB, network-disabled hosted container; no host key; allowlisted verified CSV inputs, strict outputs, logs/code/ZIP; real medians independently matched |
| Judge Mode | Implemented and tested | Three explicitly scripted deterministic walkthroughs plus two real recorded workflows; canonical event schemas validated; offline playback works |
| Remaining numeric/telemetry parsers and reviewed SI profiles | Not implemented | Saffire telemetry, SAME-R/CFI-G/ACME/SPICE extensions, synthesized reviewed profiles and complete facets remain open |
| Conceptual image generation / validated predictive model | Deferred | Illustrations disabled; no fabricated image/measurement/risk score; no partial-gravity predictor |
| Student/game features / deployment / publication | Deferred or excluded | Explicitly outside this assignment |

## Actual test results

- Backend: 37 tests pass after final budget/integrity regressions; Ruff lint and format checks pass. One third-party Starlette/httpx deprecation warning remains.
- Frontend: 3 test files / 5 tests pass; ESLint, TypeScript and Vite production build pass. Plotly remains a lazy ~4.67 MB chunk (~1.42 MB gzip).
- Keyless browser suite: 9 passed, 2 live-only tests skipped, 25.0 seconds. Includes hosted Python recording/code/table display, data/chart/export, discovery, comparisons, applicability, citations, video Range and mobile disclosures. Report: build/eval/playwright-keyless.json.
- Live browser measurement workflow passed: FLEX alternate identifier 20CAL10 resolves to test 2 / physical CSV row 3 / visible extinction diameter 0.94 mm; citation opens and reload preserves the answer.
- Live browser habitat workflow passed in 29.5 seconds (37.1 including server startup): real question -> research tools -> 17 matching atmosphere rows -> 16 available burning-rate points -> interactive Plotly chart -> cited explanation. The test compares chart run IDs against deterministic measurement results. Report: build/eval/playwright-live-habitat.json; screenshot: build/eval/screens/live-habitat-chart.png.
- Live direct habitat research: 37.764 seconds, estimated $0.0451759, nine tools, two artifacts; one recovered tool argument error; invalid citation IDs=0, type mismatches=0, heuristically uncited statements=0. Semantic numerical audit stays null. Report: build/eval/live_research.json.
- Live model authentication, availability, streaming, strict function call and structured JSON verified in build/eval/livecheck.json. That initial discovery report retains its earlier citation warnings; later browser/live research results and citation regression fixes supersede them.
- Hosted code smoke verified explicit memory/network policy, actual execution, absence of OPENAI_API_KEY and successful container deletion: build/eval/sandbox_smoke.json. Real analysis report: build/eval/analysis_lab.json. Final independent raw-CSV check: methanol n=150 median 4.6e-7 m²/s; n-heptane n=107 median 5.4e-7 m²/s.
- Final local audit: five recordings validate against canonical SSE/evidence/artifact schemas; configured API secret absent from scanned source, tests, docs, curation, frontend build and app database. build/eval/final_local_audit.json. Local .env, .env.txt, build, .venv, node_modules and dist are Git-ignored.

## Retrieval quality: open acceptance gap

No benchmark labels were edited and weights were not tuned on test. Corrected passage aggregation to fuse one investigation rank list, rather than giving report-rich investigations multiple chunk votes.

| Split | Recall@5 | MRR | nDCG@10 | Mean search latency |
|---|---:|---:|---:|---:|
| Dev (20) | 0.6067 | 0.7567 | 0.7084 | 978 ms |
| Test (10) | 0.6238 | 0.8083 | 0.6337 | 1,155 ms |

Recall target 0.85 and nDCG target 0.75 are missed; MRR target 0.7 passes. Evidence hit@8 misses the single labeled dev gold page (0/1); no test gold pages are supplied. Verbatim source metadata lacks the reviewed scientific profiles and complete facets in the architecture. That and passage coverage are review priorities. Do not present the ranking evaluation as passing all quality gates.

## Scientific corrections

- FLEX raw d² consistency: 196 complete rows, median 0.9511842477375565. Production exclusions are explicit and separately tested.
- FLEX test 24 contains an original cp1252 en dash, not an encoding failure; test 114 has invalid zero pressure; duplicate alternate identifier 193F001 matches both real primary tests.
- The specific 30–34% / 520–560 mmHg selection has 17 rows, with only 16 K measurements. The stricter <=10.2 psi lunar preset has no joint FLEX matches. Nearby tests are not validated lunar-gravity evidence.
- CFI CSV has 87 rows and 79 distinct Flex Numbers. Eight duplicate rows are preserved and excluded from analysis. Workbook hot/cool definitions remain distinct; HF burn-time unit remains unknown.
- BASS fan settings are not calibrated velocity; FLEX-2 lists/ranges are designs, not invented combinations.

## Architecture changes and known limits

See the audit, PROGRESS_LOG proposals and CODEX_REVIEW_HANDOFF. Canonical architecture/ADR files and AGENTS.md/CLAUDE.md were not edited. The runtime SQL catalog and several API/tool options are a documented subset of the full specifications. Some frontend HTTP shapes still use any; SSE/artifact/evidence types are generated. Formal schema migrations, first-turn response cache, full A1–A8 evaluation, reviewed synthesized profiles, full accessibility/cross-browser/load audits and production security/operations remain open.

Hosted CSV export is a verified fallback for unavailable Parquet readers. Execution is hosted only, per turn, with deletion requested and expiry fallback. Cleanup failures are currently suppressed. Arbitrary host execution is absent. Provider-side built-in tool-call limits and a pre-container spending check bound optional Lab requests. Broad scientific correctness of arbitrary generated analyses still requires review.

Windows asyncio may log WinError 10054 when the browser intentionally closes a media connection; all Range/playback tests pass. Some original MPEG-TS decoders warn; original bytes remain intact. Initial dependency DNS/timeouts were resolved; ENOSPC during browser download was resolved by removing only verified generated caches and using installed Chrome. These are historical setup failures, not hidden passing checks.

## Modified implementation areas

backend/ (source, tests, pyproject and uv.lock), frontend/ (workspace, schemas, tests, package lock/build), curation/tables and vocab/media mappings, scripts/, .env.example, .gitignore, README.md, SI_DISCLOSURE.json, and Codex implementation audit/progress/handoff/log. Generated builds/reports remain ignored. Existing architecture docs and original NASA files remain in place.

## Run and review

From repository root: cd backend; then .venv/Scripts/python.exe -I -X utf8 -m uvicorn embernova.main:app --host 127.0.0.1 --port 8000. Open http://127.0.0.1:8000. README has fresh-install, rebuild, frontend-dev and test commands. No current credential/infrastructure blocker prevents local use. Independent Claude scientific/security review and remaining acceptance work are outstanding; public deployment remains unauthorized.

## Post-judging first checkpoint
Comparison and unsupported d2 corrections implemented under review 11 authorization. 39 backend tests passed; Ruff lint/format passed. See POST_JUDGING_IMPLEMENTATION_REPORT.md. Full remediation remains incomplete; no publication or commits.


## Visitor isolation checkpoint

Implemented anonymous 256-bit visitor credentials in HttpOnly SameSite=Strict cookies, hashed ownership in stored sessions, owner-filtered listing, and backend ownership enforcement for every /api/sessions/{id} path (read, update, message, cancel and events). Cross-origin writes are rejected. SECURE_COOKIES must be true under production HTTPS. Legacy ownerless sessions are inaccessible through public thread routes; no automatic adoption is permitted.

Verification: 40 backend tests passed in 7.83 s, including two visitor contexts, guessed thread IDs, event retrieval, cancellation, mutation, listing, cookie persistence and cross-origin rejection. Ruff import ordering corrected after initial lint failure; formatting passed.

A4 remains IN_PROGRESS: artifact/evidence download ownership and browser end-to-end behavior still require audit. This is not a claim of complete privacy remediation. Budget accounting and retrieval remain unchanged. No publication, commits or original NASA data changes.
