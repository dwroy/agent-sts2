import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("authenticates original manual V6 notice sources and preserves independent role and scope guards", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_manual_notice_ack.py"], {
    encoding: "utf8", timeout: 15_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 7 tests");
});
