import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
it("reports unique shadow comparisons without claiming sampling admission", () => {
  const result = spawnSync("python3", ["-B", "tests/adaptive_health_test.py"], { encoding: "utf8" });
  expect(result.status, result.stdout + result.stderr).toBe(0);
});
