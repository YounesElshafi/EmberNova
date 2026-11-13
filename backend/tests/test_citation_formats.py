from embernova.agent.citations import validate


def test_short_marker_format_is_repaired_only_for_turn_evidence():
    ledger = {"ev_abcdefgh1234": {"kind": "data_rows"}}
    result = validate("**Measured** 0.94 mm [[ev_abcdefgh1234]]", ledger)
    assert result["citations"] == [{"n": 1, "evidence_id": "ev_abcdefgh1234"}]
    assert result["audit"]["kind_mismatches"] == 0
    assert result["audit"]["uncited_sentences"] == 0
    assert "[[" not in result["validated_markdown"]
    assert validate("Unknown [[ev_nonexistent]]", ledger)["audit"]["invalid_citations"] == 1
