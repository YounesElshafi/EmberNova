import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Code2, ShieldAlert } from "lucide-react";
import { CAPABILITIES, PILLARS, type Pillar } from "../content/capabilities";
import { Reveal } from "../components/Reveal";

export function Capabilities() {
  const { hash } = useLocation();
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash]);
  return (
    <main className="page caps-page">
      <header className="page-hero">
        <p className="eyebrow ember">Capabilities</p>
        <h1 className="display-sm">
          A research instrument,
          <br />
          <em>not a chat window.</em>
        </h1>
        <p className="lede">
          NASA's challenge asks for three things: summarize microgravity combustion findings, rank them, and
          interpret them for fire safety. EmberNova does all three, and makes each step checkable. Everything listed
          here is implemented and can be opened from this page.
        </p>
        <nav className="pillar-jump" aria-label="Capability groups">
          {PILLARS.map((p, i) => (
            <a key={p.id} href={`#${p.id}`} className={`pj pj-${p.id}`}>
              <span>0{i + 1}</span> {p.title}
            </a>
          ))}
        </nav>
      </header>

      {PILLARS.map((p, i) => (
        <section key={p.id} id={p.id} className={`cap-group cap-${p.id}`} aria-labelledby={`h-${p.id}`}>
          <Reveal className="cap-group-head">
            <span className="pillar-n">0{i + 1}</span>
            <div>
              <h2 id={`h-${p.id}`}>{p.title}</h2>
              <p className="pillar-verb">{p.verb}</p>
              <p className="muted">{p.line}</p>
            </div>
          </Reveal>
          <div className="cap-grid">
            {CAPABILITIES.filter((c) => c.pillar === (p.id as Pillar)).map((c, j) => {
              const expanded = open === c.id;
              return (
                <Reveal as="article" key={c.id} className={`cap-card ${expanded ? "open" : ""}`} delay={j * 60}>
                  <h3>{c.name}</h3>
                  <p>{c.what}</p>
                  <dl>
                    <div>
                      <dt>Why it matters</dt>
                      <dd>{c.why}</dd>
                    </div>
                    <div className="vs">
                      <dt>Unlike a chatbot</dt>
                      <dd>{c.notChat}</dd>
                    </div>
                    {expanded && (
                      <>
                        <div>
                          <dt>How it works</dt>
                          <dd>{c.how}</dd>
                        </div>
                        <div>
                          <dt>
                            <Code2 size={12} /> Implementation
                          </dt>
                          <dd className="mono">{c.code}</dd>
                        </div>
                      </>
                    )}
                  </dl>
                  {c.limits && (
                    <p className="cap-limit">
                      <ShieldAlert size={13} /> {c.limits}
                    </p>
                  )}
                  <div className="cap-actions">
                    {c.try && (
                      <Link to={c.try.to} className="link-arrow">
                        {c.try.label} <ArrowUpRight size={14} />
                      </Link>
                    )}
                    <button
                      className="text-button"
                      aria-expanded={expanded}
                      onClick={() => setOpen(expanded ? null : c.id)}
                    >
                      {expanded ? "Less" : "How it works"}
                    </button>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>
      ))}

      <Reveal as="section" className="cap-limits-band">
        <h2>What EmberNova does not claim</h2>
        <ul>
          <li>It does not predict fire risk, give probabilities, or certify safety.</li>
          <li>Microgravity results are not presented as lunar- or Martian-gravity measurements. The corpus contains none.</li>
          <li>Liquid droplets, gas burners and solid materials are kept separate; one is never used as evidence for another.</li>
          <li>SI-written prose is badged, and its citations are checked automatically. That check does not prove scientific correctness.</li>
        </ul>
        <Link to="/workspace" className="btn btn-ember">
          Try it in the workspace <ArrowRight size={16} />
        </Link>
      </Reveal>
    </main>
  );
}
