import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Minus,
  PlayCircle,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { api } from "../api/client";
import { CinematicIntro } from "../intro/CinematicIntro";
import { FlameCanvas } from "../intro/FlameCanvas";
import { HISTORY } from "../intro/story";
import { PILLARS } from "../content/capabilities";
import { Reveal } from "../components/Reveal";

const SEEN = "embernova-intro-seen";
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* storage can be unavailable; the intro then simply plays again next time */
  }
};

const GRAVITY_STOPS = [
  { g: 1, label: "Earth", note: "1 g" },
  { g: 0.38, label: "Mars", note: "0.38 g" },
  { g: 0.17, label: "Moon", note: "0.17 g" },
  { g: 0, label: "Orbit", note: "≈0 g" },
];

const CONTRAST: [string, string, string][] = [
  ["Where numbers come from", "The model's training data", "NASA tables and reports, queried by deterministic tools during the turn"],
  ["Charts of measured data", "Plotting code written by the model", "Built by backend code; every point opens its source row"],
  ["Citations", "Can be invented", "Must resolve to that turn's evidence ledger or they are removed"],
  ["Comparisons", "Differences presented as causes", "Validity checklist with named confounders; association, not cause"],
  ["Lunar or Martian conditions", "Extrapolates freely", "Says when no partial-gravity data exists; atmosphere match ≠ gravity match"],
  ["Out-of-scope questions", "Answers anyway", "Relevance floor returns no match"],
];

const STARTERS = [
  "Which NASA tests come closest to a lunar-habitat atmosphere of 30–36% oxygen at 8–10.2 psi?",
  "How do CO₂ and helium dilution change droplet flame extinction in FLEX?",
  "Which investigations inform smoke detection aboard spacecraft?",
];

export function Home() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [intro, setIntro] = useState(() => params.get("intro") === "1");
  const [gIndex, setGIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const { data: meta, isError: metaError } = useQuery({ queryKey: ["meta"], queryFn: () => api("/meta") });
  const { data: media } = useQuery({ queryKey: ["media"], queryFn: () => api<any[]>("/media") });

  useEffect(() => {
    if (params.get("intro") === "1") setIntro(true);
  }, [params]);

  function closeIntro() {
    write(SEEN, "1");
    setIntro(false);
    if (params.get("intro")) setParams({}, { replace: true });
    window.scrollTo({ top: 0 });
    document.getElementById("main")?.focus({ preventScroll: true });
  }

  const footage = useMemo(() => {
    const items = (media || []).filter((m) => m.media_type === "video" && m.thumb_url);
    const pick = ["PSI-69", "PSI-25", "SAFFIRE-VI", "PSI-10", "PSI-159"];
    const chosen = pick.map((id) => items.find((m) => m.investigation_id === id)).filter(Boolean);
    return (chosen.length >= 3 ? chosen : items).slice(0, 3);
  }, [media]);
  const candle = media?.find((m: any) => m.media_id === "media:NASA-MEDIA-5");
  const corpus = meta?.corpus;

  return (
    <main className="home">
      {intro && <CinematicIntro corpus={corpus} onDone={closeIntro} />}

      {/* HERO */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-sky" aria-hidden="true" />
        <div className="hero-planet" aria-hidden="true" />
        <div className="hero-inner">
          <p className="eyebrow ember">NASA Space Apps 2026 · Flame in Freefall</p>
          <h1 id="hero-title" className="display">
            In orbit, fire
            <br />
            has no <em>up.</em>
          </h1>
          <p className="lede">
            EmberNova is a scientific intelligence workspace for NASA's microgravity combustion research. It ranks
            the experiments relevant to your question, compares their measurements with the caveats kept, and links
            every number to its NASA source.
          </p>
          <div className="hero-actions">
            <Link to="/workspace" className="btn btn-ember">
              Start researching <ArrowRight size={16} />
            </Link>
            <Link to="/featured" className="btn btn-ghost">
              <PlayCircle size={16} /> Watch a recorded investigation
            </Link>
            <button className="btn btn-quiet" onClick={() => setIntro(true)}>
              <RotateCcw size={14} /> Replay intro
            </button>
          </div>
        </div>
        <dl className="hero-stats" aria-label="NASA evidence in this build">
          {corpus ? (
            [
              ["investigations", corpus.investigations, "NASA investigations"],
              ["documents", corpus.documents, "reports & papers"],
              ["pages", corpus.pages, "indexed pages"],
              ["runs", corpus.runs, "source test records"],
              ["datasets", corpus.datasets, "curated datasets"],
              ["media", corpus.media, "NASA videos & images"],
            ].map(([k, v, l]) => (
              <div key={k as string}>
                <dt>{l as string}</dt>
                <dd>{Number(v).toLocaleString()}</dd>
              </div>
            ))
          ) : (
            <div className="hero-stats-empty">
              {metaError
                ? "The research service is not responding, so live corpus figures are unavailable. Recorded pages may also be offline."
                : "Loading the evidence corpus…"}
            </div>
          )}
        </dl>
      </section>

      <section className="research-launchpad band" aria-labelledby="launchpad-title">
        <div><p className="eyebrow">Your next discovery</p><h2 id="launchpad-title" className="section-title">Choose a starting point.</h2><p className="muted">Follow a question, inspect the measurements, or see a complete investigation.</p></div>
        <div className="launchpad-links">
          <Link to="/workspace"><span className="eyebrow">Ask</span><h3>Follow the evidence.</h3><p>Ask a research question and inspect the sources behind the answer.</p><ArrowUpRight aria-hidden="true" /></Link>
          <Link to="/investigations"><span className="eyebrow">Explore</span><h3>Go to the source.</h3><p>Search NASA investigations, open reports, and examine original data.</p><ArrowUpRight aria-hidden="true" /></Link>
          <Link to="/featured"><span className="eyebrow">Watch</span><h3>See research in action.</h3><p>Replay a recorded investigation with its analysis and citations.</p><ArrowUpRight aria-hidden="true" /></Link>
        </div>
      </section>
      {/* HISTORY */}
      <section className="band history" aria-labelledby="history-title">
        <Reveal className="band-head">
          <p className="eyebrow">Why this matters</p>
          <h2 id="history-title" className="section-title">
            Every crewed spacecraft carries
            <br />a fire problem with it.
          </h2>
        </Reveal>
        <ol className="timeline">
          {HISTORY.map((h, i) => (
            <Reveal as="li" key={h.year} className={`moment ${h.kind}`} delay={i * 90}>
              <span className="moment-year">{h.year}</span>
              <div>
                <span className="moment-mission">{h.mission}</span>
                <h3>{h.title}</h3>
                <p>{h.text}</p>
                <a href={h.url} target="_blank" rel="noreferrer" className="source-link">
                  Source <ExternalLink size={12} />
                </a>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* SCIENCE */}
      <section className="band science" aria-labelledby="science-title">
        <div className="science-grid">
          <Reveal className="science-visual">
            <div className="flame-stage">
              <FlameCanvas
                gravity={GRAVITY_STOPS[gIndex].g}
                label={`Conceptual illustration of a flame at ${GRAVITY_STOPS[gIndex].label} gravity`}
              />
              <span className="illustration-tag">Conceptual illustration · not simulation or NASA data</span>
            </div>
            <div className="gravity-switch" role="radiogroup" aria-label="Gravity level for the illustration">
              {GRAVITY_STOPS.map((s, i) => (
                <button
                  key={s.label}
                  role="radio"
                  aria-checked={gIndex === i}
                  className={gIndex === i ? "on" : ""}
                  onClick={() => setGIndex(i)}
                >
                  {s.label}
                  <small>{s.note}</small>
                </button>
              ))}
            </div>
          </Reveal>
          <Reveal className="science-copy" delay={120}>
            <p className="eyebrow">The physics</p>
            <h2 id="science-title" className="section-title">
              Remove gravity and
              <br />
              the flame changes.
            </h2>
            <div className="facts">
              <div>
                <h3>No buoyant plume</h3>
                <p>
                  On Earth, hot gas rises and pulls fresh air in from below. In orbit that flow stops, and oxygen
                  reaches the flame mainly by slow diffusion. Flames become rounder, dimmer and slower.
                </p>
              </div>
              <div>
                <h3>Different limits</h3>
                <p>
                  Whether a material keeps burning depends on gravity, oxygen, pressure and airflow together.
                  Flammability tests run on Earth do not automatically apply in orbit, which is why NASA flew these
                  experiments.
                </p>
              </div>
              <div>
                <h3>New atmospheres</h3>
                <p>
                  Planned exploration habitats lower total pressure and raise oxygen. That combination needs
                  evidence, and EmberNova shows how much of it exists.
                </p>
              </div>
            </div>
            <p className="note-line">
              The partial-gravity settings in this illustration show only the trend. The NASA PSI corpus contains no
              measured lunar or Martian combustion tests, and EmberNova never presents microgravity data as such.
            </p>
          </Reveal>
        </div>
        {candle && (
          <Reveal as="figure" className="authentic-figure">
            <img src={candle.stream_url} alt={candle.caption || "NASA candle flame comparison"} loading="lazy" />
            <figcaption>
              <span className="authentic-tag">Original NASA image</span> {candle.caption} Credit: {candle.credit}.
            </figcaption>
          </Reveal>
        )}
      </section>

      {/* PILLARS */}
      <section className="band pillars" aria-labelledby="pillars-title">
        <Reveal className="band-head center">
          <p className="eyebrow">What EmberNova does</p>
          <h2 id="pillars-title" className="section-title">
            Summarize. Rank. Interpret.
            <br />
            <span className="dim">And show the source for each step.</span>
          </h2>
        </Reveal>
        <div className="pillar-grid">
          {PILLARS.map((p, i) => (
            <Reveal key={p.id} className={`pillar pillar-${p.id}`} delay={i * 80}>
              <span className="pillar-n">0{i + 1}</span>
              <h3>{p.title}</h3>
              <p className="pillar-verb">{p.verb}</p>
              <p>{p.line}</p>
              <Link to={`/capabilities#${p.id}`} className="link-arrow">
                See how <ArrowUpRight size={14} />
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CONTRAST */}
      <section className="band contrast" aria-labelledby="contrast-title">
        <Reveal className="band-head">
          <p className="eyebrow">Not a chatbot</p>
          <h2 id="contrast-title" className="section-title">
            Every number has a source
            <br />
            <span className="dim">you can open.</span>
          </h2>
        </Reveal>
        <Reveal className="contrast-table" role="table" aria-label="Generic AI chat compared with EmberNova">
          <div className="ct-row ct-head" role="row">
            <span role="columnheader" />
            <span role="columnheader">Generic AI chat</span>
            <span role="columnheader">EmberNova</span>
          </div>
          {CONTRAST.map(([k, a, b]) => (
            <div className="ct-row" role="row" key={k}>
              <span role="rowheader">{k}</span>
              <span role="cell" className="ct-a">
                <Minus size={14} /> {a}
              </span>
              <span role="cell" className="ct-b">
                <Check size={14} /> {b}
              </span>
            </div>
          ))}
        </Reveal>
        <Reveal className="contrast-cta">
          <Link to="/capabilities" className="btn btn-ghost">
            All capabilities <ArrowRight size={15} />
          </Link>
          <Link to="/how-it-works" className="btn btn-quiet">
            How the system works <ArrowUpRight size={14} />
          </Link>
        </Reveal>
      </section>

      {/* FOOTAGE */}
      {footage.length > 0 && (
        <section className="band footage" aria-labelledby="footage-title">
          <Reveal className="band-head">
            <p className="eyebrow">Evidence you can watch</p>
            <h2 id="footage-title" className="section-title">
              Original NASA flight footage,
              <br />
              <span className="dim">with its source shown.</span>
            </h2>
          </Reveal>
          <div className="footage-grid">
            {footage.map((m: any, i: number) => (
              <Reveal as="figure" key={m.media_id} className="footage-card" delay={i * 90}>
                <video controls preload="none" poster={m.thumb_url} src={m.stream_url} aria-label={`NASA video, ${m.investigation_id}`} />
                <figcaption>
                  <b>{m.investigation_id}</b>
                  <span>{m.caption || "No NASA caption supplied"}</span>
                  <small>
                    Credit: {m.credit} · association: {String(m.association).replaceAll("_", " ")}
                  </small>
                </figcaption>
              </Reveal>
            ))}
          </div>
          <Link to="/media" className="link-arrow">
            Browse every NASA image and video <ArrowUpRight size={14} />
          </Link>
        </section>
      )}

      {/* CTA */}
      <section className="band begin" aria-labelledby="begin-title">
        <Reveal className="begin-card">
          <h2 id="begin-title" className="section-title">Start with a question.</h2>
          <form
            className="begin-form"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/workspace${draft.trim() ? `?q=${encodeURIComponent(draft.trim())}` : ""}`);
            }}
          >
            <label htmlFor="begin-q" className="sr-only">
              Research question
            </label>
            <input
              id="begin-q"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. How does oxygen concentration affect flame spread in microgravity?"
            />
            <button className="btn btn-ember">
              Open in workspace <ArrowRight size={16} />
            </button>
          </form>
          <div className="starter-row">
            {STARTERS.map((s) => (
              <button key={s} onClick={() => setDraft(s)}>
                {s}
              </button>
            ))}
          </div>
          <p className="fine">
            Live answers need the server's OpenAI key. NASA data tools, explorers and recorded sessions work without
            one.
          </p>
        </Reveal>
      </section>
    </main>
  );
}
