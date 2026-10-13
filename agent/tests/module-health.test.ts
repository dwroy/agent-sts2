import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
it("separates unsupported candidates, failed sampling and missing DPR while preserving immutable incidents", () => {
  const result = spawnSync("python3", ["-B", "tests/module_health_test.py"], { encoding: "utf8", timeout: 10_000 });
  expect(result.status, result.stdout + result.stderr).toBe(0);
});
