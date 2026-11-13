from embernova.provenance import digest
from embernova.science.bundle import Bundle


def make_spec(
    bundle: Bundle,
    data,
    x: str,
    y: str,
    title: str,
    table_ids: list,
    evidence_ids: list,
    color_by: str | None = None,
    chart_type="scatter",
    notes=None,
    x_scale="linear",
    y_scale="linear",
    allow_empty=False,
) -> dict:
    for field in [x, y]:
        if field not in bundle.units:
            raise ValueError(f"Cannot chart an unmapped or unitless quantity: {field}")
    if color_by and color_by not in data.columns:
        raise ValueError("Unknown series field")
    good = data.dropna(subset=[x, y])
    if x_scale == "log":
        good = good[good[x] > 0]
    if y_scale == "log":
        good = good[good[y] > 0]
    if good.empty and not allow_empty:
        raise ValueError(
            "No complete scalar values for these axes and filters; inspect raw/design cells or choose different variables"
        )
    missing_count = len(data) - len(good)
    origin = (
        "NASA measured values"
        if set(good.value_kind) == {"measured"}
        else "NASA source records (inspect measured/design status)"
    )
    stride = max(1, (len(good) + 49999) // 50000)
    good = good.iloc[::stride]
    grouped = (
        list(good.groupby(color_by, dropna=False)) if color_by else [("NASA measurements", good)]
    )
    series = []
    for i, (name, group) in enumerate(grouped):
        rows = bundle.display(group, [x, y, "run_uid"])
        series.append(
            {
                "name": str(name),
                "style": {"color_token": f"series-{i + 1}", "symbol": "circle", "hollow": False},
                "points": {
                    "x": [r[x] for r in rows],
                    "y": [r[y] for r in rows],
                    "run_uid": [r["run_uid"] for r in rows],
                },
            }
        )

    def axis(field, scale):
        return {
            "field": field,
            "label": field.replace("_", " ").capitalize(),
            "unit": bundle.units[field]["unit_si"],
            "display_unit": bundle.units[field]["display_unit"],
            "scale": scale or "linear",
        }

    args = {
        "x": x,
        "y": y,
        "table_ids": table_ids,
        "run_uids": sorted(good.run_uid),
        "color_by": color_by,
    }
    return {
        "spec_version": "1",
        "chart_type": chart_type,
        "title": title,
        "subtitle": f"{len(good)} points · {origin}",
        "x": axis(x, x_scale),
        "y": axis(y, y_scale),
        "series": series,
        "annotations": [],
        "notes": list(notes or []) + [f"Missing/nonpositive axis values excluded: {missing_count}"],
        "provenance": {
            "bundle_version": bundle.manifest["bundle_version"],
            "query_hash": digest(args),
            "table_ids": table_ids,
            "evidence_ids": evidence_ids,
            "transform_steps": [
                "Filter invalid rows",
                "Read normalized SI bundle",
                "pint conversion to axis display units",
            ],
            "downsampling": f"stride={stride}" if stride > 1 else None,
        },
    }
