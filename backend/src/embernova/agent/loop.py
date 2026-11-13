import asyncio
import logging
import time
from pathlib import Path

from openai import APIConnectionError, APIStatusError, AsyncOpenAI
from pint.errors import PintError
from pydantic import ValidationError

from embernova.agent.budget import Budget
from embernova.agent.citations import validate
from embernova.agent.registry import REGISTRY, function_tools
from embernova.config import Settings
from embernova.evidence import Ledger
from embernova.provenance import canonical
from embernova.sandbox import HostedLab
from embernova.tools import Tools

SYSTEM = Path(__file__).with_name("prompts").joinpath("system.md").read_text(encoding="utf-8")
FAILED_TURN_FLOOR_USD = 0.01
LOG = logging.getLogger("embernova.agent")


def compact(data):
    """Bound model context without turning JSON into a truncated invalid string."""
    if isinstance(data, list):
        return [compact(v) for v in data[:12]]
    if isinstance(data, dict):
        blocked = {
            "mapping",
            "source",
            "raw_json",
            "artifact",
            "metadata_path",
            "inventory_snapshot_path",
            "version_history_path",
        }
        out = {k: compact(v) for k, v in data.items() if k not in blocked}
        if "artifact" in data and data["artifact"]:
            art = data["artifact"]
            payload = art["payload"]
            out["artifact"] = {
                "artifact_id": art["artifact_id"],
                "evidence_id": art["evidence_id"],
                "title": art["title"],
                "type": art["type"],
                "summary": {
                    k: compact(v)
                    for k, v in payload.items()
                    if k
                    in {
                        "validity",
                        "groups",
                        "stats",
                        "coverage",
                        "per_investigation",
                        "gravity_note",
                        "gaps",
                    }
                },
            }
        return out
    if isinstance(data, str):
        return data[:1600]
    return data


async def run_agent(
    cfg: Settings, store, bundle, session_id, turn_id, text, cancel: asyncio.Event, client=None
):
    ledger = Ledger(store)
    tools = Tools(store, bundle, ledger)
    budget = Budget(cfg, store)
    start = time.monotonic()
    seq = 0
    usage = {"input_tokens": 0, "cached_tokens": 0, "output_tokens": 0}
    cost = 0.0

    def event(name, **data):
        nonlocal seq
        evt = {
            "event": name,
            "seq": seq,
            "turn_id": turn_id,
            "t_ms": int((time.monotonic() - start) * 1000),
            **data,
        }
        if name == "error":
            evt.update(usage=usage.copy(), cost_usd=cost)
        seq += 1
        store.event(session_id, evt)
        return evt

    yield event("turn.started", session_id=session_id, model=cfg.agent_model, replay=False)
    yield event("status", phase="thinking", message="Planning evidence-grounded research…")
    own_client = client is None
    client = client or AsyncOpenAI(
        api_key=cfg.openai_api_key.get_secret_value(), timeout=cfg.turn_timeout_s, max_retries=0
    )
    session = store.get("sessions", session_id)
    transcript = []
    for turn in session.get("history", [])[-6:]:
        transcript.extend(
            [
                {"role": "user", "content": turn["user_text"]},
                {"role": "assistant", "content": turn["answer"]["validated_markdown"]},
            ]
        )
    inputs = transcript + [{"role": "user", "content": text}]
    previous = None
    final_text = ""
    failed = True
    lab = None
    lab_tool = None
    lab_done = False
    tool_outputs: list[str] = []
    lab_started = False
    try:
        async with asyncio.timeout(cfg.turn_timeout_s):
            if cfg.analysis_lab and session.get("analysis_lab"):
                if cfg.code_container_cost_usd > cfg.max_turn_cost_usd:
                    yield event(
                        "error",
                        code="budget_exceeded",
                        message="The hosted container estimate exceeds this turn's configured spending limit.",
                        retryable=False,
                    )
                    return
                lab = HostedLab(client, cfg, bundle)
                try:
                    lab_tool = await lab.start()
                    cost += cfg.code_container_cost_usd
                    yield event(
                        "status",
                        phase="analyzing",
                        message="Hosted Analysis Lab enabled: 1 GB, network disabled, NASA bundle only.",
                    )
                except Exception:
                    await lab.close()
                    lab = None
                    yield event(
                        "status",
                        phase="thinking",
                        message="Hosted Analysis Lab unavailable; continuing with deterministic research tools.",
                    )
            for _round_index in range(cfg.max_tool_rounds + 1):
                if cancel.is_set():
                    raise asyncio.CancelledError
                if (
                    usage["input_tokens"] + len(canonical(inputs).encode())
                    > cfg.max_turn_input_tokens
                ):
                    yield event(
                        "error",
                        code="budget_exceeded",
                        message="Turn input budget reached. Narrow the research question.",
                        retryable=False,
                    )
                    return
                # Reserve enough for the next response; the provider is still the billing authority.
                estimated_input = len(
                    (SYSTEM + canonical(function_tools()) + canonical(inputs)).encode()
                )
                worst_next = budget.cost(
                    {
                        "input_tokens": max(estimated_input, usage["input_tokens"]),
                        "output_tokens": cfg.max_output_tokens,
                    }
                )
                if cost + worst_next > cfg.max_turn_cost_usd:
                    yield event(
                        "error",
                        code="budget_exceeded",
                        message="Per-turn spending limit reached; existing artifacts remain available.",
                        retryable=False,
                    )
                    return
                request = {
                    "model": cfg.agent_model,
                    "instructions": SYSTEM + ("\n" + lab.instructions() if lab else ""),
                    "input": inputs,
                    "tools": function_tools() + ([lab_tool] if lab_tool and not lab_done else []),
                    "max_output_tokens": cfg.max_output_tokens,
                    "reasoning": {"effort": cfg.agent_reasoning_effort_chat},
                    "stream": True,
                    "parallel_tool_calls": not bool(lab),
                }
                if previous:
                    request["previous_response_id"] = previous
                if _round_index == cfg.max_tool_rounds:
                    request["tools"] = []
                    request["tool_choice"] = "none"
                    request["instructions"] += (
                        "\nThe tool-round budget is exhausted. Write the final answer now using only registered evidence and completed artifacts. Explain any unresolved gaps; do not request more tools."
                    )
                if lab:
                    request["include"] = ["code_interpreter_call.outputs"]
                    request["max_tool_calls"] = max(1, 3 - lab.calls)
                response = None
                # Fallback is restricted to connection, throttling and provider failures; never hide malformed requests.
                for attempt in range(2):
                    emitted = False
                    try:
                        stream = await client.responses.create(**request)
                        async with stream:
                            async for item in stream:
                                if cancel.is_set():
                                    raise asyncio.CancelledError
                                if item.type == "response.output_text.delta":
                                    emitted = True
                                    final_text += item.delta
                                    if not lab:
                                        yield event("text.delta", delta=item.delta)
                                elif (
                                    item.type == "response.code_interpreter_call.in_progress"
                                    and not lab_started
                                ):
                                    lab_started = True
                                    yield event(
                                        "tool.started",
                                        call_id="hosted_lab",
                                        tool="analysis_lab",
                                        label="Hosted Python analysis",
                                        args_summary="1 GB; network disabled; allowlisted NASA bundle; no host secrets",
                                    )
                                elif item.type == "response.completed":
                                    response = item.response
                                elif item.type in {
                                    "response.failed",
                                    "response.incomplete",
                                    "error",
                                }:
                                    yield event(
                                        "error",
                                        code="provider_incomplete",
                                        message="The provider did not complete this research response. Existing evidence remains available.",
                                        retryable=True,
                                    )
                                    return
                        break
                    except (APIConnectionError, APIStatusError) as exc:
                        status = getattr(exc, "status_code", 503)
                        if attempt or emitted or status not in {429, 500, 502, 503, 504}:
                            raise
                        request["model"] = cfg.agent_fallback_model
                        yield event(
                            "status",
                            phase="thinking",
                            message="Provider unavailable; trying the configured fallback model…",
                        )
                if response is None:
                    yield event(
                        "error",
                        code="provider_error",
                        message="No completed response received.",
                        retryable=True,
                    )
                    return
                if response.usage:
                    u = response.usage
                    call_usage = {
                        "input_tokens": u.input_tokens,
                        "output_tokens": u.output_tokens,
                        "cached_tokens": getattr(u.input_tokens_details, "cached_tokens", 0),
                    }
                    for key in usage:
                        usage[key] += call_usage[key]
                    cost += budget.cost(call_usage)
                calls = [item for item in response.output if item.type == "function_call"]
                previous = response.id
                if lab and any(item.type == "code_interpreter_call" for item in response.output):
                    before = set(ledger.items)
                    art = await lab.collect(response, tools)
                    if not lab_started:
                        yield event(
                            "tool.started",
                            call_id="hosted_lab",
                            tool="analysis_lab",
                            label="Hosted Python analysis",
                            args_summary="Isolated hosted computation",
                        )
                    for eid in set(ledger.items) - before:
                        yield event("evidence.added", evidence=ledger.items[eid])
                    yield event(
                        "tool.completed",
                        call_id="hosted_lab",
                        tool="analysis_lab",
                        status="ok" if art["status"] == "ok" else "error",
                        latency_ms=0,
                        summary="Backend validated hosted computation outputs"
                        if art["status"] == "ok"
                        else "Hosted output validation failed",
                        evidence_ids=[art["evidence_id"]],
                        artifact_ids=[art["artifact_id"]],
                    )
                    yield event("artifact.created", artifact=art)
                    inputs = [
                        {
                            "role": "user",
                            "content": "The backend inspected your hosted code outputs. Cite the following derived-artifact evidence ID for these computations: "
                            + art["evidence_id"]
                            + ". Validated result and errors: "
                            + canonical(
                                {
                                    "result": art["payload"]["result"],
                                    "errors": art["payload"]["validation_errors"],
                                }
                            )
                            + ". Present an exploratory SI-generated analysis, not measured observations or certified guidance.",
                        }
                    ]
                    lab_done = art["status"] == "ok" or lab.calls >= 3
                    final_text = ""
                    continue
                if not calls:
                    if not final_text:
                        yield event(
                            "error",
                            code="empty_response",
                            message="The model returned no research answer.",
                            retryable=True,
                        )
                        return
                    answer = validate(
                        final_text,
                        ledger.items,
                        {a["evidence_id"]: a for a in ledger.artifacts},
                        text,
                        tool_outputs,
                    )
                    if lab:
                        yield event("text.delta", delta=final_text)
                    session.setdefault("history", []).append(
                        {
                            "turn_id": turn_id,
                            "user_text": text,
                            "answer": answer,
                            "si_generated": True,
                            "artifacts": [a["artifact_id"] for a in ledger.artifacts],
                        }
                    )
                    store.put("sessions", session_id, session)
                    yield event("text.completed", answer=answer)
                    yield event(
                        "turn.completed",
                        usage=usage,
                        cost_usd=cost,
                        latency_ms=int((time.monotonic() - start) * 1000),
                    )
                    failed = False
                    return
                inputs = []
                for call in calls[:10]:
                    before_evs = set(ledger.items)
                    before_arts = len(ledger.artifacts)
                    tick = time.monotonic()
                    yield event(
                        "tool.started",
                        call_id=call.call_id,
                        tool=call.name,
                        label=call.name.replace("_", " "),
                        args_summary="Read-only NASA evidence tool",
                    )
                    try:
                        model = REGISTRY[call.name][0]
                        args = model.model_validate_json(call.arguments).model_dump()
                        result = await asyncio.wait_for(
                            asyncio.to_thread(tools.call, call.name, args), timeout=20
                        )
                        # Deterministic outputs ground the numeric audit of the final answer.
                        tool_outputs.append(canonical(result))
                        new_evs = [e for k, e in ledger.items.items() if k not in before_evs]
                        new_arts = ledger.artifacts[before_arts:]
                        for ev in new_evs:
                            yield event("evidence.added", evidence=ev)
                        yield event(
                            "tool.completed",
                            call_id=call.call_id,
                            tool=call.name,
                            status="ok",
                            latency_ms=int((time.monotonic() - tick) * 1000),
                            summary="Verified source evidence retrieved",
                            evidence_ids=[e["evidence_id"] for e in new_evs],
                            artifact_ids=[a["artifact_id"] for a in new_arts],
                        )
                        for art in new_arts:
                            art["labels"]["selected_by_si"] = True
                            store.put("artifacts", art["artifact_id"], art)
                            yield event("artifact.created", artifact=art)
                        output = {
                            "ok": True,
                            "data": compact(result),
                            "evidence": [
                                {
                                    "evidence_id": e["evidence_id"],
                                    "kind": e["kind"],
                                    "title": e["title"],
                                    "excerpt": e["excerpt"][:600],
                                }
                                for e in new_evs[:20]
                            ],
                            "truncated": True,
                        }
                    except (KeyError, ValueError, ValidationError, TimeoutError, PintError) as exc:
                        LOG.warning(
                            "tool %s rejected arguments %s: %s",
                            call.name,
                            call.arguments[:400],
                            str(exc)[:300],
                        )
                        code = (
                            "timeout"
                            if isinstance(exc, TimeoutError)
                            else "unit_error"
                            if isinstance(exc, PintError)
                            else "invalid_argument"
                        )
                        yield event(
                            "tool.completed",
                            call_id=call.call_id,
                            tool=call.name,
                            status="error",
                            latency_ms=int((time.monotonic() - tick) * 1000),
                            summary="Tool could not satisfy the request",
                            evidence_ids=[],
                            artifact_ids=[],
                            error_code=code,
                        )
                        output = {
                            "ok": False,
                            "error": {
                                "code": code,
                                "message": str(exc)[:600],
                                "hint": "Inspect the dataset schema and retry with valid fields; do not invent results.",
                            },
                        }
                    inputs.append(
                        {
                            "type": "function_call_output",
                            "call_id": call.call_id,
                            "output": canonical(output),
                        }
                    )
            yield event(
                "error",
                code="tool_round_limit",
                message="Research tool round limit reached. Narrow the question or use the available artifacts.",
                retryable=False,
            )
    except asyncio.CancelledError:
        yield event(
            "error",
            code="cancelled",
            message="Research stopped. Completed artifacts remain available.",
            retryable=False,
        )
    except TimeoutError:
        yield event(
            "error",
            code="timeout",
            message="Research timed out. Try a narrower question.",
            retryable=True,
        )
    except (APIConnectionError, APIStatusError):
        yield event(
            "error",
            code="llm_unavailable",
            message="OpenAI is unavailable or rejected the configured credentials/model. Use the data tools or recorded demonstrations.",
            retryable=True,
        )
    except Exception:
        yield event(
            "error",
            code="internal",
            message="Research could not be completed. No unsupported results were substituted.",
            retryable=True,
        )
    finally:
        if lab:
            await lab.close()
        # A failed turn may have been billed for tokens whose usage never arrived, so charge
        # the metered cost plus one more worst-case request, never less than a floor. Keeping
        # the whole per-turn reservation let seven failures lock live research for everyone.
        if failed:
            budget.settle(
                turn_id,
                min(
                    cfg.max_turn_cost_usd,
                    max(cost, FAILED_TURN_FLOOR_USD)
                    + budget.cost(
                        {
                            "input_tokens": usage["input_tokens"] or 20000,
                            "output_tokens": cfg.max_output_tokens,
                        }
                    ),
                ),
            )
        else:
            budget.settle(turn_id, cost)
        if own_client:
            await client.close()
