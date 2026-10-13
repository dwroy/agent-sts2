import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("refuses an oversized checkout before allocating files or starting a learner", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_disk_capacity.py"], {
    encoding: "utf8", timeout: 20_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 3 tests");
});
