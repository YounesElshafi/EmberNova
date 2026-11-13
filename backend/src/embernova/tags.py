"""Curated fire-safety roles of investigations (curation/investigation_tags.yaml)."""

from functools import lru_cache

import yaml

from embernova.config import ROOT

OBJECTIVES = ("prevention", "detection", "suppression", "fundamental")
TAGS_PATH = ROOT / "curation/investigation_tags.yaml"


@lru_cache(maxsize=1)
def investigation_tags() -> dict:
    data = yaml.safe_load(TAGS_PATH.read_text(encoding="utf-8")) or {}
    for iid, entry in data.items():
        bad = set(entry.get("objectives", [])) - set(OBJECTIVES)
        if bad:
            raise ValueError(f"{iid}: unknown fire-safety objective {sorted(bad)}")
    return data


def with_tags(record: dict) -> dict:
    entry = investigation_tags().get(record["investigation_id"], {})
    return {
        **record,
        "fire_safety_objectives": list(entry.get("objectives", [])),
        "facility": entry.get("facility"),
        "tag_basis": list(entry.get("basis", [])),
    }
