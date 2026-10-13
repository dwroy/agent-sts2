import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("acknowledges verified ordinary notices without inventing a learning parent and rejects invalid proofs before writes", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_ordinary_notice_ack.py"], {
    encoding: "utf8", timeout: 15_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 4 tests");
});
