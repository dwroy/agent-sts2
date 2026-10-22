import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("passes the project Codex home from the report hook through learner dispatch without weakening preflight", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "-m", "unittest", "discover", "-s", "ops/tests", "-p", "test_boss_sim_home.py"], {
    cwd: resolve(".."), encoding: "utf8", timeout: 15_000,
    env: { PATH: process.env.PATH ?? "/usr/bin:/bin", TMPDIR: process.env.TMPDIR ?? "/tmp", PYTHONDONTWRITEBYTECODE: "1" },
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 6 tests");
  expect(result.stderr).toContain("OK");
});
