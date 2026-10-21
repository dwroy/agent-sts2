import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("protects real runtime identities while retiring inherited bindings and main-only reports", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_reclaim_gates.py"], {
    encoding: "utf8", timeout: 90_000,
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 16 tests");
}, 95_000);
