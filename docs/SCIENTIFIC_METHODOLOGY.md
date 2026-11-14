# Scientific and SI methodology

Detailed rules live in [architecture/SCIENTIFIC_ANALYSIS.md](architecture/SCIENTIFIC_ANALYSIS.md), [architecture/SCIENTIFIC_VALIDATION.md](architecture/SCIENTIFIC_VALIDATION.md) and [architecture/AI_ARCHITECTURE.md](architecture/AI_ARCHITECTURE.md). This page summarizes them.

## 1. From NASA files to numbers

1. **Build:** `embernova-build all` reads the read-only corpus, verifies each file's SHA-256, extracts page-aware text into `knowledge.db` (SQLite with FTS5), and normalizes the curated tables into the **Analysis Bundle** (Parquet: runs, conditions, measurements, quality findings, provenance).
2. **Curation, not guessing:** each column interpretation is declared in `curation/tables/*.yaml` with an evidence locator. FLEX semantics follow NASA/TP-2015-216046 (pp. 26–34): burning rate is K in **mm²/s**, "O/N/CO/He" are O₂/N₂/CO₂/He **mole fractions**, and pressure is in **mmHg**. O₂ fraction, total pressure and O₂ partial pressure are always separate fields.
3. **Units:** conversion happens only in `embernova.science.units` (pint). `value_raw` and `unit_raw` are stored next to `value_si` and `unit_si`.
4. **Unknowns stay unknown:** a missing condition is stored as `null`, shown as "not recorded", and never treated as a mismatch or a zero. For example, FLEX non-extinction zeros are excluded from extinction-diameter statistics, and the exclusion is disclosed.
5. **Quality checks:** plausibility flags and duplicate detection (such as CFI's 8 duplicate rows) are recorded per row, and flagged rows are excluded from analyses with a visible count.

## 2. Analyses (deterministic code)

| Tool | What it does |
| --- | --- |
| `query_measurements` | Unit-aware filters over the bundle, returning source rows with run IDs |
| `make_chart` | A ChartSpec built from those rows. The model never writes chart data |
| `compare_runs` | Group comparison that **names confounders** (other conditions that differ) |
| `check_applicability_envelope` | Which tests bracket a target O₂ and pressure; reports atmosphere coverage separately from gravity coverage |
| `assess_evidence` | Classifies evidence as direct, indirect or insufficient, with a condition table and gaps |
| `check_d2_law` | Internal consistency of droplet diameter, burning rate and burn time |
| `map_evidence_coverage`, `suppression_overview` | Coverage grid and suppression data views |
| `search_investigations`, `search_documents`, `get_document_page`, `get_investigation`, `list_datasets`, `find_media` | Retrieval and source access |

## 3. Retrieval

Two-level hybrid retrieval runs over investigation profiles and page chunks: BM25 (FTS5), 512-dimension embeddings with cosine floors, and reciprocal-rank fusion. A curated **scientific-facet** layer (`curation/investigation_facets.yaml`, with a NASA-text basis for every value) reranks results and explains each one: study type, matches, partial matches, differences and unrecorded parameters. The 0–100 relevance score is labeled "not a probability, evidence strength or fire risk". Off-topic queries return `no_match`. On the held-out benchmark split, recall@5 is 0.74, MRR 0.88 and nDCG@10 0.72 (`curation/benchmark/retrieval_v1.yaml`).

## 4. The SI agent

- A single OpenAI agent (`gpt-6.1-sol`, Responses API, strict function tools, streaming) plans, calls tools and writes the explanation. Budgets: at most 6 tool rounds, 3,500 output tokens, 120 s per turn, about $0.30 per turn, $2 per day, and 20 turns per visitor per hour.
- The answer template separates **Measured**, **Published**, **Derived**, engineering implications, limits, and open questions.
- Multi-turn context carries the ordered cited investigations and assessment classes, so a follow-up like "compare the first two" resolves correctly.

## 5. Safeguards against hallucination

| Safeguard | Mechanism |
| --- | --- |
| Evidence ledger | Every tool result registers evidence (source SHA-256, page or row locator, transformation). Citation markers must reference ledger IDs from **that turn** |
| Invalid citations | Markers that are not in the ledger are replaced by a visible "[unverified citation removed]" and counted in the turn audit |
| Claim-kind check | A "Measured" claim must cite data rows, a "Published" claim a document span, a "Derived" claim an artifact |
| Numeric-grounding audit | Numbers in the answer that cannot be matched to cited evidence values are flagged in the audit. It errs on the side of flagging and has known false positives |
| No fabricated chart points | Rows with missing values are excluded from charts, never filled in (for example, 17 matching FLEX rows give 16 points) |
| No risk scores | No probability, percentage risk or lunar or Martian prediction is produced. PSI has no partial-gravity data |
| SI labeling | All SI prose and code carry an "SI" badge and `si_generated: true`. NASA measurements and deterministic charts are labeled as not SI-generated |
| Analysis Lab isolation | Generated Python runs only in an OpenAI-hosted container (1 GB, network disabled) on hash-verified CSV exports. It is never executed on the server |

The audits validate IDs and numbers, **not semantic entailment**. A cited page can still be paraphrased imperfectly, so expert review is still required. This is stated in the app.
