import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
it("only accepts fresh advancing simulation markers", () => {
  const result = spawnSync("python3", ["tests/sim_wait_test.py"], { encoding: "utf8" });
  expect(result.status, result.stdout + result.stderr).toBe(0);
});
