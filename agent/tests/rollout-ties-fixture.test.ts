import { expect, it, vi } from "vitest";
import { rolloutDecision } from "../src/reflex/rollout.js";

// A label fixture must work even when the simulator is unavailable or expensive.
vi.mock("../src/reflex/rollout.js", async (original) => ({
  ...await original<typeof import("../src/reflex/rollout.js")>(),
  rolloutDecision: vi.fn(() => { throw new Error("fixed fixture must not simulate future turns"); }),
}));

// Keep the original question, log and choice assertions in this negative control.
import "./rollout-ties.test.js";

it("the forced tie label fixture never invokes the future-turn simulator", () => {
  expect(rolloutDecision).not.toHaveBeenCalled();
});
