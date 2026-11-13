// Display formatting shared by tables, charts and cards. Values are never rounded in
// exports or in the backend; this only controls what a reader sees on screen.

const UNIT_LABELS: Record<string, string> = {
  "mm**2/s": "mm²/s",
  "m**2/s": "m²/s",
  percent: "%",
  degC: "°C",
  dimensionless: "",
  "mg/min": "mg/min",
  "cm/s": "cm/s",
  "mm/s": "mm/s",
};

export function unitLabel(unit?: string | null, name = ""): string {
  if (!unit) return "";
  if (unit === "dimensionless")
    return name.endsWith("mole_fraction") ? "mole fraction" : "";
  return UNIT_LABELS[unit] ?? unit;
}

const NAMES: Record<string, string> = {
  o2_mole_fraction: "O₂",
  burner_o2_mole_fraction: "Burner-stream O₂",
  co2_mole_fraction: "CO₂",
  he_mole_fraction: "He",
  n2_mole_fraction: "N₂",
  o2_partial_pressure: "O₂ partial pressure",
  total_pressure: "Total pressure",
  burning_rate_constant: "Burning-rate constant K",
  extinction_diameter: "Extinction diameter",
  droplet_initial_diameter: "Initial droplet diameter",
  source_run_label: "NASA test",
  fuel_canonical: "Fuel",
  run_uid: "Record",
  delta_o2_percent_points: "ΔO₂ (points)",
  within_atmosphere: "Inside requested band",
  investigation: "Investigation",
};

export function label(name: string): string {
  if (NAMES[name]) return NAMES[name];
  const delta = name.match(/^delta_pressure_(.+)$/);
  if (delta) return `ΔPressure (${delta[1]})`;
  const text = name.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function num(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (Number.isInteger(v) && Math.abs(v) < 1e6) return v.toLocaleString();
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e6)) return v.toExponential(2);
  return Number(v.toPrecision(3)).toString();
}

export function summary(s: any): string {
  if (!s || s.n === 0 || s.median == null) return `no values (n=${s?.n ?? 0})`;
  const unit = unitLabel(s.unit);
  const iqr = s.q1 != null && s.n > 1 ? ` (IQR ${num(s.q1)}–${num(s.q3)})` : "";
  return `${num(s.median)}${unit ? " " + unit : ""}${iqr}, n=${s.n}`;
}

export function cell(v: any): string {
  if (v == null || v === "") return "unknown";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return num(v);
  if (Array.isArray(v))
    return v.length ? v.map((x) => (typeof x === "number" ? num(x) : cell(x))).join(", ") : "none";
  if (typeof v === "object") {
    if ("median" in v && "n" in v) return summary(v);
    return Object.entries(v)
      .map(([k, x]) => `${label(k)}: ${cell(x)}`)
      .join(" · ");
  }
  return String(v);
}

export function testLabel(runUid: string): string {
  // "PSI-69:flex_experimental:37" -> "test 37"
  const parts = runUid.split(":");
  return parts.length >= 3 ? `test ${parts.slice(2).join(":")}` : runUid;
}
