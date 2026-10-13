import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
it("audits module coverage, isolates roles, and emits one durable incident per run", () => {
  const result = spawnSync("python3", ["-B", "tests/module_health_test.py"], { encoding: "utf8", timeout: 10_000 });
  expect(result.status, result.stdout + result.stderr).toBe(0);
});
