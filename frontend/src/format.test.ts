import { describe, expect, it } from "vitest";
import { cell, label, num, summary, unitLabel } from "./format";

describe("display formatting", () => {
  it("never shows raw JSON or long floats", () => {
    expect(num(0.5175000000000001)).toBe("0.518");
    expect(num(1.0025001428224871)).toBe("1");
    expect(num(17)).toBe("17");
    expect(cell({ n: 22, median: 0.48, q1: 0.4625, q3: 0.5175000000000001, unit: "mm**2/s" })).toBe(
      "0.48 mm²/s (IQR 0.463–0.518), n=22",
    );
    expect(cell(true)).toBe("Yes");
    expect(cell(null)).toBe("unknown");
    expect(cell([1.0025001428, 0.70697])).toBe("1, 0.707");
  });
  it("uses scientific unit symbols", () => {
    expect(unitLabel("mm**2/s")).toBe("mm²/s");
    expect(unitLabel("percent")).toBe("%");
    expect(unitLabel("dimensionless", "he_mole_fraction")).toBe("mole fraction");
    expect(label("o2_mole_fraction")).toBe("O₂");
    expect(label("delta_pressure_psi")).toBe("ΔPressure (psi)");
  });
  it("reports empty summaries honestly", () => {
    expect(summary({ n: 0, median: null })).toBe("no values (n=0)");
  });
});
