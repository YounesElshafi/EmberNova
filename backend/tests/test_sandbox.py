import json

import pytest
from jsonschema.exceptions import ValidationError

from embernova.sandbox import ALLOWED_INPUTS, validate_result


def valid_result():
    return {
        "schema_version": "1",
        "question": "Descriptive source analysis",
        "method": "Group measured values by fuel",
        "inputs": [{"file": "measurements.csv", "filters": "measured only", "n_rows": 1}],
        "results": [
            {
                "name": "example",
                "value": 1.0,
                "unit": "s",
                "uncertainty": None,
                "uncertainty_kind": "none",
                "n": 1,
                "note": "Test fixture, not NASA evidence",
            }
        ],
        "tables": [],
        "charts": [],
        "warnings": [],
    }


def test_sandbox_result_boundary():
    result = valid_result()
    assert validate_result(json.dumps(result).encode()) == result
    assert ".env" not in ALLOWED_INPUTS
    aliased = valid_result()
    aliased["inputs"][0]["file"] = "file-provider_measurements.csv"
    assert (
        validate_result(
            json.dumps(aliased).encode(), {"file-provider_measurements.csv": "measurements.csv"}
        )["inputs"][0]["file"]
        == "measurements.csv"
    )
    result["inputs"][0]["file"] = "../../.env"
    with pytest.raises(ValueError, match="unmounted"):
        validate_result(json.dumps(result).encode())


def test_sandbox_rejects_unbounded_nonfinite_and_traversal():
    with pytest.raises(ValueError, match="2 MB"):
        validate_result(b" " * 2_000_001)
    result = valid_result()
    result["results"][0]["value"] = float("nan")
    with pytest.raises(ValueError, match="Non-finite"):
        validate_result(json.dumps(result).encode())
    result = valid_result()
    result["tables"] = [{"name": "escape", "file": "../host.csv", "columns": []}]
    with pytest.raises(ValidationError):
        validate_result(json.dumps(result).encode())
