import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("voids held learners only with a supervisor verdict, idle native groups and no writer", () => {
  const result = spawnSync("python3", ["-B", "-m", "unittest", "discover", "-s", "ops/tests", "-p", "test_learner_supervisor_close.py"], {
    cwd: fileURLToPath(new URL("../..", import.meta.url)), encoding: "utf8", timeout: 60_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
}, 65_000);
