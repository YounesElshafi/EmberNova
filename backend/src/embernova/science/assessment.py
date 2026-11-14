"""Deterministic evidence classification for an engineering scenario.

Classifies how well each NASA investigation in this corpus bears on a requested scenario,
independently of retrieval relevance:

* direct       - a flight or ground *test* whose gravity regime, fuel/material and phenomenon
                 match, and whose curated measured runs fall inside every requested numeric range;
* indirect     - the fuel class or phenomenon is related, but at least one key condition differs,
                 is simulated, is planned, or is not recorded;
* (excluded)   - neither fuel class nor phenomenon is related.

The overall class is "direct" if any investigation is direct, "indirect" if any is indirect and
otherwise "insufficient". Microgravity, simulated partial gravity, lunar/Martian surface gravity and
1 g are never interchangeable. No probability, risk score or certification is produced.
"""

import pandas as pd

from embernova.science.intent import investigation_facets, label
from embernova.science.units import convert

CORE_FUEL = {"solid", "liquid_droplet", "gaseous"}
BUNDLE_FUEL = {
    "solid_thin": "solid",
    "solid_fabric": "solid",
    "solid_thick": "solid",
    "liquid_droplet": "liquid_droplet",
    "gaseous_spherical_burner": "gaseous",
    "gaseous_jet_coflow": "gaseous",
    "gaseous_porous_burner": "gaseous",
}
NUMERIC = {
    "o2_mole_fraction": ("Ambient O₂ mole fraction", "oxygen", "percent"),
    "total_pressure": ("Total pressure", "pressure", None),
    "flow_velocity": ("Flow velocity", "airflow", "cm/s"),
}
TESTS = {"flight_experiment", "ground_test"}
# Curated outcome quantities that directly measure a phenomenon (substring of quantity name).
OUTCOMES = {
    "flame_spread": ("spread", "burn_length"),
    "fire_growth": ("spread", "burn_length"),
    "extinction": ("extinction",),
    "flammability_limit": ("extinction",),
    "burning_rate": ("burning_rate",),
    "cool_flame": ("cool_flame",),
    "smoke_aerosol": ("mass_loss", "smoke"),
    "soot": ("soot",),
}
GRAVITY_TEXT = {
    "microgravity": "orbital microgravity",
    "lunar": "lunar surface gravity (≈0.17 g)",
    "martian": "Martian surface gravity (≈0.38 g)",
    "earth": "1 g",
}


def _gravity(requested: str | None, env: dict) -> tuple[str, str]:
    have = set(env)
    if not requested:
        return "not_requested", "No gravity regime specified"
    if not have:
        return "unknown", "Gravity environment not recorded"
    if requested == "microgravity":
        if "microgravity" in have and "numerical_model" not in have:
            return "match", "Orbital microgravity flight data"
        if "microgravity" in have:
            return "differs", "Numerical modeling of microgravity data, not a test"
        return "differs", "Not tested in orbital microgravity"
    if requested == "earth":
        return (
            ("match", "1-g data present")
            if "normal_gravity" in have
            else ("differs", "No 1-g tests recorded")
        )
    if "simulated_partial_gravity" in have:
        return (
            "simulated",
            f"Simulated partial gravity (aircraft/centrifuge/rotating capsule), not {GRAVITY_TEXT[requested]}",
        )
    if "planned_lunar" in have and requested == "lunar":
        return "planned", "Planned lunar-surface experiment; no results in this corpus"
    return "differs", f"Microgravity or 1 g only; not {GRAVITY_TEXT[requested]}"


def _set_status(requested: list[str], recorded: dict, what: str) -> tuple[str, str]:
    if not requested:
        return "not_requested", f"No {what} specified"
    have = set(recorded)
    hit = [v for v in requested if v in have]
    if hit:
        return "match", ", ".join(label(v) for v in hit)
    if not have:
        return "unknown", f"{what.capitalize()} not recorded in curated metadata"
    return "differs", "Studied " + ", ".join(label(v) for v in sorted(have))


def _numeric(bundle, data: pd.DataFrame, field: str, rng: dict, facet_params: dict) -> dict:
    name, param, display = NUMERIC[field]
    unit_si = bundle.units[field]["unit_si"]
    disp = display or rng.get("unit") or bundle.units[field]["display_unit"]
    if field == "o2_mole_fraction":
        lo, hi = rng["min"], rng["max"]
        req_txt = f"{rng['min'] * 100:g}–{rng['max'] * 100:g} %"
    else:
        lo, hi = (
            convert(rng["min"], rng["unit"], unit_si),
            convert(rng["max"], rng["unit"], unit_si),
        )
        req_txt = f"{rng['min']:g}–{rng['max']:g} {rng['unit']}"
    col = data[field].dropna() if field in data else pd.Series(dtype=float)
    if col.empty:
        reported = param in facet_params
        return {
            "condition": name,
            "requested": req_txt,
            "status": "unknown",
            "detail": "Varied in the investigation, but not curated per test in the Analysis Bundle; see reports"
            if reported
            else "Not recorded per test",
            "n_runs_in_range": 0,
            "tested_range": None,
        }
    n = int(col.between(lo, hi).sum())
    tmin, tmax = (convert(float(v), unit_si, disp) for v in (col.min(), col.max()))
    tested = (
        f"{tmin:.3g} {disp}" if f"{tmin:.3g}" == f"{tmax:.3g}" else f"{tmin:.3g}–{tmax:.3g} {disp}"
    )
    return {
        "condition": name,
        "requested": req_txt,
        "status": "match" if n else "differs",
        "detail": f"{n} measured run(s) inside the requested range"
        if n
        else f"Measured runs lie outside the requested range (tested {tested})",
        "n_runs_in_range": n,
        "tested_range": tested,
    }


def assess(bundle, investigations: dict, scenario: dict) -> dict:
    """scenario keys: scenario_label, phenomena, fuel_class, materials, gravity,
    o2_mole_fraction, total_pressure, flow_velocity, investigation_ids."""
    facets = investigation_facets()
    fuel = [scenario["fuel_class"]] if scenario.get("fuel_class") else []
    materials = scenario.get("materials") or []
    if materials and not fuel:
        fuel = ["solid"]
    phenomena = scenario.get("phenomena") or []
    gravity = scenario.get("gravity")
    numeric = {f: scenario[f] for f in NUMERIC if scenario.get(f)}
    if not (fuel or phenomena or materials):
        raise ValueError("Specify at least a fuel class, material or phenomenon to assess evidence")
    measured = bundle.wide[bundle.wide.value_kind == "measured"]
    rows, gaps = [], []
    ids = scenario.get("investigation_ids") or list(facets)
    for iid in ids:
        rec = facets.get(iid)
        if rec is None:
            raise KeyError(iid)
        f_status, f_detail = _set_status(fuel, rec.get("fuel_classes", {}), "fuel class")
        m_status, m_detail = _set_status(materials, rec.get("materials", {}), "material")
        p_status, p_detail = _set_status(phenomena, rec.get("phenomena", {}), "phenomenon")
        if f_status != "match" and p_status != "match":
            continue  # unrelated to the scenario; not listed
        g_status, g_detail = _gravity(gravity, rec.get("environment", {}))
        data = measured[measured.investigation_id == iid]
        if fuel and not data.empty:
            data = data[data.fuel_class.map(BUNDLE_FUEL).isin(fuel)]
        scope_note = ""
        if materials and not data.empty:
            # Material-specific runs where the source names the material; otherwise all class runs.
            pattern = "|".join(
                {"PMMA": "PMMA|acrylic", "cotton_fiberglass": "SIBAL|cotton"}.get(m, m)
                for m in materials
            )
            named = data[data.sample_material.fillna("").str.contains(pattern, case=False)]
            if named.empty:
                scope_note = " (runs of other materials in this fuel class)"
            else:
                data = named
        checks = [
            {
                "condition": "Gravity",
                "requested": GRAVITY_TEXT.get(gravity, "any"),
                "status": g_status,
                "detail": g_detail,
            },
            {
                "condition": "Fuel class",
                "requested": ", ".join(label(v) for v in fuel) or "any",
                "status": f_status,
                "detail": f_detail,
            },
        ]
        if materials:
            if m_status != "match" and f_status == "match" and rec.get("materials"):
                m_status, m_detail = (
                    "differs",
                    "Same fuel class; tested "
                    + ", ".join(label(v) for v in sorted(rec["materials"])),
                )
            checks.append(
                {
                    "condition": "Material",
                    "requested": ", ".join(label(v) for v in materials),
                    "status": m_status,
                    "detail": m_detail,
                }
            )
        if phenomena:
            checks.append(
                {
                    "condition": "Phenomenon",
                    "requested": ", ".join(label(v) for v in phenomena),
                    "status": p_status,
                    "detail": p_detail,
                }
            )
        for field, rng in numeric.items():
            check = _numeric(bundle, data, field, rng, rec.get("parameters", {}))
            if check["tested_range"]:
                check["detail"] += scope_note
            checks.append(check)
        outputs = sorted(
            q
            for q in getattr(bundle, "measured_quantities", set())
            if q in data and data[q].notna().any()
        )
        if phenomena and p_status == "match":
            hits = [
                o for o in outputs if any(h in o for p in phenomena for h in OUTCOMES.get(p, ()))
            ]
            checks.append(
                {
                    "condition": "Measured outcome",
                    "requested": ", ".join(label(v) for v in phenomena),
                    "status": "match" if hits else "unknown",
                    "detail": "Curated measurements: " + ", ".join(label(o) for o in hits)
                    if hits
                    else "No curated per-test measurement of this outcome"
                    + (f" (curated: {', '.join(label(o) for o in outputs)})" if outputs else "")
                    + "; results may exist only in reports",
                }
            )
        study = sorted(rec.get("study_type", {}))
        is_test = bool(set(study) & TESTS)
        direct = (
            is_test
            and g_status in {"match", "not_requested"}
            and all(c["status"] in {"match", "not_requested"} for c in checks)
        )
        n_in = min(
            (c.get("n_runs_in_range", 0) for c in checks if "n_runs_in_range" in c), default=None
        )
        reasons = [
            f"{c['condition']}: {c['detail']}"
            for c in checks
            if c["status"] not in {"match", "not_requested"}
        ]
        if not is_test:
            reasons.insert(
                0,
                "Study type: "
                + (", ".join(s.replace("_", " ") for s in study) or "unknown")
                + " — not an experimental measurement",
            )
        inv = investigations.get(iid, {})
        doi = inv.get("doi")
        rows.append(
            {
                "investigation_id": iid,
                "acronym": inv.get("acronym") or iid,
                "title": inv.get("title", iid),
                "classification": "direct" if direct else "indirect",
                "study_type": study,
                "checks": checks,
                "limiting_factors": reasons,
                "measured_runs_in_range": n_in if numeric else None,
                "curated_measured_outputs": [label(o) for o in outputs],
                "curated_runs": int(len(data)),
                "source_url": inv.get("source_url"),
                "doi_url": f"https://doi.org/{doi}" if doi else None,
                "is_psi": str(inv.get("is_psi")) == "True",
            }
        )
    order = {"direct": 0, "indirect": 1}
    score = {
        "match": 3,
        "simulated": 2,
        "planned": 1,
        "unknown": 1,
        "not_requested": 2,
        "differs": 0,
    }
    rows.sort(
        key=lambda r: (
            order[r["classification"]],
            -sum(score[c["status"]] for c in r["checks"]),
            r["investigation_id"],
        )
    )
    overall = (
        "direct"
        if any(r["classification"] == "direct" for r in rows)
        else "indirect"
        if rows
        else "insufficient"
    )
    # Evidence gaps: state what no investigation in this corpus covers.
    if gravity in {"lunar", "martian"}:
        sims = [r["acronym"] for r in rows if r["checks"][0]["status"] in {"simulated", "planned"}]
        gaps.append(
            f"No investigation in this corpus measured these conditions in {GRAVITY_TEXT[gravity]}. "
            + (f"Closest: {', '.join(sims)} (simulated or planned). " if sims else "")
            + "Microgravity results cannot be transferred to a planetary surface without analysis."
        )
    elif gravity and not any(r["checks"][0]["status"] == "match" for r in rows):
        gaps.append(f"No related investigation tested in {GRAVITY_TEXT[gravity]}.")
    for field, (name, _, _) in NUMERIC.items():
        if field not in numeric:
            continue
        rel = [r for r in rows]
        if not any(
            c["condition"] == name and c["status"] == "match" for r in rel for c in r["checks"]
        ):
            tested = sorted(
                {
                    c["tested_range"]
                    for r in rel
                    for c in r["checks"]
                    if c["condition"] == name and c.get("tested_range")
                }
            )
            gaps.append(
                f"No curated measured run of a related investigation lies inside the requested {name} range"
                + (
                    f" (tested: {'; '.join(tested)})."
                    if tested
                    else "; it is not recorded per test for related investigations."
                )
            )
    if materials and not any(
        c["condition"] == "Material" and c["status"] == "match" for r in rows for c in r["checks"]
    ):
        gaps.append(
            f"No investigation in this corpus tested {', '.join(label(m) for m in materials)}."
        )
    if not rows:
        gaps.append("No investigation in this corpus studied this fuel class or phenomenon.")
    needed = (
        "Tests needed to close the gap: "
        + ", ".join(label(m) for m in materials or fuel or ["the material"])
        + (f" {', '.join(label(p) for p in phenomena)}" if phenomena else "")
        + (f" in {GRAVITY_TEXT[gravity]}" if gravity else "")
        + "".join(f", {NUMERIC[f][0]} {c}" for f, c in [(f, _fmt(scenario[f], f)) for f in numeric])
        + ", with measured outcomes and uncertainties."
    )
    if overall != "direct":
        gaps.append(needed)
    return {
        "kind": "evidence_assessment",
        "scenario": scenario,
        "classification": overall,
        "definitions": {
            "direct": "A flight/ground test directly measured this phenomenon with matching gravity, fuel/material and measured runs inside every requested range.",
            "indirect": "Related investigations exist, but at least one key condition differs, is simulated or planned, or is not recorded.",
            "insufficient": "No related investigation in this corpus; no conclusion can be drawn.",
        },
        "counts": {
            "direct": sum(r["classification"] == "direct" for r in rows),
            "indirect": sum(r["classification"] == "indirect" for r in rows),
        },
        "investigations": rows[:12],
        "gaps": gaps,
        "note": "Evidence classification is independent of retrieval relevance. It is not a fire-risk estimate, probability or certification; engineering implications require expert review and testing.",
    }


def _fmt(rng: dict, field: str) -> str:
    if field == "o2_mole_fraction":
        return f"{rng['min'] * 100:g}–{rng['max'] * 100:g} %"
    return f"{rng['min']:g}–{rng['max']:g} {rng['unit']}"
