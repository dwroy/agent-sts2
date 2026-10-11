import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("dispatches fixed feature fixtures while retaining missing-tree guards", () => {
  const result = spawnSync("python3", ["-B", "../ops/tests/test_silent_calibration_dispatch.py"], {
    encoding: "utf8",
    timeout: 20_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stderr).toContain("OK");
});
