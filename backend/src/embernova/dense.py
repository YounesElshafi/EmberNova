import json
from functools import lru_cache

import numpy as np
from openai import OpenAI

from embernova.agent.budget import Budget
from embernova.provenance import new_id


@lru_cache(maxsize=2)
def load_index(folder: str, version: float):
    from pathlib import Path

    root = Path(folder)
    manifest = json.loads((root / "embeddings.json").read_text())
    return manifest, np.load(root / "embeddings.npy", allow_pickle=False)


def dense_ranks(store, query: str, kind: str, limit=50):
    ids, degraded, _ = dense_scored(store, query, kind, limit)
    return ids, degraded


def dense_scored(store, query: str, kind: str, limit=50):
    """Return (ids, degraded, cosine similarities aligned with ids)."""
    ids, degraded, sims = _dense(store, query, kind, limit)
    return ids, degraded, sims


def _dense(store, query: str, kind: str, limit=50):
    cfg = store.cfg
    path = cfg.build_dir / "embeddings.json"
    if not path.exists() or not cfg.openai_api_key or not cfg.openai_api_key.get_secret_value():
        return [], "bm25_only", []
    try:
        manifest, vectors = load_index(str(cfg.build_dir), path.stat().st_mtime)
    except (OSError, ValueError):
        return [], "bm25_only_invalid_index", []
    if vectors.shape != (len(manifest["owners"]), cfg.embedding_dims):
        return [], "embedding_shape_mismatch", []
    if manifest["model"] != cfg.embedding_model or manifest["dimensions"] != cfg.embedding_dims:
        return [], "embedding_config_mismatch", []
    if (cfg.build_dir / "knowledge.db").stat().st_mtime > path.stat().st_mtime:
        return [], "embedding_index_stale", []
    try:
        cache_key = (cfg.embedding_model, cfg.embedding_dims, query)
        cache = getattr(store, "query_vectors", {})
        if cache_key not in cache:
            budget = Budget(
                cfg.model_copy(update={"max_turn_cost_usd": 0.001, "per_ip_turns_per_hour": 120}),
                store,
            )
            usage_id = new_id("embedding_")
            budget.reserve(usage_id, "semantic-search")
            with OpenAI(
                api_key=cfg.openai_api_key.get_secret_value(), timeout=10, max_retries=0
            ) as client:
                response = client.embeddings.create(
                    model=cfg.embedding_model, dimensions=cfg.embedding_dims, input=query[:4000]
                )
            budget.settle(
                usage_id, response.usage.total_tokens * cfg.embedding_price_per_million / 1e6
            )
            vector = np.asarray(response.data[0].embedding, dtype="float32")
            vector /= max(float(np.linalg.norm(vector)), 1e-12)
            if len(cache) >= 512:
                cache.clear()
            cache[cache_key] = vector
            store.query_vectors = cache
        scores = vectors @ cache[cache_key]
        ranked = [i for i in np.argsort(-scores) if manifest["owners"][i]["kind"] == kind][:limit]
        return (
            [manifest["owners"][i]["id"] for i in ranked],
            None,
            [float(scores[i]) for i in ranked],
        )
    except Exception:
        return [], "bm25_only_provider_unavailable", []
