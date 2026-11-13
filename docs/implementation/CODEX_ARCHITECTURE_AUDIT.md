# Independent architecture audit

Audit date: 2026-11-13. Scope: local implementation only. No commits, branch changes, remote operations or deployment are authorized. This instruction supersedes the milestone commit/deployment/checkpoint-stop instructions.

## Verdict

**PASS WITH IMPROVEMENT.** The single research agent, deterministic scientific tools, SQLite retrieval, Parquet Analysis Bundle, FastAPI and React architecture addresses the challenge. Preserve it. The local FLEX vertical slice and extensions are implemented and tested. No general risk predictor is justified. Hosted code execution passed an isolation smoke test and real numerical verification and is available only by explicit thread opt-in. This verdict approves the architecture for local implementation, not scientific certification or public release; retrieval quality and other acceptance gaps remain documented in the review handoff.

## Requirements traceability

| Requirement | Existing architecture component | Verdict | Required action |
|---|---|---|---|
| A: discover and rank habitat-relevant investigations | Two-level retrieval, profiles, ranked investigation explorer | PASS WITH IMPROVEMENT | Measure ranking against the independent benchmark; expose degraded lexical search |
| B: extract evidence for predictive research | Raw/SI Analysis Bundle, numeric queries, exports | PASS | Verify original hashes; retain row and mapping provenance |
| C: inform prevention, detection and suppression controls | Objective facets, source passages, engineering implications | PASS WITH IMPROVEMENT | Include document-led solids and smoke research, not just droplet plots |
| Scientific conversation and tool choice | Responses API single-agent loop | PASS WITH IMPROVEMENT | Verify account model access, streaming, bounded loops and citation ledger |
| Experiment and numerical exploration | Investigation and dataset explorers | PASS | Show raw values, units, missing values and quality findings |
| Comparisons | Validity rules and comparison artifacts | PASS WITH IMPROVEMENT | Include within-group heterogeneity, not just median differences |
| Interactive charts | Backend ChartSpec and Plotly | PASS WITH IMPROVEMENT | Unambiguously specify plotted display units; forbid model-supplied points |
| Original media | Catalog, derivatives, Range streaming | PASS | Link to runs only with verified keys; unknown captions stay null |
| Reproducibility and citations | Evidence ledger, artifact provenance and exports | PASS WITH IMPROVEMENT | Include source digest and row locators in derived artifacts, verify extracted text linkage |
| Applicability | Atmosphere envelope, gravity caveat | PASS WITH IMPROVEMENT | Separate atmosphere overlap from full scenario coverage; missing pressure is unknown, not outside |
| Safe generated code | Hosted Code Interpreter | PASS WITH IMPROVEMENT | Fail closed until live sandbox verification; never execute generated code on host |
| Judge resilience | Recorded real sessions | PASS WITH IMPROVEMENT | Never label scripted demonstrations as live or as previously executed model responses |
| Universal lunar/Martian prediction | Explicitly rejected | PASS | Retain refusal; no partial-gravity run dataset is present |
| Local-only development | M8 deployment conflicts with this assignment | PASS | User restriction wins: no deployment, production connection, commits or publication |

## Independent evidence and scientific assessment

`python -I scripts/audit_corpus.py` recomputed SHA-256 for **274 verified original files**: **zero mismatches**. Saved evidence: `build/eval/corpus_audit.json`. The repository initially contained architecture/curation documentation and empty application directories, not application code. Git already contained uncommitted documentation changes. The requested FEATURE_SPECIFICATIONS, architecture README, TECH_STACK_DECISIONS, TASK_BREAKDOWN and ACCEPTANCE_CRITERIA files do not exist; their canonical counterparts are PRODUCT_REQUIREMENTS, the ADRs and CODEX_MASTER_PLAN.

FLEX CSV SHA-256: `37c88ce8ae9391b7544ff630a45ce87543d04d317cdbfbed104fe7d5c27e1b96`. Direct parsing confirms 274 rows; 17 with oxygen fraction 0.30–0.34 and pressure 520–560 mmHg; alternate identifier `193F001` occurs twice; test 114 has pressure zero. Source test numbers, not alternate identifiers, form the run key. NASA/TP-2015-216046 physical PDF page 25 defines the burning-rate constant through a diameter-squared/time fit; physical page 26 Table IX identifies mm²/s, mmHg and O₂/N₂/CO₂/He. Printed page numbers differ from physical PDF pages by six. All citations use physical pages.

Independent raw d²-law calculation finds **196 complete finite rows**, median **0.9511842477375565**, rather than the reported approximately 188. Production exclusions must be explicit and must not silently force an expected count. Departures from unity do not prove erroneous measurements. Some extinction diameters are extrapolated, per page 25. Visible extinction is not proof that all combustion ceased.

The normalizing golden test is slightly imprecise: 757.7 mmHg converts through pint to approximately 101018 Pa, within the documented rounding tolerance. Every parsed field needs its raw value and source header; inferred units additionally need the NASA page locator. BASS-II has gas percentages and raw fan settings but no calibrated airflow or ambient pressure in its CSV. Never infer those from cabin defaults. FLEX-2 is a design matrix with lists and ranges, not eight measured tests. CFI requires a separately verified workbook join for outcomes. CFI-G inverse burner oxygen is not ambient habitat oxygen.

## Official sources and limitations of this audit

- [Official challenge](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/): independently retrieved in read-only headless Chrome after HTTP 502/TLS failures in other clients. The scientific description is embedded in the site's Next.js JSON rather than its short visible body. `scripts/extract_challenge.py` parses JSON without executing it and extracts 10,428 characters of Background, Objectives, Potential Considerations and Resources into `build/eval/official_challenge_full.txt`. The source explicitly requires (A) relevant-investigation ranking, (B) extraction for flammability/fire modeling research, and (C) safety engineering insights. It confirms no PSI partial-gravity data, gravity/hardware distinctions, separate pressure/oxygen effects, lunar atmospheres at ≥30% O₂ and ≤10.2 psi, and exclusion of rocket propulsion. CFI-G's burner-side oxygen must not be interpreted as ambient habitat oxygen. This confirms the scientific challenge fit independently of Claude's summaries. Separate legal/submission guidance and event dates are not certified here; no date gate is implemented.
- [PSI](https://psi.nasa.gov/) and downloaded manifest/metadata: source records, persistent identifiers, originals and extraction indexes are available locally.
- [Official video](https://www.youtube.com/watch?v=AVuEiKxOpc0): fetch returned cache miss; the local resource catalog references it, but its contents were not independently viewed.
- [OpenAI model catalog](https://developers.openai.com/api/docs/models), [Responses function calling](https://developers.openai.com/api/docs/guides/function-calling), [streaming](https://developers.openai.com/api/docs/guides/streaming-responses): official documentation was checked, then actual account requests authenticated, retrieved `gpt-6.1-sol`, called a strict function, streamed text and returned structured JSON. Subsequent live scientific and hosted-code workflows succeeded. No replacement was needed. The fallback model's account access was not separately tested.

## Technical strengths, weaknesses and security

Strong choices: separate evidence and mutable session stores; no unnecessary vector service; deterministic numeric queries shared by UI and agent; schema-based artifacts; hosted-only generated code; lexical fallback; bounded agent and cost controls.

Corrections: expected 5k–12k chunks are not supported by the architecture's own 5.14M-character/3.2k-character calculation (approximately 1.6k before page boundaries and overlap). Count actual chunks instead of padding. Avoid accepting citations merely because an ID exists globally: require the turn ledger. Validate source paths against the corpus root, source digests and allowlisted file IDs. Generated output files never become executable host code. Avoid false numeric-grounding confidence from marker validity alone. Cost estimates must come from configured rates and reported usage, with a reservation before requests to limit concurrent overspend. Provider error messages must be sanitized. No API keys go to the frontend, container or artifact records.

## Implementation decisions

Preserve canonical architecture files; document corrections here and in PROGRESS_LOG for Claude review. Retain the existing stack and verified model. Both real live research and keyless tools/clearly labeled recordings work. Use atmosphere-specific coverage labels and separate gravity verdicts. Missing source quantities remain unknown. No architecture redesign, synthetic scientific data, unsafe host execution, deployment or remote publication is authorized.

## Build-time findings and corrections

- CFI's CSV has **87 source records but 79 distinct Flex Numbers**. Eight rows (81–88) exactly repeat rows 24–31 after decoding. The proposed unique join assumption was wrong. Curation explicitly preserves duplicate source records with `@row` locator suffixes and `duplicate_row` flags; analysis excludes those copies, while raw/normalized explorers retain them. These engineering IDs do not assert new NASA tests.
- FLEX test 24's original cp1252 cell is **U+2013 EN DASH**, a missing-value token, not U+FFFD. The earlier architecture's encoding-artifact golden assertion is wrong. The implementation keeps the diameter null and does not invent an encoding flag or discard valid atmospheric conditions in that row.
- Actual page-bounded chunk count is **3,495**, with **3,187** physical-page/extracted-part records. Chunk count is not padded to the inconsistent expected range.
- Real API checks authenticated successfully, retrieved `gpt-6.1-sol`, streamed text, produced a strict function call and validated structured JSON. No model replacement is required. End-to-end workflow verification is tracked separately.
- Some downloaded MPEG-TS clips emit decoder warnings. Web derivatives preserve the original source hash; original bytes remain untouched. Playback verification must not be described as perfect source decoding.

## Final implementation assessment and recommended review

Five curated tables expose 577 source records, including CFI duplicates, distinct source representations of CFI runs, and FLEX-2 designs. This is not a count of 577 independent experiments. Search indexes all 34 investigations, including document-only evidence relevant to solid-material spread and smoke detection. Original media have source hashes; unknown captions and associations remain unknown.

Critical scientific safeguards passed tests: raw/SI units, missing values, duplicate handling, exact alternate-label lookup, filter-specific quality exclusions, chart point provenance, confounded comparisons and missing-gravity applicability. The 17 selected FLEX atmosphere rows have **16 nonmissing burning-rate values**; the seventeenth must not be fabricated as a chart point. Bundle files are hash-checked at startup.

Hosted execution uses provider-confirmed 1 GB/network-disabled containers and only allowlisted, hash-verified CSV exports of the bundle. CSV is a justified fallback because the hosted environment lacked a Parquet reader. Containers are per turn, with cleanup requested and expiry fallback. Output sizes, units, filenames and result schema are validated. Two fuel medians and sample counts matched independent raw-source calculations. Generated code/results remain SI-labeled and require review; schema validity alone does not prove arbitrary generated calculations correct.

Remaining **GAP** items are implementation/evaluation gates rather than reasons to redesign the system: reviewed synthesized profiles and full facet coverage, remaining telemetry/numeric parsers, complete canonical SQL/API parity, semantic numerical entailment checks and comprehensive A1–A8/load/security evaluation. Actual hybrid test R@5=0.6238 and nDCG@10=0.6337 miss their targets; MRR=0.8083 passes. Only one gold-page question exists, and it misses hit@8. Passage ranking must improve and evaluation coverage must expand before strong quality claims.

The test suite validates artifact/evidence/SSE contracts, keyless and live browser workflows, source exports/media Range requests and hostile paths/arguments. Citation-ID/type checks cannot certify scientific entailment. Final readiness: **functional local core, ready for independent engineering/scientific review; full roadmap acceptance and deployment approval remain open.** See CODEX_PROGRESS and CODEX_REVIEW_HANDOFF for exact commands, evidence and unfinished work. Canonical architecture/ADR documents, AGENTS.md and CLAUDE.md remain unchanged.
