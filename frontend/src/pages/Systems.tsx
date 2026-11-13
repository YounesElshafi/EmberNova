import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Database, Download, ShieldAlert } from "lucide-react";
import { api } from "../api/client";
import type { Artifact } from "../api/generated/Artifact";
import { PageHead, QueryError, Result } from "./Explorers";

const AREAS = [
  {
    id: "prevention",
    title: "Prevention",
    question: "Which materials burn, and how fast, in spacecraft-like conditions?",
    data: "Saffire I–III sample and flow conditions, Saffire-II microgravity and 1-g spread rates, BASS/BASS-II material logs and gas readings, CFI-G high-oxygen gas flames.",
    links: [
      ["/evidence-map", "What has and has not been tested"],
      ["/envelope", "Check a habitat atmosphere"],
    ],
  },
  {
    id: "detection",
    title: "Detection",
    question: "What does smoke look like to a detector in microgravity?",
    data: "SAME and SAME-R smoke-source conditions (sample, flow, heating, aging). Particle-size results and Saffire smoke-detector telemetry are in NASA files not parsed in this build; their reports are searchable.",
    links: [["/investigations?objective=detection", "Detection investigations"]],
  },
  {
    id: "suppression",
    title: "Suppression",
    question: "How do inert diluents put flames out?",
    data: "FLEX droplet tests diluted with CO₂ or helium, with recorded outcome and extinction diameter (counts computed from the source table on request); FLEX-2 design matrix.",
    links: [["/compare", "Compare FLEX test groups"]],
  },
] as const;

function Card({ i, objective }: { i: any; objective: string }) {
  const basis = (i.tag_basis || []).find((b: any) => b.objective === objective);
  return (
    <Link className="system-card" to={`/investigations/${i.investigation_id}`}>
      <div className="card-kicker">
        <span>{i.is_psi ? "NASA PSI" : "Supplemental"}</span>
        {i.facility && <span>{i.facility}</span>}
      </div>
      <h3>{i.acronym || i.title}</h3>
      {i.acronym && <p className="full-title">{i.title}</p>}
      {i.has_numeric_data && (
        <span className="pill ok">
          <Database size={12} /> numeric data
        </span>
      )}
      {basis && (
        <small className="basis">
          {basis.source === "challenge"
            ? `Challenge statement: “${basis.quote}”`
            : `NASA metadata mentions “${basis.keyword}”`}
        </small>
      )}
    </Link>
  );
}

export function Systems() {
  const { data, error } = useQuery({
    queryKey: ["all-investigations-tagged"],
    queryFn: () => api("/investigations?limit=100"),
  });
  const [artifact, setArtifact] = useState<Artifact | null>(null),
    [busy, setBusy] = useState(false),
    [issue, setIssue] = useState("");
  async function suppression() {
    setBusy(true);
    setIssue("");
    try {
      setArtifact((await api("/suppression", {})).artifact);
    } catch (e) {
      setIssue((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const items: any[] = data?.items || [];
  const fundamental = items.filter(
    (i) =>
      i.fire_safety_objectives?.includes("fundamental") &&
      !["prevention", "detection", "suppression"].some((o) =>
        i.fire_safety_objectives.includes(o),
      ),
  );
  return (
    <main className="page">
      <PageHead
        eyebrow="FIRE-SAFETY SYSTEMS"
        title="Evidence for the next generation of controls."
        description="NASA's spacecraft fire-safety work covers prevention, detection and suppression. Each column lists the investigations that inform it, why they belong there, and what measured data you can use today."
      />
      <QueryError error={error} />
      <div className="systems-grid">
        {AREAS.map((area) => (
          <section className="content-card system-column" key={area.id}>
            <div className="eyebrow">{area.title.toUpperCase()}</div>
            <h2>{area.question}</h2>
            <p className="muted">
              <b>Measured data here:</b> {area.data}
            </p>
            <div className="system-links">
              {area.links.map(([to, text]) => (
                <Link className="text-button" to={to} key={to}>
                  {text} <ArrowUpRight size={13} />
                </Link>
              ))}
              {area.id === "suppression" && (
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => void suppression()}
                >
                  {busy ? "Computing…" : "Show FLEX dilution evidence"}
                </button>
              )}
            </div>
            <div className="system-cards">
              {items
                .filter((i) => i.fire_safety_objectives?.includes(area.id))
                .map((i) => (
                  <Card key={i.investigation_id} i={i} objective={area.id} />
                ))}
            </div>
          </section>
        ))}
      </div>
      {issue && <div className="error">{issue}</div>}
      <Result artifact={artifact} />
      <section className="content-card">
        <h2>Fundamental combustion science</h2>
        <p className="muted">
          Relevant to fire safety, in the challenge's words, "just not as
          strongly or directly": flame structure, soot, cool flames and
          extinction physics that models of real fires build on.
        </p>
        <div className="system-cards inline">
          {fundamental.map((i) => (
            <Card key={i.investigation_id} i={i} objective="fundamental" />
          ))}
        </div>
      </section>
      <section className="content-card download-strip">
        <ShieldAlert size={22} />
        <div>
          <h3>Data for predictive modeling</h3>
          <p className="muted">
            One row per valid measured test, SI units, quality flags and
            source-row provenance, with a data card describing definitions and
            limits. Microgravity only; fuel classes are not interchangeable.
          </p>
        </div>
        {[
          ["liquid_droplet", "Droplets (FLEX, CFI)"],
          ["gaseous_spherical_burner", "Gas flames (CFI-G)"],
          ["solid_fabric", "Fabrics (Saffire)"],
          ["solid_thin", "Thin solids (BASS, Saffire-II)"],
          ["aerosol_smoke_source", "Smoke sources (SAME)"],
        ].map(([fc, text]) => (
          <a
            className="button secondary"
            key={fc}
            href={`/api/export/model-ready?fuel_class=${fc}`}
          >
            <Download size={14} /> {text}
          </a>
        ))}
      </section>
    </main>
  );
}

export function EvidenceMap() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["coverage"],
    queryFn: () => api("/coverage"),
  });
  const [selected, setSelected] = useState<any>(null);
  return (
    <main className="page">
      <PageHead
        eyebrow="EVIDENCE MAP"
        title="What NASA has tested — and what it has not."
        description="Every measured test in this PSI snapshot, placed by fuel type, ambient oxygen and total pressure. Empty cells are research gaps, not safety statements."
      />
      <QueryError error={error} />
      {isLoading && <div className="skeleton">Counting NASA tests…</div>}
      {data && (
        <>
          <section className="content-card findings">
            <h2>Findings</h2>
            <ul className="notes">
              {data.findings.map((f: string) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p className="muted">{data.note}</p>
          </section>
          {data.fuel_classes.map((fc: any) => {
            const count = (o: string, p: string) =>
              fc.cells.find(
                (c: any) => c.o2_band === o && c.pressure_band === p,
              );
            return (
              <section className="content-card gap-map" key={fc.fuel_class}>
                <div className="section-bar">
                  <div>
                    <h2>{fc.label}</h2>
                    <p className="muted">
                      {fc.n_runs} measured tests · {fc.investigations.join(", ")}
                    </p>
                  </div>
                </div>
                <div className="table-scroll">
                  <table className="gap-table">
                    <thead>
                      <tr>
                        <th>Ambient O₂ \ Total pressure</th>
                        {data.pressure_bands.map((p: string) => (
                          <th key={p}>{p}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.o2_bands.map((o: string) => (
                        <tr key={o}>
                          <th scope="row">{o}</th>
                          {data.pressure_bands.map((p: string) => {
                            const c = count(o, p);
                            const lunar =
                              o.includes("lunar") && p.includes("lunar");
                            return (
                              <td
                                key={p}
                                className={`${c ? "filled" : "empty"} ${lunar ? "lunar" : ""}`}
                              >
                                {c ? (
                                  <button
                                    onClick={() => setSelected({ ...c, fc: fc.label })}
                                    aria-label={`${c.n_runs} tests: ${o}, ${p}`}
                                  >
                                    {c.n_runs}
                                  </button>
                                ) : (
                                  <span aria-label="no test">·</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {fc.burner_oxygen && (
                  <p className="notice">
                    {fc.burner_oxygen.n_runs} tests report burner-stream oxygen
                    up to {fc.burner_oxygen.max_percent}%.{" "}
                    {fc.burner_oxygen.note}
                  </p>
                )}
              </section>
            );
          })}
          {selected && (
            <section className="content-card">
              <h3>
                {selected.fc}: {selected.n_runs} tests at {selected.o2_band},{" "}
                {selected.pressure_band}
              </h3>
              <p>Investigations: {selected.investigations.join(", ")}</p>
              <p className="muted hash">{selected.run_uids.slice(0, 40).join(" · ")}</p>
            </section>
          )}
          <section className="content-card">
            <h2>Partial gravity</h2>
            <p>
              No lunar (1/6 g) or Martian (3/8 g) combustion test exists in
              PSI. These sources are labeled supplemental: planned experiments
              or simulated reduced-gravity reports, not measured lunar data.
            </p>
            <ul className="notes">
              {data.partial_gravity_sources.map((s: any) => (
                <li key={s.investigation_id}>
                  <Link to={`/investigations/${s.investigation_id}`}>
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
