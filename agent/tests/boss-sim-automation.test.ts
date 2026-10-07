import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("checks B4/B5 triggers, leases, retries, completion and acceptance with fixed fixtures", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "-m", "unittest", "discover", "-s", "ops/tests", "-p", "test_boss_sim_automation.py"], {
    cwd: resolve(".."),
    env: { PATH: process.env.PATH ?? "/usr/bin:/bin", TMPDIR: process.env.TMPDIR ?? "/tmp", PYTHONDONTWRITEBYTECODE: "1" },
    encoding: "utf8",
    timeout: 30_000,
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toMatch(/Ran \d+ tests/);
  expect(result.stderr).toContain("OK");
});
