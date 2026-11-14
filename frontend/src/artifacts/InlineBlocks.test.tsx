import { describe, expect, it } from "vitest";
import { sortBlocks } from "./InlineBlocks";

describe("inline research blocks", () => {
  it("orders ranking and evidence assessment before measurements and media", () => {
    const order = sortBlocks([
      { type: "media" },
      { type: "chart" },
      { type: "evidence_assessment" },
      { type: "investigation_ranking" },
      { type: "unknown_kind" },
    ]).map((b) => b.type);
    expect(order).toEqual([
      "investigation_ranking",
      "evidence_assessment",
      "chart",
      "media",
      "unknown_kind",
    ]);
  });
});
