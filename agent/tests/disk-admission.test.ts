import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("enforces approved capacity gates in the original tick and only at a finished-run boundary", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_disk_admission.py"], {
    encoding: "utf8", timeout: 35_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stderr).toMatch(/Ran [1-9]\d* tests/);
}, 40_000);
