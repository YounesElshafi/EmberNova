import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { Reveal } from "../components/Reveal";

type Stage = { id: string; n: string; title: string; short: string; detail: string[]; tone: "data" | "agent" | "trust" };

const STAGES: Stage[] = [
  {
    id: "corpus",
    n: "01",
    title: "Verified NASA corpus",
    short: "PSI files hashed, parsed and curated",
    tone: "data",
    detail: [
      "The NASA Physical Sciences Informatics (PSI) snapshot is read-only. Each original file is verified by SHA-256 before ingestion.",
      "Reports are split into physical pages and indexed for full-text (SQLite FTS5) and semantic search.",
      "Measurement tables are mapped column by column in curated YAML files. Every mapping records its evidence locator, and unknown values stay null.",
      "Values are converted with pint. The raw value and unit are stored next to the SI value.",
    ],
  },
  {
    id: "bundle",
    n: "02",
    title: "Analysis Bundle",
    short: "One Parquet store of measured tests",
    tone: "data",
    detail: [
      "All curated tables are merged into one Parquet Analysis Bundle, queried with DuckDB.",
      "Each row keeps its investigation ID, source file hash, row locator and transformation steps.",
      "Plausibility warnings, such as composition sums or extinction diameter larger than initial diameter, are flagged. Source values are never altered.",
    ],
  },
  {
    id: "agent",
    n: "03",
    title: "Bounded research agent",
    short: "One SI agent, deterministic tools",
    tone: "agent",
    detail: [
      "One OpenAI Responses agent plans the research. It does not compute or recall numbers itself: it calls read-only tools.",
      "Tools: search_investigations, search_documents, get_investigation, get_document_page, list_datasets, query_measurements, make_chart, compare_runs, check_applicability_envelope, assess_evidence, map_evidence_coverage, suppression_overview and find_media.",
      "Each turn is limited by configurable caps on tool rounds, time and cost. By default these are six rounds, 120 seconds and about $0.30.",
    ],
  },
  {
    id: "ledger",
    n: "04",
    title: "Evidence ledger",
    short: "Every passage and row gets an ID",
    tone: "trust",
    detail: [
      "Every passage, row set, metadata record and media item a tool returns is registered with a deterministic evidence ID.",
      "Typed research blocks (rankings, evidence assessments, charts, comparisons, envelopes, tables and media) are stored as artifacts that link back to that evidence.",
    ],
  },
  {
    id: "answer",
    n: "05",
    title: "Validated answer",
    short: "Citations checked, numbers audited",
    tone: "trust",
    detail: [
      "The answer is written in four parts: answer, evidence, engineering implications and limits.",
      "Any citation marker that does not resolve to this turn's ledger is removed. An automated audit counts uncited statements and numbers missing from the cited evidence.",
      "SI-written prose carries a visible SI badge. Charts of measured data are never written by the model.",
    ],
  },
  {
    id: "inspect",
    n: "06",
    title: "Inspect and export",
    short: "Open the source and reproduce the result",
    tone: "trust",
    detail: [
      "Click a citation or chart point to open the full report page or source rows, with hash, DOI and the transformation chain.",
      "Export the result bundle (query, source hashes, rows, computation record) or model-ready data with a data card.",
    ],
  },
];

export function HowItWorks() {
  const [active, setActive] = useState("agent");
  const stage = STAGES.find((s) => s.id === active)!;
  const { data: meta } = useQuery({ queryKey: ["meta"], queryFn: () => api("/meta") });
  return (
    <main className="page how-page">
      <header className="page-hero">
        <p className="eyebrow ember">How it works</p>
        <h1 className="display-sm">
          The model chooses the tools.
          <br />
          <em>The data provides the numbers.</em>
        </h1>
        <p className="lede">
          EmberNova separates SI interpretation from scientific computation. The language model plans and explains.
          Deterministic, read-only tools retrieve and compute every measured value it reports.
        </p>
      </header>

      <section className="pipeline" aria-label="EmberNova pipeline">
        <ol className="pipe-track" role="tablist" aria-label="Pipeline stages">
          {STAGES.map((s) => (
            <li key={s.id}>
              <button
                role="tab"
                aria-selected={active === s.id}
                aria-controls="pipe-detail"
                className={`pipe-node tone-${s.tone} ${active === s.id ? "on" : ""}`}
                onClick={() => setActive(s.id)}
              >
                <span className="pipe-n">{s.n}</span>
                <b>{s.title}</b>
                <small>{s.short}</small>
              </button>
            </li>
          ))}
        </ol>
        <div className="pipe-detail" id="pipe-detail" role="tabpanel" key={stage.id}>
          <span className={`pipe-badge tone-${stage.tone}`}>
            {stage.tone === "data" ? "Deterministic data" : stage.tone === "agent" ? "SI orchestration" : "Verification"}
          </span>
          <h2>{stage.title}</h2>
          <ul>
            {stage.detail.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="how-legend">
        <Reveal className="legend-card tone-data">
          <h3>Deterministic data</h3>
          <p>Python code, curated mappings and stored NASA files. The same input gives the same output.</p>
        </Reveal>
        <Reveal className="legend-card tone-agent" delay={80}>
          <h3>SI orchestration</h3>
          <p>
            The model chooses which tools to call and writes the explanation. Its prose is badged SI.
            {meta?.models?.agent ? ` Configured model: ${meta.models.agent}.` : ""}
          </p>
        </Reveal>
        <Reveal className="legend-card tone-trust" delay={160}>
          <h3>Verification</h3>
          <p>Ledger IDs, citation checks, number audits and the source inspector let a reviewer check the result.</p>
        </Reveal>
      </section>

      <Reveal as="section" className="how-facts">
        <div>
          <h3>Retrieval</h3>
          <p>
            BM25 full-text search is combined with semantic embeddings using reciprocal rank fusion. Results must
            pass a relevance floor.{" "}
            {meta?.retrieval_mode && (
              <span className="mono">Current mode: {meta.retrieval_mode === "hybrid" ? "hybrid" : "lexical fallback"}.</span>
            )}
          </p>
        </div>
        <div>
          <h3>Code execution</h3>
          <p>
            The EmberNova server never runs model-written code. The optional Analysis Lab runs it in a hosted 1 GB
            container with networking disabled and hash-verified inputs.
          </p>
        </div>
        <div>
          <h3>Sessions</h3>
          <p>
            Research threads are private to each visitor, through a cookie. Recorded sessions replay through the
            same event reducer as live turns, without any model call.
          </p>
        </div>
      </Reveal>
      <div className="center-cta">
        <Link to="/capabilities" className="btn btn-ghost">
          See every capability <ArrowRight size={15} />
        </Link>
        <Link to="/about" className="btn btn-quiet">
          Methods & disclosure
        </Link>
      </div>
    </main>
  );
}
