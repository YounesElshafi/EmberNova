import json
import sqlite3
from contextlib import closing

import numpy as np
from openai import OpenAI

from embernova.config import settings
from embernova.provenance import canonical, digest, now, sha256


def build_embeddings():
    cfg = settings()
    if not cfg.openai_api_key or not cfg.openai_api_key.get_secret_value():
        raise ValueError("OPENAI_API_KEY is required to build real semantic embeddings")
    with closing(sqlite3.connect(cfg.build_dir / "knowledge.db")) as db:
        owners = [
            ("profile", r[0], r[1])
            for r in db.execute("SELECT investigation_id,profile_text FROM profiles_fts")
        ]
        owners += [
            ("chunk", r[0], r[1] + "\n" + r[2])
            for r in db.execute("SELECT chunk_id,context_header,text FROM chunks ORDER BY chunk_id")
        ]
    cache_path = cfg.build_dir / "embedding_cache.db"
    tokens = 0
    with closing(sqlite3.connect(cache_path)) as cache, cache:
        cache.execute(
            "CREATE TABLE IF NOT EXISTS vectors(hash TEXT PRIMARY KEY, model TEXT, dims INT, vector BLOB)"
        )
        todo = [
            (kind, key, text, digest([cfg.embedding_model, cfg.embedding_dims, text]))
            for kind, key, text in owners
        ]
        missing = [
            r
            for r in todo
            if cache.execute("SELECT 1 FROM vectors WHERE hash=?", (r[3],)).fetchone() is None
        ]
        estimated_tokens = sum(len(row[2].encode()) for row in missing)
        estimated_cost = estimated_tokens * cfg.embedding_price_per_million / 1e6
        if estimated_cost > min(0.25, cfg.daily_budget_usd):
            raise ValueError("Embedding build exceeds the conservative local spending limit")
        with OpenAI(
            api_key=cfg.openai_api_key.get_secret_value(), timeout=45, max_retries=1
        ) as client:
            for start in range(0, len(missing), 64):
                batch = missing[start : start + 64]
                response = client.embeddings.create(
                    model=cfg.embedding_model,
                    dimensions=cfg.embedding_dims,
                    input=[r[2] for r in batch],
                )
                tokens += response.usage.total_tokens
                for row, item in zip(batch, response.data, strict=True):
                    vector = np.asarray(item.embedding, dtype="float32")
                    if len(vector) != cfg.embedding_dims or not np.isfinite(vector).all():
                        raise ValueError("Invalid embedding vector from provider")
                    vector /= max(float(np.linalg.norm(vector)), 1e-12)
                    cache.execute(
                        "INSERT OR REPLACE INTO vectors VALUES (?,?,?,?)",
                        (row[3], cfg.embedding_model, cfg.embedding_dims, vector.tobytes()),
                    )
                cache.commit()
                print(
                    f"Embedded {min(start + 64, len(missing))}/{len(missing)} passages/profiles",
                    flush=True,
                )
        items, matrix = [], []
        for kind, key, _text, h in todo:
            vector = cache.execute("SELECT vector FROM vectors WHERE hash=?", (h,)).fetchone()[0]
            items.append({"kind": kind, "id": key, "content_sha256": h})
            matrix.append(np.frombuffer(vector, dtype="float32"))
    # Publish only after every source is present. This is a build-time operation; restart the API afterwards.
    np.save(cfg.build_dir / "embeddings.npy", np.asarray(matrix))
    manifest = {
        "model": cfg.embedding_model,
        "dimensions": cfg.embedding_dims,
        "owners": items,
        "knowledge_sha256": sha256(cfg.build_dir / "knowledge.db"),
        "tokens_this_build": tokens,
        "estimated_cost_usd": tokens * cfg.embedding_price_per_million / 1e6,
        "built_at": now(),
    }
    (cfg.build_dir / "embeddings.json").write_text(canonical(manifest), encoding="utf-8")
    print(json.dumps({k: v for k, v in manifest.items() if k != "owners"}, indent=2))
