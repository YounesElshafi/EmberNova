import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import { ARTEMIS_QUOTE, HISTORY } from "./story";
import { FlameCanvas } from "./FlameCanvas";
import { IntroSound } from "./sound";
import type { SpaceScene } from "./spaceScene";

type Corpus = { investigations: number; documents: number; runs: number; pages: number; media: number } | undefined;

const SCENES = [
  { id: "silence", seconds: 6 },
  { id: "threat", seconds: 5.5 },
  { id: "stakes", seconds: 9 },
  { id: "history", seconds: 8 },
  { id: "science", seconds: 8 },
  { id: "opportunity", seconds: 7.5 },
  { id: "reveal", seconds: Infinity },
] as const;

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function CinematicIntro({ corpus, onDone }: { corpus: Corpus; onDone: () => void }) {
  const reduce = useRef(window.matchMedia("(prefers-reduced-motion: reduce)").matches).current;
  const [scene, setScene] = useState(0);
  const [paused, setPaused] = useState(reduce);
  const [sound, setSound] = useState(false);
  const [three, setThree] = useState<"loading" | "ready" | "off">(reduce || !webglAvailable() ? "off" : "loading");
  const canvas = useRef<HTMLCanvasElement>(null);
  const space = useRef<SpaceScene | null>(null);
  const audio = useRef<IntroSound | null>(null);
  const clock = useRef({ scene: 0, elapsed: 0, last: performance.now(), time: 0, paused: reduce });
  const flameG = useRef(1);
  const skipRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const go = useCallback((n: number) => {
    const next = Math.max(0, Math.min(SCENES.length - 1, n));
    clock.current.scene = next;
    clock.current.elapsed = 0;
    setScene(next);
  }, []);
  const finish = useCallback(() => {
    audio.current?.dispose();
    doneRef.current();
  }, []);

  // Load the 3D scene lazily; any failure falls back to the static backdrop.
  useEffect(() => {
    if (three !== "loading") return;
    let alive = true;
    const lowPower = (navigator.hardwareConcurrency || 4) <= 4 || window.innerWidth < 700;
    import("./spaceScene")
      .then(({ createSpaceScene }) => {
        if (!alive || !canvas.current) return;
        space.current = createSpaceScene(canvas.current, lowPower);
        const r = canvas.current.getBoundingClientRect();
        space.current.resize(r.width, r.height);
        setThree("ready");
      })
      .catch(() => alive && setThree("off"));
    return () => {
      alive = false;
    };
  }, [three]);

  useEffect(() => {
    const onResize = () => {
      if (!canvas.current || !space.current) return;
      const r = canvas.current.getBoundingClientRect();
      space.current.resize(r.width, r.height);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // One animation loop drives both the timeline and the 3D render.
  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const c = clock.current;
      const dt = Math.min(0.5, (now - c.last) / 1000);
      c.last = now;
      if (document.hidden) return;
      c.time += dt;
      if (!c.paused) c.elapsed += dt;
      const sc = SCENES[c.scene];
      if (c.elapsed >= sc.seconds && c.scene < SCENES.length - 1) {
        c.scene += 1;
        c.elapsed = 0;
        setScene(c.scene);
      }
      const t = Math.min(1, c.elapsed / (Number.isFinite(sc.seconds) ? sc.seconds : 6));
      flameG.current = SCENES[c.scene].id === "science" ? Math.max(0, 1 - Math.max(0, t - 0.15) * 1.6) : c.scene > 4 ? 0 : 1;
      if (space.current && c.scene < 4) space.current.render(Math.min(c.scene, 3), c.scene >= 4 ? 1 : t, c.time);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => () => space.current?.dispose(), []);
  useEffect(() => {
    clock.current.paused = paused;
  }, [paused]);
  useEffect(() => {
    if (!sound) return;
    audio.current?.alarm(SCENES[scene].id === "threat" || SCENES[scene].id === "stakes");
  }, [scene, sound]);
  useEffect(() => {
    skipRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") go(clock.current.scene + 1);
      else if (e.key === "ArrowLeft") go(clock.current.scene - 1);
      else if (e.key === " " && (e.target as HTMLElement)?.tagName !== "BUTTON") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      audio.current?.dispose();
    };
  }, [finish, go]);

  function toggleSound() {
    if (!audio.current) audio.current = new IntroSound();
    if (sound) audio.current.stop();
    else {
      audio.current.start();
      audio.current.alarm(SCENES[scene].id === "threat" || SCENES[scene].id === "stakes");
    }
    setSound(!sound);
  }

  const id = SCENES[scene].id;
  const alarm = id === "threat" || id === "stakes";
  return (
    <div
      className={`intro scene-${id} ${alarm ? "alarm" : ""} ${three === "off" ? "static" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="EmberNova introduction"
    >
      <canvas ref={canvas} className={`intro-space ${three === "ready" ? "on" : ""}`} aria-hidden="true" />
      <div className="intro-static-bg" aria-hidden="true">
        <div className="limb" />
      </div>
      <div className="intro-vignette" aria-hidden="true" />
      <div className="intro-grain" aria-hidden="true" />

      <div className="intro-stage" aria-live="polite">
        {id === "silence" && (
          <div className="beat beat-silence" key="silence">
            <p className="kicker">Translunar space</p>
            <p className="whisper">
              Four people. One small cabin.
              <br />
              The nearest help is a planet away.
            </p>
          </div>
        )}
        {id === "threat" && (
          <div className="beat beat-threat" key="threat">
            <div className="hud">
              <span className="hud-tag">CAUTION &amp; WARNING</span>
              <strong>SMOKE DETECTED</strong>
              <span className="hud-sub">CREW CABIN · CHECK FOR FIRE</span>
            </div>
          </div>
        )}
        {id === "stakes" && (
          <figure className="beat beat-stakes" key="stakes">
            <blockquote>“{ARTEMIS_QUOTE.text}”</blockquote>
            <figcaption>
              <b>{ARTEMIS_QUOTE.speaker}</b>
              <span>{ARTEMIS_QUOTE.context}</span>
              <span className="src">Source: {ARTEMIS_QUOTE.source}</span>
            </figcaption>
          </figure>
        )}
        {id === "history" && (
          <div className="beat beat-history" key="history">
            <p className="kicker">It was not the first time</p>
            <ol>
              {HISTORY.slice(0, 3).map((h, i) => (
                <li key={h.year} style={{ animationDelay: `${0.4 + i * 0.9}s` }}>
                  <span className="year">{h.year}</span>
                  <span className="mission">{h.mission}</span>
                  <span className="what">{h.title}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {id === "science" && (
          <div className="beat beat-science" key="science">
            <FlameCanvas gravity={() => flameG.current} className="intro-flame" />
            <h2>
              Fire behaves differently
              <br />
              <em>when gravity disappears.</em>
            </h2>
            <p>
              Without buoyancy, hot gas no longer rises and fresh oxygen no longer flows in from below. Flames change
              shape, speed and limits, so rules learned on Earth do not simply carry over.
            </p>
            <span className="illustration-tag">Conceptual illustration, not experimental data</span>
          </div>
        )}
        {id === "opportunity" && (
          <div className="beat beat-opportunity" key="opportunity">
            <p className="kicker">Decades of NASA research</p>
            <h2>The answers exist. They are scattered.</h2>
            {corpus ? (
              <div className="intro-stats">
                <span><b>{corpus.investigations}</b> investigations</span>
                <span><b>{corpus.documents}</b> reports</span>
                <span><b>{corpus.pages.toLocaleString()}</b> pages</span>
                <span><b>{corpus.runs.toLocaleString()}</b> test records</span>
              </div>
            ) : (
              <p className="whisper">Investigations, reports, data tables and flight video, spread across separate archives.</p>
            )}
            <p className="whisper">Each finding sits in its own report, table or flight video, recorded under its own conditions and units.</p>
          </div>
        )}
        {id === "reveal" && (
          <div className="beat beat-reveal" key="reveal">
            <div className="reveal-mark" aria-hidden="true">
              <span />
            </div>
            <h1>
              Ember<span>Nova</span>
            </h1>
            <p>
              Ranked, cited, testable fire-safety evidence from NASA microgravity combustion research.
            </p>
            <button className="btn btn-ember" onClick={finish} autoFocus>
              Enter EmberNova
            </button>
          </div>
        )}
      </div>

      {["silence", "threat", "stakes", "history"].includes(id) && <span className="illustration-tag corner">Illustration, not mission footage</span>}

      <div className="intro-controls">
        <button className="intro-btn" onClick={() => go(scene - 1)} disabled={scene === 0} aria-label="Previous scene">
          <ChevronLeft size={16} />
        </button>
        <ol className="intro-progress" aria-label="Introduction scenes">
          {SCENES.map((s, i) => (
            <li key={s.id}>
              <button
                aria-label={`Scene ${i + 1}: ${s.id}`}
                aria-current={i === scene ? "step" : undefined}
                className={i < scene ? "done" : i === scene ? (paused ? "now paused" : "now") : ""}
                style={i === scene && Number.isFinite(s.seconds) ? { ["--dur" as string]: `${s.seconds}s` } : undefined}
                onClick={() => go(i)}
              />
            </li>
          ))}
        </ol>
        <button className="intro-btn" onClick={() => go(scene + 1)} disabled={scene === SCENES.length - 1} aria-label="Next scene">
          <ChevronRight size={16} />
        </button>
        <button className="intro-btn" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Play introduction" : "Pause introduction"}>
          {paused ? <Play size={15} /> : <Pause size={15} />}
        </button>
        <button className="intro-btn" onClick={toggleSound} aria-pressed={sound} aria-label={sound ? "Mute sound" : "Turn sound on"}>
          {sound ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>
      </div>
      <button ref={skipRef} className="intro-skip" onClick={finish}>
        Skip intro <X size={15} />
      </button>
    </div>
  );
}
