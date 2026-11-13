# Retrieval architecture

Canonical for: indexing, query workflow, ranking and its explanation, and retrieval metrics. Rationale: [ADR-003](../decisions/ADR-003-retrieval.md). Storage: [DATA_ARCHITECTURE.md §6](DATA_ARCHITECTURE.md).

## 1. What we retrieve

| Level | Unit | Count (expected) | Index | Used by |
| --- | --- | --- | --- | --- |
| A: Investigations | Curated profile text: title, acronym, summary, objectives, approach, hardware, variables, quantities, facets | 34 | `profiles_fts` + profile embeddings + `investigation_facets` | `search_investigations` |
| B: Evidence passages | Page-aware chunks with a deterministic context header | ~7–9k (5.1M chars / ~3.2k chars per chunk, plus overlap) | `chunks_fts` + chunk embeddings | `search_documents` |
| C: Data | Runs, conditions and measurements | Bundle | SQL (DuckDB) | `list_datasets`, `query_measurements` |
| D: Media | Media rows | 39 + archive images | SQL over metadata | `find_media` |

Levels C and D are structured lookups, not semantic search. That's deliberate: numbers and media come from exact queries.

## 2. Indexing details

- **Context header** (deterministic): `"[{investigation_id} {acronym}] {document title} — {section heading if detected} — p.{page}"`. It is prepended to the text for both FTS and embedding. This is the cheap equivalent of "contextual retrieval" for a corpus whose metadata already names the context.
- **FTS5** with tokenizer `porter unicode61`. Columns are `context_header` and `text`, and BM25 weights `(2.0, 1.0)` boost header matches. Acronym aliases are added to the header text: "FLEX", "Flame Extinguishment Experiment", "MDCA", "CIR" and others from `curation/vocab.yaml` `aliases`.
- **Dense:** `text-embedding-3-small` at `dimensions=512`, L2-normalized float32. All vectors load at startup into a `numpy.ndarray` (~9k × 512 ≈ 18 MB) along with an ID array. Cosine similarity is a dot product.
- **Empty pages** (`is_empty`) are not chunked.

## 3. Query workflow

### 3.1 `search_investigations(query, filters)`

1. **Lexical:** `profiles_fts MATCH <sanitized query>` → rank list L1. Sanitize by quoting tokens, removing FTS operators, and OR-ing terms. For multi-word queries, run phrase and OR variants and merge.
2. **Dense:** embed the query (LRU cache of 512 entries; on API error skip with a `degraded=bm25_only` flag) → cosine against profile vectors → rank list L2.
3. **Passage evidence:** run `search_documents(query, limit=50)` and aggregate to investigations. The score is the sum of the top-3 chunk RRF scores per investigation → rank list L3. This is what makes ranking reflect the *content* of reports, not just profile wording.
4. **RRF fusion:** `rrf(i) = Σ_k 1/(60 + rank_k(i))` over L1, L2 and L3.
5. **Facet match:** the tool arguments carry the facets the agent inferred: objectives, habitat contexts, fuel classes, variables, quantities, gravity regimes.
   - `facet_score(i) = Σ_f w_f · |requested_f ∩ facets_f(i)| / |requested_f|`
   - The weights are `w = {fire_safety_objective: 0.6, fuel_class: 0.5, variable: 0.5, quantity: 0.4, habitat_context: 0.3, gravity_regime: 0.3, hardware: 0.2}`.
6. **Data availability:**
   - `T1 → 0.15`, `T2 → 0.07`, `T3 → 0`.
   - An extra `+0.1` when a requested variable or quantity exists in the bundle for that investigation.
7. **Final score:**
   - `score = 0.6·norm(rrf) + 0.3·norm(facet_score) + 0.1·norm(availability)`
   - `norm` is min-max normalization over candidates.
   - A supplemental (non-PSI) source is **not penalized but is labeled**.
8. **Explanation** is returned per result:
   - each component value;
   - matched facets with their evidence locators;
   - the top 2 supporting chunk excerpts with evidence IDs;
   - the datasets available.

   The UI renders this as "Why ranked #n".

The weights live in `config.retrieval` and get tuned once against the benchmark (§5). **Don't tune them on the test split.**

### 3.2 `search_documents(query, investigation_ids?, doc_types?, limit)`

FTS top 50 + dense top 50 → RRF → optional filter → return the top `limit` (default 8, max 20). Each result carries the chunk text (≤ 1,200 chars, trimmed at a sentence boundary), its context header, its evidence ID and score components. Adjacent chunks from the same page are merged when both are selected.

## 4. Why not rerank, graph or HyDE

- **Reranking.** The agent model reads 8–12 passages and selects among them, which is effectively LLM reranking at no extra infrastructure. Revisit only if benchmark MRR is below 0.7.
- **GraphRAG.** Relations are explicit (hardware, related investigations, publications) and are served by SQL in `get_investigation`. Graph traversal adds nothing for 34 nodes.
- **HyDE and query expansion.** Not needed. The acronym aliases plus dense retrieval cover vocabulary gaps. The agent may reformulate and call search again.

## 5. Metrics

| Task | Metric | Target | Data |
| --- | --- | --- | --- |
| Investigation ranking | Recall@5, MRR, nDCG@10 (graded relevance 0/1/2) | R@5 ≥ 0.85, MRR ≥ 0.7, nDCG@10 ≥ 0.75 | `curation/benchmark/retrieval_v1.yaml` (30 questions, architect-labeled) |
| Passage retrieval | Evidence hit@8: the gold page appears among the returned chunks | ≥ 0.7 on questions with page gold labels | Same file, `gold_pages` |
| Answer evidence coverage | % of factual sentences carrying a valid citation | ≥ 0.9 on the demo scenarios | Agent scenario tests |

The benchmark is split into `dev` (20) and `test` (10). Tune only on `dev`. Report both.
