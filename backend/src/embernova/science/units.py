import math

import pint

UREG = pint.UnitRegistry(autoconvert_offset_to_baseunit=True)
UREG.define("mmHg = 133.322387415 * pascal")
UREG.define("ppm = 1e-6 = parts_per_million")


def convert(value: float, source: str, target: str) -> float:
    result = float(UREG.Quantity(value, source).to(target).magnitude)
    if not math.isfinite(result):
        raise ValueError("Non-finite measurement")
    return result


def normalize(value: float, unit: str) -> tuple[float, str]:
    q = UREG.Quantity(value, unit).to_base_units()
    n = float(q.magnitude)
    if not math.isfinite(n):
        raise ValueError("Non-finite measurement")
    return n, str(q.units)
