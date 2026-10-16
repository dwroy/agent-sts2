import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("keeps fixed ten-run boundaries, actual bosses, SL first attempts, unknowns and failed cadence archives distinct", () => {
  const result = spawnSync("python3", ["-B", "tests/global_build_funnel_test.py"], { encoding: "utf8", timeout: 20_000 });
  expect(result.status, result.stdout + result.stderr).toBe(0);
});
