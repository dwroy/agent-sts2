import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("manual research requires its bound request, frozen evidence and a clean report-only tree", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_strategy_research.py"], {
    encoding: "utf8", timeout: 30_000,
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 8 tests");
});
