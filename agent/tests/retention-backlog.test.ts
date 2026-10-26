import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("drains done scratch, preserves runtime retirement consumers, and bounds refresh copies", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_retention_backlog.py"], {
    encoding: "utf8", timeout: 30_000,
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 10 tests");
}, 35_000);
