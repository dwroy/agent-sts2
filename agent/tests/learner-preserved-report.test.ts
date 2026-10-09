import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("rechecks only launch-bound calibration completions with verified source and publication proofs", () => {
  const result = spawnSync("python3", ["-B", "tests/learner_preserved_report_test.py"], {
    encoding: "utf8", timeout: 10_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
});
