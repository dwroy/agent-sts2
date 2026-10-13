import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("reclaims only settled learner copies with verified archival and safe restoration", () => {
  const result = spawnSync("python3", ["-B", "../ops/tests/test_learner_retention.py"], {
    encoding: "utf8",
    timeout: 30_000,
  });
  expect(result.status, result.stderr).toBe(0);
}, 35_000);
