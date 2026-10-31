import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("retires only verified workspaces and recovers preserved artifacts after interruptions", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_worktree_retention.py"], {
    encoding: "utf8", timeout: 60_000,
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 31 tests");
}, 65_000);
