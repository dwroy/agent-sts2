import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

it("replenishes anonymous stock through original dispatch, native reading and content callbacks", () => {
  // Durable fixture writes use the repository's disk-backed temp root, not /tmp tmpfs.
  expect(execFileSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_external_stock.py"], {
    encoding: "utf8", timeout: 60_000,
  })).toBe("");
}, 60_000);
