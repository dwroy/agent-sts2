import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("frozen research takes the next slot and starts only after its actual registration is saved", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_strategy_research_scheduling.py"], {
    encoding: "utf8", timeout: 30_000,
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 18 tests");
});
