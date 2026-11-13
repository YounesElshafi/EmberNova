import base64
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

from ulid import ULID


def canonical(value: object) -> str:
    return json.dumps(
        value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False
    )


def digest(value: object) -> str:
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def evidence_id(kind: str, locator: dict) -> str:
    raw = hashlib.sha256(f"{kind}|{canonical(locator)}".encode()).digest()
    return "ev_" + base64.b32encode(raw).decode().lower()[:12]


def new_id(prefix: str) -> str:
    return prefix + str(ULID())


def now() -> str:
    return datetime.now(UTC).isoformat()


def safe_path(root: Path, relative: str) -> Path:
    target = (root / relative).resolve()
    if not target.is_relative_to(root.resolve()) or not target.is_file():
        raise ValueError("Source path is outside the allowed root or missing")
    return target


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()
