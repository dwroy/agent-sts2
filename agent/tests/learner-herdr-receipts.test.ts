import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("gates interactive learner retirement and launch identity on fixed persisted receipts", () => {
  const result = spawnSync("python3", ["-B", "-m", "unittest", "ops.tests.test_learner_tui"], {
    cwd: fileURLToPath(new URL("../..", import.meta.url)), encoding: "utf8", timeout: 20_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
});
