import json

import duckdb
import pandas as pd

from embernova.config import Settings
from embernova.provenance import safe_path, sha256
from embernova.science.units import convert

DISPLAY_UNITS = {
    "o2_mole_fraction": "percent",
    "burner_o2_mole_fraction": "percent",
    "co2_mole_fraction": "percent",
    "total_pressure": "atm",
    "flow_velocity": "cm/s",
}


class Bundle:
    def __init__(self, cfg: Settings):
        self.root = cfg.build_dir / "bundle"
        self.manifest = json.loads((self.root / "bundle_manifest.json").read_text())
        for file in self.manifest["files"]:
            if sha256(safe_path(self.root, file["name"])) != file["sha256"]:
                raise ValueError(
                    "Analysis Bundle integrity check failed; rebuild before displaying numbers"
                )
        # All SQL is static and all identifiers come from the closed schema.
        with duckdb.connect() as db:
            self.runs = db.execute(
                "SELECT * FROM read_parquet(?)", [str(self.root / "runs.parquet")]
            ).df()
            frames = [
                db.execute("SELECT * FROM read_parquet(?)", [str(self.root / "conditions.parquet")])
                .df()
                .rename(columns={"variable": "name"}),
                db.execute(
                    "SELECT * FROM read_parquet(?)", [str(self.root / "measurements.parquet")]
                )
                .df()
                .rename(columns={"quantity": "name"}),
            ]
            self.values = pd.DataFrame.from_records(
                [record for frame in frames for record in frame.to_dict("records")]
            )
        self.units = {}
        for name, part in self.values.groupby("name"):
            known = part.dropna(subset=["unit_si"])
            if not known.empty:
                row = known.iloc[0]
                self.units[name] = {
                    "unit_si": row.unit_si,
                    # One display unit per variable, independent of which table loads first.
                    "display_unit": DISPLAY_UNITS.get(name, row.display_unit),
                }
        # Pivot from the single long-format bundle; nulls stay null, never zero-filled.
        scalar = self.values.pivot(index="run_uid", columns="name", values="value_si")
        self.wide = self.runs.merge(scalar, left_on="run_uid", right_index=True, how="left")

    def select(
        self, table_ids: list[str], filters=None, include_invalid=False
    ) -> tuple[pd.DataFrame, dict]:
        available = set(self.runs.table_id)
        if not table_ids or not set(table_ids) <= available:
            raise ValueError(f"Unknown table; available: {sorted(available)}")
        data = self.wide[self.wide.table_id.isin(table_ids)].copy()
        for f in filters or []:
            field, op, values = f["field"], f["op"], f["values"]
            if field == "test_identifier":
                if op not in {"eq", "in"} or not values or (op == "eq" and len(values) != 1):
                    raise ValueError("test_identifier accepts eq or in with exact NASA labels")
                labels = {str(v) for v in values}
                data = data[
                    data.apply(
                        lambda row, labels=labels: (
                            str(row.source_run_label) in labels
                            or any(str(label) in labels for label in row.alt_labels)
                        ),
                        axis=1,
                    )
                ]
                continue
            if field not in data.columns or not values:
                raise ValueError(f"Unknown or empty filter: {field}")
            if field in self.units:
                if not f.get("unit"):
                    raise ValueError(f"Numeric filter requires unit: {field}")
                values = [
                    convert(float(v), f["unit"], self.units[field]["unit_si"]) for v in values
                ]
            col = data[field]
            if op == "between":
                if len(values) != 2 or values[0] > values[1]:
                    raise ValueError("between needs ordered min and max")
                mask = col.between(*values)
            elif op == "in":
                mask = col.isin(values)
            elif op in {"eq", "ne", "lt", "lte", "gt", "gte"} and len(values) == 1:
                mask = {
                    "eq": col.eq,
                    "ne": col.ne,
                    "lt": col.lt,
                    "lte": col.le,
                    "gt": col.gt,
                    "gte": col.ge,
                }[op](values[0])
            else:
                raise ValueError("Invalid filter operator or cardinality")
            data = data[mask.fillna(False)]
        # Exclusions describe this selection, not unrelated rows in the full table.
        reasons = ["implausible_value", "encoding_artifact", "duplicate_row"]
        invalid = data.quality_flags.map(lambda flags: any(f in flags for f in reasons))
        excluded = {"n": int(invalid.sum()) if not include_invalid else 0, "reasons": reasons}
        if not include_invalid:
            data = data.loc[~invalid.astype(bool)]
        return data, excluded

    def display(self, data: pd.DataFrame, fields: list[str]) -> list[dict]:
        if not set(fields) <= set(data.columns):
            raise ValueError(f"Unknown fields; available: {list(data.columns)}")
        out = data[fields].copy()
        for name in fields:
            if name in self.units:
                units = self.units[name]
                out[name] = out[name].map(
                    lambda v, u=units: (
                        None if pd.isna(v) else convert(v, u["unit_si"], u["display_unit"])
                    )
                )
        return json.loads(out.to_json(orient="records"))
