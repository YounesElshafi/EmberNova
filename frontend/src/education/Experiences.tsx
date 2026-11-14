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
export function Kids() {
  const [done, D] = useState(() => readProgress("embernova-kids")),
    [mission, M] = useState(0),
    [items, I] = useState<string[]>([]),
    [shape, S] = useState("earth"),
    [flow, V] = useState(false),
    [fixed, X] = useState<string[]>([]),
    [message, B] = useState(
      "Welcome, explorer! I’m Pip. Let’s investigate safely, using only our imaginary station.",
    ),
    [won, W] = useState(false);
  function enter(i: number) {
    M(i);
    I([]);
    X([]);
    W(false);
    B("Mission briefing: " + lessons[i].text);
  }
  function win() {
    const next = [...new Set([...done, mission])];
    D(next);
    const saved = saveProgress("embernova-kids", next);
    W(true);
    B(
      "Discovery badge earned! " +
        lessons[mission].text +
        (saved ? "" : " Progress cannot be saved on this device."),
    );
  }
  const add = (item: string) => I((v) => (v.includes(item) ? v : [...v, item]));
  return (
    <main className="education kids" data-si-generated="true">
      <header className="academy-header">
        <div>
          <p className="edu-kicker">EMBERNOVA KIDS / GUEST EXPLORER</p>
          <h1>
            Space Fire
            <br />
            <em>Academy</em>
          </h1>
          <p>Explore an imaginary station. Make discoveries. Help your crew.</p>
        </div>
        <div className="robot" aria-label="Pip the robot">
          ▰<span>● ▿ ●</span>
          <small>PIP / SCIENCE CREW</small>
        </div>
      </header>
      <p className="safety-ribbon">
        All experiments are pretend. Never play with real fire, heaters or
        chemicals. Ask a trusted adult about safety.
      </p>
      <nav className="mission-map" aria-label="Mission map">
        {[
          "Fire triangle",
          "Floating flame",
          "Oxygen mystery",
          "Station safety",
          "Junior scientist",
        ].map((name, i) => (
          <button
            key={name}
            disabled={i > 0 && !done.includes(i - 1)}
            aria-pressed={mission === i}
            onClick={() => enter(i)}
          >
            <b>{done.includes(i) ? "★" : i + 1}</b>
            {name}
            {i > 0 && !done.includes(i - 1) && " · locked"}
          </button>
        ))}
      </nav>
      <section className="station-room">
        <div className="station-window" aria-hidden="true">
          <div className="planet" />
        </div>
        <p className="edu-kicker">
          LAB MODULE {mission + 1} / {done.length} DISCOVERY BADGES
        </p>
        <h2>
          {
            [
              "Assemble the fire triangle",
              "Find the floating flame",
              "Deliver oxygen to the chamber",
              "Repair the station",
              "Your final discovery",
            ][mission]
          }
        </h2>
        <div className="pip-dialogue" role="status">
          {message}
        </div>
        {!won && (
          <div className="mission-play">
            {mission === 0 && (
              <>
                <p>
                  Drag ingredients into the chamber, or tap each tile. Then test
                  your combination.
                </p>
                <div className="ingredient-tray">
                  {["Fuel", "Oxygen", "Heat", "Moon rock"].map((item) => (
                    <button
                      key={item}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", item)
                      }
                      onClick={() => add(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <div
                  className="ingredient-drop"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const item = e.dataTransfer.getData("text/plain");
                    if (["Fuel", "Oxygen", "Heat", "Moon rock"].includes(item))
                      add(item);
                  }}
                  aria-label="Experiment chamber"
                >
                  {items.length
                    ? items.join(" + ")
                    : "Drop or tap ingredients to load the chamber"}
                </div>
                <button onClick={() => I([])}>Clear chamber</button>
                <button
                  onClick={() =>
                    items.length === 3 &&
                    ["Fuel", "Oxygen", "Heat"].every((x) => items.includes(x))
                      ? win()
                      : B(
                          "Pip hint: choose fuel, oxygen and heat. Moon rocks are not an ingredient in our fire triangle.",
                        )
                  }
                >
                  Test combination
                </button>
              </>
            )}
            {mission === 1 && (
              <>
                <p>
                  Use the gravity switch. Then identify the quiet microgravity
                  flame.
                </p>
                <button
                  onClick={() =>
                    S(shape === "earth" ? "microgravity" : "earth")
                  }
                >
                  Gravity: {shape} — switch
                </button>
                <div
                  className={`edu-flame ${shape === "earth" ? "tall" : "round"}`}
                />
                <button
                  onClick={() =>
                    shape === "microgravity"
                      ? win()
                      : B(
                          "Pip hint: switch to microgravity to greatly reduce buoyancy. Look for the rounded flame.",
                        )
                  }
                >
                  Record rounded flame discovery
                </button>
              </>
            )}
            {mission === 2 && (
              <>
                <p>
                  A conceptual oxygen parcel needs a path to the chamber. Open
                  the ventilation gate to see directed transport. Molecules can
                  also diffuse without the fan.
                </p>
                <div className={"oxygen-track " + (flow ? "flowing" : "")}>
                  <span>O₂</span>
                  <b>{flow ? "OPEN → CHAMBER" : "CLOSED GATE"}</b>
                </div>
                <button onClick={() => V(!flow)}>
                  {flow ? "Close" : "Open"} ventilation gate
                </button>
                <button
                  onClick={() =>
                    flow
                      ? win()
                      : B(
                          "Pip hint: open the gate. The arrows represent transport, not measured speed.",
                        )
                  }
                >
                  Deliver parcel & explain
                </button>
              </>
            )}
            {mission === 3 && (
              <>
                <p>
                  Inspect each station object and choose its preventive repair.
                </p>
                {[
                  ["vent", "Blocked vent → clear airflow path"],
                  ["sensor", "Covered detector → uncover for inspection"],
                  ["locker", "Loose supplies → secure storage"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    disabled={fixed.includes(id)}
                    onClick={() => X((v) => [...v, id])}
                  >
                    {fixed.includes(id) ? "✓ Repaired" : label}
                  </button>
                ))}
                <button
                  onClick={() =>
                    fixed.length === 3
                      ? win()
                      : B(
                          "Pip hint: inspect all three objects. Real spacecraft need tested procedures and trained crew.",
                        )
                  }
                >
                  Check station
                </button>
              </>
            )}
            {mission === 4 && (
              <>
                <p>
                  Build the mission report. Select every scientifically
                  supported statement, then submit it.
                </p>
                {[
                  "Quiet droplet flames can be rounded",
                  "Airflow can carry oxygen and smoke",
                  "Every space flame is a perfect sphere",
                  "Animations alone prove safety",
                ].map((s) => (
                  <button
                    aria-pressed={items.includes(s)}
                    key={s}
                    onClick={() =>
                      I((v) =>
                        v.includes(s) ? v.filter((x) => x !== s) : [...v, s],
                      )
                    }
                  >
                    {items.includes(s) ? "✓ " : ""}
                    {s}
                  </button>
                ))}
                <button
                  onClick={() =>
                    items.length === 2 &&
                    items.includes("Quiet droplet flames can be rounded") &&
                    items.includes("Airflow can carry oxygen and smoke")
                      ? win()
                      : B(
                          "Pip hint: geometry and ventilation matter. An illustration is not experimental proof.",
                        )
                  }
                >
                  Submit science report
                </button>
              </>
            )}
          </div>
        )}
        {won && (
          <div className="mission-reward">
            <span>✦</span>
            <h3>
              {mission === 4 ? "Junior Space Scientist" : "Discovery unlocked!"}
            </h3>
            <p>
              {mission === 4
                ? "You completed the academy. Your certificate is this badge — no name or account needed."
                : "Your crew has a new piece of science."}
            </p>
            {mission < 4 ? (
              <button onClick={() => enter(mission + 1)}>
                Launch next mission →
              </button>
            ) : (
              <Link to="/learn">Explore the learning lab →</Link>
            )}
            <button onClick={() => enter(mission)}>Play again</button>
          </div>
        )}
      </section>
      <Disclosure />
      <p>
        Guest play · No account · No personal information · Progress stays in
        this browser · Silent by design
      </p>
    </main>
  );
}
