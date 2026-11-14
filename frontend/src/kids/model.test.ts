import { describe, it, expect } from "vitest";
import { AcademyState } from "./model";
describe("academy game rules", () => {
  it("blocks locked doors and station boundaries", () => {
    const s = new AcademyState();
    expect(s.canMove(8, 0)).toBe(false);
    expect(s.canMove(0, 5)).toBe(false);
    s.x = 2;
    s.z = 0;
    s.interact("console");
    expect(s.canMove(8, 0)).toBe(true);
    expect(s.canMove(8, 3)).toBe(false);
  });
  it("requires proximity and carries one capsule at a time", () => {
    const s = new AcademyState();
    expect(s.interact("fuel")).toBe(false);
    s.x = 12;
    s.z = 2;
    s.interact("fuel");
    expect(s.held).toBe("fuel");
    s.x = 16;
    s.interact("oxygen");
    expect(s.held).toBe("fuel");
    expect(s.loaded).toEqual([]);
  });
  it("does not complete safety protocol before inspection", () => {
    const s = new AcademyState(4);
    s.x = 68;
    s.z = 1;
    s.interact("beacon");
    expect(s.complete).toBe(false);
    s.x = 60;
    s.interact("vent");
    s.x = 64;
    s.z = -1;
    s.interact("sensor");
    s.x = 68;
    s.z = 1;
    s.interact("beacon");
    expect(s.complete).toBe(true);
  });
});
