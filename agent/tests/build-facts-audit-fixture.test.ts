import { expect, it, vi } from "vitest";
import { SerialDeckRunner } from "../src/sim/build-sim-pool.js";

// Replay every original audit assertion with the expensive sampler unavailable.
import "./build-facts-audit.test.js";

const sampler = vi.spyOn(SerialDeckRunner.prototype, "run")
  .mockRejectedValue(new Error("question audits must use fixed simulation receipts"));

it("the boss fact consumer audits do not invoke the whole-fight sampler", () => {
  expect(sampler).not.toHaveBeenCalled();
});
