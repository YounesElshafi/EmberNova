from embernova.agent.citations import validate


def test_short_marker_format_is_repaired_only_for_turn_evidence():
    ledger = {"ev_abcdefgh1234": {"kind": "data_rows"}}
    result = validate("**Measured** 0.94 mm [[ev_abcdefgh1234]]", ledger)
    assert result["citations"] == [{"n": 1, "evidence_id": "ev_abcdefgh1234"}]
    assert result["audit"]["kind_mismatches"] == 0
    assert result["audit"]["uncited_sentences"] == 0
    assert "[[" not in result["validated_markdown"]
    assert validate("Unknown [[ev_nonexistent]]", ledger)["audit"]["invalid_citations"] == 1


def test_numeric_scan_rejects_sign_units_and_unrelated_sources():
    eid = "ev_abcdefgh1234"
    ledger = {
        eid: {
            "kind": "data_rows",
            "excerpt": "",
            "locator": {},
            "preview_rows": [
                {
                    "run_uid": "x",
                    "values": [
                        {"name": "extinction_diameter", "display_value": 0.94, "display_unit": "mm"}
                    ],
                }
            ],
        }
    }
    for claim in ("-0.94 mm", "0.94 m", "999 mm", "888 mm"):
        result = validate(
            f"Extinction diameter {claim} [[{eid}]]", ledger, question="999", tool_outputs=["888"]
        )
        assert result["audit"]["ungrounded_numbers"] > 0
    assert (
        validate(f"Extinction diameter 0.94 mm [[{eid}]]", ledger)["audit"]["ungrounded_numbers"]
        == 0
    )
    assert validate(f"Pressure 0.94 mm [[{eid}]]", ledger)["audit"]["ungrounded_numbers"] > 0
