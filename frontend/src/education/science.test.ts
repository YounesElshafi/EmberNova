import { describe, expect, it } from "vitest";
import { explain, lessons, readProgress } from "./science";
describe("educational boundaries", () => {
  it("prioritizes missing oxidizer and distinguishes flow from buoyancy", () => {
    expect(explain("earth", "quiet", "absent")).toContain("not a measured");
    expect(explain("earth", "directed", "present")).toContain("extinguish");
    expect(explain("microgravity", "quiet", "present")).toContain(
      "not describe every",
    );
  });
  it("has a valid answer for every module", () => {
    for (const l of lessons) expect(l.choices[l.answer]).toBeTruthy();
  });
  it("handles unavailable or malformed persistence", () => {
    expect(readProgress("unknown")).toEqual([]);
  });
});
