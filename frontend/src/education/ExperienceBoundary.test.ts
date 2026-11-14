import { expect, it } from "vitest";
import { ExperienceBoundary } from "./ExperienceBoundary";
it("offers a recovery screen after an error", () => {
  expect(ExperienceBoundary.getDerivedStateFromError()).toEqual({
    failed: true,
  });
});
