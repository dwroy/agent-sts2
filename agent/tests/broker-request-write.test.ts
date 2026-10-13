import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("returns immediately when broker request write or publication fails", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_broker_request_write.py"], {
    encoding: "utf8", timeout: 15_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 2 tests");
});
