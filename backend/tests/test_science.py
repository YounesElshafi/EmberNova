import csv
import statistics

import pytest
from jsonschema import validate
from pint.errors import DimensionalityError

from embernova.config import ROOT
from embernova.science.analyses import GRAVITY_NOTE

FLEX = "PSI-69:flex_experimental"


def test_flex_golden(bundle):
    data = bundle.wide[bundle.wide.table_id == FLEX]
    assert len(data) == data.run_uid.nunique() == 274
    first = data[data.source_run_label == "1"].iloc[0]
    assert first.total_pressure == pytest.approx(101018, abs=1)
    assert first.o2_mole_fraction == 0.21
    assert first.droplet_initial_diameter == pytest.approx(0.00169)
    assert first.burning_rate_constant == pytest.approx(5.2e-7)
    assert first.burn_time == 4.3
    assert first.outcome_raw == "Disruption"
    assert data.alt_labels.map(lambda a: "193F001" in a).sum() == 2
    assert "implausible_value" in data[data.source_run_label == "114"].iloc[0].quality_flags
    # The original cp1252 CSV contains an en dash, not a replacement character.
    # Missing data must not be reclassified as corrupt encoding to match an earlier audit.
    missing = data[data.source_run_label == "24"].iloc[0]
    assert "encoding_artifact" not in missing.quality_flags
    assert __import__("pandas").isna(missing.droplet_initial_diameter)
    values = bundle.values[
        (bundle.values.run_uid == FLEX + ":1") & (bundle.values.name == "burning_rate_constant")
    ].iloc[0]
    assert values.unit_raw == "mm"
    assert "unit_inferred_from_source_doc" in values.quality_flags


def test_lunar_selection(bundle):
    rows, _ = bundle.select(
        [FLEX],
        [
            {"field": "o2_mole_fraction", "op": "between", "values": [30, 34], "unit": "percent"},
            {"field": "total_pressure", "op": "between", "values": [520, 560], "unit": "mmHg"},
        ],
    )
    assert len(rows) == 17
    assert rows.burning_rate_constant.notna().sum() == 16
    assert set(rows.fuel_canonical) == {"methanol", "n-heptane"}
    assert rows.co2_mole_fraction.max() == rows.he_mole_fraction.max() == 0


def test_variable_summary_provenance_and_quality_exclusions(tools):
    details = tools.investigation("PSI-69")
    pressure = next(v for v in details["variables"] if v["name"] == "total_pressure")
    assert pressure["min"] > 0
    assert pressure["n"] == 273
    assert pressure["transform_steps"] and pressure["evidence_ids"]
    for eid in pressure["evidence_ids"]:
        evidence = tools.ledger.items[eid]
        assert evidence["source"]["sha256"]
        assert evidence["locator"]["source_rows"]


def test_exact_nasa_identifiers_and_selection_exclusions(bundle):
    def lookup(label):
        return bundle.select(
            [FLEX], [{"field": "test_identifier", "op": "eq", "values": [label], "unit": None}]
        )

    data, excluded = lookup("20CAL10")
    assert len(data) == 1
    assert data.iloc[0].source_run_label == "2"
    assert data.iloc[0].extinction_diameter == pytest.approx(0.00094)
    assert excluded["n"] == 0
    assert len(lookup("193F001")[0]) == 2
    assert lookup("114")[1]["n"] == 1
    missing, excluded = lookup("not-a-NASA-test")
    assert len(missing) == excluded["n"] == 0


def test_bass_and_design(bundle):
    bass = bundle.wide[bundle.wide.table_id == "PSI-25:bass2"]
    assert bass[bass.source_run_label == "B1"].iloc[0].o2_mole_fraction == pytest.approx(0.222)
    assert bass.total_pressure.isna().all()
    design = bundle.values[bundle.values.run_uid.str.startswith("PSI-68:flex2_design:")]
    assert set(design.value_kind) == {"design"}
    assert design[design.name == "o2_mole_fraction"].value_si.isna().all()
    assert len(bundle.wide[bundle.wide.table_id == "PSI-39:cfi"]) == 87


def test_invalid_fields_and_units(bundle):
    with pytest.raises(ValueError):
        bundle.select(["../secrets"])
    with pytest.raises(ValueError):
        bundle.select(
            [FLEX], [{"field": "x; DROP TABLE runs", "op": "eq", "values": [1], "unit": "Pa"}]
        )
    with pytest.raises(DimensionalityError):
        bundle.select([FLEX], [{"field": "total_pressure", "op": "eq", "values": [1], "unit": "s"}])


def test_chart_source_and_contract(tools, schemas):
    args = {
        "table_ids": [FLEX],
        "x": "o2_mole_fraction",
        "y": "burning_rate_constant",
        "color_by": "fuel_canonical",
        "title": "K vs oxygen",
    }
    art = tools.chart(args)["artifact"]
    validate(art, schemas["artifact"])
    chart = art["payload"]["chart"]
    assert sum(len(s["points"]["x"]) for s in chart["series"]) >= 200
    assert chart["provenance"]["evidence_ids"]
    assert art["reproducibility"]["input_files"][0]["sha256"]
    for ev in tools.ledger.items.values():
        validate(ev, schemas["evidence"])


def test_empty_chart_does_not_advertise_measurements(tools):
    with pytest.raises(ValueError, match="No complete scalar"):
        tools.chart(
            {
                "table_ids": [FLEX],
                "x": "o2_mole_fraction",
                "y": "burning_rate_constant",
                "title": "Missing test",
                "filters": [
                    {"field": "test_identifier", "op": "eq", "values": ["missing"], "unit": None}
                ],
            }
        )


def test_d2_independent(tools, schemas):
    result = tools.analyze("check_d2_law", {"table_id": FLEX})
    values = []
    with (
        ROOT / "data/investigations/PSI-69_FLEX/raw/datasets/PSI-69_Experimental table_FLEX.csv"
    ).open(encoding="cp1252", newline="") as f:
        for r in csv.DictReader(f):
            if r["FLEX Test #"] in {"24", "114"}:
                continue
            try:
                d0, de, k, t = [
                    float(r[c])
                    for c in [
                        "Droplet initial diameter; mm",
                        "Visible flame extinction diameter; mm",
                        "Burning rate; mm",
                        "Burn time; s",
                    ]
                ]
                values.append((d0 * d0 - de * de) / (k * t))
            except (ValueError, ZeroDivisionError):
                pass
    assert result["stats"]["median_ratio"] == pytest.approx(statistics.median(values))
    assert result["stats"]["n"] == len(values)
    assert 0.85 < result["stats"]["median_ratio"] < 1.05
    validate(result["artifact"], schemas["artifact"])


def test_envelope_gravity_unknown_and_joint_coverage(tools, schemas):
    args = {
        "scenario_label": "Lunar reference",
        "o2_mole_fraction": {"min": 0.30, "max": 0.36},
        "total_pressure": {"min": 8, "max": 10.2, "unit": "psi"},
        "gravity": "lunar",
    }
    art = tools.analyze("check_applicability_envelope", args)["artifact"]
    validate(art, schemas["artifact"])
    payload = art["payload"]
    assert payload["coverage"] != "inside_tested_envelope"
    assert payload["gravity_note"] == GRAVITY_NOTE
    bass = next(p for p in payload["per_investigation"] if p["investigation_id"] == "PSI-25")
    assert not bass["data_complete"]
    assert any(
        gap.startswith("Total pressure not recorded per test") and "BASS-II" in gap
        for gap in payload["gaps"]
    )
    flex = next(p for p in payload["per_investigation"] if p["investigation_id"] == "PSI-69")
    assert flex["coverage"] in {"inside", "partial"}


def test_comparison_confounds(tools, schemas):
    groups = [
        {
            "label": "reference",
            "table_id": FLEX,
            "filters": [
                {
                    "field": "o2_mole_fraction",
                    "op": "between",
                    "values": [0.20, 0.22],
                    "unit": "dimensionless",
                },
                {"field": "total_pressure", "op": "between", "values": [740, 780], "unit": "mmHg"},
            ],
        },
        {
            "label": "high oxygen",
            "table_id": FLEX,
            "filters": [
                {
                    "field": "o2_mole_fraction",
                    "op": "between",
                    "values": [0.30, 0.34],
                    "unit": "dimensionless",
                },
                {"field": "total_pressure", "op": "between", "values": [520, 560], "unit": "mmHg"},
            ],
        },
    ]
    art = tools.analyze(
        "compare_runs", {"groups": groups, "quantities": ["burning_rate_constant"]}
    )["artifact"]
    validate(art, schemas["artifact"])
    assert art["payload"]["validity"]["verdict"] == "comparable_with_caveats"
    warning = next(
        c for c in art["payload"]["validity"]["checks"] if c["rule"] == "n_differing_conditions"
    )
    assert warning["status"] == "warn"
    assert "o2_mole_fraction" in warning["detail"] and "total_pressure" in warning["detail"]


def test_non_extinction_zero_excluded_from_comparison(bundle):
    from embernova.science.analyses import compare

    source = bundle.wide
    zeros = source[(source.table_id == FLEX) & source.extinction_diameter.eq(0)]
    assert len(zeros) == 8
    groups = [
        {"label": label, "table_id": FLEX, "run_uids": list(zeros.run_uid)} for label in ["A", "B"]
    ]
    result = compare(bundle, groups, ["extinction_diameter"], [])
    for group in result["groups"]:
        assert group["summary"]["extinction_diameter"]["n"] == 0
        assert group["summary"]["extinction_diameter"]["median"] is None
        assert group["no_extinction_observed"] == 8
        assert sum(group["outcome_counts"].values()) == 8
    assert (
        next(c for c in result["validity"]["checks"] if c["rule"] == "sample_size")["status"]
        == "fail"
    )
    assert bundle.wide.loc[zeros.index, "extinction_diameter"].eq(0).all()


def test_non_extinction_zero_excluded_from_generic_summary(tools, bundle):
    data, _ = bundle.select([FLEX])
    expected = int(data.extinction_diameter.gt(0).sum())
    result = tools.query([FLEX], quantities=["extinction_diameter"], aggregate="summary")
    measured = next(row for row in result["rows"] if row["value_kind"] == "measured")
    assert measured["n_runs"] == len(data)
    assert measured["summary"]["extinction_diameter"]["n"] == expected
    assert measured["summary"]["extinction_diameter"]["median"] is not None


def test_oxygen_only_envelope_with_missing_pressure(bundle):
    from embernova.science.analyses import envelope

    result = envelope(
        bundle,
        {
            "investigation_ids": ["PSI-25"],
            "o2_mole_fraction": {"min": 0.2, "max": 0.4},
            "gravity": "microgravity",
        },
        [],
    )
    assert result["kind"] == "envelope"
    assert result["chart"]["series"] == []
    assert result["o2_only"]


def test_d2law_rejects_non_droplet_table(bundle):
    from embernova.science.analyses import d2law

    with pytest.raises(ValueError, match="no complete droplet"):
        d2law(bundle, "PSI-25:bass2", None, [])
