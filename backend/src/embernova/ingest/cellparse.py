import re

from pint.errors import PintError

from embernova.science.units import normalize

NUM = r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?"


def parse_cell(raw: object, unit: str | None) -> dict:
    text = "" if raw is None else str(raw)
    clean = text.strip()
    result = {
        "value_raw": text,
        "unit_raw": unit,
        "value_si": None,
        "unit_si": None,
        "value_min_si": None,
        "value_max_si": None,
        "value_list_si": None,
        "display_value": None,
        "display_unit": unit,
        "qualifier": "exact",
        "quality_flags": [],
    }
    if not clean or clean.lower() in {"none", "n/a", "na", "-", "–", "—"}:
        return result
    if any(c in clean for c in ["�", "ï¿½", "ÿ"]):
        result["quality_flags"].append("encoding_artifact")
        return result
    if unit is None:
        result["quality_flags"].append("missing_unit")
        return result
    clean = re.sub(r"\bor\s+", "", clean)
    if clean.startswith(("~", "≈")):
        clean = clean[1:].strip()
        result["qualifier"] = "approx"
    try:
        if ";" in clean:
            vals = [float(s.strip()) for s in clean.split(";") if s.strip()]
            result.update(
                qualifier="list",
                value_list_si=[normalize(v, unit)[0] for v in vals],
                unit_si=normalize(1, unit)[1],
            )
            return result
        match_range = re.fullmatch(f"({NUM})\\s*(?:[-–]|to)\\s*({NUM})", clean)
        if match_range:
            lo, hi = (float(v) for v in match_range.groups())
            if lo > hi:
                # "22.1 to 22.0" reports a drift during a test; keep the interval, never a point.
                lo, hi = hi, lo
                result["quality_flags"].append("range_reported_high_to_low")
            result.update(
                qualifier="range",
                value_min_si=normalize(lo, unit)[0],
                value_max_si=normalize(hi, unit)[0],
                unit_si=normalize(1, unit)[1],
            )
            return result
        match = re.fullmatch(f"({NUM})\\s*(.*)", clean)
        if not match:
            result["quality_flags"].append("sentinel_value")
            return result
        value = float(match[1])
        actual_unit = match[2].strip() or unit
        from embernova.science.units import convert

        display = convert(value, actual_unit, unit)
        si, si_unit = normalize(display, unit)
        result.update(value_si=si, unit_si=si_unit, display_value=display)
    except (ValueError, TypeError):
        result["quality_flags"].append("header_ambiguous")
    except PintError:
        # Annotated cells such as "~ 0 (Nomex)" or "5 cm & 0 (note 2)": keep raw text, no number.
        result["quality_flags"].append("unparsed_cell_text")
    return result
