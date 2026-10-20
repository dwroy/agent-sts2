import { expect, it, vi } from "vitest";

// Keep every original question, comparison, failure and role-isolation assertion.
import "./global-build-integration.test.js";

const solver = await vi.importActual<typeof import("../src/reflex/turn-solver.js")>("../src/reflex/turn-solver.js");
const solve = solver.solveTurn;
const search = vi.spyOn(solver, "solveTurn").mockImplementation((input) => {
  if (input.hand.length) throw new Error("fixed receipt consumers must not search an opening hand");
  return solve(input);
});

it("global fact consumers capture synthetic boards without searching opening hands", () => {
  expect(search).toHaveBeenCalled();
  expect(search.mock.calls.every(([input]) => input.hand.length === 0)).toBe(true);
});
