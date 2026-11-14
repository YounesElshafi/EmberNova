import { useEffect, useRef, useState } from "react";
import {
  Download,
  ExternalLink,
  FlaskConical,
  AlertTriangle,
} from "lucide-react";
import type { Artifact, ChartSpec } from "../api/generated/Artifact";
import { toPlotly } from "./toPlotly";
import { useWorkspace } from "../state";
import { cell, label, num, summary, unitLabel } from "../format";

export function ScientificChart({ chart }: { chart: ChartSpec }) {
  const element = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  const inspect = useWorkspace((s) => s.inspect);
  useEffect(() => {
    let active = true;
    setReady(false);
    let resize: ResizeObserver | undefined;
    let purge: (() => void) | undefined;
    // Cartesian partial bundle: covers every ChartSpec trace type (scatter, bar, box, histogram)
// at about a third of the full bundle's size.
import("plotly.js-cartesian-dist-min")
      .then(async ({ default: Plotly }) => {
        if (!element.current || !active) return;
        const node = element.current;
        const spec = toPlotly(chart);
        const plot = await Plotly.newPlot(node, spec.data, spec.layout, {
          responsive: true,
          displaylogo: false,
          modeBarButtonsToRemove: ["lasso2d", "select2d"],
          toImageButtonOptions: {
            filename: "EmberNova_NASA_source_chart",
            format: "png",
            width: 1400,
            height: 900,
            scale: 2,
          },
        });
        if (!active) {
          Plotly.purge(node);
          return;
        }
        setReady(true);
        plot.on("plotly_click", (event: { points?: { curveNumber: number; pointNumber: number }[] }) => {
          const point = event.points?.[0];
          if (!point) return;
          const index = chart.series.slice(0, point.curveNumber).reduce((n, series) => n + series.points.x.length, 0) + point.pointNumber;
          const total = chart.series.reduce((n, series) => n + series.points.x.length, 0);
          if (chart.provenance.evidence_ids.length === total && chart.provenance.evidence_ids[index])
            inspect(chart.provenance.evidence_ids[index]);
          else setError("Point-level source evidence is unavailable for this chart. Use the artifact source list.");
        });
        resize = new ResizeObserver(() => Plotly.Plots.resize(node));
        resize.observe(node);
        purge = () => Plotly.purge(node);
      })
      .catch(() =>
        setError(
          "The chart could not load. Download the artifact to inspect its source data.",
        ),
      );
    return () => {
      active = false;
      resize?.disconnect();
      purge?.();
    };
  }, [chart, inspect]);
  return (
    <>
      {error && <p className="error">{error}</p>}
      {!ready && !error && (
        <p className="muted">Loading interactive NASA data chart…</p>
      )}
      <div
        ref={element}
        data-chart-ready={ready}
        className="scientific-chart"
        role="img"
        aria-label={chart.title}
      />
      <div className="chart-help">
        Drag to zoom · double-click to reset · select a point to inspect source
        evidence
      </div>
    </>
  );
}

export function DataTable({
  rows,
  columns,
  units,
}: {
  rows: any[];
  columns?: string[];
  units?: Record<string, string | null | undefined>;
}) {
  if (!rows.length)
    return <div className="empty-note">No rows match these conditions.</div>;
  const cols = columns || Object.keys(rows[0]);
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {cols.map((c) => {
              const unit = unitLabel(units?.[c], c);
              return (
                <th key={c}>
                  {label(c)}
                  {unit && <small className="th-unit"> {unit}</small>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.run_uid || i}>
              {cols.map((c) => (
                <td key={c}>{cell(r[c])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComparisonTables({ p }: { p: any }) {
  const groups: any[] = p.groups;
  const quantities = Object.keys(groups[0]?.summary || {});
  return (
    <>
      <h3>Measured quantities by group</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Quantity</th>
              {groups.map((g) => (
                <th key={g.label}>
                  {g.label} <small className="th-unit">{g.n} tests</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {quantities.map((q) => (
              <tr key={q}>
                <td>{label(q)}</td>
                {groups.map((g) => (
                  <td key={g.label}>{summary(g.summary[q])}</td>
                ))}
              </tr>
            ))}
            {groups.some((g) => Object.keys(g.outcome_counts || {}).length) && (
              <tr>
                <td>Recorded outcomes</td>
                {groups.map((g) => (
                  <td key={g.label}>
                    {Object.entries(g.outcome_counts || {})
                      .map(([k, v]) => `${k} ${v}`)
                      .join(" · ") || "unknown"}
                    {g.no_extinction_observed > 0 && (
                      <small className="muted">
                        {" "}
                        · {g.no_extinction_observed} with extinction diameter 0
                        and no extinction recorded (excluded from diameter)
                      </small>
                    )}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <h3>Test conditions (group medians)</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Condition</th>
              {groups.map((g) => (
                <th key={g.label}>{g.label}</th>
              ))}
              <th>Differs</th>
            </tr>
          </thead>
          <tbody>
            {p.condition_diff.map((d: any) => (
              <tr key={d.variable}>
                <td>{label(d.variable)}</td>
                {d.values.map((v: number | null, i: number) => (
                  <td key={i}>
                    {v == null
                      ? "unknown"
                      : `${num(v)} ${unitLabel(d.display_unit, d.variable)}`}
                  </td>
                ))}
                <td>
                  <span className={d.differs ? "pill warn" : "pill"}>
                    {d.values.some((v: number | null) => v == null) ? "Unknown" : d.differs ? "Yes" : "No"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function EnvelopeDetails({ p }: { p: any }) {
  const pressureKey = (p.bracketing_runs[0] &&
    Object.keys(p.bracketing_runs[0]).find((k) =>
      k.startsWith("delta_pressure_"),
    )) as string | undefined;
  const nearestCols = p.bracketing_runs[0]?.distance !== undefined
    ? ["run_uid", "distance", "within_atmosphere"] // recordings made before offsets existed
    : [
        "investigation",
        "test",
        "delta_o2_percent_points",
        ...(pressureKey ? [pressureKey] : []),
        "within_atmosphere",
      ];
  return (
    <>
      <h3>Nearest tested conditions</h3>
      <p className="muted">
        Offsets from the edge of the requested band (0 = inside). Positive
        means above the band.
      </p>
      <DataTable rows={p.bracketing_runs} columns={nearestCols} />
      {p.o2_only?.length > 0 && (
        <>
          <h3>Oxygen recorded, pressure not recorded per test</h3>
          <p className="muted">
            These tests cannot be placed on the oxygen–pressure chart and are
            never counted as joint coverage.
          </p>
          <DataTable
            rows={p.o2_only.map((r: any) => ({
              ...r,
              fuel_class: r.fuel_class.replaceAll("_", " "),
            }))}
            columns={[
              "investigation",
              "fuel_class",
              "n_runs",
              "o2_percent_min",
              "o2_percent_max",
              "n_runs_in_o2_band",
            ]}
          />
        </>
      )}
      {p.gaps.length > 0 && (
        <>
          <h3>Coverage gaps</h3>
          <ul className="notes">
            {p.gaps.map((g: string) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

export function ArtifactView({ artifact }: { artifact: Artifact }) {
  const p = artifact.payload as any;
  const inspect = useWorkspace((s) => s.inspect);
  return (
    <div className="artifact-view">
      <div className="eyebrow">
        <FlaskConical size={13} /> {artifact.type.replaceAll("_", " ")}{" "}
        <span className="source-chip">NASA evidence</span>
        {artifact.labels.si_generated && <span className="si-badge">SI</span>}
      </div>
      <h2>{artifact.title}</h2>
      {p.kind === "analysis_run" && (
        <>
          <div className="notice">
            SI-generated exploratory code and derived results. Executed only in
            a hosted 1 GB container with network disabled. Inspect the code and
            input hashes; outputs are not new NASA measurements or certified
            guidance.
          </div>
          {p.validation_errors?.length > 0 && (
            <div className="error">{p.validation_errors.join(" · ")}</div>
          )}
          {p.result && (
            <>
              <p>{p.result.method}</p>
              <DataTable rows={p.result.results} />
              {p.result.warnings.map((warning: string, i: number) => (
                <p className="notice" key={i}>
                  {warning}
                </p>
              ))}
            </>
          )}
          {p.charts?.map((chart: ChartSpec, i: number) => (
            <ScientificChart chart={chart} key={i} />
          ))}
          {p.tables?.map((table: any, i: number) => (
            <details key={i}>
              <summary>{table.name}</summary>
              <DataTable rows={table.rows} />
            </details>
          ))}
          <h3>Reproducible SI code</h3>
          {p.cells.map((cell: any, i: number) => (
            <details className="repro" open key={i}>
              <summary>Python cell {i + 1} · SI-generated</summary>
              <pre>{cell.code}</pre>
              {cell.stdout && <pre>{cell.stdout}</pre>}
              {cell.stderr && <pre>{cell.stderr}</pre>}
            </details>
          ))}
        </>
      )}
      {p.kind === "envelope" && (
        <>
          {p.headline ? (
            <p className="headline-finding">{p.headline}</p>
          ) : (
            <div className="verdict">{p.coverage.replaceAll("_", " ")}</div>
          )}
          <p className="muted">
            Coverage describes this local PSI snapshot. Atmosphere overlap does
            not establish safety.
          </p>
          {p.gravity_note && (
            <div className="notice">
              <AlertTriangle size={17} />
              {p.gravity_note}
            </div>
          )}
          <div className="coverage-list">
            {(p.coverage_by_fuel_class || []).map((c: any) => (
              <div key={c.fuel_class}>
                <b>{c.label}</b>
                <span>
                  {c.n_runs_in_range} in range · {c.n_runs_with_known_conditions}{" "}
                  of {c.n_runs} with known conditions
                </span>
                <small>{c.investigations.join(", ")}</small>
              </div>
            ))}
            {!p.coverage_by_fuel_class &&
              p.per_investigation.map((r: any) => (
                <div key={r.investigation_id}>
                  <b>{r.investigation || r.investigation_id}</b>
                  <span>
                    {r.coverage} atmosphere overlap · {r.n_runs_in_range} tests
                  </span>
                  {!r.data_complete && (
                    <small>Requested conditions partly unknown</small>
                  )}
                </div>
              ))}
          </div>
        </>
      )}
      {p.kind === "comparison" && (
        <>
          <div className="verdict warning">
            {p.validity.verdict.replaceAll("_", " ")}
          </div>
          <div className="checklist">
            {p.validity.checks.map((c: any, i: number) => (
              <div className={`check ${c.status}`} key={i}>
                <span>
                  {c.status === "pass" ? "✓" : c.status === "warn" ? "!" : "×"}
                </span>
                <div>
                  <b>{c.rule.replaceAll("_", " ")}</b>
                  <p>{c.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="notice">{p.association_note}</p>
        </>
      )}
      {p.chart && <ScientificChart chart={p.chart} />}
      {p.stats && (
        <div className="stats-inline">
          {Object.entries(p.stats)
            .filter(([, v]) => typeof v === "number")
            .map(([k, v]) => (
              <div key={k}>
                <strong>{num(Number(v))}</strong>
                <small>{label(k)}</small>
              </div>
            ))}
        </div>
      )}
      {p.kind === "table" && (
        <DataTable
          rows={p.rows}
          units={Object.fromEntries(
            (p.columns || []).map((c: any) => [c.name, c.display_unit]),
          )}
        />
      )}
      {p.kind === "comparison" && <ComparisonTables p={p} />}
      {p.kind === "envelope" && <EnvelopeDetails p={p} />}
      {p.levels && (
        <>
          <h3>Recorded outcomes by diluent level</h3>
          <DataTable
            rows={p.levels}
            columns={[
              "fuel",
              "diluent",
              "diluent_percent",
              "n_tests",
              "extinction",
              "disruption",
              "completion",
              "o2_percent_median",
              "pressure_atm_median",
            ]}
          />
        </>
      )}
      {p.chart?.notes?.length > 0 && (
        <ul className="notes">
          {p.chart.notes.map((n: string, i: number) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
      <div className="artifact-footer">
        <button
          className="text-button"
          onClick={() => inspect(artifact.evidence_id)}
        >
          <ExternalLink size={14} /> Inspect provenance
        </button>
        <a
          href={`/api/artifacts/${artifact.artifact_id}/bundle`}
          className="text-button"
        >
          <Download size={14} /> Reproduce / export
        </a>
      </div>
      <details className="repro">
        <summary>Computation record</summary>
        <pre>{JSON.stringify(artifact.reproducibility, null, 2)}</pre>
      </details>
    </div>
  );
}
