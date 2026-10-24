import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("keeps own evidence separate and verifies allowlisted external decision fields", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../eval/tests/test_own_build_stats.py"], {
    encoding: "utf8", timeout: 30_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stderr).toContain("OK");
});
