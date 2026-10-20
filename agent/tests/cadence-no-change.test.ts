import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("settles registered empty cadence reviews and preserves source, parent and retention guards", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_cadence_no_change.py"], {
    encoding: "utf8", timeout: 15_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 4 tests");
});
