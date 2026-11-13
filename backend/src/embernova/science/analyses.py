import math

import numpy as np
import pandas as pd

from embernova.science.bundle import Bundle
from embernova.science.charts import make_spec
from embernova.science.units import convert

GRAVITY_NOTE = "PSI contains no partial-gravity combustion run data in this snapshot. Atmosphere overlap is not lunar or Martian gravity coverage; supplemental simulated-gravity reports are not measured lunar tests. Similarity does not establish safety."
ASSOCIATION_NOTE = "Observed differences are associations between test groups, not causal effects. Multiple changed or uncontrolled conditions prevent attributing the difference to a single variable."


def statistics(values) -> dict:
    a = pd.Series(values).dropna()
    return {
        "n": len(a),
        "median": float(a.median()) if len(a) else None,
        "q1": float(a.quantile(0.25)) if len(a) else None,
        "q3": float(a.quantile(0.75)) if len(a) else None,
        "min": float(a.min()) if len(a) else None,
        "max": float(a.max()) if len(a) else None,
    }


def compare(bundle: Bundle, groups: list[dict], quantities: list[str], evidence_ids: list) -> dict:
    if not 2 <= len(groups) <= 4 or not quantities or not set(quantities) <= set(bundle.units):
        raise ValueError("Select two to four groups and mapped quantities")
    selected, summaries, checks, differences = [], [], [], []
    for group in groups:
        rows, _ = bundle.select([group["table_id"]], group.get("filters"))
        if group.get("run_uids"):
            rows = rows[rows.run_uid.isin(group["run_uids"])]
        rows = rows.copy()
        no_extinction = pd.Series(False, index=rows.index)
        if "extinction_diameter" in rows and "outcome_raw" in rows:
            no_extinction = (
                rows.extinction_diameter.eq(0)
                & rows.outcome_raw.notna()
                & (rows.outcome_raw.str.strip().str.casefold() != "extinction")
            )
            rows.loc[no_extinction, "extinction_diameter"] = np.nan
        selected.append(rows)
        display = bundle.display(rows, quantities)
        summaries.append(
            {
                "label": group["label"],
                "n": len(rows),
                "no_extinction_observed": int(no_extinction.sum()),
                "outcome_counts": rows.outcome_raw.fillna("unknown").value_counts().to_dict()
                if "outcome_raw" in rows
                else {},
                "run_uids": list(rows.run_uid),
                "summary": {
                    q: {
                        **statistics([r[q] for r in display]),
                        "unit": bundle.units[q]["display_unit"],
                    }
                    for q in quantities
                },
            }
        )

    def check(rule, status, detail):
        checks.append(
            {"rule": rule, "status": status, "detail": detail, "evidence_ids": evidence_ids}
        )

    check(
        "sample_size",
        "fail"
        if any(s["summary"][q]["n"] == 0 for s in summaries for q in quantities)
        else "warn"
        if any(s["summary"][q]["n"] < 3 for s in summaries for q in quantities)
        else "pass",
        "Usable observations: "
        + "; ".join(
            f"{s['label']} {q}: n={s['summary'][q]['n']}" for s in summaries for q in quantities
        ),
    )
    for field, rule, failure in [
        ("value_kind", "value_kind_match", True),
        ("gravity_regime", "gravity_regime", True),
        ("hardware", "hardware_family", False),
        ("fuel_class", "fuel_class", True),
        ("fuel_canonical", "fuel_or_material", False),
    ]:
        sets = [set(d[field].dropna()) if field in d else set() for d in selected]
        differs = any(s != sets[0] for s in sets[1:])
        heterogeneous = any(len(s) != 1 for s in sets)
        status = ("fail" if failure else "warn") if differs else "warn" if heterogeneous else "pass"
        check(
            rule,
            status,
            f"{field}: " + " / ".join(", ".join(sorted(map(str, s))) or "unknown" for s in sets),
        )
    for q in quantities:
        check(
            "same_quantity_definition",
            "fail" if any(d[q].notna().sum() == 0 for d in selected) else "pass",
            f"{q}: only the same curated definition may be compared",
        )
    changed = []
    for variable in [
        "o2_mole_fraction",
        "total_pressure",
        "droplet_initial_diameter",
        "co2_mole_fraction",
        "he_mole_fraction",
        "flow_velocity",
    ]:
        if variable not in bundle.wide:
            continue
        medians = [
            float(d[variable].median()) if d[variable].notna().any() else None for d in selected
        ]
        valid = [v for v in medians if v is not None]
        tol = (
            0.01
            if "mole_fraction" in variable
            else 0.03 * max(valid, default=0)
            if variable == "total_pressure"
            else 0.1 * max(valid, default=0)
        )
        differs = len(valid) == len(medians) and max(valid) - min(valid) > tol
        display = [
            convert(v, bundle.units[variable]["unit_si"], bundle.units[variable]["display_unit"])
            if v is not None
            else None
            for v in medians
        ]
        differences.append(
            {
                "variable": variable,
                "values": display,
                "differs": bool(differs),
                "display_unit": bundle.units[variable]["display_unit"],
            }
        )
        if differs:
            changed.append(variable)
        if len(valid) < len(medians):
            check("missing_conditions", "warn", f"{variable} is unknown in one or more groups")
    check(
        "n_differing_conditions",
        "warn" if len(changed) >= 2 else "pass",
        "Confounded: "
        + ", ".join(changed)
        + " differ; differences cannot be attributed to either alone."
        if len(changed) >= 2
        else "Fewer than two median conditions differ; this does not establish experimental control.",
    )
    # Median equality alone cannot certify control or account for unknown apparatus settings.
    check(
        "uncontrolled_conditions",
        "warn",
        "Source summaries do not establish that all unreported conditions were controlled.",
    )
    worst = (
        "not_comparable"
        if any(c["status"] == "fail" for c in checks)
        else "comparable_with_caveats"
        if any(c["status"] == "warn" for c in checks)
        else "comparable"
    )
    frames = [d.assign(comparison_group=g["label"]) for g, d in zip(groups, selected, strict=True)]
    data = pd.concat(frames)
    y = quantities[0]
    x = "o2_mole_fraction" if y != "o2_mole_fraction" else "total_pressure"
    chart = make_spec(
        bundle,
        data,
        x,
        y,
        "Selected test groups",
        [g["table_id"] for g in groups],
        evidence_ids,
        "comparison_group",
        notes=[ASSOCIATION_NOTE, "Unavailable quantities have no plotted observations."],
        allow_empty=True,
    )
    return {
        "kind": "comparison",
        "groups": summaries,
        "condition_diff": differences,
        "validity": {"verdict": worst, "checks": checks},
        "chart": chart,
        "association_note": ASSOCIATION_NOTE,
    }


def envelope(bundle: Bundle, args: dict, evidence_ids: list, names: dict | None = None) -> dict:
    tables = list(bundle.runs.table_id.unique())
    data, _ = bundle.select(tables)
    data = data[
        data.value_kind == "measured"
    ]  # design lists are not manufactured into measured joint combinations
    if args.get("investigation_ids"):
        data = data[data.investigation_id.isin(args["investigation_ids"])]
    if args.get("fuel_classes"):
        data = data[data.fuel_class.isin(args["fuel_classes"])]
    constraints = []
    oxygen = args.get("o2_mole_fraction")
    pressure = args.get("total_pressure")
    flow = args.get("flow_velocity")
    if oxygen:
        if not 0 <= oxygen["min"] <= oxygen["max"] <= 1:
            raise ValueError("Oxygen must be an ordered mole-fraction range in [0,1]")
        constraints.append(("o2_mole_fraction", oxygen["min"], oxygen["max"]))
    for field, val in [("total_pressure", pressure), ("flow_velocity", flow)]:
        if val:
            lo, hi = (
                convert(val["min"], val["unit"], bundle.units[field]["unit_si"]),
                convert(val["max"], val["unit"], bundle.units[field]["unit_si"]),
            )
            if lo > hi or lo < 0 or (field == "total_pressure" and lo == 0):
                raise ValueError("Invalid environmental range")
            constraints.append((field, lo, hi))
    if not constraints:
        raise ValueError("At least one environmental range is required")
    per, gaps = [], []
    matching = []
    unknown: dict[str, list[str]] = {}
    names = names or {}
    for iid, group in data.groupby("investigation_id"):
        masks = [
            group[field].between(lo, hi).fillna(False)
            if field in group
            else pd.Series(False, index=group.index)
            for field, lo, hi in constraints
        ]
        joint = np.logical_and.reduce(masks)
        known = all(field in group and group[field].notna().any() for field, _, _ in constraints)
        n = int(joint.sum())
        status = "inside" if n else "partial" if any(m.any() for m in masks) else "outside"
        per.append(
            {
                "investigation_id": iid,
                "coverage": status,
                "n_runs_in_range": n,
                "data_complete": known,
                "interpretation": "atmosphere overlap only"
                if known
                else "one or more requested conditions unknown",
            }
        )
        matching += list(group.loc[joint, "run_uid"])
        for field, _, _ in constraints:
            if field not in group or not group[field].notna().any():
                unknown.setdefault(field, []).append(iid)
    field_names = {
        "o2_mole_fraction": "Oxygen",
        "total_pressure": "Total pressure",
        "flow_velocity": "Flow velocity",
    }
    for field, iids in unknown.items():
        gaps.append(
            f"{field_names.get(field, field)} not recorded per test, so joint coverage cannot "
            f"be established: {', '.join(names.get(i, i) for i in iids)}"
        )
    gravity = args.get("gravity")
    gravity_match = gravity == "microgravity"
    if not gravity_match:
        gaps.append("No verified gravity-regime match for " + str(gravity or "unspecified gravity"))
    atmospheric = any(p["coverage"] == "inside" for p in per)
    coverage = (
        "inside_tested_envelope"
        if atmospheric and gravity_match
        else "partially_covered"
        if atmospheric or any(p["coverage"] == "partial" for p in per)
        else "outside_envelope"
    )
    jointdata = data.dropna(subset=["o2_mole_fraction", "total_pressure"]).copy()
    chart = make_spec(
        bundle,
        jointdata,
        "o2_mole_fraction",
        "total_pressure",
        args.get("scenario_label", "Habitat applicability"),
        tables,
        evidence_ids,
        "investigation_id",
        "envelope",
        [
            "Atmosphere overlap does not establish safety. Design matrices excluded from joint measured coverage."
        ],
    )
    if oxygen and pressure:
        chart["annotations"].append(
            {
                "kind": "region",
                "label": args.get("scenario_label", "Scenario"),
                "x": [
                    convert(oxygen[k], "dimensionless", chart["x"]["display_unit"])
                    for k in ["min", "max"]
                ],
                "y": [
                    convert(pressure[k], pressure["unit"], chart["y"]["display_unit"])
                    for k in ["min", "max"]
                ],
            }
        )
    # Nearest tested conditions, reported as plain offsets from the requested band in the
    # user's units (0 = inside). Ordering uses band-normalized offsets so oxygen and
    # pressure contribute comparably; the ordering value itself is not shown as a "distance".
    pressure_unit = pressure["unit"] if pressure else None
    nearest = []
    for _, row in jointdata.iterrows():
        offsets, order = {}, 0.0
        for field, lo, hi in constraints:
            val = row.get(field)
            if val is None or pd.isna(val):
                order = math.inf
                break
            off = val - hi if val > hi else val - lo if val < lo else 0.0
            order += (off / max(hi - lo, 1e-9 if field != "o2_mole_fraction" else 0.01)) ** 2
            if field == "o2_mole_fraction":
                offsets["delta_o2_percent_points"] = round(off * 100, 3)
            elif field == "total_pressure":
                offsets[f"delta_pressure_{pressure_unit}"] = round(
                    convert(off, "pascal", pressure_unit), 4
                )
            else:
                offsets["delta_flow_cm_s"] = round(off * 100, 3)
        if math.isfinite(order):
            nearest.append(
                {
                    "run_uid": row.run_uid,
                    "investigation_id": row.investigation_id,
                    "test": row.source_run_label,
                    "fuel_class": row.fuel_class,
                    **offsets,
                    "within_atmosphere": row.run_uid in matching,
                    "_order": order,
                }
            )
    nearest.sort(key=lambda x: (x["_order"], x["run_uid"]))
    for item in nearest:
        item.pop("_order")
    by_class = coverage_by_fuel_class(data, constraints, matching)
    return {
        "kind": "envelope",
        "scenario": args,
        "coverage": coverage,
        "headline": envelope_headline(by_class, gravity_match, gravity),
        "coverage_by_fuel_class": by_class,
        "o2_only": o2_only_strip(data, oxygen) if oxygen else [],
        "per_investigation": per,
        "gaps": gaps,
        "bracketing_runs": nearest[:10],
        "gravity_note": None if gravity_match else GRAVITY_NOTE,
        "chart": chart,
    }


FUEL_CLASS_NAMES = {
    "liquid_droplet": "Liquid droplets",
    "solid_thin": "Thin solid materials",
    "solid_fabric": "Fabrics",
    "solid_thick": "Thick solids",
    "gaseous_spherical_burner": "Gas flames (spherical burner)",
    "gaseous_jet_coflow": "Gas jet flames",
    "gaseous_porous_burner": "Gas flames (porous burner)",
    "aerosol_smoke_source": "Smoke sources",
    "dust": "Dust",
}


def coverage_by_fuel_class(data, constraints, matching) -> list[dict]:
    out = []
    for fuel_class, group in data.groupby("fuel_class"):
        known = np.logical_and.reduce(
            [
                group[f].notna() if f in group else pd.Series(False, index=group.index)
                for f, _, _ in constraints
            ]
        )
        inside = group.run_uid.isin(matching)
        out.append(
            {
                "fuel_class": fuel_class,
                "label": FUEL_CLASS_NAMES.get(fuel_class, fuel_class),
                "n_runs": int(len(group)),
                "n_runs_with_known_conditions": int(known.sum()),
                "n_runs_in_range": int(inside.sum()),
                "investigations_in_range": sorted(group.loc[inside, "investigation_id"].unique()),
                "investigations": sorted(group.investigation_id.unique()),
            }
        )
    return sorted(out, key=lambda c: (-c["n_runs_in_range"], c["label"]))


def envelope_headline(by_class, gravity_match, gravity) -> str:
    parts = []
    for c in by_class:
        if c["n_runs_in_range"]:
            parts.append(f"{c['label']}: {c['n_runs_in_range']} measured tests in range")
        elif c["n_runs_with_known_conditions"]:
            parts.append(
                f"{c['label']}: none of {c['n_runs_with_known_conditions']} tests with known conditions in range"
            )
        else:
            parts.append(f"{c['label']}: conditions not recorded per test")
    text = ". ".join(parts) + "."
    if not gravity_match:
        text += f" No NASA test in this snapshot was run at {gravity or 'the requested'} gravity."
    return text


def o2_only_strip(data, oxygen) -> list[dict]:
    """Investigations that report oxygen but not pressure: visible, never placed on the
    joint oxygen-pressure chart and never counted as joint coverage."""
    rows = data[data.o2_mole_fraction.notna() & data.total_pressure.isna()]
    out = []
    for iid, group in rows.groupby("investigation_id"):
        o2 = group.o2_mole_fraction
        out.append(
            {
                "investigation_id": iid,
                "fuel_class": group.fuel_class.iloc[0],
                "n_runs": int(len(group)),
                "o2_percent_min": round(float(o2.min()) * 100, 2),
                "o2_percent_max": round(float(o2.max()) * 100, 2),
                "n_runs_in_o2_band": int(o2.between(oxygen["min"], oxygen["max"]).sum()),
            }
        )
    return out


PSI_TO_PA = 6894.757293168361
O2_BANDS = [
    (0.0, 0.18, "below 18%"),
    (0.18, 0.22, "18-22% (air-like)"),
    (0.22, 0.30, "22-30%"),
    (0.30, 0.36, "30-36% (lunar habitat reference)"),
    (0.36, 0.50, "36-50%"),
    (0.50, 1.000001, "50-100% (spacesuit reference)"),
]
PRESSURE_BANDS = [
    (0.0, 8.0, "below 8 psi"),
    (8.0, 10.2, "8-10.2 psi (lunar habitat reference)"),
    (10.2, 12.0, "10.2-12 psi"),
    (12.0, 15.5, "12-15.5 psi (Earth-like)"),
    (15.5, 1000.0, "above 15.5 psi"),
]
LUNAR_CELL = ("30-36% (lunar habitat reference)", "8-10.2 psi (lunar habitat reference)")
COVERAGE_NOTE = (
    "Counts are measured tests in this local PSI snapshot, by ambient oxygen mole fraction "
    "and total pressure. An empty cell means no test there, not that the condition is safe or "
    "unsafe. All tests are microgravity (ISS or Cygnus); no lunar or Martian gravity test "
    "exists in PSI. Design matrices are excluded."
)


def band_of(value, bands, scale=1.0):
    if value is None or pd.isna(value):
        return None
    v = value / scale
    for lo, hi, label in bands:
        if lo <= v < hi:
            return label
    return None


def coverage_grid(bundle: Bundle, evidence_ids: list) -> dict:
    """Evidence-gap map: measured NASA tests per fuel class, oxygen band and pressure band."""
    data, _ = bundle.select(list(bundle.runs.table_id.unique()))
    data = data[data.value_kind == "measured"].copy()
    data["o2_band"] = data.o2_mole_fraction.map(lambda v: band_of(v, O2_BANDS))
    data["p_band"] = data.total_pressure.map(lambda v: band_of(v, PRESSURE_BANDS, PSI_TO_PA))
    o2_labels = [b[2] for b in O2_BANDS] + ["oxygen not recorded"]
    p_labels = [b[2] for b in PRESSURE_BANDS] + ["pressure not recorded"]
    classes = []
    for fuel_class, group in data.groupby("fuel_class"):
        cells = []
        for o2_label in o2_labels:
            o2_mask = (
                group.o2_band.isna() if o2_label == o2_labels[-1] else group.o2_band.eq(o2_label)
            )
            for p_label in p_labels:
                p_mask = (
                    group.p_band.isna() if p_label == p_labels[-1] else group.p_band.eq(p_label)
                )
                hit = group[o2_mask & p_mask]
                if len(hit):
                    cells.append(
                        {
                            "o2_band": o2_label,
                            "pressure_band": p_label,
                            "n_runs": int(len(hit)),
                            "investigations": sorted(hit.investigation_id.unique()),
                            "run_uids": sorted(hit.run_uid)[:200],
                        }
                    )
        burner = group["burner_o2_mole_fraction"] if "burner_o2_mole_fraction" in group else None
        classes.append(
            {
                "fuel_class": fuel_class,
                "label": FUEL_CLASS_NAMES.get(fuel_class, fuel_class),
                "n_runs": int(len(group)),
                "investigations": sorted(group.investigation_id.unique()),
                "cells": cells,
                "burner_oxygen": None
                if burner is None or burner.notna().sum() == 0
                else {
                    "n_runs": int(burner.notna().sum()),
                    "max_percent": round(float(burner.max()) * 100, 1),
                    "note": "Inverse flames: oxygen flows from the burner into a fuel-filled "
                    "chamber. Burner-stream oxygen is not an ambient atmosphere and is not "
                    "placed in the ambient oxygen bands.",
                },
            }
        )
    findings = [
        "Lunar habitat reference cell (30-36% O2, 8-10.2 psi): "
        + str(
            sum(
                c["n_runs"]
                for fc in classes
                for c in fc["cells"]
                if (c["o2_band"], c["pressure_band"]) == LUNAR_CELL
            )
        )
        + " measured tests in this snapshot."
    ]
    for fc in classes:
        near = sum(
            c["n_runs"]
            for c in fc["cells"]
            if c["o2_band"] == LUNAR_CELL[0] and c["pressure_band"] == "10.2-12 psi"
        )
        if near:
            findings.append(
                f"{fc['label']}: {near} tests at 30-36% O2 just above the 10.2 psi reference (10.2-12 psi)."
            )
    solid = data[data.fuel_class.str.startswith("solid")]
    solid_joint = int((solid.o2_mole_fraction.notna() & solid.total_pressure.notna()).sum())
    top = solid.o2_mole_fraction.max()
    findings.append(
        f"Solid materials and fabrics: {len(solid)} tests, {solid_joint} with both oxygen and "
        "pressure recorded per test; highest recorded solid-material oxygen: "
        + (f"{round(float(top) * 100, 1)}%." if pd.notna(top) else "not recorded.")
    )
    return {
        "kind": "coverage_grid",
        "o2_bands": o2_labels,
        "pressure_bands": p_labels,
        "fuel_classes": classes,
        "findings": findings,
        "note": COVERAGE_NOTE,
        "evidence_ids": evidence_ids,
        "provenance": {
            "bundle_version": bundle.manifest["bundle_version"],
            "bundle_sha256": bundle.manifest["bundle_sha256"],
            "transform_steps": [
                "Exclude invalid and duplicate rows",
                "Exclude design matrices",
                "Band ambient O2 mole fraction and total pressure (1 psi = 6894.757 Pa)",
                "Count measured tests per fuel class and band",
            ],
        },
    }


SUPPRESSION_NOTE = (
    "FLEX diluted the chamber atmosphere with CO2 or He. Oxygen fraction, pressure and droplet "
    "size also vary between these tests, so differences are associations, not the isolated "
    "effect of the diluent. Extinction diameters are plotted only for tests whose recorded "
    "outcome is Extinction. Visible-flame extinction may be followed by cool-flame burning."
)


def suppression_view(bundle: Bundle, evidence_ids: list) -> dict:
    data, excluded = bundle.select(["PSI-69:flex_experimental"])
    data = data.copy()
    data["outcome"] = data.outcome_raw.fillna("unknown").str.strip()
    levels, series = [], []
    for diluent, field, other in [
        ("CO2", "co2_mole_fraction", "he_mole_fraction"),
        ("He", "he_mole_fraction", "co2_mole_fraction"),
    ]:
        subset = data[data[field].fillna(0).gt(0) & data[other].fillna(0).eq(0)]
        for fuel, group in subset.groupby("fuel_canonical"):
            for level, at_level in group.groupby(group[field].round(3)):
                counts = at_level.outcome.value_counts()
                levels.append(
                    {
                        "fuel": fuel,
                        "diluent": diluent,
                        "diluent_percent": round(float(level) * 100, 1),
                        "n_tests": int(len(at_level)),
                        "extinction": int(counts.get("Extinction", 0)),
                        "disruption": int(counts.get("Disruption", 0)),
                        "completion": int(counts.get("Completion", 0)),
                        "o2_percent_median": round(
                            float(at_level.o2_mole_fraction.median()) * 100, 1
                        ),
                        "pressure_atm_median": round(
                            convert(float(at_level.total_pressure.median()), "pascal", "atm"), 3
                        ),
                        "run_uids": sorted(at_level.run_uid),
                    }
                )
            ext = group[(group.outcome == "Extinction") & group.extinction_diameter.gt(0)]
            if len(ext):
                series.append(
                    {
                        "name": f"{fuel} · {diluent}",
                        "style": {
                            "color_token": f"series-{len(series) + 1}",
                            "symbol": "circle" if diluent == "CO2" else "diamond",
                            "hollow": diluent == "He",
                        },
                        "points": {
                            "x": [round(float(v) * 100, 3) for v in ext[field]],
                            "y": [round(float(v) * 1000, 4) for v in ext.extinction_diameter],
                            "run_uid": list(ext.run_uid),
                        },
                    }
                )
    n_co2 = int(data.co2_mole_fraction.fillna(0).gt(0).sum())
    n_he = int(data.he_mole_fraction.fillna(0).gt(0).sum())
    chart = {
        "spec_version": "1",
        "chart_type": "scatter",
        "title": "FLEX: visible-flame extinction diameter vs diluent fraction",
        "subtitle": f"{sum(len(s['points']['x']) for s in series)} extinction tests · NASA measured values",
        "x": {
            "field": "diluent_mole_fraction",
            "label": "Diluent mole fraction (CO2 or He)",
            "unit": "percent",
            "display_unit": "percent",
            "scale": "linear",
        },
        "y": {
            "field": "extinction_diameter",
            "label": "Visible-flame extinction diameter",
            "unit": "mm",
            "display_unit": "mm",
            "scale": "linear",
        },
        "series": series,
        "annotations": [],
        "notes": [
            SUPPRESSION_NOTE,
            f"Valid diluted tests: CO2 {n_co2}, He {n_he}; none use both. "
            f"Rows excluded as implausible or duplicate: {excluded['n']}.",
        ],
        "provenance": {
            "bundle_version": bundle.manifest["bundle_version"],
            "query_hash": bundle.manifest["bundle_sha256"],
            "table_ids": ["PSI-69:flex_experimental"],
            "evidence_ids": evidence_ids,
            "transform_steps": [
                "Exclude invalid and duplicate rows",
                "Select tests with exactly one diluent (CO2 or He) above zero",
                "Group by fuel, diluent and reported diluent fraction; count recorded outcomes",
                "Plot extinction diameter only for outcome Extinction",
            ],
        },
    }
    return {
        "kind": "chart",
        "chart": chart,
        "levels": levels,
        "stats": {"n_co2_tests": n_co2, "n_he_tests": n_he},
        "note": SUPPRESSION_NOTE,
    }


def d2law(bundle: Bundle, table_id: str, filters, evidence_ids, title=None) -> dict:
    data, excluded = bundle.select([table_id], filters)
    needed = [
        "droplet_initial_diameter",
        "extinction_diameter",
        "burning_rate_constant",
        "burn_time",
    ]
    if not set(needed) <= set(data):
        raise ValueError("Dataset lacks the required d²-law quantities")
    data = data.dropna(subset=needed)
    data = data[(data.burning_rate_constant > 0) & (data.burn_time > 0)]
    if data.empty:
        raise ValueError(
            "This dataset has no complete droplet diameter, burning-rate and burn-time rows"
        )
    predicted = (
        data.droplet_initial_diameter**2 - data.extinction_diameter**2
    ) / data.burning_rate_constant
    ratio = predicted / data.burn_time
    note = "Values near 1 indicate internal consistency under the quasi-steady d²-law. Deviations can arise from ignition transients, disruption, drift or extrapolated diameters; they do not by themselves indicate data errors."
    chart = {
        "spec_version": "1",
        "chart_type": "scatter",
        "title": f"{title or table_id}: d²-law consistency",
        "x": {
            "field": "burn_time",
            "label": "Reported burn time",
            "unit": "s",
            "display_unit": "s",
            "scale": "linear",
        },
        "y": {
            "field": "d2_time",
            "label": "(D₀² − Dext²) / K",
            "unit": "s",
            "display_unit": "s",
            "scale": "linear",
        },
        "series": [
            {
                "name": "NASA measurements",
                "style": {"color_token": "series-1", "symbol": "circle", "hollow": False},
                "points": {
                    "x": list(data.burn_time),
                    "y": list(predicted),
                    "run_uid": list(data.run_uid),
                },
            }
        ],
        "annotations": [
            {"kind": "isoline", "label": "1:1 consistency", "slope": 1, "intercept": 0}
        ],
        "notes": [note],
        "provenance": {
            "bundle_version": bundle.manifest["bundle_version"],
            "query_hash": bundle.manifest["bundle_sha256"],
            "table_ids": [table_id],
            "evidence_ids": evidence_ids,
            "transform_steps": ["SI units", "(D0²-Dext²)/(K*t_b)"],
        },
    }
    flagged = data.loc[(ratio < 0.6) | (ratio > 1.4), ["run_uid"]].copy()
    stats = {
        **statistics(ratio),
        "median_ratio": float(ratio.median()) if len(ratio) else None,
        "n_flagged": len(flagged),
        "excluded": excluded,
    }
    return {
        "kind": "chart",
        "chart": chart,
        "stats": stats,
        "flagged_runs": flagged.to_dict("records")[:20],
    }
