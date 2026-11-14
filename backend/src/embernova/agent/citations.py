import json
import re

MARKER = re.compile(r"\[\[(?:ev:([^\]]+)|(ev_[a-z0-9]+))\]\]")
NUMBER = re.compile(r"(?<![\w.])[-+−]?\d+(?:[.,]\d+)?(?![\w])")
# Identifiers, not quantities: FLEX-2, SAFFIRE-III, PSI-69, NASA/TP-2015-216046, O2, CO2, d²
IDENTIFIER = re.compile(
    r"(?:[A-Za-z]+[-/]?\d+[A-Za-z0-9-]*|\d+[A-Za-z]+\d*|[A-Z]{2,}[-‐–]\d+(?:[-‐–]\d+)*)"
)


# Rank cells ("| **1** |"), list ordinals ("2. ") and "#3"/"rank 3" are positions, not quantities.
ORDINAL = re.compile(
    r"^\s*\|\s*\**\s*\d{1,2}\s*\**\s*(?=\|)|^\s*\d{1,2}[.)]\s|#\d{1,2}\b|\brank(?:ed)?\s+\d{1,2}\b"
    r"|\b(?:physical\s+)?pages?(?:/parts?)?\s+\d{1,4}(?:\s*[-–]\s*\d{1,4})?|\bpp?\.\s*\d{1,4}",
    re.I,
)


def _numbers(text: str) -> list[str]:
    cleaned = IDENTIFIER.sub(" ", MARKER.sub(" ", ORDINAL.sub(" ", text)))
    return [m.group().replace("−", "-").replace(",", "") for m in NUMBER.finditer(cleaned)]


def _value_set(texts) -> set[float]:
    values = set()
    for t in texts:
        for n in NUMBER.findall(str(t).replace("−", "-")):
            try:
                values.add(float(n.replace(",", "")))
            except ValueError:
                pass
    return values


def _grounded(token: str, values: set[float]) -> bool:
    try:
        n = float(token)
    except ValueError:
        return True
    decimals = len(token.split(".")[1]) if "." in token else 0
    tolerance = 0.5 * 10**-decimals + 1e-12
    # A stated number is grounded when some cited value rounds to it (e.g. 0.4583 -> 0.46).
    return any(abs(n - v) <= tolerance for v in values)


def grounding_corpus(item: dict, artifacts: dict) -> list:
    texts = [item.get("excerpt", "")]
    texts.append(json.dumps(item.get("preview_rows") or []))
    run_uids = item.get("locator", {}).get("run_uids")
    if run_uids:
        texts.append(str(len(run_uids)))
    art = artifacts.get(item.get("evidence_id"))
    if art:
        texts.append(json.dumps(art.get("payload", {})))
    return texts


def numeric_audit(
    text: str, ledger: dict, artifacts: dict, question: str = "", tool_outputs=()
) -> dict:
    """Heuristic check that each number in a cited sentence appears (after rounding) in the
    evidence that sentence cites or in this turn's deterministic tool outputs. Numbers the
    user supplied are allowed. A number the model computed or invented is flagged. This does
    not prove semantic entailment."""
    # User text and unrelated tool output cannot establish a source-backed claim.
    allowed: set[float] = set()
    unmatched = []
    for line in text.splitlines():
        ids = [m[1] or m[2] for m in MARKER.finditer(line)]
        cited = [ledger[e] for e in ids if e in ledger]
        if not cited or line.lstrip().startswith("#"):
            continue
        values = allowed | _value_set(t for e in cited for t in grounding_corpus(e, artifacts))
        for token in _numbers(line):
            match = re.search(rf"(?<![\w.]){re.escape(token)}(?![\w])", line)
            context = (
                line[max(0, match.start() - 35) : match.end() + 24].lower()
                if match
                else line.lower()
            )
            topic = next(
                (
                    word
                    for word in (
                        "pressure",
                        "diameter",
                        "temperature",
                        "velocity",
                        "burning rate",
                        "oxygen",
                    )
                    if word in context
                ),
                None,
            )
            matching_values = [
                v
                for e in cited
                for row in e.get("preview_rows") or []
                for v in row.get("values") or []
                if v.get("display_value") is not None
                and _grounded(token, {float(v["display_value"])})
            ]
            count_claim = bool(re.search(r"\b(tests?|runs?|rows?|records?)\b", context))
            if (
                any(e.get("kind") == "data_rows" and e.get("preview_rows") for e in cited)
                and not matching_values
                and not count_claim
            ):
                unmatched.append({"number": token, "sentence": MARKER.sub("", line).strip()[:200]})
                continue
            declared = re.search(
                rf"(?<![\w.]){re.escape(token)}\s*(mmHg|mm|cm|km|m|Pa|kPa|psi|%)\b", line, re.I
            )
            preview_units = {str(v.get("display_unit", "")).lower() for v in matching_values}
            wrong_unit = bool(
                declared and preview_units and declared[1].lower() not in preview_units
            )
            aliases = {"oxygen": ("oxygen", "o2_"), "burning rate": ("burning_rate",)}
            names = aliases.get(topic, (topic.replace(" ", "_"),)) if topic else ()
            wrong_quantity = bool(
                topic
                and matching_values
                and not any(
                    any(name in str(v.get("name", "")).lower() for name in names)
                    for v in matching_values
                )
            )
            if not _grounded(token, values) or wrong_unit or wrong_quantity:
                unmatched.append({"number": token, "sentence": MARKER.sub("", line).strip()[:200]})
    return {
        "ungrounded_numbers": len(unmatched),
        "details": [
            f"Number {u['number']} not found in cited evidence: {u['sentence']}"
            for u in unmatched[:5]
        ],
    }


def validate(
    text: str,
    ledger: dict,
    artifacts: dict | None = None,
    question: str = "",
    tool_outputs=(),
) -> dict:
    citations, invalid = [], 0

    def replace(match):
        nonlocal invalid
        eid = match[1] or match[2]
        if eid not in ledger:
            invalid += 1
            return "[unverified citation removed]"
        if eid not in [c["evidence_id"] for c in citations]:
            citations.append({"n": len(citations) + 1, "evidence_id": eid})
        return "[" + str(next(c["n"] for c in citations if c["evidence_id"] == eid)) + "]"

    validated = MARKER.sub(replace, text)
    uncited, mismatch = 0, 0
    lines = text.splitlines()
    strength = {}
    section = ""
    bullet_index = -1
    for index, line in enumerate(lines):
        if line.startswith("## "):
            section = line[3:].strip()
        if line.lstrip().startswith("- "):
            bullet_index += 1
        ids = [match[1] or match[2] for match in MARKER.finditer(line)]
        if line.lstrip().startswith("|") and not ids:
            end = index
            while end < len(lines) and (
                lines[end].lstrip().startswith("|") or not lines[end].strip()
            ):
                end += 1
            if end < len(lines):
                ids = [m[1] or m[2] for m in MARKER.finditer(lines[end])]
        if (
            line.strip()
            and not line.lstrip().startswith("#")
            and re.search(r"\d|FLEX|Saffire|BASS|SAME|CFI", line)
            and not any(eid in ledger for eid in ids)
        ):
            uncited += 1
        for label, kind in [
            ("Measured", "data_rows"),
            ("Published", "document_span"),
            ("Derived", "derived_artifact"),
        ]:
            if re.search(rf"\*\*{label}(?:\s*[—–:-][^*]*)?\*\*", line) and not any(
                ledger.get(eid, {}).get("kind") == kind for eid in ids
            ):
                mismatch += 1
        if section == "Evidence" and line.lstrip().startswith("- "):
            cited = [ledger[eid] for eid in ids if eid in ledger]
            rows = any(
                e["kind"] == "data_rows" and len(e.get("locator", {}).get("run_uids", [])) >= 3
                for e in cited
            )
            docs = len(
                {e.get("source", {}).get("file_id") for e in cited if e["kind"] == "document_span"}
            )
            strength[str(bullet_index)] = (
                "strong" if rows and docs else "moderate" if rows or docs >= 2 else "limited"
            )
    return {
        "validated_markdown": validated,
        "citations": citations,
        "si_generated": True,
        "sections_present": [
            key
            for key, heading in {
                "answer": "Answer",
                "evidence": "Evidence",
                "implications": "Engineering implications",
                "limits": "Limits of the evidence",
                "hypotheses": "Open questions",
            }.items()
            if heading in text
        ],
        "audit": {
            "invalid_citations": invalid,
            "kind_mismatches": mismatch,
            "uncited_sentences": uncited,
            **numeric_audit(text, ledger, artifacts or {}, question, tool_outputs),
        },
        "evidence_strength": strength,
        "followups": [
            "Compare the matched runs",
            "Inspect the original NASA media",
            "Which experimental conditions are missing?",
        ],
    }
