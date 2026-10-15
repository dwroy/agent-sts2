import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("waits for saved scheduler registration before starting a learner and stops on lock timeout", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_learner_registration_barrier.py"], {
    encoding: "utf8", timeout: 30_000,
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 2 tests");
}, 30_000);
