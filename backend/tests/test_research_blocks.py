"""Evidence classification, ranking blocks and multi-turn research context."""

import asyncio
import json
from types import SimpleNamespace as NS

import pytest
from jsonschema import validate
from test_agent import FakeStream

from embernova.agent.citations import numeric_audit
from embernova.agent.loop import run_agent
from embernova.provenance import canonical, new_id

LUNAR = {
    "scenario_label": "Lunar habitat acrylic",
    "materials": ["PMMA"],
    "phenomena": ["flame_spread"],
    "gravity": "lunar",
    "o2_mole_fraction": {"min": 0.30, "max": 0.36},
    "total_pressure": {"min": 56, "max": 60, "unit": "kPa"},
}


def test_lunar_acrylic_is_never_direct(tools, schemas):
    out = tools.call("assess_evidence", LUNAR)
    art = out["artifact"]
    validate(art, schemas["artifact"])
    p = art["payload"]
    assert p["classification"] == "indirect"
    assert p["counts"]["direct"] == 0
    luci = next(r for r in p["investigations"] if r["investigation_id"] == "LUCI")
    assert luci["checks"][0]["status"] == "simulated"
    assert any("lunar surface gravity" in g for g in p["gaps"])
    assert "probability" not in json.dumps(p).lower().replace(
        "not a fire-risk estimate, probability", ""
    )
    # Every listed source links to its original NASA page.
    assert all(r["source_url"].startswith("https://") for r in p["investigations"])


def test_direct_requires_measured_outcome_and_matching_runs(tools):
    p = tools.call(
        "assess_evidence",
        {
            "materials": ["cotton_fiberglass"],
            "phenomena": ["flame_spread"],
            "gravity": "microgravity",
            "flow_velocity": {"min": 15, "max": 25, "unit": "cm/s"},
        },
    )["artifact"]["payload"]
    direct = {r["investigation_id"] for r in p["investigations"] if r["classification"] == "direct"}
    assert direct == {"PSI-99"}  # Saffire-II: SIBAL microgravity spread rate at 20 cm/s
    saffire1 = next(r for r in p["investigations"] if r["investigation_id"] == "PSI-98")
    assert saffire1["classification"] == "indirect"  # only burn time is curated


def test_droplet_extinction_direct_and_unrelated_insufficient(tools):
    p = tools.call(
        "assess_evidence",
        {
            "fuel_class": "liquid_droplet",
            "phenomena": ["extinction"],
            "gravity": "microgravity",
            "o2_mole_fraction": {"min": 0.15, "max": 0.2},
        },
    )["artifact"]["payload"]
    assert p["classification"] == "direct"
    assert "PSI-69" in {
        r["investigation_id"] for r in p["investigations"] if r["classification"] == "direct"
    }
    with pytest.raises(ValueError):
        tools.call("assess_evidence", {"gravity": "lunar"})


def test_assessment_api_route(client):
    r = client.post("/api/evidence-assessment", json=LUNAR)
    assert r.status_code == 200 and r.json()["classification"] == "indirect"
    bad = client.post("/api/evidence-assessment", json={**LUNAR, "gravity": "jupiter"})
    assert bad.status_code == 422


def test_ranking_scores_explanations_and_block(tools, schemas):
    tools.emit_blocks = True
    out = tools.call(
        "search_investigations",
        {
            "query": "How does ventilation airflow affect flame spread over solid materials in microgravity?",
            "limit": 8,
            "objectives": None,
        },
    )
    assert "airflow" in out["interpretation"]["requested"]["parameters"]
    top = [r["investigation_id"] for r in out["results"][:3]]
    assert {"PSI-25", "PSI-26"} <= set(top)
    for r in out["results"]:
        assert 0 <= r["scientific_relevance_score"] <= 100
        assert r["relevance_explanation"]
    art = out["artifact"]
    validate(art, schemas["artifact"])
    item = art["payload"]["items"][0]
    assert item["source_url"].startswith("https://psi.nasa.gov/") and item["doi_url"].startswith(
        "https://doi.org/10."
    )
    assert "not a probability" in art["payload"]["score_note"].lower()


def test_rank_ordinals_not_flagged_by_numeric_audit():
    ledger = {"ev_abc123": {"kind": "investigation_record", "excerpt": "airflow study"}}
    text = "| **1** | **BASS** | airflow study [[ev:ev_abc123]] |\n| **3** | Saffire | flow [[ev:ev_abc123]] |"
    assert numeric_audit(text, ledger, {})["ungrounded_numbers"] == 0


class RankingClient:
    """Turn 1 ranks investigations; turn 2 must see the ordered context."""

    def __init__(self):
        self.responses = self
        self.requests = []

    async def create(self, **kwargs):
        self.requests.append(kwargs)
        n = len(self.requests)
        if n == 1:
            output = [
                NS(
                    type="function_call",
                    name="search_investigations",
                    call_id="c1",
                    arguments=canonical(
                        {"query": "flame extinction studies", "objectives": None, "limit": 5}
                    ),
                )
            ]
            text = None
        else:
            output, text = (
                [],
                "## Answer\nRanked studies are shown. \n## Limits of the evidence\nDiscovery only.",
            )
        usage = NS(input_tokens=100, output_tokens=50, input_tokens_details=NS(cached_tokens=0))
        events = ([NS(type="response.output_text.delta", delta=text)] if text else []) + [
            NS(type="response.completed", response=NS(id=f"r{n}", output=output, usage=usage))
        ]
        return FakeStream(events)


@pytest.mark.asyncio
async def test_follow_up_turn_receives_ordered_research_context(cfg, store, bundle):
    sid = new_id("ses_")
    store.put("sessions", sid, {"session_id": sid, "history": []})
    client = RankingClient()
    events = [
        e
        async for e in run_agent(
            cfg,
            store,
            bundle,
            sid,
            new_id("turn_"),
            "Show flame extinction studies",
            asyncio.Event(),
            client,
        )
    ]
    ranking = [e for e in events if e["event"] == "artifact.created"]
    assert ranking and ranking[0]["artifact"]["type"] == "investigation_ranking"
    first_two = [i["investigation_id"] for i in ranking[0]["artifact"]["payload"]["items"][:2]]
    history = store.get("sessions", sid)["history"]
    assert history[0]["context"].startswith(
        "ranked investigations shown to the user, in order: 1. "
    )
    client.requests.clear()
    async for _ in run_agent(
        cfg, store, bundle, sid, new_id("turn_"), "Compare the first two", asyncio.Event(), client
    ):
        pass
    prior = client.requests[0]["input"][1]["content"]
    assert "[Research context recorded by EmberNova" in prior
    assert all(i in prior for i in first_two)
    assert prior.index(first_two[0]) < prior.index(first_two[1])


def test_page_locators_not_flagged_by_numeric_audit():
    ledger = {"ev_abc123": {"kind": "document_span", "excerpt": "radiative extinction"}}
    text = "- **Published:** radiative extinction; see physical page 21 and p. 14 [[ev:ev_abc123]]."
    assert numeric_audit(text, ledger, {})["ungrounded_numbers"] == 0
    # A genuine unsupported quantity is still flagged.
    assert (
        numeric_audit("Extinction at 0.37 mm [[ev:ev_abc123]].", ledger, {})["ungrounded_numbers"]
        == 1
    )


def test_context_lists_cited_investigations_first():
    from embernova.agent.loop import research_context

    ledger = {"ev_a": {"investigation_ids": ["PSI-10"]}, "ev_b": {"investigation_ids": ["PSI-69"]}}
    ctx = research_context(
        [], {"citations": [{"evidence_id": "ev_a"}, {"evidence_id": "ev_b"}]}, ledger
    )
    assert ctx == "investigations cited in this answer, in order: PSI-10, PSI-69"


class ThreeRoundClient:
    """Three tool rounds of ~25k input tokens each, then an answer. Real cost ≈ $0.20."""

    def __init__(self):
        self.responses = self
        self.n = 0

    async def create(self, **kwargs):
        self.n += 1
        usage = NS(input_tokens=25000, output_tokens=100, input_tokens_details=NS(cached_tokens=0))
        if self.n <= 3:
            output = [
                NS(
                    type="function_call",
                    name="list_datasets",
                    call_id=f"c{self.n}",
                    arguments=canonical({"investigation_ids": ["PSI-69"]}),
                )
            ]
            events = []
        else:
            output = []
            events = [NS(type="response.output_text.delta", delta="## Answer\nDatasets listed.")]
        events.append(
            NS(type="response.completed", response=NS(id=f"r{self.n}", output=output, usage=usage))
        )
        return FakeStream(events)


@pytest.mark.asyncio
async def test_multi_round_turn_not_aborted_by_cumulative_reservation(cfg, store, bundle):
    sid = new_id("ses_")
    store.put("sessions", sid, {"session_id": sid, "history": []})
    cfg = cfg.model_copy(
        update={
            "max_turn_cost_usd": 0.30,
            "price_input_per_million": 2.0,
            "price_output_per_million": 10.0,
            "max_output_tokens": 3500,
        }
    )
    events = [
        e
        async for e in run_agent(
            cfg,
            store,
            bundle,
            sid,
            new_id("turn_"),
            "List FLEX data",
            asyncio.Event(),
            ThreeRoundClient(),
        )
    ]
    assert events[-1]["event"] == "turn.completed", events[-1]
    assert events[-1]["cost_usd"] <= 0.30


def test_investigation_summary_excludes_non_extinction_zero_diameters(tools):
    v = next(
        x for x in tools.investigation("PSI-69")["variables"] if x["name"] == "extinction_diameter"
    )
    assert v["min"] > 0, "a completion/disruption zero is not an extinction diameter"
    assert any("non-extinction" in s for s in v["transform_steps"])
