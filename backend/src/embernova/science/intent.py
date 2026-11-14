"""Deterministic scientific query interpretation and facet agreement.

The vocabulary is curated (not SI-generated). It maps everyday and engineering wording onto the
facet values in curation/investigation_facets.yaml so that, e.g., "ventilation" matches airflow
studies and "acrylic" matches PMMA. Facet agreement is an explainable relevance signal; it is not
an evidence-strength judgement and never a fire-risk estimate.
"""

import re
from functools import lru_cache

import yaml

from embernova.config import ROOT

FACETS_PATH = ROOT / "curation/investigation_facets.yaml"
DIMENSIONS = ("phenomena", "fuel_classes", "materials", "parameters", "environment")

# (facet dimension, value, regex). Order matters only for readability.
VOCAB: list[tuple[str, str, str]] = [
    (
        "phenomena",
        "flame_spread",
        r"flame[- ]spread|spread(?:ing)? rate|spreads?\b|fire growth|grows?\b",
    ),
    ("phenomena", "fire_growth", r"fire growth|large[- ]scale fire|fire grows"),
    ("phenomena", "ignition", r"ignit\w*"),
    (
        "phenomena",
        "extinction",
        r"extinct\w*|extinguish\w*|blow[- ]?off|quench\w*|goes out|liftoff|lift-off",
    ),
    (
        "phenomena",
        "flammability_limit",
        r"flammab\w*|limiting oxygen|\bLOI\b|burn(?:s|ing)? limits?",
    ),
    (
        "phenomena",
        "suppression",
        r"suppress\w*|extinguish\w*|fire[- ]?fighting|\bCO2\b|carbon dioxide|helium|diluent|inert(?:ing)?\b",
    ),
    ("phenomena", "soot", r"soot\w*|smoke[- ]point|radiat\w*"),
    ("phenomena", "smoke_aerosol", r"smoke(?![- ]point)|aerosol|particulate|particles?\b"),
    ("phenomena", "detection", r"detect\w*|sensor|alarm"),
    ("phenomena", "cool_flame", r"cool[- ]flames?|low[- ]temperature chemistry|warm flame"),
    ("phenomena", "burning_rate", r"burning[- ]rate|burn rate|d2|d²|burning rate constant"),
    (
        "phenomena",
        "flame_structure",
        r"flame (?:shape|structure|length|height|temperature)|lifted flame",
    ),
    (
        "fuel_classes",
        "solid",
        r"solids?\b|material|fabric|plastic|polymer|PMMA|acrylic|plexiglas\w*|cotton|nomex|textile|foam|wire insulation|cellulose|paper",
    ),
    (
        "fuel_classes",
        "liquid_droplet",
        r"droplet|liquid fuel|heptane|decane|dodecane|methanol|ethanol",
    ),
    (
        "fuel_classes",
        "gaseous",
        r"gaseous|gas[- ]jet|jet flame|methane|ethylene|propane|coflow|co-flow|burner",
    ),
    ("materials", "PMMA", r"PMMA|acrylic|plexiglas\w*|polymethyl methacrylate"),
    ("materials", "cotton_fiberglass", r"cotton|sibal|fiberglass"),
    ("materials", "Nomex", r"nomex"),
    ("materials", "silicone", r"silicone"),
    ("materials", "Ultem", r"ultem"),
    (
        "parameters",
        "airflow",
        r"ventilat\w*|air ?flow|flow (?:velocity|speed|rate)|forced flow|forced convection|convection|draft|wind|fan|\bflow\b",
    ),
    ("parameters", "flow_direction", r"opposed|concurrent|flow direction"),
    ("parameters", "oxygen", r"oxygen|\bO2\b|O₂|enriched"),
    (
        "parameters",
        "pressure",
        r"pressure|\bpsia?\b|\batm\b|\bkPa\b|\bbar\b|mmHg|hypobaric|exploration atmosphere",
    ),
    ("parameters", "diluent", r"diluent|dilution|\bCO2\b|carbon dioxide|helium|nitrogen"),
    (
        "parameters",
        "gravity_level",
        r"partial[- ]g\w*|lunar|moon|mars|martian|gravity level|g-level|reduced gravity",
    ),
    ("parameters", "temperature", r"temperature|heat(?:ed|ing)\b|preheat\w*"),
    ("parameters", "droplet_size", r"droplet (?:size|diameter)"),
    ("parameters", "electric_field", r"electric field"),
    (
        "environment",
        "microgravity",
        r"micro[- ]?gravity|μg|\bISS\b|space station|orbit\w*|low[- ]gravity|weightless|zero[- ]g|spacecraft|in space|freefall|free fall",
    ),
    ("environment", "lunar", r"lunar|moon"),
    ("environment", "martian", r"mars|martian"),
    ("environment", "partial_gravity", r"partial[- ]gravity|reduced gravity|partial-g"),
    (
        "environment",
        "normal_gravity",
        r"normal gravity|earth gravity|\b1-?g\b|on earth|ground[- ]based",
    ),
]
COMPILED = [(dim, value, re.compile(rx, re.I)) for dim, value, rx in VOCAB]
SCENARIO = re.compile(
    r"habitat|cabin|crew|spacecraft|vehicle|module|rover|gateway|station|design", re.I
)

LABELS = {
    "flame_spread": "flame spread",
    "fire_growth": "fire growth",
    "flammability_limit": "flammability limits",
    "smoke_aerosol": "smoke/aerosol",
    "cool_flame": "cool flames",
    "burning_rate": "burning rate",
    "flame_structure": "flame structure",
    "liquid_droplet": "liquid droplets",
    "cotton_fiberglass": "cotton-fiberglass (SIBAL)",
    "flow_direction": "flow direction",
    "gravity_level": "gravity level",
    "droplet_size": "droplet size",
    "electric_field": "electric field",
    "fuel_flow": "fuel flow",
    "simulated_partial_gravity": "simulated partial gravity",
    "normal_gravity": "1-g ground",
    "numerical_model": "numerical model",
    "planned_lunar": "planned lunar experiment",
    "partial_gravity": "partial gravity",
}


def label(value: str) -> str:
    return LABELS.get(value, value.replace("_", " "))


@lru_cache(maxsize=1)
def investigation_facets() -> dict:
    data = yaml.safe_load(FACETS_PATH.read_text(encoding="utf-8")) or {}
    return {iid: {k: dict(v or {}) for k, v in entry.items()} for iid, entry in data.items()}


def interpret(query: str) -> dict:
    """Return requested facet values found in the query (deterministic, explainable)."""
    found: dict[str, list[str]] = {d: [] for d in DIMENSIONS}
    terms: dict[str, list[str]] = {}
    for dim, value, rx in COMPILED:
        m = rx.search(query)
        if m and value not in found[dim]:
            found[dim].append(value)
            terms.setdefault(f"{dim}:{value}", []).append(m.group(0))
    # A material implies its fuel class; "solid" is redundant when a specific material is named.
    if found["materials"] and "solid" not in found["fuel_classes"]:
        found["fuel_classes"].append("solid")
    # "spacecraft" alone implies microgravity only when no planetary surface is named.
    if {"lunar", "martian", "partial_gravity"} & set(found["environment"]):
        found["environment"] = [
            e
            for e in found["environment"]
            if e != "microgravity" or re.search(r"micro[- ]?gravity|\bISS\b|orbit", query, re.I)
        ]
    # Suppression wording is also a diluent parameter; keep both but avoid treating CO2 as soot etc.
    return {
        "requested": {k: v for k, v in found.items() if v},
        "matched_terms": terms,
        "engineering_scenario": bool(SCENARIO.search(query)),
        "summary": "; ".join(
            f"{k.replace('_', ' ')}: {', '.join(label(x) for x in v)}"
            for k, v in found.items()
            if v
        )
        or "no specific scientific facet recognized",
    }


def _env_status(requested: list[str], recorded: dict) -> tuple[str, str]:
    have = set(recorded)
    if not have:
        return "unknown", "gravity environment not recorded"
    parts, statuses = [], []
    for env in requested:
        if env == "microgravity":
            if "microgravity" in have and "numerical_model" not in have:
                statuses.append("match")
                parts.append("orbital microgravity")
            elif "microgravity" in have:
                statuses.append("partial")
                parts.append("modeling of microgravity data")
            else:
                statuses.append("differs")
                parts.append(
                    f"{', '.join(label(h) for h in sorted(have))}, not orbital microgravity"
                )
        elif env in {"lunar", "martian", "partial_gravity"}:
            if "simulated_partial_gravity" in have:
                statuses.append("partial")
                parts.append(
                    "simulated partial gravity (aircraft/centrifuge/capsule), not a surface measurement"
                )
            elif "planned_lunar" in have and env != "martian":
                statuses.append("partial")
                parts.append("planned lunar experiment; no results in this corpus")
            else:
                statuses.append("differs")
                parts.append(
                    f"{', '.join(label(h) for h in sorted(have))}; microgravity is not {label(env)} gravity"
                )
        elif env == "normal_gravity":
            ok = "normal_gravity" in have
            statuses.append("match" if ok else "differs")
            parts.append("1-g data present" if ok else "no 1-g data recorded")
    best = "match" if "match" in statuses else "partial" if "partial" in statuses else "differs"
    return best, "; ".join(parts)


def facet_agreement(intent: dict, iid: str) -> dict:
    """Per-dimension agreement between the query and an investigation's curated facets."""
    rec = investigation_facets().get(iid, {})
    req = intent["requested"]
    checks = []
    for dim in ("phenomena", "fuel_classes", "materials", "environment"):
        if dim not in req:
            continue
        if dim == "environment":
            status, detail = _env_status(req[dim], rec.get("environment", {}))
        else:
            have = set(rec.get(dim, {}))
            hit = [v for v in req[dim] if v in have]
            if hit:
                status, detail = "match", ", ".join(label(v) for v in hit)
            elif not have:
                status, detail = "unknown", f"{label(dim)} not recorded in curated metadata"
            elif dim == "materials" and set(req.get("fuel_classes", [])) & set(
                rec.get("fuel_classes", {})
            ):
                status, detail = (
                    "partial",
                    f"same fuel class; tested {', '.join(label(v) for v in sorted(have))}",
                )
            else:
                status, detail = "differs", f"studied {', '.join(label(v) for v in sorted(have))}"
        checks.append({"dimension": dim, "requested": req[dim], "status": status, "detail": detail})
    if "parameters" in req:
        have = set(rec.get("parameters", {}))
        for p in req["parameters"]:
            ok = p in have
            checks.append(
                {
                    "dimension": "parameters",
                    "requested": [p],
                    "status": "match" if ok else "unknown",
                    "detail": f"{label(p)} was a controlled/varied condition"
                    if ok
                    else f"{label(p)} not recorded as a varied condition (not confirmed absent)",
                }
            )
    weights = {"match": 1.0, "partial": 0.5, "unknown": 0.25, "differs": 0.0}
    # Core dimensions (phenomenon, fuel, environment) weigh double relative to parameters.
    num = sum(weights[c["status"]] * (1 if c["dimension"] == "parameters" else 2) for c in checks)
    den = sum(1 if c["dimension"] == "parameters" else 2 for c in checks)
    return {
        "score": num / den if den else None,
        "checks": checks,
        "study_type": sorted(rec.get("study_type", {})),
    }
