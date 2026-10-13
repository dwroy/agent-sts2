import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("shares immutable table snapshots and cleans only a failed unpublished copy", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_paper_snapshot_capacity.py"], {
    encoding: "utf8", timeout: 20_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 4 tests");
});
