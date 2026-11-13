import { describe, it, expect } from "vitest";
import { SSEParser } from "./client";
describe("SSE parser", () => {
  it("reassembles chunk boundaries and ignores heartbeat comments", () => {
    const parser = new SSEParser();
    expect(
      parser.push(': ping\n\nevent: text.delta\ndata: {"event":"text.'),
    ).toEqual([]);
    const events = parser.push(
      'delta","delta":"O₂"}\n\nevent: turn.completed\ndata: {"event":"turn.completed"}\n\n',
    );
    expect(events).toHaveLength(2);
    expect(events[0].delta).toBe("O₂");
    expect(events[1].event).toBe("turn.completed");
  });
  it("handles multiple data lines in an event", () => {
    const parser = new SSEParser();
    expect(parser.push('data: {"event":\ndata: "status"}\n\n')[0].event).toBe(
      "status",
    );
  });
});
