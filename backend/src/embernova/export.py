"""Model-ready export: one tidy row per valid measured test, SI units, provenance, data card."""

import io
import zipfile

import pandas as pd

from embernova.ingest.tables import CHECK_MESSAGES
from embernova.provenance import canonical, now
from embernova.science.units import UREG, convert

RUN_FIELDS = [
    "investigation",
    "investigation_id",
    "table_id",
    "source_run_label",
    "fuel_class",
    "fuel_canonical",
    "sample_material",
    "gravity_regime",
    "platform",
    "hardware",
    "outcome_raw",
    "ignition_outcome_canonical",
    "flow_direction",
]


def si_column(name: str, unit_si: str) -> tuple[str, str]:
    """Readable SI column name. Pressure is reported in pascal rather than kg/(m s^2)."""
    unit = UREG.Unit(unit_si)
    if unit.dimensionality == UREG.pascal.dimensionality:
        return f"{name}_Pa", "pascal"
    if unit.dimensionless:
        return f"{name}_fraction" if "fraction" in name or name.endswith("ratio") else name, unit_si
    label = f"{unit:~C}".replace("**", "").replace("/", "_per_").replace("*", "_")
    return f"{name}_{label}", unit_si


def model_ready_frame(tools, fuel_class: str | None = None) -> tuple[pd.DataFrame, dict]:
    bundle = tools.bundle
    data, excluded = bundle.select(list(bundle.runs.table_id.unique()))
    data = data[data.value_kind == "measured"]
    if fuel_class:
        if fuel_class not in set(data.fuel_class):
            raise ValueError(f"Unknown fuel_class; available: {sorted(set(data.fuel_class))}")
        data = data[data.fuel_class == fuel_class]
    names = tools.acronyms()
    sources = {d["table_id"]: d["source"] for d in tools.store.records("datasets")}
    out = pd.DataFrame(
        {
            field: (
                data.investigation_id.map(lambda i: names.get(i, i))
                if field == "investigation"
                else data[field]
                if field in data
                else None
            )
            for field in RUN_FIELDS
        }
    )
    columns = {}
    for name, units in bundle.units.items():
        if name not in data or data[name].notna().sum() == 0:
            continue
        column, target = si_column(name, units["unit_si"])
        out[column] = data[name].map(
            lambda v, u=units["unit_si"], t=target: None if pd.isna(v) else convert(v, u, t)
        )
        columns[column] = {"variable": name, "unit": target}
    out["quality_flags"] = data.quality_flags.map(lambda f: ";".join(f))
    out["source_sha256"] = data.table_id.map(lambda t: sources[t]["sha256"])
    out["source_file_id"] = data.table_id.map(lambda t: sources[t]["file_id"])
    out["source_row"] = data.source_row
    out["run_uid"] = data.run_uid
    out = out.dropna(axis=1, how="all")
    return out.reset_index(drop=True), {"columns": columns, "excluded": excluded}


def data_card(tools, frame: pd.DataFrame, info: dict, fuel_class: str | None) -> str:
    datasets = {d["table_id"]: d for d in tools.store.records("datasets")}
    investigations = {r["investigation_id"]: r for r in tools.store.records("investigations")}
    lines = [
        "# EmberNova model-ready NASA PSI combustion data",
        "",
        f"Generated {now()} from Analysis Bundle {tools.bundle.manifest['bundle_sha256'][:16]}. "
        f"Scope: {fuel_class or 'all measured tests'}. Rows: {len(frame)}.",
        "",
        "## What a row is",
        "One measured test from a NASA PSI experiment table, after excluding rows flagged as "
        "implausible, encoding artifacts or exact duplicates "
        f"({info['excluded']['n']} excluded across the bundle). Design matrices are excluded. "
        "Values are converted to SI units; empty cells are unknown, never zero-filled.",
        "",
        "## Columns",
        "| Column | Variable | Unit |",
        "| --- | --- | --- |",
    ]
    lines += [
        f"| {column} | {meta['variable']} | {meta['unit']} |"
        for column, meta in info["columns"].items()
        if column in frame
    ]
    lines += [
        "",
        "Identifier columns: investigation, table_id, source_run_label (the NASA test label), "
        "run_uid, source_file_id, source_sha256 and source_row (physical CSV/worksheet row, "
        "header = row 1). Use them to trace any value back to the original NASA file.",
        "",
        "## Source tables and interpretation notes",
    ]
    for table_id in sorted(set(frame.table_id)):
        d = datasets[table_id]
        evidence = d["mapping"].get("evidence", {})
        note = evidence.get("note") if isinstance(evidence, dict) else None
        inv = investigations.get(d["investigation_id"], {})
        lines.append(
            f"- **{table_id}** — {d['title']} ({int((frame.table_id == table_id).sum())} rows). "
            f"DOI {inv.get('doi') or 'n/a'}. {note or ''}"
        )
    flags = sorted(
        {f for cell in frame.get("quality_flags", []) for f in str(cell).split(";") if f}
    )
    if flags:
        lines += ["", "## Quality flags kept on rows (values are never altered)"]
        lines += [f"- `{f}`: {CHECK_MESSAGES.get(f, f.replace('_', ' '))}" for f in flags]
    lines += [
        "",
        "## Limits",
        "- All tests are microgravity (ISS or Cygnus). No lunar or Martian gravity test exists in PSI.",
        "- Fuel classes are not interchangeable: droplets, gas flames, solids and smoke sources answer different questions.",
        "- Conditions vary together across tests; fitted relationships are associations within the tested ranges, not fire-safety predictions.",
        "- Burner-stream oxygen (CFI-G inverse flames) is not an ambient atmosphere.",
        "",
        "## Licence and attribution",
        "NASA PSI investigation data are CC0-1.0. Cite the investigation DOIs above. "
        "This export and its code were produced with SI assistance (EmberNova); the numbers are "
        "NASA's, converted deterministically with pint.",
    ]
    return "\n".join(lines) + "\n"


def model_ready_zip(tools, fuel_class: str | None = None) -> bytes:
    frame, info = model_ready_frame(tools, fuel_class)
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("runs.csv", frame.to_csv(index=False, float_format="%.10g"))
        archive.writestr("DATA_CARD.md", data_card(tools, frame, info, fuel_class))
        archive.writestr(
            "manifest.json",
            canonical(
                {
                    "bundle_sha256": tools.bundle.manifest["bundle_sha256"],
                    "fuel_class": fuel_class,
                    "rows": len(frame),
                    "columns": info["columns"],
                    "si_assisted_export": True,
                }
            ),
        )
    return output.getvalue()
