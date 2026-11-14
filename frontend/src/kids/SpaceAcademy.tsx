import { useEffect, useRef, useState } from "react";
import { AcademyGame, type Snapshot } from "./engine";
import { loadCheckpoint, rooms } from "./model";
import "./game.css";
export default function SpaceAcademy() {
  const mount = useRef<HTMLDivElement>(null),
    game = useRef<AcademyGame | null>(null);
  const [state, S] = useState<Snapshot | null>(null),
    [started, Start] = useState(false),
    [paused, Pause] = useState(false),
    [muted, Mute] = useState(true),
    [error, Error] = useState(""),
    [session, Session] = useState(0),
    [help, Help] = useState(false);
  useEffect(() => {
    if (!started || !mount.current) return;
    let engine: AcademyGame;
    try {
      engine = new AcademyGame(mount.current, S, loadCheckpoint());
      game.current = engine;
    } catch {
      Error(
        "WebGL could not start. Enable hardware acceleration or try another browser.",
      );
      return;
    }
    return () => {
      engine.dispose();
      game.current = null;
    };
  }, [started, session]);
  function togglePause() {
    Pause((v) => {
      game.current?.setPaused(!v);
      return !v;
    });
  }
  function sound() {
    Mute((v) => {
      game.current?.setMuted(!v);
      return !v;
    });
  }
  function restart() {
    try {
      localStorage.removeItem("embernova-academy-v2");
    } catch {
      /* storage optional */
    }
    S(null);
    Help(false);
    Pause(false);
    Mute(true);
    Session((v) => v + 1);
  }
  const control = (code: string, label: string) => (
    <button
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        game.current?.input(code, true);
      }}
      onPointerUp={() => game.current?.input(code, false)}
      onPointerCancel={() => game.current?.input(code, false)}
      onLostPointerCapture={() => game.current?.input(code, false)}
    >
      {label}
    </button>
  );
  return (
    <main className="academy-game" data-si-generated="true">
      <div className="game-bar">
        <span>
          <b>SPACE FIRE ACADEMY</b>
          <small>EMBERNOVA / EXPLORER PROGRAM</small>
        </span>
        <div>
          <button onClick={sound} aria-pressed={!muted}>
            {muted ? "Sound off" : "Sound on"}
          </button>
          <button onClick={togglePause} disabled={!started}>
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={() => {
              game.current?.setPaused(!help || paused);
              Help(!help);
            }}
          >
            Controls
          </button>
        </div>
      </div>
      <div className="game-viewport">
        <div
          className="game-render"
          ref={mount}
          data-room={state?.room ?? 0}
          data-fps={state?.fps ?? 0}
          data-unlocked={state?.unlocked ?? 0}
          data-x={state?.x ?? -3}
          data-z={state?.z ?? 1}
          data-loaded={state?.loaded ?? 0}
          data-fans={JSON.stringify(state?.fans ?? [1, 3, 1])}
          data-complete={state?.complete ?? false}
          data-targets={JSON.stringify(state?.targets ?? [])}
        />
        {!started && (
          <div className="game-start">
            <div className="game-start-orbit" />
            <p>BOARDING CALL / YOUNG EXPLORERS</p>
            <h1>
              Space Fire
              <br />
              <em>Academy</em>
            </h1>
            <p>One astronaut. One robot. A station full of discoveries.</p>
            <button onClick={() => Start(true)}>Launch adventure →</button>
            <small>Move · Carry · Experiment · Explore</small>
          </div>
        )}
        {error && (
          <div className="game-overlay" role="alert">
            <h2>Graphics unavailable</h2>
            <p>{error}</p>
            <button onClick={() => location.reload()}>Try again</button>
          </div>
        )}
        {started && state && (
          <>
            <div className="game-mission">
              <span>
                ROOM {state.room + 1} / {rooms.length} · {rooms[state.room]}
              </span>
              <p>{state.objective}</p>
              <div
                className="game-badges"
                aria-label={`${state.unlocked} rooms unlocked`}
              >
                {rooms.map((r, i) => (
                  <i
                    key={r}
                    className={i <= state.unlocked ? "earned" : ""}
                    title={r}
                  >
                    {i + 1}
                  </i>
                ))}
              </div>
            </div>
            <div className="pip-bubble" role="status">
              <b>PIP</b>
              <span>{state.hint.replace("Pip: ", "")}</span>
            </div>
            {state.nearest && (
              <div className="game-interact">
                E / TAP OBJECT · {state.nearest}
              </div>
            )}
            {state.held && (
              <div className="game-carry">Carrying {state.held} capsule</div>
            )}
            <div className="touch-gamepad">
              <div className="touch-directions">
                {control("KeyW", "↑")}
                {control("KeyA", "←")}
                {control("KeyS", "↓")}
                {control("KeyD", "→")}
              </div>
              <div>
                {control("Space", "Boost")}
                {control("KeyE", "Interact")}
              </div>
            </div>
          </>
        )}
        {(paused || help) && started && (
          <div className="game-overlay">
            <h2>{paused ? "Flight paused" : "Your flight controls"}</h2>
            <p>WASD / arrows: move · Space: hop or boost · E: interact</p>
            <p>
              Click equipment to walk over and use it. Click the floor to move.
              On touch, use the arrows and Interact.
            </p>
            <p>Follow the floor lights. Powered doors slide open.</p>
            <button
              onClick={() => {
                Help(false);
                if (!paused) game.current?.setPaused(false);
                if (paused) togglePause();
              }}
            >
              Back to the station
            </button>
            <button onClick={restart}>Restart from docking bay</button>
          </div>
        )}
        {state?.complete && (
          <div className="game-overlay victory">
            <p>MISSION ACCOMPLISHED</p>
            <h2>Explorer wings earned!</h2>
            <p>You brought the station back online.</p>
            <div className="wings" aria-hidden="true">
              ✦
            </div>
            <p>Real spacecraft need tested safety systems and trained crews.</p>
            <button onClick={restart}>Fly again</button>
          </div>
        )}
      </div>
      <div className="game-disclosure">
        <span className="si-badge">SI</span> Original SI-generated game art &
        content · Conceptual flame/airflow visuals, no measured predictions ·
        Pretend experiments only. Never use real fire.{" "}
        <a
          href="https://www.nasa.gov/missions/station/studying-combustion-and-fire-safety/"
          target="_blank"
          rel="noreferrer"
        >
          NASA science ↗
        </a>
      </div>
    </main>
  );
}
