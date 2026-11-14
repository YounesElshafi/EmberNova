# EmberNova consolidated audit

Audit date: November 13, 2026. This report consolidates the completed repository reviews, primary-source research and non-destructive probes. Production code, datasets and deployment settings were not changed. No paid model or embedding calls were made. Detailed evidence remains in [AI/retrieval notes](notes/ai-retrieval.md), [scientific/data notes](notes/science-data.md), [application notes](notes/application.md) and [file coverage](notes/file-coverage.md). Paths below are relative to the repository root; line references describe the audited snapshot.

## Overall assessment

EmberNova is a substantive scientific application with an appropriate core architecture: one bounded research agent invokes deterministic tools over an immutable NASA corpus and a curated numerical Analysis Bundle. React, FastAPI, SQLite/FTS5, Parquet/DuckDB, NumPy exact vector retrieval and backend-authored Plotly specifications remain competitive choices for this workload. There is no evidence that microservices, a vector service, a graph database or additional agents would improve the submission.

Its distance from a research-grade system is primarily evidence assurance, evaluation and operational completeness. The system can retrieve relevant investigations and reproduce important FLEX calculations, but its clean numeric audit does not establish scientific correctness. Some summaries, evidence labels and UI interactions can mislead. Deployment readiness has not been demonstrated. No component can responsibly be called best-in-class on the collected evidence.

The audit measured 34 investigations, 93 documents, 3,187 pages and 3,495 chunks. Backend tests passed **56/56**; Ruff checks and formatting passed. The separate scripted agent/citation subset passed **9 tests** and overlaps the backend suite. Frontend **8 tests**, lint, typecheck and production build passed. Twelve browser cases passed their assertions, but runner teardown hung and was interrupted with exit 1: this is **not a clean end-to-end suite pass**.

## Top ten improvements, in priority order

| Rank | Finding and action | Evidence / expected effort |
|---|---|---|
| 1 | Correct generic extinction summaries: exclude completion/disruption zeros from extinction statistics while preserving their raw records and outcomes. | Executed eight-row probe returned median 0 mm for non-extinctions; low–medium. |
| 2 | Replace claims of numeric verification with honest diagnostics immediately; implement quantity/run/unit/source-bound validation next. | Wrong units, sign, quantity and unrelated numbers passed the audit; medium for full solution. |
| 3 | Correct field-level scientific semantics: derived partial pressure is derived; ground-gravity records must retain their actual gravity. | Derived evidence-label probe plus source inspection; low–medium. |
| 4 | Make chart selection resolve the selected point's provenance rather than the first evidence record. | Deterministic source fault, `ArtifactView.tsx:49`; low–medium. |
| 5 | Return valid envelope results when pressure-chart data is absent; render an explicit unavailable chart state. | BASS-only/solids-only envelope probe raises `ValueError`; low. |
| 6 | Implement and verify deployment against actual paths/config, correct readiness status, and retain reviewed keyless replays. | No deployment assets/CI found; missing-build health returns HTTP 200; medium. |
| 7 | Authorize private artifacts and exports by owning session; explicitly mark published replay artifacts public. | Second visitor received artifact and ZIP HTTP 200, while session GET correctly returned 404; medium. |
| 8 | Add keyless relevance rejection and exact scientific identifier routing; evaluate retrieval changes on appropriate labels. | Pizza ranked highly; profile-only ablation has mixed metric gains; low–medium. |
| 9 | Correct unknown-value comparison displays, CFI row semantics, mobile overlap and evidence accessibility. | Browser/source inspection and CFI duplicate-identity probe; low–medium. |
| 10 | Close reliability gaps with bounded resources, semantic tool validation, context pagination and reproducible CI. | Static lifecycle/context findings and incomplete browser teardown; medium. |

Effort estimates are reviewer judgments, not implementation commitments. Before submission, prefer narrowly tested corrections over simultaneous broad rewrites.

## What should remain

Keep the single-agent Responses loop with configurable models, strict tool schemas, budget limits and deterministic scientific tools. Keep backend ownership of numbers, units and measured-data charts. Retain raw values, normalized values, source hashes and locators, reviewed mappings, nulls for unknown conditions and explicit partial-gravity limitations. Independent FLEX recomputation matched the implemented d² diagnostic: n=195, median approximately 0.9510817308. The 17 lunar-band FLEX labels were independently confirmed; this is coverage evidence, not lunar safety validation.

Keep SQLite WAL for single-host mutable state, read-only knowledge storage, FTS5, and exact normalized vector products for this corpus size. Keep RRF as a baseline, Plotly, React SPA navigation, source inspection and keyless recorded research. Session ownership, body-size rejection and cross-origin write protection worked in executed probes. SQL parameterization, path restrictions, disabled raw Markdown HTML and source-integrity checks are useful existing defenses.

## Confirmed scientific and data problems

The generic measurement summary still pools zero-valued non-extinction outcomes even though comparison-specific handling was fixed. Apply a shared outcome-aware eligibility function to every aggregation, chart and export-derived summary. Return selected count, eligible count, exclusions and reasons. Do not silently delete raw zeros or reinterpret every zero as missing.

Derived oxygen partial-pressure evidence is labeled measured. Row-wide provenance cannot describe heterogeneous fields accurately: maintain per-field `value_kind`, formula, input evidence and units. The scientific notes separately identify ground-gravity field semantics by source inspection; preserve 1g versus microgravity at record level and never infer gravity from dataset branding.

CFI exports contain **158 records for 79 unique Flex labels**, despite describing one measured test per row. Establish whether records represent distinct source observations, conditions or duplicated joins; do not deduplicate solely on label. Publish a composite observation identity and count unique experiments separately from rows. Correct the data-card wording immediately.

BASS-only/solids-only oxygen envelopes fail because the mandatory oxygen-pressure chart has no usable joint data. Envelope computation should return per-dimension and joint availability independently; absence of pressure must remain unknown, not outside or zero. Frontend rendering must tolerate a missing chart.

Comparison UI displays unknown flow as “Differs: No.” Use equal/different/unknown states. Do not translate missing metadata into demonstrated comparability. Evidence-strength labels based on row/publication counts likewise overstate quality: three rows plus a document do not establish independent replication, uncertainty or relevance (`agent/citations.py:134`). Replace these with factual coverage descriptions.

Further source-inspected limitations include incomplete uncertainty propagation, potential correlated observations, pooled summaries across heterogeneous conditions, and non-atomic publication of multi-file builds. These warrant explicit limitations and targeted checks; they are not demonstrated errors in every result. Publish immutable versioned bundles with one atomic active-version pointer, validating hashes before serving.

## Retrieval, ranking and RAG recommendations

The current pipeline combines Porter/unicode61 FTS5, 512-dimensional normalized vectors and RRF with k=60 (`backend/src/embernova/retrieval.py:45,89,169,188`). Objective tags are heuristic preferences, not scientific significance or fire-risk scores. Label relevance scores accordingly; expose hard filters separately from preferences.

Executed keyless fallback results on the existing architect-authored benchmark:

| Split | Queries | Recall@5 | Precision@5 | MRR | nDCG@10 |
|---|---:|---:|---:|---:|---:|
| Dev | 20 | .60833 | .42 | .84667 | .79106 |
| Test | 10 | .67381 | .46 | .93333 | .68170 |

Mean local latency was approximately 610 ms dev and 366 ms test in one sequential run, including ledger work. These are not production-load measurements. Only one benchmark query has page labels. Investigation ranking metrics do not measure citation entailment or answer correctness; Recall@5 also has a ceiling when more than five investigations are relevant.

Profile-only lexical retrieval improved recall to .78833 dev/.72857 test, but reduced test MRR to .875 and nDCG to .65618. Therefore no replacement universally wins. A pizza query returned PSI-68 with score .947159 and `no_match=false`; malformed irrelevant text also received high scores without executing SQL. These demonstrate relevance rejection failure, not database injection.

Immediately add explicit out-of-domain handling, preserve exact run/report identifiers, normalize scientific Unicode and carefully curated aliases, and prevent confidence-like interpretation of rank scores. Fix scoped dense retrieval by masking eligible rows **before** top-K selection; current global top-50 then filtering can starve scoped results (`retrieval.py:98,114`). Keep exact matrix search.

For a controlled subsequent experiment, compare current hybrid, lexical-only, hybrid plus cross-encoder, and query-expansion variants on the same page-level judgments. Measure recall, precision, nDCG, abstention errors, latency and cost; add fresh held-out labels after using existing test results. Do not adopt learned sparse retrieval, ColBERT, reasoning retrievers or GraphRAG without a measured workload benefit.

The best RAG design is the existing tool-based assistant plus stronger evidence contracts. Structured identifiers and numerical requests should route to deterministic data tools; explanatory synthesis should retrieve matched spans and supporting pages. Full-page tool strings are truncated to 1,600 characters before model use (`agent/loop.py:64`), while other excerpts also clip prefixes. Add offset/cursor pagination, total length and explicit truncation metadata so qualifiers near page ends remain reachable.

Numeric probes accepted 0.94 metres, -0.94 mm and pressure 0.94 mmHg against an extinction-diameter fixture of 0.94 mm. They also accepted 999 from a user question and 888 from unrelated tool output. An uncited universal lunar-safety assertion produced clean counters. These are executed validator failures, not observed live-model answers. Bind claims to quantity, value, unit, run, evidence ID and transformation; validate with the units module and emit deterministic numeric snippets. Treat prose entailment as separately evaluated and fallible. Mark streamed prose provisional until final checks complete.

Keep model IDs configurable and benchmark current/fallback models on repeated NASA tasks with fixed tools and budgets. No paid comparison or production semantic benchmark was run; generic leaderboards cannot select the best EmberNova model.

## Backend, UI and security actions

Chart click handling ignores selected trace/point and opens `chart.provenance.evidence_ids[0]` (`frontend/src/components/ArtifactView.tsx:49`, see application notes for exact snapshot path). Carry run/observation identifiers through Plotly custom data, resolve matching row evidence and display the original locator and transformation. Add an accessible table and keyboard source-selection route.

Mobile inspection found lower content obscured by the composer and small text. Reserve composer space, improve text sizing and focus-managed evidence presentation. Expose existing backend dataset filters in the explorer; display loading, unavailable and error states consistently. Keep Plotly; benchmark a selected trace bundle after correctness fixes instead of replacing the visualization framework.

Ownership middleware checks sessions but artifact records lack ownership (`main.py:106`, `storage.py:21`). Use session-linked ownership and explicit publication status for derived artifacts and ZIP exports. Unguessable IDs reduce discovery but are not authorization. The probe used harmless NASA data; no real private-user disclosure was demonstrated.

Missing-build `/api/health` returned HTTP 200 with `not_ready`. Separate liveness from readiness; readiness should validate stores, bundle integrity, static assets and required replays, returning 503 on failure (`main.py:199`). Deployment documentation uses environment names/layout inconsistent with current `config.py:10` and static serving. Verify actual `BUILD_DIR`/`STATE_DIR`, proxy forwarding, secure cookies, writable-state isolation and one-worker cancellation assumptions before publishing.

Source-inspected reliability risks include unbounded SSE queues, incomplete rate limits/retention for non-LLM operations, synchronous tool threads continuing after timeout, and silent dropping of function calls beyond ten (`agent/loop.py:353,368`). Send an output for every call ID, publish tool results only while the turn remains active, validate cross-field ranges and list limits, and bound concurrency, queues and artifact storage. These risks were not all reproduced under load.

Dependency scanning reported **16 affected packages: 13 moderate, one high, two critical**. Critical findings concern Vitest/Tinypool development contexts; no public production RCE was demonstrated. Upgrade through tested lockfile changes, exclude development tooling from deployment, and avoid forced automatic upgrades. Python vulnerability scanning, production load/TLS/RSS and comprehensive assistive-technology testing were not completed. A stray `.env.txt` filename was observed without reading contents; this is not proof of leaked credentials.

## Research worth using

Existing notes contain fuller authorship, evidence and applicability records. The strongest actionable research connections are:

- [BEIR, Thakur et al., NeurIPS Datasets and Benchmarks 2021](https://arxiv.org/abs/2104.08663): heterogeneous retrieval evaluation supports retaining lexical baselines and measuring domain transfer.
- [ColBERTv2, Santhanam et al., NAACL 2022](https://aclanthology.org/2022.naacl-main.272/): late interaction is a credible retrieval experiment, with additional indexing/inference complexity and no demonstrated EmberNova gain.
- [M3-Embedding, 2024 preprint](https://arxiv.org/abs/2402.03216): dense/sparse/multivector alternatives merit controlled comparison, not automatic adoption.
- [BRIGHT, Su et al., 2024 preprint](https://arxiv.org/abs/2407.12883) and [ReasonIR, Shao et al., COLM 2025](https://arxiv.org/abs/2504.20595): motivate mechanism/condition reasoning queries; external benchmark results do not transfer directly.
- [Enabling Large Language Models to Generate Text with Citations, Gao et al., EMNLP 2023](https://arxiv.org/abs/2305.14627): evaluate citation correctness and completeness separately from answer correctness and syntactic validity.

Scientific notes additionally record NASA source verification and a 2026 droplet-metrology preprint, explicitly unreplicated. Automated video metrology is a post-hackathon research direction requiring manual reference annotations and uncertainty validation. It is not a validated replacement for curated measurements. For engineering, [SQLite WAL guidance](https://sqlite.org/wal.html), [FastAPI proxy guidance](https://fastapi.tiangolo.com/advanced/behind-a-proxy/) and [WCAG non-text guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html) directly support the proposed operational and accessibility fixes.

## Submission versus subsequent work

**Before submission:** correct outcome statistics and misleading labels; fix empty envelopes, unknown comparisons and point-level source navigation; remove overstated assurance; protect unpublished artifacts; verify readiness/deployment configuration, secure proxy behavior and reviewed keyless replays. Resolve demo-breaking mobile overlap and browser teardown. Run focused regressions when implementing these fixes. If deployment cannot be verified, do not claim live readiness. Defer model/retriever rewrites.

**After the hackathon:** build page/claim-level ground truth and repeated live-agent evaluations; implement typed numeric claims, field-level uncertainty and matched-condition analyses; benchmark rerankers/embeddings/query expansion; add resumable event processing, atomic build publication, retention, dependency maintenance and observability. Study uncertainty-aware effect estimates only after experimental independence and comparability are established. Video metrology, reasoning retrievers and richer evidence graphs remain promising experiments, not proven upgrades.

The recommended architecture remains browser → same-origin proxy → modular FastAPI monolith → immutable versioned corpus/Analysis Bundle plus owner-aware SQLite state. A single configured agent uses the same deterministic tools as direct UI workflows. Stronger provenance, honest assurance and measured evaluation offer the clearest path to a scientifically trustworthy submission.

Reproduction scripts/results and selected screenshots are retained under `build/state-of-the-art-audit/`; that directory is generated and gitignored. Detailed notes preserve additional static findings and coverage limits. The audit ended at the user's stop instruction; no further research, testing or production changes were performed for this consolidation.
