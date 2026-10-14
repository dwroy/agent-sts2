import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("evicts only idle Git copies and restores SHA verified original inputs without completing failed tasks", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_worktree_storage.py"], {
    encoding: "utf8", timeout: 60_000,
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 17 tests");
}, 65_000);
