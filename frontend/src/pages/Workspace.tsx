import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowUp,
  Square,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Loader2,
  FlaskConical,
  FileText,
  X,
  PlayCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useQuery } from "@tanstack/react-query";
import { api, stream } from "../api/client";
import { useWorkspace } from "../state";
import { ArtifactView } from "../artifacts/ArtifactView";
import { EvidenceInspector } from "../components/EvidenceInspector";

const questions = [
  [
    "SUPPRESSION",
    "What do NASA experiments tell us about oxygen concentration and flame extinction near lunar-habitat atmospheric conditions?",
  ],
  [
    "PREVENTION",
    "How does ventilation affect flame spread over solid materials in microgravity?",
  ],
  [
    "DETECTION",
    "Which NASA investigations studied smoke detection in spacecraft?",
  ],
  ["MEASUREMENTS", "What was the extinction diameter in FLEX test 20CAL10?"],
];

function Answer({
  answer,
  text,
  onEvidence,
}: {
  answer: any;
  text: string;
  onEvidence: (id: string) => void;
}) {
  // Validated citation numbers are transformed into controlled local links; raw HTML stays disabled.
  let markdown =
    answer?.validated_markdown ||
    text.replace(/\[\[(?:ev:)?ev_[^\]]+\]\]/g, "[source pending]");
  if (answer)
    markdown = markdown.replace(/\[(\d+)\]/g, (whole: string, n: string) =>
      answer.citations.some((c: any) => c.n === Number(n))
        ? `[${n}](#cite-${n})`
        : whole,
    );
  return (
    <div className="answer-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          li: ({ node, children }) => {
            const line = node?.position?.start.line || 0;
            const index =
              markdown
                .split("\n")
                .slice(0, line)
                .filter((l: string) => l.trimStart().startsWith("- ")).length -
              1;
            const strength = answer?.evidence_strength?.[String(index)];
            return (
              <li>
                {children}
                {strength && (
                  <span
                    className="source-chip"
                    title="Coverage by cited source types and sample count; not a safety score or peer review"
                  >
                    {strength} coverage
                  </span>
                )}
              </li>
            );
          },
          a: ({ href, children }) => {
            if (href?.startsWith("#cite-")) {
              const n = Number(href.slice(6));
              const citation = answer.citations.find((c: any) => c.n === n);
              return (
                <button
                  className="citation"
                  onClick={() => citation && onEvidence(citation.evidence_id)}
                  aria-label={`Open citation ${n}`}
                >
                  {children}
                </button>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
      {answer?.audit &&
        (answer.audit.uncited_sentences > 0 ||
          answer.audit.invalid_citations > 0 ||
          answer.audit.kind_mismatches > 0 ||
          answer.audit.ungrounded_numbers > 0) && (
          <div className="notice">
            Citation audit: {answer.audit.uncited_sentences} potentially uncited
            statements · {answer.audit.invalid_citations} removed citations ·{" "}
            {answer.audit.kind_mismatches} evidence-type mismatches
            {answer.audit.ungrounded_numbers != null &&
              ` · ${answer.audit.ungrounded_numbers} numbers not found in the cited evidence`}
            . This is an automated check, not proof of correctness.
            {answer.audit.details?.length > 0 && (
              <ul>
                {answer.audit.details.map((d: string) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      {answer?.audit && answer.audit.ungrounded_numbers === 0 && (
        <p className="muted audit-ok">
          Every number in cited sentences was found in the cited NASA evidence
          (automated check).
        </p>
      )}
    </div>
  );
}

export function Workspace() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const state = useWorkspace();
  const [input, setInput] = useState(""),
    [messages, setMessages] = useState<any[]>([]),
    [toolOpen, setToolOpen] = useState(true);
  const [lab, setLab] = useState(false);
  const controller = useRef<AbortController | null>(null),
    bottom = useRef<HTMLDivElement>(null);
  const { data: meta } = useQuery({
    queryKey: ["meta"],
    queryFn: () => api("/meta"),
  });
  const replay = sessionId?.startsWith("replay:");
  const { data: replays } = useQuery({
    queryKey: ["replays"],
    queryFn: () => api("/replays"),
    enabled: Boolean(replay),
  });
  const recording = replays?.find(
    (r: any) => `replay:${r.replay_id}` === sessionId,
  );
  const { data: catalog } = useQuery({
    queryKey: ["all-investigations-tagged"],
    queryFn: () => api("/investigations?limit=100"),
  });
  const roleCount = (role: string) =>
    (catalog?.items || []).filter((i: any) =>
      i.fire_safety_objectives?.includes(role),
    ).length;
  const numericCount = (catalog?.items || []).filter(
    (i: any) => i.has_numeric_data,
  ).length;
  useEffect(() => {
    controller.current?.abort();
    state.reset();
    setMessages([]);
    if (sessionId?.startsWith("replay:")) {
      const control = new AbortController();
      controller.current = control;
      stream(
        `/replays/${encodeURIComponent(sessionId.slice(7))}`,
        undefined,
        useWorkspace.getState().apply,
        control.signal,
      ).catch((e) => {
        if (e.name !== "AbortError")
          useWorkspace.getState().setError(e.message);
      });
    } else if (sessionId) {
      api(`/sessions/${sessionId}`)
        .then((d) => {
          setMessages((current) =>
            current.some((m) => m.pending) ? current : d.turns || [],
          );
          setLab(Boolean(d.session.analysis_lab));
        })
        .catch((e) => useWorkspace.getState().setError(e.message));
    }
    return () => controller.current?.abort();
    // Store actions are stable; route changes are the boundary for resetting a thread.
  }, [sessionId]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [state.text, state.phase]);

  async function send(question = input) {
    if (!question.trim() || state.running) return;
    try {
      let sid = sessionId;
      if (!sid || replay) {
        const d = await api("/sessions", { title: question.slice(0, 80) });
        sid = d.session_id;
        if (lab) await api(`/sessions/${sid}`, { analysis_lab: true }, "PATCH");
        sessionStorage.setItem("embernova-pending", question);
        navigate(`/s/${sid}`);
        return;
      }
      if (state.answer)
        setMessages((m) =>
          [
            ...m,
            {
              user_text: m.at(-1)?.pending ? m.at(-1).user_text : "",
              answer: state.answer,
            },
          ].filter((t) => !t.pending),
        );
      setInput("");
      setMessages((m) => [...m, { user_text: question, pending: true }]);
      useWorkspace.setState({
        running: true,
        text: "",
        answer: null,
        error: null,
        phase: "Connecting to research agent…",
      });
      const control = new AbortController();
      controller.current = control;
      await stream(
        `/sessions/${sid}/messages`,
        { text: question },
        useWorkspace.getState().apply,
        control.signal,
      );
      // Reload authoritative history on completion, but leave streamed evidence and selected artifacts open.
      const history = await api(`/sessions/${sid}`);
      setMessages(history.turns || []);
      if (history.turns?.length) {
        useWorkspace.setState({ text: "", answer: null });
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        state.setError((e as Error).message);
    }
  }
  useEffect(() => {
    const pending = sessionStorage.getItem("embernova-pending");
    if (sessionId && !replay && pending) {
      sessionStorage.removeItem("embernova-pending");
      void send(pending);
    }
  }, [sessionId]);
  async function stop() {
    if (sessionId && !replay) await api(`/sessions/${sessionId}/cancel`, {});
    controller.current?.abort();
    useWorkspace.setState({ running: false, phase: "Research stopped" });
  }
  const hasContent =
    messages.length > 0 || state.text || state.running || replay;
  const panel = state.selected || state.evidenceId;
  return (
    <main className={`workspace ${panel ? "with-panel" : ""}`}>
      <section className="conversation">
        <div className="workspace-top">
          <span>
            <span className="live-dot" /> Research workspace
          </span>
          <span className="model-pill">
            {meta?.llm_available ? meta.models.agent : "Data tools available"}
          </span>
        </div>
        {!hasContent ? (
          <div className="welcome">
            <div className="orbit-mark">
              <FlaskConical size={27} />
            </div>
            <div className="eyebrow">
              NASA COMBUSTION SCIENCE · RESEARCH WORKSPACE
            </div>
            <h1>
              From flame behavior
              <br />
              to <em>fire safety insight.</em>
            </h1>
            <p>
              Explore NASA’s microgravity experiments.
              <br />
              Ask a question. Follow the evidence.
            </p>
            <div className="suggestions">
              {questions.map(([label, q]) => (
                <button key={label} onClick={() => void send(q)}>
                  <span>{label}</span>
                  <p>{q}</p>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            </div>
            {meta && catalog && (
              <div className="corpus-strip" aria-label="Corpus overview">
                <span>
                  <b>{meta.corpus.investigations}</b> NASA investigations
                </span>
                <span>
                  <b>{numericCount}</b> with measured data tables
                </span>
                <span>
                  <b>{meta.corpus.runs.toLocaleString()}</b> source test records
                </span>
                <span>
                  <b>{meta.corpus.documents}</b> reports ·{" "}
                  <b>{meta.corpus.media}</b> NASA videos and images
                </span>
                <div className="corpus-roles">
                  {[
                    ["prevention", "Prevention"],
                    ["detection", "Detection"],
                    ["suppression", "Suppression"],
                  ].map(([id, name]) => (
                    <Link key={id} to={`/investigations?objective=${id}`}>
                      {name} <b>{roleCount(id)}</b>
                    </Link>
                  ))}
                  <Link to="/evidence-map">
                    What NASA has not tested <ArrowUpRight size={12} />
                  </Link>
                </div>
              </div>
            )}
            <Link to="/featured" className="featured-link">
              <PlayCircle size={16} /> Explore recorded evidence demonstrations{" "}
              <ArrowUpRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="thread">
            {replay && (
              <div className="recorded-banner">
                <PlayCircle size={16} />
                <div>
                  {recording?.origin === "recorded_live" ? (
                    <>
                      <b>Recorded SI research session</b>
                      <p>
                        A real {recording.model} session recorded on{" "}
                        {new Date(recording.recorded_at).toLocaleDateString()},
                        replayed without a live request. The answer is
                        SI-generated; numbers come from the cited NASA tools.
                      </p>
                    </>
                  ) : (
                    <>
                      <b>Scripted evidence demonstration</b>
                      <p>
                        Deterministic NASA data tools only; no SI model was
                        run for this walkthrough.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div className="turn" key={m.turn_id || i}>
                <div className="user-message">{m.user_text}</div>
                {m.answer && (
                  <div className="assistant-message">
                    <div className="assistant-label">
                      <Sparkles size={17} /> EmberNova{" "}
                      <span className="si-badge">SI</span>
                    </div>
                    <Answer
                      answer={m.answer}
                      text=""
                      onEvidence={state.inspect}
                    />
                    {m.artifacts?.length > 0 && (
                      <div className="artifact-cards">
                        {m.artifacts.map((id: string) => (
                          <button
                            key={id}
                            onClick={() =>
                              api(`/artifacts/${id}`)
                                .then(state.select)
                                .catch((e) => state.setError(e.message))
                            }
                          >
                            <FlaskConical size={15} /> Open research artifact{" "}
                            <ArrowUpRight size={13} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {(state.running || state.tools.length > 0) && (
              <div className="tool-activity">
                <button
                  onClick={() => setToolOpen((v) => !v)}
                  className="text-button"
                >
                  {state.running ? (
                    <Loader2 size={15} className="spin" />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}{" "}
                  {state.phase} <span>{toolOpen ? "−" : "+"}</span>
                </button>
                {toolOpen && (
                  <ol>
                    {state.tools.map((t) => (
                      <li key={t.call_id}>
                        <span
                          className={
                            t.status === "error" ? "tool-error" : "tool-dot"
                          }
                        >
                          {t.status === "ok"
                            ? "✓"
                            : t.status === "error"
                              ? "!"
                              : "·"}
                        </span>
                        <span>{t.tool.replaceAll("_", " ")}</span>
                        <small>
                          {t.status === "ok"
                            ? `${t.latency_ms} ms`
                            : t.status === "error"
                              ? "Could not complete"
                              : "Working…"}
                        </small>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
            {state.artifacts.length > 0 && (
              <div className="artifact-cards">
                {state.artifacts.map((a) => (
                  <button
                    className={
                      state.selected?.artifact_id === a.artifact_id
                        ? "active"
                        : ""
                    }
                    key={a.artifact_id}
                    onClick={() => state.select(a)}
                  >
                    <FlaskConical size={15} />
                    <span>{a.title}</span>
                    <ArrowUpRight size={13} />
                  </button>
                ))}
              </div>
            )}
            {state.text && (
              <div className="assistant-message">
                <div className="assistant-label">
                  <Sparkles size={17} /> EmberNova{" "}
                  <span className="si-badge">SI</span>
                </div>
                <Answer
                  answer={state.answer}
                  text={state.text}
                  onEvidence={state.inspect}
                />
              </div>
            )}
            {state.error && (
              <div className="error">
                <b>Research unavailable</b>
                <p>{state.error}</p>
                <Link to="/featured">Open recorded demonstrations</Link> ·{" "}
                <Link to="/data/PSI-69:flex_experimental">
                  Explore measurements
                </Link>
              </div>
            )}
            <div ref={bottom} />
          </div>
        )}
        <div className="composer-area">
          {!meta?.llm_available && (
            <div className="offline-note">
              Live SI needs a local OpenAI key. NASA data tools and recorded
              demonstrations work offline.
            </div>
          )}
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <label className="sr-only" htmlFor="research-question">
              Research question
            </label>
            <textarea
              id="research-question"
              value={input}
              maxLength={4000}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about combustion, experimental conditions, or fire safety…"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <div className="composer-bottom">
              {meta?.features.analysis_lab && !replay && (
                <label className="lab-toggle">
                  <input
                    type="checkbox"
                    checked={lab}
                    disabled={state.running}
                    onChange={async (e) => {
                      const enabled = e.target.checked;
                      try {
                        if (sessionId)
                          await api(
                            `/sessions/${sessionId}`,
                            { analysis_lab: enabled },
                            "PATCH",
                          );
                        setLab(enabled);
                      } catch (error) {
                        state.setError((error as Error).message);
                      }
                    }}
                  />{" "}
                  Analysis Lab <span className="si-badge">SI</span>
                </label>
              )}
              <span>
                <FileText size={13} /> Grounded in NASA evidence
              </span>
              {state.running ? (
                <button
                  type="button"
                  className="send-button"
                  onClick={() => void stop()}
                  aria-label="Stop research"
                >
                  <Square size={15} />
                </button>
              ) : (
                <button
                  className="send-button"
                  disabled={!input.trim()}
                  aria-label="Send research question"
                >
                  <ArrowUp size={19} />
                </button>
              )}
            </div>
          </form>
          <p className="disclaimer">
            SI interpretations need scientific review. Experimental coverage
            does not establish safety.
          </p>
        </div>
      </section>
      {panel && (
        <aside className="research-panel">
          <div className="panel-header">
            <div>
              <button
                className={!state.evidenceId ? "active" : ""}
                onClick={() => state.inspect(null)}
              >
                Artifact
              </button>
              <button
                className={state.evidenceId ? "active" : ""}
                disabled={!state.evidenceId}
              >
                Evidence
              </button>
            </div>
            <button
              aria-label="Close research panel"
              className="icon-button"
              onClick={() =>
                useWorkspace.setState({ selected: null, evidenceId: null })
              }
            >
              <X size={17} />
            </button>
          </div>
          <div className="panel-content">
            {state.evidenceId ? (
              <EvidenceInspector id={state.evidenceId} />
            ) : state.selected ? (
              <ArtifactView artifact={state.selected} />
            ) : null}
          </div>
        </aside>
      )}
    </main>
  );
}
