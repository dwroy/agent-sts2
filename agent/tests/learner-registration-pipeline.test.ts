/** Five fixed wrappers must not wait for the rest of their parent's learning tick. */
import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

it("publishes all four external registrations and the own batch before subsequent source validation", () => {
  expect(execFileSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_learner_registration_pipeline.py"], {
    encoding: "utf8", timeout: 15_000,
  })).toBe("");
});
