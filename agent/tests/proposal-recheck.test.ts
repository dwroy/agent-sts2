import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("batches waiting proposals before allocation while retaining independent writer ownership", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_proposal_recheck.py"], {
    encoding: "utf8", timeout: 30_000,
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 10 tests");
});
