import { Component, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CircleHelp,
  ExternalLink,
  FileText,
  Maximize2,
  XCircle,
} from "lucide-react";
import type { Artifact } from "../api/generated/Artifact";
import { api } from "../api/client";
import { useWorkspace } from "../state";
import { DataTable, ScientificChart } from "./ArtifactView";

/* Typed research blocks rendered inline in the conversation. Every block is produced by a
   deterministic backend tool; the SI model only chooses which tools to call. */

const STATUS_ICON: Record<string, JSX.Element> = {
  match: <CheckCircle2 size={14} aria-label="matches" />,
  differs: <XCircle size={14} aria-label="differs" />,
  unknown: <CircleHelp size={14} aria-label="not recorded" />,
  simulated: <AlertTriangle size={14} aria-label="simulated" />,
  planned: <AlertTriangle size={14} aria-label="planned" />,
  partial: <AlertTriangle size={14} aria-label="partial" />,
};
const STATUS_TEXT: Record<string, string> = {
  match: "Matches",
  differs: "Differs",
  unknown: "Not recorded",
  simulated: "Simulated",
  planned: "Planned",
  not_requested: "—",
};
const CLASS_TEXT: Record<string, string> = {
  direct: "Direct experimental evidence",
  indirect: "Indirect evidence",
  insufficient: "Insufficient evidence",
};

function SourceLinks({
  source,
  doi,
}: {
  source?: string | null;
  doi?: string | null;
}) {
  return (
    <span className="source-links">
      {source && (
        <a href={source} target="_blank" rel="noreferrer">
          NASA source <ExternalLink size={12} />
        </a>
      )}
      {doi && (
        <a href={doi} target="_blank" rel="noreferrer">
          DOI <ExternalLink size={12} />
        </a>
      )}
      {!source && !doi && (
        <span className="muted">No verified public link</span>
      )}
    </span>
  );
}

function RankingBlock({ p }: { p: any }) {
  const inspect = useWorkspace((s) => s.inspect);
  const [all, setAll] = useState(false);
  const items = all ? p.items : p.items.slice(0, 5);
  return (
    <>
      <p className="block-meta">
        Interpreted as: <b>{p.interpretation}</b>
        {p.degraded && <span className="muted"> · lexical ranking only</span>}
      </p>
      <ol className="ranking-list">
        {items.map((it: any) => (
          <li key={it.investigation_id} className="ranking-card">
            <div className="ranking-head">
              <span className="rank">{it.rank}</span>
              <div>
                <b>{it.acronym}</b>{" "}
                {it.acronym !== it.investigation_id && (
                  <span className="muted">{it.investigation_id}</span>
                )}
                <p>{it.title}</p>
              </div>
              <div
                className="relevance"
                title="Scientific Relevance Score: agreement with your question. Not a probability or fire risk."
              >
                <strong>{it.scientific_relevance_score}</strong>
                <small>Scientific relevance</small>
                <span className="relevance-bar">
                  <span
                    style={{ width: `${it.scientific_relevance_score}%` }}
                  />
                </span>
              </div>
            </div>
            <ul className="explanation">
              {it.explanation.map((e: string) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            <div className="card-actions">
              <SourceLinks source={it.source_url} doi={it.doi_url} />
              {!it.is_psi && (
                <span className="tag">Supplemental NASA source</span>
              )}
              {it.datasets?.map((d: any) => (
                <a
                  key={d.table_id}
                  className="tag"
                  href={`/data/${encodeURIComponent(d.table_id)}`}
                >
                  {d.kind === "conditions_design"
                    ? "Design matrix"
                    : "Measured data"}
                  : {d.row_count} rows
                </a>
              ))}
              {it.passages?.map((ps: any) => (
                <button
                  key={ps.evidence_id}
                  className="text-button"
                  onClick={() => inspect(ps.evidence_id)}
                >
                  <FileText size={12} /> {ps.document_title}
                  {ps.page ? `, p. ${ps.page}` : ""}
                </button>
              ))}
              <button
                className="text-button"
                onClick={() => inspect(it.evidence_id)}
              >
                Metadata record
              </button>
            </div>
          </li>
        ))}
      </ol>
      {p.items.length > 5 && (
        <button className="text-button" onClick={() => setAll((v) => !v)}>
          {all ? "Show top 5" : `Show all ${p.items.length}`}
        </button>
      )}
      <p className="muted small">{p.score_note}</p>
    </>
  );
}

function AssessmentBlock({ p }: { p: any }) {
  const inspect = useWorkspace((s) => s.inspect);
  const [all, setAll] = useState(false);
  const rows = all ? p.investigations : p.investigations.slice(0, 4);
  return (
    <>
      <div className={`evidence-class ${p.classification}`}>
        <b>{CLASS_TEXT[p.classification]}</b>
        <span>{p.definitions[p.classification]}</span>
      </div>
      {p.gaps.length > 0 && (
        <div className="gap-box">
          <b>
            <AlertTriangle size={14} /> Evidence gaps
          </b>
          <ul>
            {p.gaps.map((g: string) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      )}
      {rows.map((r: any) => (
        <details
          key={r.investigation_id}
          className="assess-row"
          open={r.classification === "direct"}
        >
          <summary>
            <span className={`class-chip ${r.classification}`}>
              {r.classification}
            </span>
            <b>{r.acronym}</b> <span className="muted">{r.title}</span>
          </summary>
          <table className="check-table">
            <thead>
              <tr>
                <th>Condition</th>
                <th>Requested</th>
                <th>Status</th>
                <th>Basis</th>
              </tr>
            </thead>
            <tbody>
              {r.checks.map((c: any) => (
                <tr key={c.condition} className={`st-${c.status}`}>
                  <td>{c.condition}</td>
                  <td>{c.requested}</td>
                  <td>
                    {STATUS_ICON[c.status]} {STATUS_TEXT[c.status] || c.status}
                  </td>
                  <td>{c.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {r.curated_measured_outputs?.length > 0 && (
            <p className="muted small">
              Curated measured outputs: {r.curated_measured_outputs.join(", ")}
            </p>
          )}
          <div className="card-actions">
            <SourceLinks source={r.source_url} doi={r.doi_url} />
            {r.evidence_id && (
              <button
                className="text-button"
                onClick={() => inspect(r.evidence_id)}
              >
                Metadata record
              </button>
            )}
          </div>
        </details>
      ))}
      {p.investigations.length > 4 && (
        <button className="text-button" onClick={() => setAll((v) => !v)}>
          {all
            ? "Show fewer"
            : `Show all ${p.investigations.length} related investigations`}
        </button>
      )}
      <p className="muted small">{p.note}</p>
    </>
  );
}

function MediaBlock({ p }: { p: any }) {
  const assoc: Record<string, string> = {
    from_metadata: "Test association from NASA metadata",
    inferred_from_filename: "Test association inferred from file name",
    none: "No test association recorded",
  };
  return (
    <div className="media-grid">
      {p.items.slice(0, 6).map((m: any) => (
        <figure key={m.media_id}>
          {m.media_type === "video" ? (
            <video
              controls
              preload="none"
              poster={m.thumb_url || undefined}
              src={m.stream_url}
            />
          ) : (
            <img
              src={m.thumb_url || m.stream_url}
              alt={m.caption || `NASA image ${m.investigation_id}`}
              loading="lazy"
            />
          )}
          <figcaption>
            <b>{m.investigation_id}</b>
            {m.run_label ? ` · test ${m.run_label}` : ""} ·{" "}
            {m.caption || "No NASA caption supplied"}
            <small>
              {assoc[m.association]} · Credit: {m.credit} · Original NASA media,
              not SI-generated
            </small>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/** A malformed or unexpected payload degrades to a notice instead of breaking the thread. */
class BlockBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p className="error">
        This research block could not be displayed. Open details or the
        provenance record to inspect its source data.
      </p>
    ) : (
      this.props.children
    );
  }
}

export function InlineBlock({ artifact }: { artifact: Artifact }) {
  const select = useWorkspace((s) => s.select);
  const p = artifact.payload as any;
  if (!p || !p.kind) return null;
  let body: JSX.Element | null = null;
  try {
    if (p.kind === "investigation_ranking") body = <RankingBlock p={p} />;
    else if (p.kind === "evidence_assessment") body = <AssessmentBlock p={p} />;
    else if (p.kind === "media") body = <MediaBlock p={p} />;
    else if (p.kind === "chart" || p.kind === "timeseries")
      body = <ScientificChart chart={p.chart} />;
    else if (p.kind === "comparison")
      body = (
        <>
          <div className="verdict warning">
            {p.validity.verdict.replaceAll("_", " ")}
          </div>
          <ul className="notes">
            {p.validity.checks
              .filter((c: any) => c.status !== "pass")
              .slice(0, 4)
              .map((c: any, i: number) => (
                <li key={i}>
                  <b>{c.rule.replaceAll("_", " ")}:</b> {c.detail}
                </li>
              ))}
          </ul>
          {p.chart && <ScientificChart chart={p.chart} />}
          <p className="notice">{p.association_note}</p>
        </>
      );
    else if (p.kind === "envelope")
      body = (
        <>
          {p.headline && <p className="headline-finding">{p.headline}</p>}
          {p.gravity_note && <div className="notice">{p.gravity_note}</div>}
          {p.chart?.series?.length > 0 && <ScientificChart chart={p.chart} />}
        </>
      );
    else if (p.kind === "table")
      body = (
        <>
          <DataTable
            rows={p.rows.slice(0, 8)}
            units={Object.fromEntries(
              (p.columns || []).map((c: any) => [c.name, c.display_unit]),
            )}
          />
          <p className="muted small">
            Showing {Math.min(8, p.rows.length)} of{" "}
            {p.row_count ?? p.rows.length} source rows.
          </p>
        </>
      );
    else
      body = (
        <p className="muted">
          Open the details panel to view this research artifact.
        </p>
      );
  } catch {
    body = (
      <p className="error">
        This research block could not be displayed. Open details to inspect its
        source data.
      </p>
    );
  }
  return (
    <section
      className={`inline-block kind-${p.kind}`}
      aria-label={artifact.title}
    >
      <header>
        <span className="eyebrow">{artifact.type.replaceAll("_", " ")}</span>
        <h3>{artifact.title}</h3>
        <span className="source-chip">
          {artifact.labels.si_generated
            ? "SI-generated"
            : "Deterministic · NASA sources"}
        </span>
        <button
          className="icon-button"
          aria-label={`Open ${artifact.title} details`}
          onClick={() => select(artifact)}
        >
          <Maximize2 size={14} />
        </button>
      </header>
      <BlockBoundary>{body}</BlockBoundary>
    </section>
  );
}

function StoredBlock({ id }: { id: string }) {
  const { data, error, isLoading } = useQuery({
    queryKey: ["artifact", id],
    queryFn: () => api(`/artifacts/${id}`),
    staleTime: Infinity,
  });
  if (isLoading)
    return <div className="inline-block muted">Loading research block…</div>;
  if (error || !data)
    return (
      <div className="inline-block muted">
        Research artifact unavailable. <ArrowUpRight size={12} />
      </div>
    );
  return <InlineBlock artifact={data} />;
}

/** Order: ranking and evidence assessment first, then measurements, comparisons, media. */
const ORDER = [
  "investigation_ranking",
  "evidence_assessment",
  "comparison",
  "chart",
  "envelope",
  "table",
  "media",
];
export function sortBlocks<T extends { type: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ia = ORDER.indexOf(a.type),
      ib = ORDER.indexOf(b.type);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

export function StoredBlocks({ ids }: { ids: string[] }) {
  return (
    <div className="inline-blocks">
      {ids.map((id) => (
        <StoredBlock key={id} id={id} />
      ))}
    </div>
  );
}
