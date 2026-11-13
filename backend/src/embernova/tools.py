import pandas as pd

from embernova.evidence import Ledger, source_shape
from embernova.provenance import canonical, digest, new_id, now
from embernova.retrieval import document_page, search_documents, search_investigations
from embernova.science.analyses import (
    compare,
    coverage_grid,
    d2law,
    envelope,
    statistics,
    suppression_view,
)
from embernova.science.bundle import Bundle
from embernova.science.charts import make_spec
from embernova.storage import Store
from embernova.tags import with_tags


class Tools:
    def __init__(self, store: Store, bundle: Bundle, ledger: Ledger | None = None):
        self.store, self.bundle = store, bundle
        self.ledger = ledger or Ledger(store)

    def datasets(self, investigation_ids=None, **_) -> dict:
        items = self.store.records("datasets")
        if investigation_ids:
            items = [d for d in items if d["investigation_id"] in investigation_ids]
        for d in items:
            d["variables"] = [
                {"name": name, **self.bundle.units.get(name, {}), "kind": spec["role"]}
                for _, spec in d["mapping"]["columns"].items()
                if (name := spec.get("variable", spec.get("quantity")))
            ]
            d.pop("mapping", None)
            d["identifier_filter"] = {
                "field": "test_identifier",
                "operators": ["eq", "in"],
                "description": "Exact primary NASA test number or alternate label; duplicate labels return every matching source row.",
            }
        return {"datasets": items}

    def rows_evidence(self, table_id, data, fields, args=None):
        dataset = self.store.records("datasets", "WHERE table_id=?", (table_id,))[0]
        rows = data[data.table_id == table_id]
        vals = self.bundle.values[self.bundle.values.run_uid.isin(rows.run_uid)]
        previews = []
        for uid in list(rows.run_uid)[:20]:
            values = []
            for _, v in vals[vals.run_uid == uid].iterrows():
                if fields and v["name"] not in fields:
                    continue
                values.append(
                    {
                        "name": v["name"],
                        "value_raw": v.value_raw,
                        "unit_raw": v.unit_raw,
                        "display_value": None
                        if pd.isna(v.display_value)
                        else float(v.display_value),
                        "display_unit": v.display_unit,
                        "qualifier": v.qualifier,
                        "quality_flags": list(v.quality_flags),
                    }
                )
            previews.append({"run_uid": uid, "values": values})
        return self.ledger.add(
            "data_rows",
            [dataset["investigation_id"]],
            dataset["title"],
            {
                "type": "rows",
                "table_id": table_id,
                "run_uids": sorted(rows.run_uid),
                "quantities": sorted(fields),
                "source_rows": list(map(int, rows.source_row)),
                "query_hash": digest(args or {}),
            },
            source_shape(dataset["source"]),
            f"{len(rows)} source rows. Raw cells and normalized display values are retained. Design values are not measured outcomes.",
            "design" if dataset["kind"] == "conditions_design" else "measured",
            ["Curated source columns", "pint unit normalization"],
            previews,
        )

    def artifact(self, payload, title, args, tool, table_ids=None):
        aid = new_id("art_")
        datasets = self.store.records("datasets")
        sources = [d["source"] for d in datasets if d["table_id"] in (table_ids or [])]
        src = (
            source_shape(sources[0])
            if len(sources) == 1
            else {
                "file_id": None,
                "sha256": self.bundle.manifest["bundle_sha256"],
                "doi": None,
                "ntrs_id": None,
                "source_url": None,
                "local_url": f"/api/artifacts/{aid}/data",
            }
        )
        ev = self.ledger.add(
            "derived_artifact",
            sorted(
                set(d["investigation_id"] for d in datasets if d["table_id"] in (table_ids or []))
            ),
            title,
            {"type": "artifact", "artifact_id": aid},
            src,
            "Derived analysis. Inspect input source rows, all source hashes, and the transformation record. SI-generated code analyses require scientific review.",
            "derived",
            [canonical({"tool": tool, "args": args})],
        )
        created = now()
        art = {
            "artifact_id": aid,
            "type": payload["kind"],
            "title": title,
            "status": "ok",
            "created_at": created,
            "session_id": None,
            "payload": payload,
            "labels": {
                "si_generated": False,
                "selected_by_si": False,
                "data_origin": "NASA source data; deterministic computation",
            },
            "evidence_id": ev["evidence_id"],
            "reproducibility": {
                "created_at": created,
                "build_version": "0.1.0",
                "bundle_version": self.bundle.manifest["bundle_version"],
                "bundle_sha256": self.bundle.manifest["bundle_sha256"],
                "tool": tool,
                "args": args,
                "input_files": [
                    {"file_id": s["file_id"], "sha256": s["sha256"], "source_url": s["source_url"]}
                    for s in sources
                ],
                "environment": {"unit_engine": "pint", "numeric_source": "Parquet Analysis Bundle"},
            },
        }
        self.store.put("artifacts", aid, art)
        self.ledger.artifacts.append(art)
        return art

    def investigation(self, investigation_id, **_):
        rows = self.store.records("investigations", "WHERE investigation_id=?", (investigation_id,))
        if not rows:
            raise KeyError(investigation_id)
        inv = with_tags(rows[0])
        table_ids = list(
            self.bundle.runs[
                self.bundle.runs.investigation_id == investigation_id
            ].table_id.unique()
        )
        data, _ = self.bundle.select(table_ids) if table_ids else (self.bundle.wide.iloc[:0], {})
        variables = []
        for name, units in self.bundle.units.items():
            if name in data and data[name].notna().any():
                contributing = data[data[name].notna()]
                display = self.bundle.display(contributing, [name])
                evidence_ids = [
                    self.rows_evidence(table, contributing, [name])["evidence_id"]
                    for table in contributing.table_id.unique()
                ]
                variables.append(
                    {
                        "name": name,
                        **units,
                        **statistics([r[name] for r in display]),
                        "evidence_ids": evidence_ids,
                        "transform_steps": [
                            "Exclude invalid and duplicate rows",
                            "Exclude missing scalar values",
                            "pint display-unit conversion",
                            "Descriptive count, min, max, median and quartiles across source records",
                        ],
                    }
                )
        return {
            **inv,
            "datasets": self.datasets([investigation_id])["datasets"],
            "variables": variables,
            "documents": self.store.records(
                "documents", "WHERE investigation_id=?", (investigation_id,)
            ),
            "publications": self.store.records(
                "publications", "WHERE investigation_id=?", (investigation_id,)
            ),
            "media": self.store.records("media", "WHERE investigation_id=?", (investigation_id,)),
            "limitations": [
                "Only locally downloaded evidence is indexed. Metadata is NASA source text; it is not a reviewed synthesized profile."
            ],
        }

    def query(
        self,
        table_ids,
        quantities=None,
        variables=None,
        filters=None,
        group_by=None,
        aggregate=None,
        limit=500,
        **_,
    ):
        data, excluded = self.bundle.select(table_ids, filters)
        fields = list(
            dict.fromkeys(
                [
                    "run_uid",
                    "source_run_label",
                    "alt_labels",
                    "source_row",
                    "quality_flags",
                    "fuel_canonical",
                    "outcome_raw",
                ]
                + (variables or [])
                + (quantities or [])
            )
        )
        fields = [f for f in fields if f in data or f in (quantities or []) + (variables or [])]
        evidence = [self.rows_evidence(t, data, fields, {"filters": filters}) for t in table_ids]
        if aggregate == "summary":
            keys = list(dict.fromkeys((group_by or []) + ["value_kind"]))
            if not set(keys) <= set(data):
                raise ValueError("Invalid grouping fields")
            out = []
            for key, group in data.groupby(keys, dropna=False):
                key = key if isinstance(key, tuple) else (key,)
                displays = self.bundle.display(group, quantities or [])
                out.append(
                    {
                        **dict(zip(keys, map(str, key), strict=True)),
                        "n_runs": len(group),
                        "summary": {
                            q: {
                                **statistics([r[q] for r in displays]),
                                "unit": self.bundle.units[q]["display_unit"],
                            }
                            for q in quantities or []
                        },
                    }
                )
        else:
            out = self.bundle.display(data, fields)
        columns = [
            {
                "name": f,
                "display_unit": self.bundle.units.get(f, {}).get("display_unit"),
                "kind": "quantity" if f in (quantities or []) else "variable",
            }
            for f in fields
        ]
        artifact = None
        if len(out) > 50:
            artifact = self.artifact(
                {
                    "kind": "table",
                    "columns": columns,
                    "rows": out[:10000],
                    "row_count": len(out),
                    "excluded": excluded,
                },
                "NASA measurement query",
                {"table_ids": table_ids, "filters": filters},
                "query_measurements",
                table_ids,
            )
        return {
            "columns": columns,
            "rows": out[: min(limit or 500, 500)],
            "total": len(out),
            "excluded": excluded,
            "evidence_ids": [e["evidence_id"] for e in evidence],
            "artifact": artifact,
        }

    def chart(self, args):
        data, excluded = self.bundle.select(args["table_ids"], args.get("filters"))
        if args.get("color_by") == "investigation_id":
            names = self.acronyms()
            data = data.assign(
                investigation_id=data.investigation_id.map(lambda i: names.get(i, i))
            )
        fields = [args["x"], args["y"]]
        evs = [self.rows_evidence(t, data, fields, args)["evidence_id"] for t in args["table_ids"]]
        spec = make_spec(
            self.bundle,
            data,
            args["x"],
            args["y"],
            args.get("title", "NASA measurements"),
            args["table_ids"],
            evs,
            args.get("color_by"),
            args.get("chart_type", "scatter"),
            [f"Excluded invalid rows: {excluded['n']}"],
            args.get("x_scale"),
            args.get("y_scale"),
        )
        return {
            "artifact": self.artifact(
                {"kind": "chart", "chart": spec},
                args.get("title", "NASA measurements"),
                args,
                "make_chart",
                args["table_ids"],
            )
        }

    def acronyms(self) -> dict:
        return {
            r["investigation_id"]: r.get("acronym") or r["investigation_id"]
            for r in self.store.records("investigations")
        }

    def label_series(self, chart: dict | None):
        """Show investigation names (FLEX, CFI) instead of internal IDs in chart legends."""
        if chart:
            names = self.acronyms()
            for series in chart["series"]:
                series["name"] = names.get(series["name"], series["name"])
        return chart

    def table_evidence(self, tables, args):
        evs = []
        for table in dict.fromkeys(tables):
            data, _ = self.bundle.select([table])
            evs.append(
                self.rows_evidence(table, data, list(self.bundle.units), args)["evidence_id"]
            )
        return evs

    def analyze(self, name, args):
        tables = (
            [g["table_id"] for g in args["groups"]]
            if name == "compare_runs"
            else [args["table_id"]]
            if name == "check_d2_law"
            else ["PSI-69:flex_experimental"]
            if name == "suppression_overview"
            else list(self.bundle.runs.table_id.unique())
        )
        evs = self.table_evidence(tables, args)
        if name == "compare_runs":
            payload = compare(self.bundle, args["groups"], args["quantities"], evs)
        elif name == "check_d2_law":
            title = next(
                (
                    d["title"]
                    for d in self.store.records("datasets")
                    if d["table_id"] == args["table_id"]
                ),
                args["table_id"],
            )
            payload = d2law(self.bundle, args["table_id"], args.get("filters"), evs, title)
        elif name == "suppression_overview":
            payload = suppression_view(self.bundle, evs)
        else:
            names = self.acronyms()
            payload = envelope(self.bundle, args, evs, names)
            for row in (
                payload["per_investigation"] + payload["bracketing_runs"] + payload["o2_only"]
            ):
                row["investigation"] = names.get(row["investigation_id"], row["investigation_id"])
            for row in payload["coverage_by_fuel_class"]:
                row["investigations_in_range"] = [
                    names.get(i, i) for i in row["investigations_in_range"]
                ]
                row["investigations"] = [names.get(i, i) for i in row["investigations"]]
        self.label_series(payload.get("chart"))
        return {
            "artifact": self.artifact(
                payload, payload.get("chart", {}).get("title", name), args, name, tables
            ),
            **{
                k: v
                for k, v in payload.items()
                if k
                in {
                    "coverage",
                    "headline",
                    "coverage_by_fuel_class",
                    "gaps",
                    "stats",
                    "flagged_runs",
                    "bracketing_runs",
                    "gravity_note",
                    "levels",
                    "note",
                }
            },
        }

    def coverage(self, **_):
        evs = self.table_evidence(list(self.bundle.runs.table_id.unique()), {"tool": "coverage"})
        grid = coverage_grid(self.bundle, evs)
        names = self.acronyms()
        for fc in grid["fuel_classes"]:
            fc["investigations"] = [names.get(i, i) for i in fc["investigations"]]
            for cell in fc["cells"]:
                cell["investigations"] = [names.get(i, i) for i in cell["investigations"]]
        grid["partial_gravity_sources"] = [
            {"investigation_id": r["investigation_id"], "title": r["title"], "is_psi": r["is_psi"]}
            for r in self.store.records("investigations")
            if r["investigation_id"] in {"LUCI", "FM2", "KC135-PARTIAL-G", "GRC-PARTIAL-G"}
        ]
        return grid

    def media(self, investigation_ids=None, run_labels=None, media_types=None, limit=12, **_):
        items = self.store.records("media")
        items = [
            m
            for m in items
            if (not investigation_ids or m["investigation_id"] in investigation_ids)
            and (not media_types or m["media_type"] in media_types)
            and (not run_labels or (m["association"] != "none" and m["run_label"] in run_labels))
        ][: limit or 12]
        for item in items:
            ev = self.ledger.add(
                "media",
                [item["investigation_id"]],
                item["filename"],
                {"type": "media", "media_id": item["media_id"]},
                source_shape(item, item["stream_url"]),
                item.get("caption") or "Original NASA media; no source caption supplied.",
                "media",
            )
            item["evidence_id"] = ev["evidence_id"]
        return {"media": items}

    def call(self, name: str, args: dict) -> dict:
        if name == "search_investigations":
            return search_investigations(self.store, self.ledger, **args)
        if name == "search_documents":
            return search_documents(self.store, self.ledger, **args)
        if name == "get_document_page":
            return document_page(self.store, self.ledger, **args)
        if name == "get_investigation":
            return self.investigation(**args)
        if name == "list_datasets":
            return self.datasets(**args)
        if name == "query_measurements":
            return self.query(**args)
        if name == "make_chart":
            return self.chart(args)
        if name in {
            "compare_runs",
            "check_applicability_envelope",
            "check_d2_law",
            "suppression_overview",
        }:
            return self.analyze(name, args)
        if name == "map_evidence_coverage":
            grid = self.coverage()
            return {
                "findings": grid["findings"],
                "note": grid["note"],
                "fuel_classes": [
                    {
                        "label": fc["label"],
                        "n_runs": fc["n_runs"],
                        "investigations": fc["investigations"],
                        "cells": [
                            {
                                k: c[k]
                                for k in ("o2_band", "pressure_band", "n_runs", "investigations")
                            }
                            for c in fc["cells"]
                        ],
                        "burner_oxygen": fc["burner_oxygen"],
                    }
                    for fc in grid["fuel_classes"]
                ],
                "evidence_ids": grid["evidence_ids"],
            }
        if name == "find_media":
            return self.media(**args)
        raise ValueError("Unknown tool")
