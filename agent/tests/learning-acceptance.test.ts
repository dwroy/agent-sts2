/** Native retirement frees compute while original semantic acceptance stays pending. */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it.each(["test_own_learning_slot.py", "test_learner_tui_recovery.py"])("checks %s with fixed native and terminal fixtures", (file) => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "-m", "unittest", "discover", "-s", "ops/tests", "-p", file], {
    cwd: fileURLToPath(new URL("../..", import.meta.url)), encoding: "utf8", timeout: 60_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
}, 65_000);
