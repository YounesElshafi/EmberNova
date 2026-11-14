from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Filter(Input):
    field: str
    op: Literal["eq", "ne", "lt", "lte", "gt", "gte", "between", "in"]
    values: list[str | float] = Field(min_length=1)
    unit: str | None = None


class Search(Input):
    query: str = Field(min_length=1, max_length=4000)
    objectives: list[Literal["prevention", "detection", "suppression", "fundamental"]] | None = None
    limit: int | None = Field(8, ge=1, le=15)


class Documents(Input):
    query: str = Field(min_length=1, max_length=4000)
    investigation_ids: list[str] | None = None
    limit: int | None = Field(8, ge=1, le=20)


class Investigation(Input):
    investigation_id: str


class Page(Input):
    document_id: str
    page: int = Field(ge=1)
    offset: int = Field(0, ge=0)
    max_chars: int = Field(6000, ge=500, le=12000)


class Datasets(Input):
    investigation_ids: list[str] | None = None


class Query(Input):
    table_ids: list[str] = Field(min_length=1, max_length=5)
    quantities: list[str] = []
    variables: list[str] = []
    filters: list[Filter] | None = None
    group_by: list[str] | None = None
    aggregate: Literal["none", "summary"] | None = None
    limit: int | None = Field(50, ge=1, le=500)


class Chart(Input):
    title: str = Field(default="NASA measurements", max_length=200)
    chart_type: Literal["scatter", "line", "box", "bar", "histogram"] = "scatter"
    table_ids: list[str] = Field(min_length=1, max_length=5)
    x: str
    y: str
    color_by: str | None = None
    filters: list[Filter] | None = None
    x_scale: Literal["linear", "log"] | None = "linear"
    y_scale: Literal["linear", "log"] | None = "linear"


class Group(Input):
    label: str
    table_id: str
    filters: list[Filter] | None = None
    run_uids: list[str] | None = None


class Compare(Input):
    groups: list[Group] = Field(min_length=2, max_length=4)
    quantities: list[str] = Field(min_length=1)


class Range(Input):
    min: float
    max: float


class UnitRange(Range):
    unit: str


class Envelope(Input):
    scenario_label: str = "Atmosphere scenario"
    o2_mole_fraction: Range | None = None
    total_pressure: UnitRange | None = None
    flow_velocity: UnitRange | None = None
    gravity: Literal["microgravity", "lunar", "martian", "earth"] | None = None
    fuel_classes: list[str] | None = None
    investigation_ids: list[str] | None = None


PHENOMENA = Literal[
    "flame_spread",
    "fire_growth",
    "ignition",
    "extinction",
    "flammability_limit",
    "suppression",
    "soot",
    "smoke_aerosol",
    "detection",
    "cool_flame",
    "burning_rate",
    "flame_structure",
]


class Assess(Input):
    scenario_label: str = Field("Engineering scenario", max_length=200)
    phenomena: list[PHENOMENA] | None = None
    fuel_class: Literal["solid", "liquid_droplet", "gaseous"] | None = None
    materials: list[Literal["PMMA", "cotton_fiberglass", "Nomex", "silicone", "Ultem"]] | None = (
        None
    )
    gravity: Literal["microgravity", "lunar", "martian", "earth"] | None = None
    o2_mole_fraction: Range | None = None
    total_pressure: UnitRange | None = None
    flow_velocity: UnitRange | None = None
    investigation_ids: list[str] | None = Field(None, max_length=20)


class D2(Input):
    table_id: str = "PSI-69:flex_experimental"
    filters: list[Filter] | None = None


class NoArgs(Input):
    pass


class Media(Input):
    investigation_ids: list[str] | None = None
    run_labels: list[str] | None = None
    media_types: list[Literal["image", "video"]] | None = None
    limit: int | None = Field(8, ge=1, le=20)


REGISTRY = {
    "search_investigations": (
        Search,
        "Discover and rank NASA investigations for a research question; lexical search has an explicit degraded flag.",
    ),
    "search_documents": (
        Documents,
        "Retrieve exact NASA passages with physical page/part and evidence IDs.",
    ),
    "get_investigation": (
        Investigation,
        "Inspect NASA objectives, hardware, variables, source datasets, publications and original media.",
    ),
    "get_document_page": (
        Page,
        "Read a bounded page window. Use offset and max_chars to fetch later text; has_more and text_total_chars show whether more remains.",
    ),
    "list_datasets": (
        Datasets,
        "List curated measured and design datasets with canonical variable and quantity names and units, plus descriptor_fields (per-test text such as sample_material, flow_direction) usable as query_measurements variables.",
    ),
    "query_measurements": (
        Query,
        "Get real source measurements through deterministic unit-aware filtering. Numeric filters require units. For a named test use field test_identifier with eq/in: it matches primary and alternate NASA labels exactly. Flagged rows are excluded AFTER filtering; zero rows is not a measurement. No invented values.",
    ),
    "make_chart": (
        Chart,
        "Build a deterministic interactive chart from source measurements; never pass plotting code or points.",
    ),
    "compare_runs": (
        Compare,
        "Compare test groups and check definitions, design status, fuels, hardware, gravity and confounding conditions. Quote the verdict.",
    ),
    "check_applicability_envelope": (
        Envelope,
        "Check environmental coverage, nearest NASA tests and gaps. Atmosphere overlap does not imply gravity match or safety.",
    ),
    "assess_evidence": (
        Assess,
        "Classify NASA evidence for an engineering scenario as direct, indirect or insufficient, per investigation and condition (gravity, fuel/material, phenomenon, O2 mole fraction, pressure, flow), with evidence gaps and NASA source links. Independent of search relevance; never a risk score. Use for habitat/spacecraft design questions. O2 is a mole fraction in [0,1].",
    ),
    "check_d2_law": (
        D2,
        "Compute the dimensionless quasi-steady d²-law consistency ratio from FLEX measurements. Deviations need not mean data errors.",
    ),
    "map_evidence_coverage": (
        NoArgs,
        "Count measured NASA tests by fuel class, ambient oxygen band and total-pressure band, including empty cells. Use it to state what has and has not been tested; an empty cell is a gap, not a safety statement.",
    ),
    "suppression_overview": (
        NoArgs,
        "FLEX CO2 and He dilution tests: recorded outcomes per diluent level and fuel, and extinction diameters for extinguished tests. Oxygen and pressure also vary: associations only.",
    ),
    "find_media": (
        Media,
        "Retrieve original NASA images/videos. Captions and run associations may be unknown.",
    ),
}


def strict_schema(schema):
    if isinstance(schema, dict):
        schema = {k: strict_schema(v) for k, v in schema.items() if k != "default"}
        if schema.get("type") == "object":
            schema["additionalProperties"] = False
            schema["required"] = list(schema.get("properties", {}))
    elif isinstance(schema, list):
        schema = [strict_schema(v) for v in schema]
    return schema


def function_tools():
    return [
        {
            "type": "function",
            "name": name,
            "description": description,
            "strict": True,
            "parameters": strict_schema(model.model_json_schema()),
        }
        for name, (model, description) in REGISTRY.items()
    ]
