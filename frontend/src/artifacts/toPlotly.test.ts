import { describe, it, expect } from "vitest";
import type { ChartSpec } from "../api/generated/Artifact";
import { toPlotly } from "./toPlotly";
describe("backend ChartSpec rendering", () => {
  it("preserves actual points, run identities, axis units and scenario region", () => {
    const chart: ChartSpec = {
      spec_version: "1",
      chart_type: "envelope",
      title: "Measured",
      x: {
        field: "o2",
        label: "O₂",
        unit: "dimensionless",
        display_unit: "percent",
        scale: "linear",
      },
      y: {
        field: "p",
        label: "Pressure",
        unit: "Pa",
        display_unit: "mmHg",
        scale: "linear",
      },
      series: [
        {
          name: "FLEX",
          style: { color_token: "series-1", symbol: "circle", hollow: false },
          points: { x: [30, 34], y: [540, 530], run_uid: ["run-a", "run-b"] },
        },
      ],
      annotations: [
        { kind: "region", label: "Atmosphere", x: [30, 36], y: [520, 560] },
      ],
      notes: [],
      provenance: {
        bundle_version: "1",
        query_hash: "hash",
        table_ids: ["PSI-69:flex"],
        evidence_ids: ["ev_real"],
        transform_steps: ["pint"],
      },
    };
    const result = toPlotly(chart);
    expect((result.data[0] as any).x).toEqual([30, 34]);
    expect((result.data[0] as any).customdata).toEqual(["run-a", "run-b"]);
    expect((result.layout.xaxis?.title as any).text).toContain("(%)");
    expect(result.layout.shapes).toHaveLength(1);
  });
});
