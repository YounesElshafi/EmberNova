import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  PlayCircle,
  ShieldCheck,
  FlaskConical,
  ExternalLink,
} from "lucide-react";
import { api } from "../api/client";
import type { Artifact } from "../api/generated/Artifact";
import { MediaCards, PageHead, QueryError, Result } from "./Explorers";

const PSI = { psi: 1, mmHg: 51.71493, atm: 0.068046, kPa: 6.894757 } as const;
type PressureUnit = keyof typeof PSI;
const round = (v: number) => Number(v.toPrecision(4));

export function Envelope() {
  // Presets are defined in psi (the challenge's reference values) and shown in any unit.
  const presets: Record<string, [number, number, number, number, string, string]> = {
    lunar: [30, 36, 8, 10.2, "lunar", "Lunar habitat atmosphere reference"],
    earth: [20.9, 21.1, 14.5, 14.9, "earth", "Earth-like cabin atmosphere"],
    suit: [95, 100, 4.2, 4.4, "microgravity", "Spacesuit atmosphere reference"],
  };
  const [preset, setPreset] = useState("lunar"),
    [unit, setUnit] = useState<PressureUnit>("psi"),
    [lo, setLo] = useState(30),
    [hi, setHi] = useState(36),
    [plo, setPlo] = useState(8),
    [phi, setPhi] = useState(10.2),
    [gravity, setGravity] = useState("lunar");
  const [artifact, setArtifact] = useState<Artifact | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function choose(value: string) {
    setPreset(value);
    const p = presets[value];
    setLo(p[0]);
    setHi(p[1]);
    setPlo(round(p[2] * PSI[unit]));
    setPhi(round(p[3] * PSI[unit]));
    setGravity(p[4]);
  }
  function changeUnit(next: PressureUnit) {
    setPlo(round((plo / PSI[unit]) * PSI[next]));
    setPhi(round((phi / PSI[unit]) * PSI[next]));
    setUnit(next);
  }
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const d = await api("/envelope", {
        scenario_label: presets[preset]?.[5] || "Custom atmosphere reference",
        o2_mole_fraction: { min: lo / 100, max: hi / 100 },
        total_pressure: { min: plo, max: phi, unit },
        gravity,
      });
      setArtifact(d.artifact);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="page">
      <PageHead
        eyebrow="APPLICABILITY ENVELOPE"
        title="Where does the evidence reach?"
        description="Map an atmospheric scenario to real NASA tests. Find nearby measurements, missing conditions, and gravity gaps. This tool does not predict fire risk or certify safety."
      />
      <div className="scenario-presets">
        {[
          ["lunar", "Lunar habitat", "Challenge atmosphere reference"],
          ["earth", "Earth-like cabin", "Atmosphere reference"],
          ["suit", "Spacesuit", "Atmosphere reference"],
        ].map(([id, name, description]) => (
          <button
            key={id}
            className={preset === id ? "active" : ""}
            onClick={() => choose(id)}
          >
            <span>{name}</span>
            <small>{description}</small>
          </button>
        ))}
      </div>
      <form
        className="content-card scenario-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <fieldset>
          <legend>
            Oxygen concentration <span>% by volume (mole fraction × 100)</span>
          </legend>
          <label>
            Minimum
            <input
              aria-label="Oxygen minimum percent"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={lo}
              onChange={(e) => setLo(Number(e.target.value))}
            />
          </label>
          <label>
            Maximum
            <input
              aria-label="Oxygen maximum percent"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={hi}
              onChange={(e) => setHi(Number(e.target.value))}
            />
          </label>
        </fieldset>
        <fieldset>
          <legend>
            Total pressure{" "}
            <select
              aria-label="Pressure unit"
              value={unit}
              onChange={(e) => changeUnit(e.target.value as PressureUnit)}
            >
              <option value="psi">psi absolute</option>
              <option value="mmHg">mmHg</option>
              <option value="atm">atm</option>
              <option value="kPa">kPa</option>
            </select>
          </legend>
          <label>
            Minimum
            <input
              aria-label={`Pressure minimum ${unit}`}
              type="number"
              min="0"
              step="any"
              value={plo}
              onChange={(e) => setPlo(Number(e.target.value))}
            />
          </label>
          <label>
            Maximum
            <input
              aria-label={`Pressure maximum ${unit}`}
              type="number"
              min="0"
              step="any"
              value={phi}
              onChange={(e) => setPhi(Number(e.target.value))}
            />
          </label>
        </fieldset>
        <label>
          Scenario gravity
          <select
            aria-label="Scenario gravity"
            value={gravity}
            onChange={(e) => setGravity(e.target.value)}
          >
            <option value="lunar">Lunar</option>
            <option value="martian">Martian</option>
            <option value="microgravity">Microgravity</option>
            <option value="earth">Earth</option>
          </select>
        </label>
        <button className="button" disabled={busy}>
          {busy ? "Checking source conditions…" : "Explore coverage"}{" "}
          <ArrowUpRight size={15} />
        </button>
      </form>
      {error && <div className="error">{error}</div>}
      <Result artifact={artifact} />
      {!artifact && (
        <div className="method-note">
          <ShieldCheck size={24} />
          <div>
            <h3>A coverage map, with scientific limits.</h3>
            <p>
              Oxygen fraction and total pressure are checked jointly. Unknown
              conditions remain unknown. Design matrices do not become measured
              test combinations, and no partial-gravity experiment is invented.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

export function Comparison() {
  const [fuel, setFuel] = useState("methanol"),
    [a, setA] = useState([20, 22, 740, 780]),
    [b, setB] = useState([30, 34, 520, 560]);
  const [artifact, setArtifact] = useState<Artifact | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function group(values: number[], set: (v: number[]) => void, title: string) {
    return (
      <fieldset className="comparison-group">
        <legend>{title}</legend>
        <label>
          O₂ minimum (%)
          <input
            type="number"
            value={values[0]}
            onChange={(e) => set([Number(e.target.value), ...values.slice(1)])}
          />
        </label>
        <label>
          O₂ maximum (%)
          <input
            type="number"
            value={values[1]}
            onChange={(e) =>
              set([values[0], Number(e.target.value), ...values.slice(2)])
            }
          />
        </label>
        <label>
          Pressure minimum (mmHg)
          <input
            type="number"
            value={values[2]}
            onChange={(e) =>
              set([...values.slice(0, 2), Number(e.target.value), values[3]])
            }
          />
        </label>
        <label>
          Pressure maximum (mmHg)
          <input
            type="number"
            value={values[3]}
            onChange={(e) =>
              set([...values.slice(0, 3), Number(e.target.value)])
            }
          />
        </label>
      </fieldset>
    );
  }
  async function submit() {
    setBusy(true);
    setError("");
    const make = (v: number[], label: string) => ({
      label,
      table_id: "PSI-69:flex_experimental",
      filters: [
        {
          field: "o2_mole_fraction",
          op: "between",
          values: [v[0], v[1]],
          unit: "percent",
        },
        {
          field: "total_pressure",
          op: "between",
          values: [v[2], v[3]],
          unit: "mmHg",
        },
        { field: "fuel_canonical", op: "eq", values: [fuel], unit: null },
      ],
    });
    try {
      const result = await api("/compare", {
        groups: [make(a, "Group A"), make(b, "Group B")],
        quantities: [
          "burning_rate_constant",
          "extinction_diameter",
          "burn_time",
        ],
      });
      setArtifact(result.artifact);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="page">
      <PageHead
        eyebrow="EXPERIMENT COMPARISON"
        title="Compare conditions. Keep the caveats."
        description="Compare source-linked FLEX test groups and inspect differences in oxygen, pressure, fuel, and droplet size. The validity checklist identifies confounding conditions."
      />
      <form
        className="content-card comparison-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="section-bar">
          <h2>FLEX · measured droplet tests</h2>
          <label>
            Fuel
            <select value={fuel} onChange={(e) => setFuel(e.target.value)}>
              <option value="methanol">Methanol</option>
              <option value="n-heptane">n-Heptane</option>
            </select>
          </label>
        </div>
        <div className="group-grid">
          {group(a, setA, "Group A · reference atmosphere")}
          {group(b, setB, "Group B · comparison atmosphere")}
        </div>
        <button className="button" disabled={busy}>
          {busy
            ? "Checking scientific compatibility…"
            : "Compare source measurements"}{" "}
          <ArrowUpRight size={15} />
        </button>
      </form>
      {error && <div className="error">{error}</div>}
      <Result artifact={artifact} />
    </main>
  );
}

export function Featured() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["replays"],
    queryFn: () => api("/replays"),
  });
  return (
    <main className="page">
      <PageHead
        eyebrow="RECORDED RESEARCH"
        title="Follow a complete evidence trail."
        description="Recorded demonstrations remain available without live OpenAI requests. Each card identifies whether it contains a recorded model session or a scripted, deterministic evidence walkthrough."
      />
      <QueryError error={error} />
      {isLoading ? (
        <div className="skeleton">Loading recordings…</div>
      ) : (
        <div className="featured-grid">
          {data?.map((r: any, i: number) => (
            <Link
              className="featured-card"
              to={`/s/replay:${r.replay_id}`}
              key={r.replay_id}
            >
              <div className="featured-visual">
                <div className={`abstract-flame flame-${i}`}>
                  <FlaskConical size={44} />
                </div>
                <PlayCircle size={31} />
              </div>
              <div>
                <div className="eyebrow">
                  {r.origin === "recorded_live"
                    ? "RECORDED LIVE SI SESSION"
                    : "SCRIPTED EVIDENCE DEMONSTRATION"}
                </div>
                <h2>{r.title}</h2>
                <p>{r.question}</p>
                <div className="recording-meta">
                  {r.model || "No model execution"} ·{" "}
                  {new Date(r.recorded_at).toLocaleDateString()}
                </div>
                <span className="text-button">
                  Play the evidence trail <ArrowUpRight size={14} />
                </span>
              </div>
            </Link>
          ))}
          {!data?.length && (
            <div className="empty-note">
              No recorded sessions have been prepared. Run the local
              demonstration recorder after building the corpus, or explore NASA
              data directly.
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export function Media() {
  const { data, error } = useQuery({
    queryKey: ["media"],
    queryFn: () => api("/media"),
  });
  return (
    <main className="page">
      <PageHead
        eyebrow="ORIGINAL NASA MEDIA"
        title="Observe the experiments."
        description="Authentic downloaded images and videos, with source attribution and explicit association status. Unknown captions remain unknown."
      />
      <QueryError error={error} />
      {data ? (
        <MediaCards items={data} />
      ) : (
        <div className="skeleton">Loading NASA media…</div>
      )}
    </main>
  );
}

export function About() {
  const { data: meta } = useQuery({
    queryKey: ["meta"],
    queryFn: () => api("/meta"),
  });
  const { data: investigations } = useQuery({
    queryKey: ["all-investigations"],
    queryFn: () => api("/investigations?limit=100"),
  });
  return (
    <main className="page about-page">
      <PageHead
        eyebrow="METHODS & DISCLOSURE"
        title="Built on evidence. Clear about its limits."
        description="EmberNova connects NASA combustion research with deterministic scientific tools and source-grounded SI interpretation."
      />
      <div className="stats-inline">
        {meta &&
          Object.entries(meta.corpus)
            .filter(([key]) =>
              [
                "investigations",
                "documents",
                "pages",
                "runs",
                "media",
              ].includes(key),
            )
            .map(([k, v]) => (
              <div key={k}>
                <strong>{Number(v).toLocaleString()}</strong>
                <small>{k==='runs'?'source records':k}</small>
              </div>
            ))}
      </div>
      <div className="team-grid">
        <div>
          <p className="eyebrow ember">The challenge</p>
          <h3>Flame in Freefall</h3>
          <p>
            NASA Space Apps 2026 asks teams to use SI to summarize, rank and
            interpret microgravity combustion findings for fire safety in
            spacecraft, stations, lunar and Martian bases, and pressurized
            rovers.
          </p>
        </div>
        <div>
          <p className="eyebrow ember">The team</p>
          <h3>Team EmberNova</h3>
          <p>
            The team made the product decisions, curated the data and owns the
            submission. SI tools helped with architecture and code, as
            disclosed below.
          </p>
        </div>
        <div>
          <p className="eyebrow ember">The data</p>
          <h3>NASA Physical Sciences Informatics</h3>
          <p>
            Local, hash-verified snapshot of PSI combustion investigations
            (CC0-1.0), with supplemental NASA sources labeled as such.
          </p>
        </div>
      </div>
      <div className="overview-grid">
        <section className="content-card">
          <h2>Scientific method</h2>
          <p>
            NASA originals are verified by SHA-256 before ingestion. Curated
            table mappings retain raw cells, original headers, normalized
            values, and source row locators. Unit conversions use pint. Backend
            tools compute descriptive statistics, charts, comparisons, and
            environmental coverage from one Parquet Analysis Bundle.
          </p>
          <p>
            Retrieval combines lexical FTS5 BM25 with semantic embeddings when
            the real embedding index and provider are available. Keyless
            operation uses an explicitly labeled lexical fallback. Generated
            answers use a bounded OpenAI Responses tool loop. Citation markers
            are checked against the current turn’s evidence ledger; valid
            citations alone do not prove factual or numeric correctness.
          </p>
          <h2>SI usage disclosure</h2>
          <p>
            <span className="si-badge">SI</span> The architecture, application
            code, and generated research prose were assisted by SI. Research
            answers carry an SI badge. Deterministic charts display NASA source
            measurements and are not synthetic observations. This application
            does not generate scientific illustrations or execute
            model-generated code on the host. Optional hosted Analysis Lab uses
            1 GB containers with network disabled and verified NASA data inputs.
          </p>
          <h2>What EmberNova cannot establish</h2>
          <ul className="notes">
            <li>
              Microgravity results are not measurements at lunar or Martian
              gravity.
            </li>
            <li>
              The downloaded PSI subset contains no partial-gravity combustion
              run dataset.
            </li>
            <li>
              Liquid droplets, burners and solid materials are not
              interchangeable evidence.
            </li>
            <li>
              Atmosphere similarity does not establish material safety, ignition
              limits or certified engineering guidance.
            </li>
            <li>
              Uncontrolled group comparisons show associations and can have
              multiple confounding conditions.
            </li>
            <li>Visible flame extinction may not mean combustion has ended.</li>
          </ul>
        </section>
        <aside className="content-card">
          <div className="eyebrow">
            <ShieldCheck size={14} /> REPRODUCIBILITY
          </div>
          <h3>Source snapshot</h3>
          <p>{meta?.snapshot_date || "See build metadata"}</p>
          <h3>Research agent</h3>
          <p>{meta?.models.agent || "Configured locally"}</p>
          <h3>Analysis Lab</h3>
          <p>
            Available when enabled locally after hosted isolation verification.
            Generated Python never runs in the backend process.
          </p>
          <h3>NASA challenge</h3>
          <a
            href="https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/"
            target="_blank"
            rel="noreferrer"
          >
            Flame in Freefall <ExternalLink size={13} />
          </a>
          <p>
            Supports discovery, evidence extraction for predictive research, and
            fire prevention, detection and suppression insights.
          </p>
        </aside>
      </div>
      <h2 className="sources-title">NASA source catalog</h2>
      <div className="source-catalog">
        {investigations?.items.map((i: any) => (
          <div key={i.investigation_id}>
            <Link to={`/investigations/${i.investigation_id}`}>
              {i.acronym || i.investigation_id}
            </Link>
            <span>{i.title}</span>
            {i.doi ? (
              <a
                href={`https://doi.org/${i.doi}`}
                target="_blank"
                rel="noreferrer"
              >
                {i.doi} <ArrowUpRight size={12} />
              </a>
            ) : (
              <a href={i.source_url} target="_blank" rel="noreferrer">
                Source <ArrowUpRight size={12} />
              </a>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
