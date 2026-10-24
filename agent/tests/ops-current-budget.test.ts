import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("bounds growing ops checklists with complete hash-linked authority, failures and event sources", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_ops_current_budget.py"], {
    encoding: "utf8", timeout: 15_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 8 tests");
});
