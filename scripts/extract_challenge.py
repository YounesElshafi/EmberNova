"""Decode public embedded page data as JSON, never evaluate page scripts."""

import json
from html.parser import HTMLParser
from pathlib import Path


class Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in {"h1", "h2", "h3", "p", "li"}:
            self.parts.append("\n")

    def handle_data(self, data):
        self.parts.append(data)


folder = Path(__file__).resolve().parents[1] / "build/eval"
scripts = json.loads(
    (folder / "official_challenge_embedded.json").read_text(encoding="utf-8")
)
fragments = []
for script in scripts:
    prefix = "self.__next_f.push("
    if not script.startswith(prefix):
        continue
    try:
        data = json.loads(script[len(prefix) :].rstrip("; ").removesuffix(")"))
    except (ValueError, TypeError):
        continue
    if (
        len(data) > 1
        and isinstance(data[1], str)
        and data[1].lstrip().startswith(("<p data-block", "<h2 data-block"))
    ):
        fragments.append(data[1])
parser = Text()
for fragment in fragments:
    parser.feed(fragment)
text = "".join(parser.parts)
(folder / "official_challenge_full.txt").write_text(text, encoding="utf-8")
print(
    f"Extracted {len(text)} characters of official challenge details and resources as inert text."
)
