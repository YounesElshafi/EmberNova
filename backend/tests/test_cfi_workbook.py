import pytest


def test_cfi_workbook_preserves_source_definitions_and_locator(bundle, tools):
    rows, _ = bundle.select(["PSI-39:cfi_datasummary"])
    assert len(rows) == 79
    run = rows[rows.source_run_label == "1206"].iloc[0]
    assert run.source_row == 2
    assert run.droplet_initial_diameter == pytest.approx(0.004039)
    assert run.hot_flame_burning_rate_constant == pytest.approx(0.379e-6)
    assert run.cool_flame_burning_rate_constant == pytest.approx(0.385e-6)
    assert run.hot_flame_extinction_diameter == pytest.approx(0.003577)
    assert "hot_flame_burn_time" not in bundle.units
    evidence = tools.rows_evidence(
        "PSI-39:cfi_datasummary", rows, ["hot_flame_burning_rate_constant"]
    )
    assert evidence["source"]["file_id"] == "683f4b7cda33c6f4c4cec615"
    raw, _ = bundle.select(["PSI-39:cfi"], include_invalid=True)
    accepted, excluded = bundle.select(["PSI-39:cfi"])
    assert len(raw) == 87 and len(accepted) == 79 and excluded["n"] == 8
