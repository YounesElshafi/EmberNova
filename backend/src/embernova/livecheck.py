"""Minimal, bounded provider verification. Never print credentials or provider exception bodies."""

import asyncio
import json

from openai import APIStatusError, AsyncOpenAI

from embernova.agent.loop import run_agent
from embernova.agent.registry import Query, strict_schema
from embernova.config import settings
from embernova.provenance import canonical, new_id, now
from embernova.science.bundle import Bundle
from embernova.storage import Store


async def check():
    cfg = settings()
    report = {
        "checked_at": now(),
        "model": cfg.agent_model,
        "authentication": False,
        "model_available": False,
        "streaming": False,
        "tool_calling": False,
        "structured_outputs": False,
        "research_workflow": False,
    }
    if not cfg.openai_api_key or not cfg.openai_api_key.get_secret_value():
        report["blocker"] = "OPENAI_API_KEY missing"
    else:
        async with AsyncOpenAI(
            api_key=cfg.openai_api_key.get_secret_value(), timeout=45, max_retries=0
        ) as client:
            try:
                await client.models.retrieve(cfg.agent_model)
                report.update(authentication=True, model_available=True)
                tools = [
                    {
                        "type": "function",
                        "name": "query_measurements",
                        "description": "Read NASA measurement evidence",
                        "strict": True,
                        "parameters": strict_schema(Query.model_json_schema()),
                    }
                ]
                response = await client.responses.create(
                    model=cfg.agent_model,
                    input="Call query_measurements for PSI-69:flex_experimental test source_run_label 2 and quantity extinction_diameter. Use limit 1. No prose.",
                    tools=tools,
                    tool_choice={"type": "function", "name": "query_measurements"},
                    max_output_tokens=700,
                )
                calls = [i for i in response.output if i.type == "function_call"]
                report["tool_calling"] = bool(calls)
                if calls:
                    Query.model_validate_json(calls[0].arguments)
                stream = await client.responses.create(
                    model=cfg.agent_model,
                    input="Return a JSON object with ok equal to true.",
                    text={
                        "format": {
                            "type": "json_schema",
                            "name": "smoke",
                            "strict": True,
                            "schema": {
                                "type": "object",
                                "properties": {"ok": {"type": "boolean"}},
                                "required": ["ok"],
                                "additionalProperties": False,
                            },
                        }
                    },
                    max_output_tokens=200,
                    stream=True,
                )
                text = ""
                async with stream:
                    async for event in stream:
                        if event.type == "response.output_text.delta":
                            text += event.delta
                report["streaming"] = bool(text)
                report["structured_outputs"] = json.loads(text) == {"ok": True}
                state = Store(cfg)
                sid, tid = new_id("ses_"), new_id("turn_")
                state.put(
                    "sessions",
                    sid,
                    {"session_id": sid, "title": "Live verification", "history": []},
                )
                events = [
                    e
                    async for e in run_agent(
                        cfg,
                        state,
                        Bundle(cfg),
                        sid,
                        tid,
                        "What was the visible flame extinction diameter in FLEX test 20CAL10? Retrieve source measurement evidence and keep the answer brief.",
                        asyncio.Event(),
                        client,
                    )
                ]
                report["research_workflow"] = events[-1]["event"] == "turn.completed"
                report["session_id"] = sid
                report["events"] = [e["event"] for e in events]
                report["tool_names"] = [e["tool"] for e in events if e["event"] == "tool.started"]
                if report["research_workflow"]:
                    report["usage"] = events[-1]["usage"]
                    report["cost_usd"] = events[-1]["cost_usd"]
                    report["audit"] = next(
                        e["answer"]["audit"] for e in events if e["event"] == "text.completed"
                    )
                else:
                    report["blocker"] = events[-1].get("code", "incomplete")
            except APIStatusError as exc:
                report["blocker"] = (
                    f"OpenAI HTTP {exc.status_code}; credentials/model access require verification"
                )
            except Exception as exc:
                report["blocker"] = f"Provider verification failed: {type(exc).__name__}"
    (cfg.build_dir / "eval").mkdir(exist_ok=True)
    (cfg.build_dir / "eval/livecheck.json").write_text(canonical(report), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    asyncio.run(check())
