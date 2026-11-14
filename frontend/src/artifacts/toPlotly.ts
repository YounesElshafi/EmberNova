import type { ChartSpec } from "../api/generated/Artifact";
import type { Data, Layout } from "plotly.js";
import { unitLabel } from "../format";

// Series palette tuned for the dark EmberNova surfaces: ember, signal blue, amber, lilac, sand, slate.
const colors = [
  "#ff8d55",
  "#84b4ff",
  "#f3b75a",
  "#c7a6f0",
  "#e6d3a3",
  "#9aa6b8",
];
export function toPlotly(chart: ChartSpec): {
  data: Data[];
  layout: Partial<Layout>;
} {
  const data = chart.series.map(
    (s, i) =>
      ({
        type:
          chart.chart_type === "box"
            ? "box"
            : chart.chart_type === "bar"
              ? "bar"
              : chart.chart_type === "histogram"
                ? "histogram"
                : "scatter",
        mode:
          chart.chart_type === "line" || chart.chart_type === "timeseries"
            ? "lines"
            : "markers",
        name: s.name,
        x: s.points.x,
        y: s.points.y,
        customdata: s.points.run_uid,
        marker: {
          color: colors[i % colors.length],
          size: 7,
          opacity: 0.76,
          symbol:
            s.style.symbol === "diamond"
              ? s.style.hollow
                ? "diamond-open"
                : "diamond"
              : s.style.hollow
                ? "circle-open"
                : "circle",
          line: { width: 0.6, color: "#06080e" },
        },
        line: { width: 2, color: colors[i % colors.length] },
        hovertemplate:
          "%{customdata}<br>%{x}, %{y}<extra>%{fullData.name}</extra>",
        ...(s.points.error_x
          ? {
              error_x: { type: "data", array: s.points.error_x, visible: true },
            }
          : {}),
        ...(s.points.error_y
          ? {
              error_y: { type: "data", array: s.points.error_y, visible: true },
            }
          : {}),
      }) as Data,
  );
  const shapes: any[] = [];
  for (const a of chart.annotations as any[]) {
    if (a.kind === "region" && a.x && a.y)
      shapes.push({
        type: "rect",
        x0: a.x[0],
        x1: a.x[1],
        y0: a.y[0],
        y1: a.y[1],
        fillcolor: "rgba(255,106,43,0.10)",
        line: { color: "#ff8d55", dash: "dot" },
      });
    if (a.kind === "isoline" && a.slope === 1) {
      const max = Math.max(
        ...chart.series.flatMap((s) =>
          (s.points.x as number[]).filter((v) => typeof v === "number"),
        ),
        1,
      );
      shapes.push({
        type: "line",
        x0: 0,
        x1: max,
        y0: 0,
        y1: max,
        line: { color: "#959089", dash: "dot" },
      });
    }
  }
  const axis = (a: ChartSpec["x"]) => ({
    title: {
      text: `${a.label}${unitLabel(a.display_unit, a.field) ? ` (${unitLabel(a.display_unit, a.field)})` : ""}`,
      font: { size: 12, color: "#c9c2b5" },
    },
    type: a.scale === "category" ? "category" : a.scale,
    gridcolor: "rgba(232,222,205,0.07)",
    zerolinecolor: "rgba(232,222,205,0.18)",
    linecolor: "rgba(232,222,205,0.18)",
    tickfont: { color: "#959089", size: 11 },
    automargin: true,
  });
  return {
    data,
    layout: {
      autosize: true,
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      font: { family: "Inter Tight, Inter, Segoe UI, sans-serif", color: "#f1ebe1" },
      margin: { l: 65, r: 25, t: 25, b: 65 },
      xaxis: axis(chart.x) as any,
      yaxis: axis(chart.y) as any,
      legend: { orientation: "h", y: -0.25, font: { size: 11, color: "#c9c2b5" } },
      hovermode: "closest",
      shapes,
    },
  };
}
