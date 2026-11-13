import { create } from "zustand";
import type { Artifact } from "./api/generated/Artifact";
import type { Evidence } from "./api/generated/Evidence";
import type { StreamEvent } from "./api/client";

type WorkspaceState = {
  artifacts: Artifact[];
  evidence: Record<string, Evidence>;
  selected: Artifact | null;
  evidenceId: string | null;
  phase: string;
  tools: StreamEvent[];
  text: string;
  answer: any;
  running: boolean;
  error: string | null;
  replay: boolean;
  apply: (event: StreamEvent) => void;
  reset: () => void;
  select: (artifact: Artifact) => void;
  inspect: (id: string | null) => void;
  setError: (error: string | null) => void;
};
const empty = {
  artifacts: [],
  evidence: {},
  selected: null,
  evidenceId: null,
  phase: "",
  tools: [],
  text: "",
  answer: null,
  running: false,
  error: null,
  replay: false,
};
export const useWorkspace = create<WorkspaceState>((set) => ({
  ...empty,
  reset: () => set({ ...empty }),
  select: (selected) => set({ selected, evidenceId: null }),
  inspect: (evidenceId) => set({ evidenceId }),
  setError: (error) => set({ error, running: false }),
  apply: (event) =>
    set((s) => {
      switch (event.event) {
        case "turn.started":
          return {
            running: true,
            replay: event.replay,
            phase: "Planning research",
            text: "",
            answer: null,
            error: null,
            tools: [],
          };
        case "status":
          return { phase: event.message };
        case "tool.started":
          return { tools: [...s.tools, event] };
        case "tool.completed":
          return {
            tools: s.tools.map((t) =>
              t.call_id === event.call_id ? { ...t, ...event } : t,
            ),
          };
        case "evidence.added":
          return {
            evidence: {
              ...s.evidence,
              [event.evidence.evidence_id]: event.evidence,
            },
          };
        case "artifact.created":
          return {
            artifacts: [...s.artifacts, event.artifact],
            selected: s.selected || event.artifact,
          };
        case "text.delta":
          return { text: s.text + event.delta };
        case "text.completed":
          return {
            answer: event.answer,
            text: event.answer.validated_markdown,
          };
        case "turn.completed":
          return { running: false, phase: "Research complete" };
        case "error":
          return {
            running: false,
            error: event.message,
            phase: "Research stopped",
          };
        default:
          return s;
      }
    }),
}));
