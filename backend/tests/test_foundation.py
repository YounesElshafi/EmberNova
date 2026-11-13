import json
import sqlite3

import pytest

from embernova.config import Settings
from embernova.ingest.catalog import build_catalog
from embernova.ingest.cellparse import parse_cell
from embernova.ingest.media import association
from embernova.provenance import canonical, digest, evidence_id, safe_path, sha256
from embernova.science.bundle import Bundle
from embernova.science.units import convert, normalize


def test_units():
    assert convert(760, "mmHg", "Pa") == pytest.approx(101325, rel=0.0001)
    assert convert(540, "mmHg", "psi") == pytest.approx(10.44, abs=0.01)
    assert convert(10.2, "psi", "Pa") == pytest.approx(70327, abs=1)
    assert normalize(0.52, "mm**2/s")[0] == pytest.approx(5.2e-7)
    assert convert(
        convert(22.2, "percent", "dimensionless"), "dimensionless", "percent"
    ) == pytest.approx(22.2)
    with pytest.raises(ValueError):
        convert(float("nan"), "s", "s")


def test_cell_parser():
    assert parse_cell("0.27 mm", "m")["value_si"] == pytest.approx(0.00027)
    assert parse_cell("20 cm/s", "m/s")["value_si"] == pytest.approx(0.2)
    assert parse_cell("~ 21.5", "percent")["qualifier"] == "approx"
    result = parse_cell("21.5 - 21.7", "percent")
    assert result["value_si"] is None
    assert result["value_min_si"] == pytest.approx(0.215)
    assert parse_cell("0.17; 0.21;0.25; 0.3", "dimensionless")["value_list_si"] == [
        0.17,
        0.21,
        0.25,
        0.3,
    ]
    assert parse_cell("none", "s")["value_si"] is None
    assert parse_cell("RAMPED", "s")["quality_flags"] == ["sentinel_value"]
    assert parse_cell("�", "m")["quality_flags"] == ["encoding_artifact"]
    assert parse_cell("5", None)["quality_flags"] == ["missing_unit"]


def test_ids_and_paths(tmp_path):
    a = {"b": 2, "a": 1}
    assert digest(a) == digest({"a": 1, "b": 2})
    assert evidence_id("data_rows", a) == evidence_id("data_rows", a)
    assert len(evidence_id("data_rows", a)) == 15
    path = tmp_path / "sample.txt"
    path.write_text("NASA source")
    assert safe_path(tmp_path, "sample.txt") == path
    assert len(sha256(path)) == 64
    with pytest.raises(ValueError):
        safe_path(tmp_path, "../escape.txt")
    with pytest.raises(ValueError):
        canonical({"bad": float("nan")})


def test_hash_failure_aborts(tmp_path):
    source = tmp_path / "data"
    source.mkdir()
    (source / "raw.txt").write_text("changed source")
    (source / "DOWNLOAD_MANIFEST.csv").write_text(
        "file_id,investigation_id,relative_local_path,sha256,download_status,origin_status\nx,PSI-69,raw.txt,incorrect,verified,original\n"
    )
    with sqlite3.connect(":memory:") as db, pytest.raises(ValueError, match="SHA-256 mismatch"):
        build_catalog(Settings(_env_file=None, data_dir=source), db)


def test_bundle_tampering_fails_closed(tmp_path):
    root = tmp_path / "bundle"
    root.mkdir()
    (root / "runs.parquet").write_bytes(b"tampered")
    (root / "bundle_manifest.json").write_text(
        json.dumps({"files": [{"name": "runs.parquet", "sha256": "0" * 64}]})
    )
    with pytest.raises(ValueError, match="integrity check failed"):
        Bundle(Settings(_env_file=None, build_dir=tmp_path))


def test_media_association():
    rules = [{"investigation_id": "PSI-25", "pattern": r"TEST_(T\d+)"}]
    assert association("BASS_TEST_T21.mp4", "PSI-25", rules, {"T21"}) == (
        "inferred_from_filename",
        "T21",
    )
    assert association("BASS_TEST_T21.mp4", "PSI-25", rules, {"B21"}) == ("none", "T21")


def test_corpus_integrity_audit(cfg):
    report = json.loads((cfg.build_dir / "eval/corpus_audit.json").read_text())
    assert report["mismatches"] == []
    assert report["verified_originals"] == 274
