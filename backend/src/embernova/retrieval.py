import re

from embernova.dense import dense_scored
from embernova.evidence import Ledger, source_shape
from embernova.science.intent import facet_agreement, interpret
from embernova.storage import Store
from embernova.tags import with_tags

OUT_OF_SCOPE = re.compile(
    r"\b(rocket|propellants?|thrusters?|launch vehicles?|scramjet|ramjet|afterburners?|"
    r"jet engines?|turbine engines?|solid rocket|rocket motors?)\b",
    re.IGNORECASE,
)
DOMAIN_TERMS = re.compile(
    r"\b(fire|flam\w*|burn\w*|combust\w*|extinct\w*|ignit\w*|smoke|soot|aerosol|droplet|oxygen|pressure|gravity|spacecraft|habitat|rover|iss|nasa|psi|saffire|flex|bass|cfi|same|spice|soifie|sofie|pmma|kapton|flammab\w*|material\w*|suppression|detector\w*|radiativ\w*|coflow|methanol|heptane|dodecane|ethylene|methane|helium|carbon dioxide|nitrogen|glovebox|precipitator|porous burner)\b",
    re.IGNORECASE,
)

STOP = {
    "the",
    "a",
    "an",
    "and",
    "or",
    "in",
    "of",
    "to",
    "for",
    "how",
    "what",
    "is",
    "are",
    "on",
    "with",
    "from",
    "which",
    "can",
    "do",
    "does",
    "that",
    "us",
    "about",
    "tell",
    "we",
    "by",
    "at",
}


def fts_query(text: str) -> str:
    terms = [
        t for t in re.findall(r"[a-zA-Z0-9]+", text[:4000]) if t.lower() not in STOP and len(t) > 1
    ]
    return " OR ".join('"' + t + '"' for t in dict.fromkeys(terms))


def document_page(
    store: Store,
    ledger: Ledger,
    document_id: str,
    page: int,
    offset: int = 0,
    max_chars: int | None = None,
) -> dict:
    rows = store.query(
        "SELECT * FROM pages WHERE document_id=? AND page_number=?", (document_id, page)
    )
    if not rows:
        raise KeyError(document_id)
    row = rows[0]
    doc = store.records("documents", "WHERE document_id=?", (document_id,))[0]
    src = store.records("source_files", "WHERE file_id=?", (doc["file_id"],))[0]
    pdf = (
        f"/api/files/{doc['file_id']}/original#page={page}"
        if src["filename"].lower().endswith(".pdf")
        else None
    )
    ev = ledger.add(
        "document_span",
        [doc["investigation_id"]],
        doc["filename"],
        {
            "type": "page_span",
            "document_id": document_id,
            "page": page,
            "char_start": 0,
            "char_end": len(row["text"]),
        },
        source_shape(src, pdf),
        row["text"],
        "reported_in_publication",
    )
    result = {
        **row,
        "evidence_id": ev["evidence_id"],
        "local_pdf_url": pdf,
        "locator_kind": "physical_pdf_page" if pdf else "extracted_part",
    }
    if max_chars is not None:
        full_text = row["text"]
        result["text"] = full_text[offset : offset + max_chars]
        result["text_offset"] = offset
        result["text_total_chars"] = len(full_text)
        result["has_more"] = offset + max_chars < len(full_text)
    return result


def search_documents(
    store: Store, ledger: Ledger, query: str, investigation_ids=None, limit=8, **_
) -> dict:
    q = fts_query(query)
    if not q:
        return {"passages": [], "degraded": "bm25_only"}
    sql = """SELECT c.*, bm25(chunks_fts,0,2,1) score FROM chunks_fts
             JOIN chunks c ON c.chunk_id=chunks_fts.chunk_id WHERE chunks_fts MATCH ?"""
    params = [q]
    if investigation_ids:
        sql += " AND c.investigation_id IN (" + ",".join("?" for _ in investigation_ids) + ")"
        params += investigation_ids
    sql += " ORDER BY score LIMIT ?"
    params += [50]
    rows = store.query(sql, params)
    dense, degraded, sims = dense_scored(store, query, "chunk")
    floor = store.cfg.retrieval_dense_min_chunk_sim
    if not degraded and (not sims or sims[0] < floor):
        # Unrelated text: lexical OR-matches on common words are not evidence.
        return {"passages": [], "degraded": degraded, "no_match": True}
    dense = [key for key, sim in zip(dense, sims, strict=True) if sim >= floor]
    scores = {r["chunk_id"]: 1 / (60 + i + 1) for i, r in enumerate(rows)}
    for i, key in enumerate(dense):
        scores[key] = scores.get(key, 0) + 1 / (60 + i + 1)
    by_id = {r["chunk_id"]: r for r in rows}
    for key in dense:
        if key not in by_id:
            found = store.query("SELECT * FROM chunks WHERE chunk_id=?", (key,))
            if found and (
                not investigation_ids or found[0]["investigation_id"] in investigation_ids
            ):
                by_id[key] = found[0]
    rows = sorted(by_id.values(), key=lambda r: -scores[r["chunk_id"]])[: min(limit or 8, 50)]
    result = []
    for row in rows:
        doc = store.records("documents", "WHERE document_id=?", (row["document_id"],))[0]
        src = store.records("source_files", "WHERE file_id=?", (doc["file_id"],))[0]
        url = (
            f"/api/files/{doc['file_id']}/original#page={row['page']}"
            if src["filename"].lower().endswith(".pdf")
            else None
        )
        ev = ledger.add(
            "document_span",
            [row["investigation_id"]],
            doc["filename"],
            {
                "type": "page_span",
                "document_id": row["document_id"],
                "page": row["page"],
                "char_start": row["char_start"],
                "char_end": row["char_end"],
            },
            source_shape(src, url),
            row["text"],
            "reported_in_publication",
        )
        result.append(
            {
                "evidence_id": ev["evidence_id"],
                "document_id": row["document_id"],
                "title": doc["filename"],
                "page": row["page"],
                "context_header": row["context_header"],
                "text": row["text"][:1200],
                "score": scores[row["chunk_id"]],
            }
        )
    return {"passages": result, "degraded": degraded}


def scope_notes(query: str) -> list[str]:
    if OUT_OF_SCOPE.search(query):
        return [
            "Rocket, propellant and engine combustion is outside the PSI fire-safety scope of this challenge. "
            "Results below are the closest crewed-environment fire-safety investigations, not propulsion data."
        ]
    return []


def explain(agreement, passages, objectives) -> list[str]:
    out = []
    if agreement and agreement["study_type"]:
        out.append("Study type: " + ", ".join(t.replace("_", " ") for t in agreement["study_type"]))
    if agreement:
        by = {"match": [], "partial": [], "differs": [], "unknown": []}
        for c in agreement["checks"]:
            by[c["status"]].append(c["detail"])
        if by["match"]:
            out.append("Matches: " + "; ".join(by["match"]))
        if by["partial"]:
            out.append("Partly matches: " + "; ".join(by["partial"]))
        if by["differs"]:
            out.append("Differs: " + "; ".join(by["differs"]))
        if by["unknown"]:
            out.append("Not recorded: " + "; ".join(by["unknown"]))
    if passages:
        out.append(f"{len(passages)} matching NASA report passage(s) retrieved")
    if objectives:
        out.append("Curated fire-safety role: " + ", ".join(objectives))
    return out or ["Matched on NASA metadata text only"]


def search_investigations(
    store: Store, ledger: Ledger, query: str, limit=8, objectives=None, **filters
) -> dict:
    previously_registered = set(ledger.items)
    notes = scope_notes(query)
    intent = interpret(query)
    if not DOMAIN_TERMS.search(query):
        return {
            "results": [],
            "degraded": "bm25_only",
            "no_match": True,
            "notes": notes
            + [
                "No combustion or spacecraft fire-safety terms were found; no NASA relevance claim was made."
            ],
        }
    q = fts_query(query)
    if not q:
        return {"results": [], "degraded": "bm25_only", "no_match": True, "notes": notes}
    ranked = store.query(
        "SELECT investigation_id,bm25(profiles_fts) score FROM profiles_fts WHERE profiles_fts MATCH ? ORDER BY score",
        (q,),
    )
    dense, degraded, sims = dense_scored(store, query, "profile", limit=34)
    floor = store.cfg.retrieval_dense_min_profile_sim
    if not degraded and (not sims or sims[0] < floor):
        # Measured: benchmark questions reach >= 0.46, unrelated text <= 0.23 (see
        # docs/judging-review/12_REVIEW_UPDATE.md). Below the floor nothing is relevant.
        ledger.items = {k: v for k, v in ledger.items.items() if k in previously_registered}
        return {"results": [], "degraded": degraded, "no_match": True, "notes": notes}
    scores = {r["investigation_id"]: 1 / (60 + i + 1) for i, r in enumerate(ranked)}
    for i, (iid, sim) in enumerate(zip(dense, sims, strict=True)):
        if sim >= floor:
            scores[iid] = scores.get(iid, 0) + 1 / (60 + i + 1)
    passages = search_documents(store, ledger, query, limit=50)["passages"]
    if degraded and not ranked and not passages:
        return {"results": [], "degraded": degraded, "no_match": True, "notes": notes}
    support = {}
    for passage in passages:
        iid = ledger.items[passage["evidence_id"]]["investigation_ids"][0]
        support.setdefault(iid, [])
        if len(support[iid]) < 3:
            support[iid].append(passage)
    # L3 is ONE ranked list of investigations. Adding three chunk RRF terms
    # directly here would give report-rich investigations three votes.
    passage_ranking = sorted(support, key=lambda iid: (-sum(p["score"] for p in support[iid]), iid))
    for rank, iid in enumerate(passage_ranking, 1):
        scores[iid] = scores.get(iid, 0) + 1 / (60 + rank)
    all_inv = {r["investigation_id"]: with_tags(r) for r in store.records("investigations")}
    datasets = store.records("datasets")
    result = []
    # Fixed scale: the best attainable fused score is rank 1 in every contributing list.
    # Unlike min-max scaling, a weak result set no longer shows a top score of 1.00.
    lists = 2 if degraded else 3
    best_possible = lists / 61
    cfg = store.cfg
    for iid, score in scores.items():
        if iid not in all_inv:
            continue
        inv = all_inv[iid]
        ds = [d for d in datasets if d["investigation_id"] == iid]
        matched = [o for o in objectives or [] if o in inv["fire_safety_objectives"]]
        facet_score = len(matched) / max(len(objectives or []), 1)
        available = 1.0 if ds else 0.0
        text = min(1.0, score / best_possible)
        components = {"text_rrf": text, "facet": facet_score, "availability": available}
        weights = cfg.retrieval_text_weight + cfg.retrieval_availability_weight
        total = text * cfg.retrieval_text_weight + available * cfg.retrieval_availability_weight
        if objectives:
            weights += cfg.retrieval_facet_weight
            total += facet_score * cfg.retrieval_facet_weight
        agreement = facet_agreement(intent, iid) if intent["requested"] else None
        if agreement and agreement["score"] is not None:
            components["scientific_facets"] = agreement["score"]
            weights += cfg.retrieval_science_weight
            total += agreement["score"] * cfg.retrieval_science_weight
        final = total / weights if weights else text
        src = {
            "file_id": None,
            "sha256": inv["metadata_sha256"],
            "doi": inv.get("doi"),
            "ntrs_id": None,
            "source_url": inv["source_url"],
            "local_url": None,
            "is_psi": inv["is_psi"],
        }
        ev = ledger.add(
            "investigation_record",
            [iid],
            inv["title"],
            {"type": "record", "investigation_id": iid, "field": "objectives"},
            src,
            inv.get("objectives", ""),
        )
        result.append(
            {
                **inv,
                "score": final,
                # Displayed 0-100 rank score: query agreement, never a probability or fire risk.
                "scientific_relevance_score": round(final * 100),
                "components": components,
                "facet_checks": agreement["checks"] if agreement else [],
                "study_type": agreement["study_type"] if agreement else [],
                "relevance_explanation": explain(agreement, support.get(iid, []), matched),
                "supporting_passages": support.get(iid, [])[:2],
                "matched_facets": [
                    {"facet": "fire_safety_objective", "value": o, "evidence_id": ev["evidence_id"]}
                    for o in matched
                ],
                "datasets": [
                    {k: d[k] for k in ["table_id", "title", "row_count", "kind"]} for d in ds
                ],
                "evidence_id": ev["evidence_id"],
                "degraded": degraded,
            }
        )
    result.sort(key=lambda r: (-r["score"], r["investigation_id"]))
    result = result[: min(limit or 8, 15)]
    exposed = previously_registered | {r["evidence_id"] for r in result}
    exposed |= {p["evidence_id"] for r in result for p in r["supporting_passages"]}
    ledger.items = {key: value for key, value in ledger.items.items() if key in exposed}
    return {
        "results": result,
        "interpretation": intent,
        "degraded": degraded,
        "no_match": not result,
        "notes": notes
        + [
            "Scientific Relevance Score (0-100) measures agreement with the question's text and curated "
            "scientific facets. It is not a probability, evidence strength or fire risk.",
            "Ranking uses NASA source metadata and page evidence, fused with semantic retrieval when available. "
            "Objective filters use curated fire-safety tags. Numeric data availability is shown, not scored.",
        ],
    }
