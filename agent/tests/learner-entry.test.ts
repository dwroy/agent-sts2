import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("recovers only the registered pre-session shared-main config import failure and preserves its evidence", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_learner_entry.py"], {
    encoding: "utf8", timeout: 30_000,
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 9 tests");
}, 30_000);
