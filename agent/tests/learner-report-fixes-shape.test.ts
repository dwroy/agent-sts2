import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("rechecks descriptive fixes only with verified sources and unchanged published leaves", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_learner_report_fixes_shape.py"], {
    encoding: "utf8", timeout: 10_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 3 tests");
});
