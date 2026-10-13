import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("rechecks immutable prior delivery proofs before ordinary ACKs and registered completion", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_prior_delivery_proofs.py"], {
    encoding: "utf8", timeout: 15_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 5 tests");
});
