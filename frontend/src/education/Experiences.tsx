import { useState } from "react";
import { Link } from "react-router-dom";
import {
  explain,
  lessons,
  readProgress,
  saveProgress,
  source,
} from "./science";
import "./education.css";
function Disclosure() {
  return (
    <p className="edu-disclosure">
      <span className="si-badge">SI</span> SI-generated educational content ·
      Conceptual illustrations, not NASA measurements or predictive models.{" "}
      <a href={source} target="_blank" rel="noreferrer">
        NASA science reference ↗
      </a>
    </p>
  );
}
export function Universe() {
  return (
    <main className="universe" data-si-generated="true">
      <div className="orbit-world" aria-hidden="true">
        <div className="planet" />
        <span className="satellite">✦</span>
      </div>
      <p className="edu-kicker">ONE UNIVERSE. THREE WAYS TO DISCOVER.</p>
      <h1>What happens when fire behaves differently in space?</h1>
      <p className="universe-lede">
        Follow a flame beyond the familiar. From NASA evidence to your first
        discovery, choose your own way into the science.
      </p>
      <div className="paths">
        {[
          [
            "RESEARCH",
            "Explore the science. Analyze the evidence.",
            "/research",
            "01 / THE OBSERVATORY",
            "Measured data · citations · scientific tools",
          ],
          [
            "LEARN",
            "Discover the physics. Experiment with the impossible.",
            "/learn",
            "02 / THE LEARNING LAB",
            "Predict · observe · explain",
          ],
          [
            "PLAY",
            "Become a space explorer. Learn through adventure.",
            "/kids",
            "03 / SPACE FIRE ACADEMY",
            "Five missions · a robot guide · discoveries",
          ],
        ].map(([name, sub, url, tag, detail]) => (
          <Link
            to={url}
            key={name}
            className={`path path-${name.toLowerCase()}`}
          >
            <small>{tag}</small>
            <strong>
              {name} <span>↗</span>
            </strong>
            <p>{sub}</p>
            <footer>{detail}</footer>
          </Link>
        ))}
      </div>
      <Disclosure />
      <Link to="/research-overview">
        Explore the original research introduction →
      </Link>
    </main>
  );
}
export function Lab() {
  const [gravity, G] = useState("microgravity"),
    [airflow, A] = useState("quiet"),
    [oxygen, O] = useState("present"),
    [prediction, P] = useState(""),
    [result, R] = useState(false);
  const expected =
    oxygen === "absent"
      ? "off"
      : airflow === "directed"
        ? "bent"
        : gravity === "earth"
          ? "tall"
          : "round";
  const change = (set: (v: string) => void, v: string) => {
    set(v);
    R(false);
  };
  return (
    <section className="virtual-lab">
      <div>
        <p className="edu-kicker">VIRTUAL COMBUSTION CHAMBER / TIER C</p>
        <h2>Take away the up.</h2>
        <p>
          Predict what a conceptual isolated droplet flame might look like.
          Change one condition at a time.
        </p>
        <div className="lab-controls">
          {[
            ["Gravity", gravity, G, ["earth", "microgravity"]],
            ["Airflow", airflow, A, ["quiet", "directed"]],
            ["Oxygen", oxygen, O, ["present", "absent"]],
          ].map(([label, value, set, options]) => (
            <label key={label as string}>
              {label as string}
              <select
                value={value as string}
                onChange={(e) =>
                  change(set as (v: string) => void, e.target.value)
                }
              >
                {(options as string[]).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <label>
          Your prediction
          <select
            value={prediction}
            onChange={(e) => {
              P(e.target.value);
              R(false);
            }}
          >
            <option value="">Choose a shape</option>
            <option value="round">Rounded</option>
            <option value="tall">Elongated upward</option>
            <option value="bent">Distorted by flow</option>
            <option value="off">Not sustained</option>
          </select>
        </label>
        <button disabled={!prediction} onClick={() => R(true)}>
          Run conceptual experiment →
        </button>
      </div>
      <div className="chamber">
        <div className="chamber-grid" />
        <div
          className={`edu-flame ${result ? expected : "waiting"}`}
          aria-label={
            result ? expected + " conceptual flame" : "Waiting for prediction"
          }
        />
        <span>
          {result
            ? "OBSERVATION / " + expected.toUpperCase()
            : "AWAITING YOUR HYPOTHESIS"}
        </span>
      </div>
      {result && (
        <div className="lab-result" role="status">
          <b>
            {prediction === expected
              ? "Your prediction matches this illustration."
              : "A discovery! Compare your prediction with the observation."}
          </b>
          <p>{explain(gravity, airflow, oxygen)}</p>
          <p>
            No temperature, burning rate or safety threshold is calculated.
            Shape and color are illustrative; oxygen is categorical. Fuel is
            fixed to an idealized isolated droplet. Radiation, chemistry and
            transient behavior are omitted.
          </p>
        </div>
      )}
    </section>
  );
}
export function Learn() {
  const [selected, S] = useState(0),
    [done, D] = useState(() => readProgress("embernova-learn")),
    [feedback, F] = useState(""),
    [mode, M] = useState("Explain it simply");
  const lesson = lessons[selected];
  function answer(i: number) {
    if (i === lesson.answer) {
      const next = [...new Set([...done, selected])];
      D(next);
      const saved = saveProgress("embernova-learn", next);
      F(
        "Discovery recorded. " +
          (saved
            ? "Progress saved on this device."
            : "Storage unavailable; progress lasts for this visit."),
      );
    } else F("Try again. Look for the explanation in the mission briefing.");
  }
  return (
    <main className="education learn" data-si-generated="true">
      <header className="edu-hero">
        <p className="edu-kicker">EMBERNOVA / LEARNING LABORATORY</p>
        <h1>
          Make a prediction.
          <br />
          <em>Find your explanation.</em>
        </h1>
        <p>
          A guided journey from an Earth flame to spacecraft safety. No real
          fire. Just curiosity.
        </p>
        <Link to="/learn/lab">Enter the virtual lab ↓</Link>
      </header>
      <div className="lesson-layout">
        <nav aria-label="Learning modules">
          {lessons.map((l, i) => (
            <button
              key={l.title}
              className={i === selected ? "selected" : ""}
              onClick={() => {
                S(i);
                F("");
              }}
            >
              <small>
                {done.includes(i) ? "✓ DISCOVERED" : "MODULE " + (i + 1)}
              </small>
              {l.topic}
            </button>
          ))}
          <p>
            {done.length} / {lessons.length} discoveries saved locally
          </p>
        </nav>
        <article>
          <p className="edu-kicker">{lesson.topic}</p>
          <h2>{lesson.title}</h2>
          <p>{lesson.text}</p>
          <h3>{lesson.question}</h3>
          <div className="answers">
            {lesson.choices.map((c, i) => (
              <button key={c} onClick={() => answer(i)}>
                {c}
              </button>
            ))}
          </div>
          <p role="status">{feedback}</p>
          <aside className="tutor">
            <h3>Science guide</h3>
            <p>
              Offline, source-linked guidance. No open chat or research tools.
            </p>
            <label>
              Guide mode
              <select value={mode} onChange={(e) => M(e.target.value)}>
                {[
                  "Explain it simply",
                  "Go deeper",
                  "Quiz me",
                  "Help me experiment",
                ].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <p>
              {mode === "Explain it simply"
                ? lesson.text
                : mode === "Go deeper"
                  ? "Separate transport from reaction: diffusion moves molecules down concentration gradients; flow carries gas in bulk. Geometry, radiation and chemistry also matter. Compare experiment conditions before generalizing."
                  : mode === "Quiz me"
                    ? lesson.question
                    : "Change only gravity in the lab first. Predict a shape, run the illustration, then keep gravity fixed and change airflow. What changed, and why?"}
            </p>
            <a href={source}>Read the NASA explanation ↗</a>
          </aside>
        </article>
      </div>
      <Lab />
      <Disclosure />
      <Link to="/investigations/PSI-69">
        Continue into the FLEX research evidence →
      </Link>
    </main>
  );
}
export function LabPage() {
  return (
    <main className="education learn" data-si-generated="true">
      <Link to="/learn">← Learning hub</Link>
      <Lab />
      <Disclosure />
    </main>
  );
}
