import asyncio
from types import SimpleNamespace as NS

import httpx
import pytest
from jsonschema import Draft202012Validator
from openai import APIConnectionError
from referencing import Registry, Resource

from embernova.agent.budget import Budget, BudgetError
from embernova.agent.citations import validate
from embernova.agent.loop import run_agent
from embernova.agent.registry import REGISTRY, function_tools
from embernova.config import Settings
from embernova.provenance import canonical, new_id


def test_strict_tools():
    for tool in function_tools():
        assert tool["strict"] is True

        def check(value):
            if isinstance(value, dict):
                if value.get("type") == "object":
                    assert value["additionalProperties"] is False
                    assert set(value["required"]) == set(value["properties"])
                for v in value.values():
                    check(v)
            elif isinstance(value, list):
                for v in value:
                    check(v)

        check(tool["parameters"])
        Draft202012Validator.check_schema(tool["parameters"])
    assert "make_chart" in REGISTRY


def test_citation_ledger_scope():
    ledger = {"ev_abcdefgh1234": {"kind": "data_rows"}}
    result = validate(
        "## Answer\nFLEX test: **Measured** 0.94 mm [[ev:ev_abcdefgh1234]].\nFake [[ev:ev_nonexistent]].",
        ledger,
    )
    assert result["audit"]["invalid_citations"] == 1
    assert result["audit"]["kind_mismatches"] == 0
    assert len(result["citations"]) == 1
    assert "[[ev:" not in result["validated_markdown"]
    assert (
        validate("**Published** facts [[ev:ev_abcdefgh1234]]", ledger)["audit"]["kind_mismatches"]
        == 1
    )


def test_budget_reservation_and_settlement(store):
    cfg = Settings(_env_file=None, daily_budget_usd=0.30, max_turn_cost_usd=0.30)
    budget = Budget(cfg, store)
    # Isolate usage state from other tests without modifying scientific data.
    with store.app() as db:
        db.execute("DELETE FROM usage")
    budget.reserve("first", "local")
    with pytest.raises(BudgetError):
        budget.reserve("second", "local")
    budget.settle("first", 0.01)
    assert budget.used() == 0.01
    assert budget.cost(
        {"input_tokens": 1000, "cached_tokens": 0, "output_tokens": 100}
    ) == pytest.approx(0.003)


class FakeStream:
    def __init__(self, events):
        self.events = events

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        pass

    def __aiter__(self):
        self.iterator = iter(self.events)
        return self

    async def __anext__(self):
        try:
            return next(self.iterator)
        except StopIteration:
            raise StopAsyncIteration from None


class FakeClient:
    def __init__(self):
        self.responses = self
        self.requests = []

    async def create(self, **kwargs):
        self.requests.append(kwargs)
        if len(self.requests) == 1:
            call = NS(
                type="function_call",
                name="query_measurements",
                call_id="call_1",
                arguments=canonical(
                    {
                        "table_ids": ["PSI-69:flex_experimental"],
                        "quantities": ["extinction_diameter"],
                        "variables": [],
                        "filters": [
                            {"field": "source_run_label", "op": "eq", "values": ["2"], "unit": None}
                        ],
                        "group_by": None,
                        "aggregate": None,
                        "limit": 1,
                    }
                ),
            )
            output = [call]
            text = None
        else:
            data = __import__("json").loads(kwargs["input"][0]["output"])
            eid = data["evidence"][0]["evidence_id"]
            text = f"## Answer\nThe visible extinction diameter was 0.94 mm. [[ev:{eid}]]\n## Evidence\n**Measured** source row. [[ev:{eid}]]\n## Limits of the evidence\nMicrogravity droplets do not certify habitat safety."
            output = []
        usage = NS(input_tokens=300, output_tokens=100, input_tokens_details=NS(cached_tokens=0))
        response = NS(id=f"response_{len(self.requests)}", output=output, usage=usage)
        events = ([NS(type="response.output_text.delta", delta=text)] if text else []) + [
            NS(type="response.completed", response=response)
        ]
        return FakeStream(events)


@pytest.mark.asyncio
async def test_scripted_agent_tool_and_ordering(cfg, store, bundle):
    sid, tid = new_id("ses_"), new_id("turn_")
    store.put("sessions", sid, {"session_id": sid, "history": []})
    client = FakeClient()
    events = [
        e
        async for e in run_agent(
            cfg, store, bundle, sid, tid, "Extinction in 20CAL10?", asyncio.Event(), client
        )
    ]
    assert events[0]["event"] == "turn.started"
    assert events[-1]["event"] == "turn.completed"
    names = [e["event"] for e in events]
    assert names.index("evidence.added") < names.index("text.delta")
    completed = next(e for e in events if e["event"] == "text.completed")
    assert completed["answer"]["audit"]["invalid_citations"] == 0
    assert "0.94" in completed["answer"]["validated_markdown"]
    assert client.requests[1]["previous_response_id"] == "response_1"
    assert store.events(sid)[-1]["event"] == "turn.completed"


@pytest.mark.asyncio
async def test_final_synthesis_round_and_sse_contract(cfg, store, bundle, schemas):
    sid, tid = new_id("ses_"), new_id("turn_")
    store.put("sessions", sid, {"session_id": sid, "history": []})
    client = FakeClient()
    cfg = cfg.model_copy(update={"max_tool_rounds": 1})
    events = [
        e
        async for e in run_agent(
            cfg, store, bundle, sid, tid, "FLEX test 2?", asyncio.Event(), client
        )
    ]
    assert events[-1]["event"] == "turn.completed"
    assert client.requests[-1]["tools"] == []
    assert client.requests[-1]["tool_choice"] == "none"
    registry = Registry().with_resources(
        (schema["$id"], Resource.from_contents(schema)) for schema in schemas.values()
    )
    validator = Draft202012Validator(schemas["sse_events"], registry=registry)
    for event in events:
        validator.validate(event)


@pytest.mark.asyncio
async def test_cancelled_agent(cfg, store, bundle):
    sid, tid = new_id("ses_"), new_id("turn_")
    store.put("sessions", sid, {"session_id": sid, "history": []})
    event = asyncio.Event()
    event.set()
    output = [
        e async for e in run_agent(cfg, store, bundle, sid, tid, "Question", event, FakeClient())
    ]
    assert output[-1]["event"] == "error" and output[-1]["code"] == "cancelled"


@pytest.mark.asyncio
async def test_provider_connection_fallback(cfg, store, bundle):
    class FlakyClient(FakeClient):
        failed = False

        async def create(self, **kwargs):
            if not self.failed:
                self.failed = True
                raise APIConnectionError(
                    request=httpx.Request("POST", "https://api.openai.com/v1/responses")
                )
            return await super().create(**kwargs)

    sid, tid = new_id("ses_"), new_id("turn_")
    store.put("sessions", sid, {"session_id": sid, "history": []})
    client = FlakyClient()
    events = [
        e
        async for e in run_agent(
            cfg, store, bundle, sid, tid, "FLEX test 2?", asyncio.Event(), client
        )
    ]
    assert events[-1]["event"] == "turn.completed"
    assert client.requests[0]["model"] == cfg.agent_fallback_model
    assert any("fallback" in e.get("message", "") for e in events)


@pytest.mark.asyncio
async def test_container_budget_refused_before_provider_request(cfg, store, bundle):
    sid, tid = new_id("ses_"), new_id("turn_")
    store.put("sessions", sid, {"session_id": sid, "history": [], "analysis_lab": True})
    cfg = cfg.model_copy(update={"analysis_lab": True, "max_turn_cost_usd": 0.01})
    client = FakeClient()
    events = [
        e
        async for e in run_agent(cfg, store, bundle, sid, tid, "Calculate", asyncio.Event(), client)
    ]
    assert events[-1]["event"] == "error" and events[-1]["code"] == "budget_exceeded"
    assert client.requests == []
