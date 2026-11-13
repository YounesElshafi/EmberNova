"""Regression tests for the independent judging review (docs/judging-review/)."""

import csv
import io
import re
import zipfile

import pandas as pd
import pytest

from embernova.agent.budget import Budget
from embernova.agent.citations import validate
from embernova.config import ROOT
from embernova.retrieval import search_investigations
from embernova.tags import investigation_tags

FLEX = "PSI-69:flex_experimental"


# --- A7: curated fire-safety tags ---------------------------------------------------------


def test_every_investigation_has_tags_with_checkable_basis(store):
    tags = investigation_tags()
    records = {r["investigation_id"]: r for r in store.records("investigations")}
    assert set(tags) == set(records)
    challenge = ROOT / "build/eval/official_challenge_full.txt"
    official = challenge.read_text(encoding="utf-8") if challenge.exists() else None
    norm = lambda s: re.sub(r"\s+", " ", s.replace("’", "'")).casefold()  # noqa: E731
    for iid, entry in tags.items():
        assert entry["objectives"]
        assert {b["objective"] for b in entry["basis"]} == set(entry["objectives"])
        meta = " ".join(
            records[iid].get(k) or "" for k in ("title", "objectives", "approach")
        ).casefold()
        for basis in entry["basis"]:
            if basis["source"] == "metadata":
                assert basis["keyword"].casefold() in meta, (iid, basis)
            elif official is not None:
                assert norm(basis["quote"]) in norm(official), (iid, basis)


def test_detection_filter_uses_tags_not_substrings(client):
    data = client.get("/api/investigations?limit=100&objective=detection").json()
    ids = {i["investigation_id"] for i in data["items"]}
    assert {"PSI-101", "PSI-102", "PSI-47"} <= ids
    assert "PSI-25" not in ids  # BASS-II mentions "detection" in prose but is not a detection study


# --- A6 / C1: relevance floor, scope notice, no availability bias ------------------------


def test_nonsense_query_returns_no_match(tools):
    result = search_investigations(tools.store, tools.ledger, "asdfqwer zzzz")
    assert result["results"] == [] and result["no_match"]


def test_propulsion_query_carries_scope_note(tools):
    result = search_investigations(tools.store, tools.ledger, "rocket engine propellant combustion")
    assert any("outside the PSI fire-safety scope" in n for n in result["notes"])


def test_scores_are_not_min_max_normalized_and_availability_is_not_scored(tools):
    result = search_investigations(tools.store, tools.ledger, "smoke detection in spacecraft")
    assert result["results"]
    assert tools.store.cfg.retrieval_availability_weight == 0
    for r in result["results"]:
        assert 0 <= r["components"]["text_rrf"] <= 1
        assert r["score"] == pytest.approx(r["components"]["text_rrf"])


# --- B1: newly curated NASA tables -------------------------------------------------------


def test_new_tables_counts_and_definitions(bundle):
    runs = bundle.runs.groupby("table_id").size()
    assert runs["PSI-159:cfig_inverse"] == 154  # 861 blank spreadsheet rows skipped
    assert runs["PSI-159:cfig_normal"] == 179
    assert runs["PSI-101:same_r"] == 109
    assert runs["PSI-98:saffire1"] == 2  # flow-visualization rows excluded
    assert runs["PSI-99:saffire2"] == 9
    wide = bundle.wide
    inverse = wide[wide.table_id == "PSI-159:cfig_inverse"]
    assert inverse.burner_o2_mole_fraction.max() == pytest.approx(0.85)
    # Burner-stream oxygen must never be treated as an ambient atmosphere.
    assert inverse.o2_mole_fraction.isna().all()
    saffire2 = wide[wide.table_id == "PSI-99:saffire2"].set_index("source_run_label")
    assert saffire2.loc["2-5", "flame_spread_rate_microgravity"] == pytest.approx(0.0021)
    assert saffire2.loc["2-2", "flame_spread_rate_normal_gravity"] == pytest.approx(0.0012)
    assert pd.isna(saffire2.loc["2-4", "sample_thickness"])  # "037 mm" withheld, raw kept
    assert "suspect_value_withheld" in saffire2.loc["2-4", "quality_flags"]
    raw = bundle.values[
        (bundle.values.run_uid == "PSI-99:saffire2:2-4")
        & (bundle.values.name == "sample_thickness")
    ].iloc[0]
    assert raw.value_raw == "037 mm"
    same_r = wide[wide.table_id == "PSI-101:same_r"].source_run_label
    assert {"Lampwick 57", "Teflon 57"} <= set(same_r)


def test_display_units_do_not_depend_on_table_order(bundle):
    assert bundle.units["total_pressure"]["display_unit"] == "atm"
    assert bundle.units["o2_mole_fraction"]["display_unit"] == "percent"


# --- C3: plausibility warnings never alter values ---------------------------------------


def test_plausibility_flags(bundle):
    wide = bundle.wide.set_index("run_uid")
    for test in ["69", "75", "76", "79", "80", "81"]:
        assert "composition_sum" in wide.loc[f"{FLEX}:{test}", "quality_flags"]
    assert "extinction_exceeds_initial" in wide.loc[f"{FLEX}:129", "quality_flags"]
    for test in ["P22b", "T28b"]:
        assert "final_exceeds_initial" in wide.loc[f"PSI-25:bass2:{test}", "quality_flags"]
    assert wide.loc["PSI-25:bass2:P22b", "o2_final"] == pytest.approx(0.391)
    # Warnings do not exclude rows: FLEX golden selection is unchanged.
    rows, _ = bundle.select(
        [FLEX],
        [
            {"field": "o2_mole_fraction", "op": "between", "values": [30, 34], "unit": "percent"},
            {"field": "total_pressure", "op": "between", "values": [520, 560], "unit": "mmHg"},
        ],
    )
    assert len(rows) == 17


# --- B6: envelope per fuel class with explicit offsets -----------------------------------


def test_envelope_headline_and_offsets(tools, schemas):
    from jsonschema import validate as check

    result = tools.analyze(
        "check_applicability_envelope",
        {
            "o2_mole_fraction": {"min": 0.30, "max": 0.36},
            "total_pressure": {"min": 8, "max": 10.2, "unit": "psi"},
            "gravity": "lunar",
        },
    )
    check(result["artifact"], schemas["artifact"])
    payload = result["artifact"]["payload"]
    droplets = next(
        c for c in payload["coverage_by_fuel_class"] if c["fuel_class"] == "liquid_droplet"
    )
    assert droplets["n_runs_in_range"] == 0
    assert "lunar gravity" in payload["headline"]
    nearest = payload["bracketing_runs"][0]
    assert "delta_pressure_psi" in nearest and "distance" not in nearest
    assert 0 < nearest["delta_pressure_psi"] < 0.5  # FLEX at ~534-543 mmHg vs 527.5 mmHg
    assert any(o["investigation_id"] == "PSI-25" for o in payload["o2_only"])
    names = {s["name"] for s in payload["chart"]["series"]}
    assert "FLEX" in names and "PSI-69" not in names


# --- B3: evidence-gap map ----------------------------------------------------------------


def test_coverage_grid_counts(tools):
    grid = tools.coverage()
    droplets = next(fc for fc in grid["fuel_classes"] if fc["fuel_class"] == "liquid_droplet")
    near = sum(
        c["n_runs"]
        for c in droplets["cells"]
        if c["o2_band"].startswith("30-36%") and c["pressure_band"] == "10.2-12 psi"
    )
    assert near == 17
    assert any(
        "Lunar habitat reference cell" in f and ": 0 measured" in f for f in grid["findings"]
    )
    gas = next(fc for fc in grid["fuel_classes"] if fc["fuel_class"] == "gaseous_spherical_burner")
    assert gas["burner_oxygen"]["max_percent"] == 85.0
    total = sum(c["n_runs"] for fc in grid["fuel_classes"] for c in fc["cells"])
    data, _ = tools.bundle.select(list(tools.bundle.runs.table_id.unique()))
    assert total == int((data.value_kind == "measured").sum())


# --- B4: FLEX suppression view -----------------------------------------------------------


def test_suppression_view_matches_raw_counts(tools):
    payload = tools.analyze("suppression_overview", {})["artifact"]["payload"]
    # Raw CSV: 123 CO2 and 50 He tests. Test 114 (CO2 0.35) reports pressure 0 and is
    # excluded as implausible, leaving 122 valid CO2 tests.
    assert payload["stats"]["n_co2_tests"] == 122
    assert payload["stats"]["n_he_tests"] == 50
    assert sum(level["n_tests"] for level in payload["levels"]) == 172
    for series in payload["chart"]["series"]:
        assert all(y > 0 for y in series["points"]["y"])


# --- B7: model-ready export --------------------------------------------------------------


def test_model_ready_export(client):
    response = client.get("/api/export/model-ready?fuel_class=liquid_droplet")
    assert response.status_code == 200
    archive = zipfile.ZipFile(io.BytesIO(response.content))
    assert {"runs.csv", "DATA_CARD.md", "manifest.json"} <= set(archive.namelist())
    rows = list(csv.DictReader(io.StringIO(archive.read("runs.csv").decode())))
    flex2 = [r for r in rows if r["source_run_label"] == "2" and r["table_id"] == FLEX]
    assert float(flex2[0]["burning_rate_constant_m2_per_s"]) == pytest.approx(6.0e-7)
    assert all(r["table_id"] != "PSI-68:flex2_design" for r in rows)
    assert "CC0" in archive.read("DATA_CARD.md").decode()
    assert client.get("/api/export/model-ready?fuel_class=plasma").status_code == 422


# --- C4: d2-law title and guard ----------------------------------------------------------


def test_d2_title_names_dataset(tools):
    art = tools.analyze("check_d2_law", {"table_id": FLEX})["artifact"]
    assert art["payload"]["chart"]["title"].startswith("FLEX droplet combustion results")


# --- A3: failed turns no longer hold the whole reservation -------------------------------


def test_failed_turn_settles_below_reservation(cfg, store):
    budget = Budget(cfg, store)
    budget.reserve("turn_review_fail", "203.0.113.9")
    reserved = budget.used()
    budget.settle("turn_review_fail", 0.05)
    assert budget.used() < reserved


def test_trusted_proxy_client_address(cfg):
    from fastapi.testclient import TestClient

    from embernova.main import create_app

    app = create_app(cfg.model_copy(update={"trusted_proxy": True, "openai_api_key": None}))
    with TestClient(app) as c:
        sid = c.post("/api/sessions", json={}).json()["session_id"]
        response = c.post(
            f"/api/sessions/{sid}/messages",
            json={"text": "test"},
            headers={"X-Forwarded-For": "198.51.100.7"},
        )
        assert response.status_code == 503  # no key: never reaches the provider


# --- C2: numeric grounding audit ---------------------------------------------------------


def test_numeric_audit_flags_numbers_missing_from_cited_evidence():
    ledger = {
        "ev_a": {
            "evidence_id": "ev_a",
            "kind": "data_rows",
            "excerpt": "17 source rows.",
            "locator": {"run_uids": ["x"] * 17},
            "preview_rows": [{"values": [{"display_value": 0.4583}]}],
        }
    }
    text = "## Answer\nFLEX has 17 tests; median K 0.46 mm²/s [[ev:ev_a]].\nK was 0.91 mm²/s [[ev:ev_a]]."
    audit = validate(text, ledger, {}, "tests at 30-34% oxygen")["audit"]
    assert audit["ungrounded_numbers"] == 1
    assert "0.91" in audit["details"][0]
    # A value returned by this turn's deterministic tools is grounded; an invented one is not.
    grounded = validate(text, ledger, {}, "", ['{"median": 0.912}'])["audit"]
    assert grounded["ungrounded_numbers"] == 0
