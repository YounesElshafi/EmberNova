import asyncio
import json

from embernova.agent.budget import Budget
from embernova.agent.loop import run_agent
from embernova.config import settings
from embernova.provenance import canonical, new_id
from embernova.science.bundle import Bundle
from embernova.storage import Store


async def main():
    cfg = settings().model_copy(update={"analysis_lab": True})
    store = Store(cfg)
    sid, tid = new_id("ses_"), new_id("turn_")
    store.put("sessions", sid, {"session_id": sid, "history": [], "analysis_lab": True})
    Budget(cfg, store).reserve(tid, "local-lab-verification")
    question = "Use hosted Python to calculate the median FLEX burning_rate_constant for each fuel from the mounted Analysis Bundle CSV files. Exclude invalid and duplicate rows, use value_si in m**2/s, and preserve the measured-versus-design distinction. Write result.json using the given schema and a small CSV of the fuel medians. This is an exploratory derived analysis, not a safety assessment. Keep your final explanation brief."
    events = []
    async for event in run_agent(
        cfg, store, Bundle(cfg), sid, tid, question, asyncio.Event()
    ):
        events.append(event)
        if event["event"] in {
            "tool.started",
            "tool.completed",
            "error",
            "artifact.created",
        }:
            print(
                event["event"],
                event.get(
                    "tool", event.get("code", event.get("artifact", {}).get("type"))
                ),
                flush=True,
            )
    artifacts = [e["artifact"] for e in events if e["event"] == "artifact.created"]
    report = {
        "success": events[-1]["event"] == "turn.completed"
        and any(a["type"] == "analysis_run" and a["status"] == "ok" for a in artifacts),
        "session_id": sid,
        "artifacts": [
            {
                "artifact_id": a["artifact_id"],
                "type": a["type"],
                "status": a["status"],
                "errors": a["payload"].get("validation_errors"),
            }
            for a in artifacts
        ],
        "cost_usd": events[-1].get("cost_usd"),
        "error": events[-1].get("code"),
    }
    (cfg.build_dir / "eval/analysis_lab.json").write_text(
        canonical(report), encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


asyncio.run(main())
