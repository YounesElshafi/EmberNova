from embernova.provenance import evidence_id
from embernova.storage import Store


def source_shape(record: dict, local_url=None) -> dict:
    return {
        "file_id": record.get("file_id"),
        "sha256": record.get("sha256"),
        "doi": record.get("doi") or None,
        "ntrs_id": record.get("file_id", "").split("-")[1]
        if record.get("file_id", "").startswith("NTRS-")
        else None,
        "source_url": record.get("source_record_url") or record.get("source_url"),
        "local_url": local_url,
        "file_version": str(record.get("file_version") or ""),
        "source_version": str(record.get("source_version") or ""),
        "is_psi": record.get("investigation_id", "").startswith("PSI-"),
    }


class Ledger:
    def __init__(self, store: Store):
        self.store = store
        self.items: dict[str, dict] = {}
        self.artifacts: list[dict] = []

    def add(
        self,
        kind,
        investigations,
        title,
        locator,
        source,
        excerpt="",
        value_kind="metadata",
        transform=None,
        preview_rows=None,
    ):
        eid = evidence_id(kind, {"locator": locator, "sha256": source.get("sha256")})
        item = {
            "evidence_id": eid,
            "kind": kind,
            "investigation_ids": investigations,
            "title": title,
            "locator": locator,
            "excerpt": excerpt[:2000],
            "source": source,
            "value_kind": value_kind,
            "transform": transform,
            "preview_rows": preview_rows,
        }
        self.items[eid] = item
        self.store.put("evidence", eid, item)
        return item
