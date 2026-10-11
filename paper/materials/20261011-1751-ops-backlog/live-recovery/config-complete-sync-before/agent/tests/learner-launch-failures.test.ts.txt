import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("nested Fast launches preserve the native CLI and missing failed reports keep their original failure", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_learner_launch_failures.py"], {
    encoding: "utf8", timeout: 30_000,
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 8 tests");
});
