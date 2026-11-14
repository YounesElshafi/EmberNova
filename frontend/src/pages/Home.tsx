import { lazy, Suspense, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowUpRight, Search, PlayCircle, ShieldCheck, Database, BookOpen, RotateCcw } from "lucide-react";
import { api } from "../api/client";
const CinematicIntro = lazy(() => import("../intro/CinematicIntro").then(m => ({ default: m.CinematicIntro })));
const pathways = [
  { to: "/investigations", title: "Explore the experiments", label: "NASA investigations", text: "Find the apparatus, objectives and original reports behind each investigation.", Icon: BookOpen },
  { to: "/data/PSI-69:flex_experimental", title: "Work with measurements", label: "Source-level data", text: "Inspect raw values, build a chart and trace every point to its source row.", Icon: Database },
  { to: "/envelope", title: "Check the boundaries", label: "Applicability envelope", text: "Compare an atmosphere with tested conditions. See where the evidence stops.", Icon: ShieldCheck },
];
const questions = ["How does oxygen affect flame extinction?", "Which investigations studied smoke detection?", "How does ventilation affect flame spread?"];
export function Home() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [intro, setIntro] = useState(params.get("intro") === "1");
  const [draft, setDraft] = useState("");
  const { data: meta } = useQuery({ queryKey: ["meta"], queryFn: () => api("/meta") });
  const { data: media } = useQuery({ queryKey: ["media"], queryFn: () => api<any[]>("/media") });
  const hero = media?.find(m => m.media_id === "media:69fe14ff919a47bc78971772");
  const footage = media?.filter(m => m.media_type === "video" && m.thumb_url).filter((m, i, all) => all.findIndex(x => x.investigation_id === m.investigation_id) === i).slice(0, 3) || [];
  return <main className="observatory-home">
    {intro && <Suspense fallback={<div className="notice" role="status">Loading introduction…</div>}><CinematicIntro corpus={meta?.corpus} onDone={() => { setIntro(false); setParams({}, { replace: true }); }} /></Suspense>}
    <section className="mission-hero">
      <div className="mission-copy">
        <p className="eyebrow"><span className="mission-dot" /> MICROGRAVITY COMBUSTION / NASA PSI</p>
        <h1>In orbit, fire<br />has no <span>up.</span><br /><em>Start with evidence.</em></h1>
        <p className="mission-lede">A research workspace for understanding fire beyond Earth. Explore NASA experiments, compare measured data, and follow every answer back to its source.</p>
        <form className="mission-search" onSubmit={e => { e.preventDefault(); navigate(`/workspace${draft.trim() ? `?q=${encodeURIComponent(draft.trim())}` : ""}`); }}>
          <label htmlFor="begin-q">What would you like to investigate?</label>
          <div><Search size={20} aria-hidden="true" /><input id="begin-q" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Ask about oxygen, flame spread, smoke…" /><button aria-label="Open in workspace"><ArrowRight size={22} /></button></div>
        </form>
        <div className="mission-quick"><Link to="/workspace">Open research workspace <ArrowUpRight size={15} /></Link><Link to="/featured"><PlayCircle size={16} /> Recorded demos</Link></div>
      </div>
      <figure className="mission-image">
        {hero ? <img src={hero.stream_url} alt="Original NASA representative image for the E-Field Flames investigation" fetchPriority="high" /> : <div className="image-loading" role="status">Loading original NASA imagery…</div>}
        <div className="image-topline"><span>FIELD NOTES / E-FIELD FLAMES</span><span>ORIGINAL NASA MEDIA</span></div>
        <figcaption><span>Fire, seen differently.</span><small>{hero ? `${hero.credit} · ${hero.investigation_id}` : "NASA image catalog"}</small><Link to="/media">Inspect original media <ArrowUpRight size={14} /></Link></figcaption>
      </figure>
    </section>
    <section className="mission-proof" aria-label="Research principles"><span><Database size={18} /> Original NASA sources</span><span><ShieldCheck size={18} /> Traceable measurements</span><span><BookOpen size={18} /> Evidence and limits, together</span><Link to="/about">Methods & disclosure <ArrowRight size={16} /></Link></section>
    <section className="mission-section">
      <div className="mission-heading"><div><p className="eyebrow">THE RESEARCH DESK</p><h2>Three ways in.<br />One evidence trail.</h2></div><p>You can start with a question or go directly to the data. The original evidence is always within reach.</p></div>
      <div className="mission-paths">{pathways.map(({ to, title, label, text, Icon }, i) => <Link key={to} to={to}><div className="path-top"><Icon size={26} /><span>0{i + 1}</span></div><p className="eyebrow">{label}</p><h3>{title}</h3><p>{text}</p><span className="path-action">Explore <ArrowUpRight size={20} /></span></Link>)}</div>
    </section>
    <section className="mission-method"><div><p className="eyebrow">FROM QUESTION TO SOURCE</p><h2>Good research<br />leaves a trail.</h2><Link className="btn btn-ember" to="/how-it-works">Inside the process <ArrowRight size={18} /></Link></div><ol>{[["Ask", "Describe the question. The research agent finds relevant investigations and calls scientific tools."], ["Examine", "Read the answer alongside charts, original measurements and named limitations."], ["Verify", "Open a citation to inspect the report page or source row. Keep the evidence with the claim."]].map(([title, text], i) => <li key={title}><span>0{i + 1}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol></section>
    <section className="mission-section"><div className="mission-heading"><div><p className="eyebrow">THE ORIGINAL RECORD</p><h2>Real experiments.<br />Original footage.</h2></div><Link className="link-arrow" to="/media">Open the media library <ArrowUpRight size={18} /></Link></div><div className="mission-footage">{footage.map(m => <figure key={m.media_id}><video controls preload="none" poster={m.thumb_url} src={m.stream_url} aria-label={`NASA video, ${m.investigation_id}`} /><figcaption><b>{m.investigation_id}</b><span>{m.caption || "Original investigation footage; no NASA caption supplied."}</span><small>Credit: {m.credit} · association: {String(m.association).replaceAll("_", " ")}</small></figcaption></figure>)}</div>{!footage.length && <p className="muted">Browse the media library for available original recordings.</p>}</section>
    <section className="mission-close"><p className="eyebrow">A QUESTION IS ENOUGH TO BEGIN</p><h2>What will you<br />investigate?</h2><div>{questions.map(q => <Link key={q} to={`/workspace?q=${encodeURIComponent(q)}`}>{q}<ArrowUpRight size={18} /></Link>)}</div><p>Microgravity evidence does not establish lunar or Martian fire safety. SI-written answers are labeled and should be checked against their sources.</p><button className="btn btn-quiet" onClick={() => setIntro(true)}><RotateCcw size={16} /> Replay intro</button></section>
  </main>;
}
