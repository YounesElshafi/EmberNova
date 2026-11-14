import json
import sqlite3

from embernova.science.intent import facet_agreement, interpret, investigation_facets


def _texts(cfg):
    db = sqlite3.connect(f"file:{cfg.build_dir / 'knowledge.db'}?mode=ro", uri=True)
    meta = {}
    for iid, raw in db.execute("SELECT investigation_id, data_json FROM investigations"):
        d = json.loads(raw)
        meta[iid] = " ".join(
            str(d.get(k) or "") for k in ["title", "objectives", "approach", "hardware", "platform"]
        )
    docs = {}
    for iid, text in db.execute(
        "SELECT d.investigation_id, p.text FROM pages p JOIN documents d USING(document_id)"
    ):
        docs[iid] = docs.get(iid, "") + " " + (text or "")
    return meta, docs


def test_every_facet_has_verifiable_nasa_basis(cfg, bundle):
    meta, docs = _texts(cfg)
    facets = investigation_facets()
    assert set(facets) == set(meta), "every investigation must be curated, and only real ones"
    missing = []
    for iid, entry in facets.items():
        corpus = (meta[iid] + " " + docs.get(iid, "")).lower()
        for dim, values in entry.items():
            for value, keyword in values.items():
                if keyword.lower() not in corpus:
                    missing.append(f"{iid}.{dim}.{value}: {keyword!r}")
    assert not missing, missing


def test_interpret_challenge_example():
    q = "Find the most relevant NASA investigations about how ventilation airflow affects flame spread over solid materials in microgravity."
    req = interpret(q)["requested"]
    assert "flame_spread" in req["phenomena"]
    assert "solid" in req["fuel_classes"]
    assert "airflow" in req["parameters"]
    assert req["environment"] == ["microgravity"]


def test_interpret_synonyms_and_planetary_gravity():
    req = interpret("Could acrylic create a fire hazard in a lunar habitat under elevated oxygen?")[
        "requested"
    ]
    assert req["materials"] == ["PMMA"] and "solid" in req["fuel_classes"]
    assert "lunar" in req["environment"] and "microgravity" not in req["environment"]
    assert "oxygen" in req["parameters"]


def test_lunar_request_never_matches_microgravity_flight():
    intent = interpret("PMMA flame spread on the Moon")
    env = next(
        c for c in facet_agreement(intent, "PSI-25")["checks"] if c["dimension"] == "environment"
    )
    assert env["status"] == "differs"
    luci = next(
        c for c in facet_agreement(intent, "LUCI")["checks"] if c["dimension"] == "environment"
    )
    assert luci["status"] == "partial" and "simulated" in luci["detail"]


def test_unrecorded_parameter_is_unknown_not_mismatch():
    intent = interpret("effect of electric field on flame spread over solids in microgravity")
    checks = facet_agreement(intent, "PSI-26")["checks"]
    field = next(c for c in checks if c["requested"] == ["electric_field"])
    assert field["status"] == "unknown" and "not confirmed absent" in field["detail"]
