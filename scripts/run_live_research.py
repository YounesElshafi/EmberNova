"""Record one real local research workflow using the configured provider; no key output."""

import asyncio
import json
from collections import Counter

from embernova.agent.budget import Budget
from embernova.agent.loop import run_agent
from embernova.config import settings
from embernova.provenance import canonical, new_id, now
from embernova.science.bundle import Bundle
from embernova.storage import Store


async def main():
    cfg = settings()
    store = Store(cfg)
    sid, tid = new_id("ses_"), new_id("turn_")
    question = "What do NASA experiments tell us about elevated oxygen and flame extinction for lunar habitats? Find FLEX tests between 30–34% oxygen and 520–560 mmHg. Check applicability for lunar gravity, show a burning-rate-constant versus oxygen chart from FLEX, and cite the original NASA report and measurement rows. Distinguish measurements from engineering interpretation and keep the answer brief."
    store.put(
        "sessions",
        sid,
        {"session_id": sid, "title": "Lunar habitat evidence", "history": []},
    )
    Budget(cfg, store).reserve(tid, "local-validation")
    events = []
    async for event in run_agent(
        cfg, store, Bundle(cfg), sid, tid, question, asyncio.Event()
    ):
        events.append(event)
        if event["event"] in {"tool.started", "tool.completed", "error"}:
            print(
                event["event"],
                event.get("tool", event.get("code")),
                event.get("status", ""),
                flush=True,
            )
    success = events[-1]["event"] == "turn.completed"
    answer = next((e["answer"] for e in events if e["event"] == "text.completed"), None)
    report = {
        "success": success,
        "session_id": sid,
        "model": cfg.agent_model,
        "tools": [e["tool"] for e in events if e["event"] == "tool.started"],
        "events": dict(Counter(e["event"] for e in events)),
        "audit": answer["audit"] if answer else None,
        "cost_usd": events[-1].get("cost_usd"),
        "latency_ms": events[-1].get("latency_ms"),
        "error": events[-1].get("code"),
    }
    if success:
        playback = [
            {**e, **({"replay": True} if e["event"] == "turn.started" else {})}
            for e in events
        ]
        meta = {
            "replay_id": "live-lunar",
            "title": "A live SI investigation of habitat conditions",
            "question": question,
            "recorded_at": now(),
            "model": cfg.agent_model,
            "scenario": "lunar",
            "origin": "recorded_live",
            "si_generated": True,
            "audit": answer["audit"],
        }
        (cfg.build_dir / "replays/live-lunar.json").write_text(
            canonical({"meta": meta, "events": playback}), encoding="utf-8"
        )
    (cfg.build_dir / "eval/live_research.json").write_text(
        canonical(report), encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


asyncio.run(main())
