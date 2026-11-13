import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Search,
  FlaskConical,
  Download,
  FileText,
  PlayCircle,
  Image as ImageIcon,
} from "lucide-react";
import { api } from "../api/client";
import { ArtifactView, DataTable } from "../artifacts/ArtifactView";
import { EvidenceInspector } from "../components/EvidenceInspector";
import type { Artifact } from "../api/generated/Artifact";
import { useWorkspace } from "../state";
import { label, unitLabel } from "../format";

export function PageHead({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="page-head">
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}
export function QueryError({ error }: { error: Error | null }) {
  return error ? <div className="error">{error.message}</div> : null;
}
export function Result({ artifact }: { artifact: Artifact | null }) {
  const id = useWorkspace((s) => s.evidenceId);
  const inspect = useWorkspace((s) => s.inspect);
  useEffect(() => {
    inspect(null);
  }, [artifact, inspect]);
  return artifact ? (
    <section className="result-card">
      {id ? (
        <>
          <button className="text-button" onClick={() => inspect(null)}>
            ← Return to analysis
          </button>
          <EvidenceInspector id={id} />
        </>
      ) : (
        <ArtifactView artifact={artifact} />
      )}
    </section>
  ) : null;
}

export function Investigations() {
  const [params] = useSearchParams();
  const [q, setQ] = useState(""),
    [query, setQuery] = useState(""),
    [objective, setObjective] = useState(params.get("objective") || "");
  const { data, error, isLoading } = useQuery({
    queryKey: ["investigations", query, objective],
    queryFn: () =>
      api(
        `/investigations?limit=100&q=${encodeURIComponent(query)}${objective ? `&objective=${objective}` : ""}`,
      ),
  });
  const { data: meta } = useQuery({
    queryKey: ["meta"],
    queryFn: () => api("/meta"),
  });
  const mode =
    meta?.retrieval_mode === "hybrid"
      ? "lexical + semantic relevance"
      : "lexical relevance (semantic index unavailable)";
  return (
    <main className="page">
      <PageHead
        eyebrow="INVESTIGATION EXPLORER"
        title="Find the research that matters."
        description="Explore NASA combustion investigations, their objectives, apparatus, and local evidence. Supplemental sources are labeled."
      />
      <form
        className="filter-bar"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(q);
        }}
      >
        <div className="search-input">
          <Search size={17} />
          <input
            aria-label="Search investigations"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a question, investigation, or material…"
          />
        </div>
        <select
          aria-label="Fire safety objective"
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
        >
          <option value="">All fire-safety roles</option>
          <option value="prevention">Prevention</option>
          <option value="detection">Detection</option>
          <option value="suppression">Suppression</option>
          <option value="fundamental">Fundamental combustion</option>
        </select>
        <button className="button secondary">Search</button>
      </form>
      <QueryError error={error} />
      {isLoading ? (
        <div className="skeleton">Searching the NASA catalog…</div>
      ) : (
        <>
          <div className="results-heading">
            {data?.total} investigations{" "}
            <span>
              Local snapshot · {query ? mode : "catalog order"}
              {objective ? ` · curated ${objective} tag` : ""}
            </span>
          </div>
          {data?.notes?.map((n: string) => (
            <div className="notice" key={n}>
              {n}
            </div>
          ))}
          <div className="investigation-grid">
            {data?.items.map((r: any) => (
              <Link
                className="investigation-card"
                to={`/investigations/${r.investigation_id}`}
                key={r.investigation_id}
              >
                <div className="card-kicker">
                  <span>{r.investigation_id}</span>
                  <span>{r.is_psi ? "NASA PSI" : "Supplemental"}</span>
                </div>
                <h2>{r.acronym || r.title}</h2>
                <p className="full-title">{r.title}</p>
                <div className="tag-row">
                  {(r.fire_safety_objectives || []).map((o: string) => (
                    <span className={`pill tag-${o}`} key={o}>
                      {o}
                    </span>
                  ))}
                  {(r.has_numeric_data || r.datasets?.length > 0) && (
                    <span className="pill ok">numeric data</span>
                  )}
                </div>
                <p>
                  {(r.objectives || r.relevance || r.availability_notes).slice(
                    0,
                    240,
                  )}
                  …
                </p>
                <div className="card-bottom">
                  <span>
                    {r.subcategory || r.platform || "Combustion research"}
                  </span>
                  <ArrowUpRight size={16} />
                </div>
                {r.components && (
                  <small title="Text match is the fused lexical and semantic rank on a fixed 0–1 scale; it is not a measure of scientific strength.">
                    Text match {r.components.text_rrf.toFixed(2)}
                    {objective
                      ? ` · ${objective} tag ${r.components.facet ? "yes" : "no"}`
                      : ""}
                  </small>
                )}
              </Link>
            ))}
          </div>
          {data?.total === 0 && (
            <div className="empty-note">
              {data?.no_match
                ? "Nothing in the NASA combustion corpus is a strong match for this query. "
                : "No investigation matched. "}
              Try an investigation name (FLEX, Saffire, SAME), a material, or a
              fire-safety term such as flame spread, smoke or extinction.
            </div>
          )}
        </>
      )}
    </main>
  );
}

export function MediaCards({ items }: { items: any[] }) {
  return (
    <div className="media-grid">
      {items.map((m: any) => (
        <article className="media-card" key={m.media_id}>
          {m.media_type === "video" ? (
            <video
              controls
              preload="metadata"
              poster={m.thumb_url || undefined}
              src={m.stream_url}
              aria-label={m.filename}
            />
          ) : (
            <img
              src={m.stream_url}
              alt={m.caption || `NASA source image: ${m.filename}`}
            />
          )}
          <div>
            <div className="eyebrow">
              {m.media_type === "video" ? (
                <PlayCircle size={13} />
              ) : (
                <ImageIcon size={13} />
              )}{" "}
              ORIGINAL NASA {m.media_type.toUpperCase()}
            </div>
            <h3>{m.caption || m.filename}</h3>
            <p>
              {m.credit} · association: {m.association.replaceAll("_", " ")}
            </p>
            {m.run_label && <p>Filename label: {m.run_label}</p>}
            <a
              href={m.source_record_url || m.source_url}
              target="_blank"
              rel="noreferrer"
            >
              NASA source <ArrowUpRight size={12} />
            </a>
            <details>
              <summary>Source integrity</summary>
              <small className="hash">SHA-256 {m.sha256}</small>
            </details>
          </div>
        </article>
      ))}
    </div>
  );
}

export function Investigation() {
  const { id } = useParams();
  const [tab, setTab] = useState("Overview");
  const { data, error, isLoading } = useQuery({
    queryKey: ["investigation", id],
    queryFn: () => api(`/investigations/${id}`),
  });
  const inspect = useWorkspace((s) => s.inspect);
  const evidenceId = useWorkspace((s) => s.evidenceId);
  useEffect(() => {
    inspect(null);
  }, [id, inspect]);
  if (isLoading)
    return (
      <main className="page skeleton">Loading investigation evidence…</main>
    );
  if (error || !data)
    return (
      <main className="page">
        <QueryError error={error} />
      </main>
    );
  return (
    <main className="page">
      <Link className="back-link" to="/investigations">
        ← Investigations
      </Link>
      <PageHead
        eyebrow={`${data.investigation_id} · ${data.is_psi ? "NASA PSI" : "SUPPLEMENTAL SOURCE"}`}
        title={data.acronym || data.title}
        description={data.title}
      />
      <div className="badge-row">
        <span className="source-chip">Source metadata</span>
        <a
          className="text-button"
          href={data.source_url}
          target="_blank"
          rel="noreferrer"
        >
          NASA record <ArrowUpRight size={13} />
        </a>
        {data.doi && (
          <a
            href={`https://doi.org/${data.doi}`}
            target="_blank"
            rel="noreferrer"
          >
            DOI {data.doi}
          </a>
        )}
      </div>
      <nav className="tabs" aria-label="Investigation sections">
        {[
          "Overview",
          "Variables",
          "Datasets",
          "Documents",
          "Media",
          "Publications",
        ].map((t) => (
          <button
            key={t}
            aria-pressed={tab === t}
            className={tab === t ? "active" : ""}
            onClick={() => {
              setTab(t);
              inspect(null);
            }}
          >
            {t}
            {t === "Datasets" ? ` (${data.datasets.length})` : ""}
          </button>
        ))}
      </nav>
      {evidenceId ? (
        <>
          <button className="text-button" onClick={() => inspect(null)}>
            ← Return to investigation
          </button>
          <EvidenceInspector id={evidenceId} />
        </>
      ) : (
        <>
          {tab === "Overview" && (
            <div className="overview-grid">
              <section className="content-card">
                <h2>Research objectives</h2>
                <p className="source-prose">{data.objectives}</p>
                <h2>Experimental approach</h2>
                <p className="source-prose">{data.approach}</p>
              </section>
              <aside className="content-card">
                <h3>Experimental context</h3>
                <dl>
                  {[
                    "platform",
                    "hardware",
                    "principal_investigator",
                    "institution",
                    "project_type",
                    "license",
                  ].map((k) => (
                    <div key={k}>
                      <dt>{k.replaceAll("_", " ")}</dt>
                      <dd>{data[k] || "Unknown"}</dd>
                    </div>
                  ))}
                </dl>
                <div className="notice">{data.limitations.join(" ")}</div>
              </aside>
            </div>
          )}
          {tab === "Variables" && (
            <section className="content-card">
              <h2>Conditions and measurements</h2>
              <p className="muted">
                Ranges are computed from mapped scalar values in the local
                Analysis Bundle. Lists and ranges in design matrices are not
                measured tests.
              </p>
              <DataTable
                rows={data.variables.map((v: any) =>
                  Object.fromEntries(
                    Object.entries(v).filter(
                      ([key]) =>
                        !["evidence_ids", "transform_steps"].includes(key),
                    ),
                  ),
                )}
              />
              <p className="muted">
                Counts describe contributing source values; separate tables can
                describe the same experiment. Invalid and duplicate rows are
                excluded.
              </p>
              <details>
                <summary>Trace variable summaries to source rows</summary>
                {data.variables.map((v: any) => (
                  <div key={v.name}>
                    <p className="muted">{v.transform_steps.join(" → ")}</p>
                    {v.evidence_ids.map((eid: string, index: number) => (
                      <button
                        className="text-button"
                        key={eid}
                        onClick={() => inspect(eid)}
                      >
                        Trace {v.name}
                        {v.evidence_ids.length > 1
                          ? ` · source ${index + 1}`
                          : ""}
                      </button>
                    ))}
                  </div>
                ))}
              </details>
              {!data.variables.length && (
                <p>
                  Structured numerical values are not curated for this
                  investigation. Inspect the source documents.
                </p>
              )}
              {data.datasets.map((d: any) => (
                <Link
                  className="text-button"
                  to={`/data/${d.table_id}`}
                  key={d.table_id}
                >
                  Inspect {d.title} and raw provenance{" "}
                  <ArrowUpRight size={13} />
                </Link>
              ))}
            </section>
          )}
          {tab === "Datasets" && (
            <div className="dataset-cards">
              {data.datasets.map((d: any) => (
                <Link
                  className="content-card dataset-card"
                  to={`/data/${d.table_id}`}
                  key={d.table_id}
                >
                  <FlaskConical />
                  <h2>{d.title}</h2>
                  <p>
                    {d.row_count} source rows · {d.kind.replaceAll("_", " ")}
                  </p>
                  <span>
                    Open raw and normalized data <ArrowUpRight size={14} />
                  </span>
                </Link>
              ))}
              {!data.datasets.length && (
                <div className="empty-note">
                  No normalized numeric dataset yet. Original scientific reports
                  remain searchable.
                </div>
              )}
            </div>
          )}
          {tab === "Documents" && (
            <div className="document-list">
              {data.documents.map((d: any) => (
                <button
                  key={d.file_id}
                  onClick={() =>
                    api(
                      `/documents/${encodeURIComponent("doc:" + d.file_id)}/pages/1`,
                    )
                      .then((p) => inspect(p.evidence_id))
                      .catch((e) => alert(e.message))
                  }
                >
                  <FileText size={20} />
                  <div>
                    <b>{d.filename}</b>
                    <p>
                      {d.parts} physical pages / extracted parts · {d.method}
                    </p>
                  </div>
                  <ArrowUpRight size={17} />
                </button>
              ))}
            </div>
          )}
          {tab === "Media" && (
            <>
              {data.media.length ? (
                <MediaCards items={data.media} />
              ) : (
                <div className="empty-note">
                  No original media downloaded for this investigation.
                </div>
              )}
            </>
          )}
          {tab === "Publications" && (
            <div className="document-list">
              {data.publications.map((p: any, i: number) => (
                <article className="content-card" key={i}>
                  <h3>{p.title}</h3>
                  <p>{p.authorList || "Authors unknown"}</p>
                  {p.doi && (
                    <a
                      href={`https://doi.org/${p.doi}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      DOI {p.doi} <ArrowUpRight size={12} />
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}

export function Dataset() {
  const { tableId = "PSI-69:flex_experimental" } = useParams();
  const [view, setView] = useState("normalized"),
    [cursor, setCursor] = useState(0),
    [x, setX] = useState("o2_mole_fraction"),
    [y, setY] = useState("burning_rate_constant"),
    [artifact, setArtifact] = useState<Artifact | null>(null),
    [busy, setBusy] = useState(false),
    [issue, setIssue] = useState("");
  const { data: datasets } = useQuery({
    queryKey: ["datasets"],
    queryFn: () => api("/datasets"),
  });
  const { data, error, isLoading } = useQuery({
    queryKey: ["dataset", tableId, view, cursor],
    queryFn: () =>
      api(
        `/datasets/${encodeURIComponent(tableId)}?view=${view}&limit=50&cursor=${cursor}`,
      ),
  });
  useEffect(() => {
    setCursor(0);
    setArtifact(null);
  }, [tableId]);
  useEffect(() => {
    if (!data?.variables?.length) return;
    const fields = data.variables.filter((v: any) => v.unit_si);
    setX(
      fields.find((v: any) => v.name === "o2_mole_fraction")?.name ||
        fields[0]?.name ||
        "",
    );
    setY(
      fields.find((v: any) => v.name === "burning_rate_constant")?.name ||
        fields.find((v: any) => v.kind === "measurement")?.name ||
        fields[1]?.name ||
        fields[0]?.name ||
        "",
    );
  }, [data?.table_id]);
  async function chart(d2 = false) {
    setBusy(true);
    setIssue("");
    try {
      const result = await api(
        d2 ? "/checks/d2law" : "/charts",
        d2
          ? { table_id: tableId }
          : {
              table_ids: [tableId],
              x,
              y,
              color_by: tableId.startsWith("PSI-69") ? "fuel_canonical" : null,
              title: `${y.replaceAll("_", " ")} vs ${x.replaceAll("_", " ")}`,
            },
      );
      setArtifact(result.artifact);
    } catch (e) {
      setIssue((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const numeric = data?.variables || [];
  return (
    <main className="page">
      <PageHead
        eyebrow="DATASET EXPLORER"
        title="Every measurement has a source."
        description="Inspect original cells, curated units, quality flags, and deterministic analyses. Normalized tables use the displayed column units."
      />
      <div className="dataset-switch">
        {datasets?.map((d: any) => (
          <Link
            key={d.table_id}
            className={tableId === d.table_id ? "active" : ""}
            to={`/data/${d.table_id}`}
          >
            {d.title.split(/[(:]/)[0].trim()}{" "}
            <span>{d.kind === "conditions_design" ? "design" : `${d.row_count} rows`}</span>
          </Link>
        ))}
      </div>
      <QueryError error={error} />
      {isLoading ? (
        <div className="skeleton">Reading NASA measurements…</div>
      ) : (
        data && (
          <>
            <div className="section-bar">
              <div>
                <h2>{data.title}</h2>
                <p>
                  {data.total} source rows · {data.kind.replaceAll("_", " ")}
                </p>
              </div>
              <div className="segmented">
                <button
                  className={view === "normalized" ? "active" : ""}
                  onClick={() => {
                    setView("normalized");
                    setCursor(0);
                  }}
                >
                  Normalized
                </button>
                <button
                  className={view === "raw" ? "active" : ""}
                  onClick={() => {
                    setView("raw");
                    setCursor(0);
                  }}
                >
                  Raw cells
                </button>
              </div>
              <a
                className="button secondary"
                href={`/api/datasets/${encodeURIComponent(tableId)}/export`}
              >
                <Download size={14} /> Export CSV
              </a>
              <a
                className="button secondary"
                href="/api/export/model-ready"
                title="All measured tests in SI units with provenance and a data card"
              >
                <Download size={14} /> Model-ready data
              </a>
            </div>
            <div className="unit-key">
              {numeric.map((v: any) => (
                <span key={v.name}>
                  {label(v.name)}{" "}
                  <b>{unitLabel(v.display_unit, v.name) || (v.unit_si ? "ratio" : "unit not stated")}</b>
                </span>
              ))}
            </div>
            <div className="content-card dataset-table">
              <DataTable
                rows={data.rows}
                units={
                  view === "normalized"
                    ? Object.fromEntries(numeric.map((v: any) => [v.name, v.display_unit]))
                    : undefined
                }
              />
              <div className="pagination">
                <span>
                  Rows {cursor + 1}–{Math.min(cursor + 50, data.total)} of{" "}
                  {data.total}
                </span>
                <button
                  disabled={cursor === 0}
                  onClick={() => setCursor((c) => Math.max(0, c - 50))}
                >
                  Previous
                </button>
                <button
                  disabled={!data.next_cursor}
                  onClick={() => setCursor(Number(data.next_cursor))}
                >
                  Next
                </button>
              </div>
            </div>
            <div className="notice">
              Invalid or encoding-damaged rows are visible here and excluded
              from analyses by default. Inferred burning-rate units retain their
              raw header and the NASA report locator.{" "}
              {data.kind === "conditions_design"
                ? "This table describes design ranges and lists, not measured test combinations."
                : ""}
            </div>
            <section className="chart-builder content-card">
              <div>
                <h3>Quick analysis</h3>
                <p>
                  Charts are computed by the backend from NASA measurements.
                </p>
              </div>
              <label>
                X axis
                <select value={x} onChange={(e) => setX(e.target.value)}>
                  {numeric.filter((v: any) => v.unit_si).map((v: any) => (
                    <option key={v.name} value={v.name}>
                      {label(v.name)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Y axis
                <select value={y} onChange={(e) => setY(e.target.value)}>
                  {numeric.filter((v: any) => v.unit_si).map((v: any) => (
                    <option key={v.name} value={v.name}>
                      {label(v.name)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button"
                disabled={busy}
                onClick={() => void chart()}
              >
                {busy ? "Computing…" : "Build chart"}
              </button>
              {tableId.startsWith("PSI-69") && (
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => void chart(true)}
                >
                  Check d²-law
                </button>
              )}
            </section>
          </>
        )
      )}
      {issue && <div className="error">{issue}</div>}
      <Result artifact={artifact} />
    </main>
  );
}
