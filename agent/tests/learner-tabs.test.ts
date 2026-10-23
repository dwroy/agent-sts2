import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("reclaims only verified terminal learner tabs with the current native verifier", () => {
  const result = spawnSync("python3", ["-B", "-m", "unittest", "discover", "-s", "ops/tests", "-p", "test_learner_tabs.py"], {
    cwd: fileURLToPath(new URL("../..", import.meta.url)), encoding: "utf8", timeout: 20_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
});
