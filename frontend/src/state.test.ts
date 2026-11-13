import { beforeEach, describe, expect, it } from "vitest";
import { useWorkspace } from "./state";
describe("research state", () => {
  beforeEach(() => useWorkspace.getState().reset());
  const send = (event: any) =>
    useWorkspace
      .getState()
      .apply({ seq: 0, turn_id: "turn", t_ms: 0, ...event });
  it("records evidence before validating a completed answer and opens the first artifact", () => {
    send({ event: "turn.started", replay: true });
    send({ event: "evidence.added", evidence: { evidence_id: "ev_real" } });
    send({
      event: "artifact.created",
      artifact: { artifact_id: "art_real", title: "NASA measurements" },
    });
    send({
      event: "text.completed",
      answer: {
        validated_markdown: "Measured [1]",
        citations: [{ n: 1, evidence_id: "ev_real" }],
      },
    });
    send({ event: "turn.completed" });
    const state = useWorkspace.getState();
    expect(state.running).toBe(false);
    expect(state.replay).toBe(true);
    expect(state.selected?.artifact_id).toBe("art_real");
    expect(state.evidence.ev_real).toBeDefined();
  });
  it("surfaces failed tools and terminal errors", () => {
    send({ event: "tool.started", call_id: "c", tool: "query_measurements" });
    send({ event: "tool.completed", call_id: "c", status: "error" });
    send({ event: "error", message: "No data" });
    expect(useWorkspace.getState().tools[0].status).toBe("error");
    expect(useWorkspace.getState().error).toBe("No data");
  });
});
