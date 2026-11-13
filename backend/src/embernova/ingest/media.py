import re
import shutil
import sqlite3
import subprocess

import yaml

from embernova.config import ROOT, Settings
from embernova.ingest.catalog import jsonlines
from embernova.provenance import canonical, safe_path, sha256


def association(filename: str, iid: str, rules: list, known: set) -> tuple[str, str | None]:
    for rule in rules:
        if rule["investigation_id"] == iid and (match := re.search(rule["pattern"], filename)):
            label = match[1]
            return ("inferred_from_filename" if label in known else "none"), label
    return "none", None


def build_media(cfg: Settings, db: sqlite3.Connection, sources: dict) -> None:
    db.execute(
        "CREATE TABLE media(media_id TEXT PRIMARY KEY, investigation_id TEXT, data_json TEXT)"
    )
    dest = cfg.build_dir / "media"
    dest.mkdir(exist_ok=True)
    rules = yaml.safe_load((ROOT / "curation/media_rules.yaml").read_text())["rules"]
    import pandas as pd

    runs = pd.read_parquet(cfg.build_dir / "bundle/runs.parquet")
    for item in jsonlines(cfg.data_dir / "indexes/LOCAL_MEDIA.jsonl"):
        source = sources.get(item["file_id"])
        if source is None or item["sha256"] != source["sha256"]:
            raise ValueError("Media index references unverified source")
        original = safe_path(cfg.data_dir, item["relative_local_path"])
        name = item["file_id"] + original.suffix.lower()
        transform = "byte-for-byte original copy"
        if original.suffix.lower() == ".ts":
            name = item["file_id"] + ".mp4"
            subprocess.run(
                [
                    "ffmpeg",
                    "-nostdin",
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-y",
                    "-i",
                    str(original),
                    "-map",
                    "0:v:0",
                    "-an",
                    "-c:v",
                    "libx264",
                    "-preset",
                    "veryfast",
                    "-crf",
                    "28",
                    "-vf",
                    "scale='min(1280,iw)':-2",
                    "-movflags",
                    "+faststart",
                    str(dest / name),
                ],
                check=True,
                timeout=180,
            )
            transform = "ffmpeg H.264 web derivative, CRF28, width <=1280, no audio"
        elif original.suffix.lower() in {".tif", ".tiff"}:
            from PIL import Image

            name = item["file_id"] + ".png"
            with Image.open(original) as image:
                image.convert("RGB").save(dest / name)
            transform = "TIFF to RGB PNG web derivative; original unchanged"
        else:
            shutil.copyfile(original, dest / name)
        thumb = item.get("preview_path")
        if thumb:
            shutil.copyfile(safe_path(cfg.data_dir, thumb), dest / (item["file_id"] + "_thumb.jpg"))
        labels = set(
            runs.loc[runs.investigation_id == item["investigation_id"], "source_run_label"]
        )
        assoc, label = association(item["filename"], item["investigation_id"], rules, labels)
        mid = "media:" + item["file_id"]
        item.update(
            media_id=mid,
            title=item["filename"],
            association=assoc,
            run_label=label,
            is_representative=False,
            credit="NASA / PSI",
            derivative_path="media/" + name,
            thumb_path="media/" + item["file_id"] + "_thumb.jpg" if thumb else None,
            stream_url=f"/api/media/{mid}/stream",
            thumb_url=f"/api/media/{mid}/thumb" if thumb else None,
            attribution_note="Original NASA media. Filename labels are not confirmed test associations.",
        )
        item.update(derivative_sha256=sha256(dest / name), derivative_transform=transform)
        db.execute(
            "INSERT INTO media VALUES (?,?,?)", (mid, item["investigation_id"], canonical(item))
        )
