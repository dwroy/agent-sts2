import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

it("defers unlaunchable calibration/audits and retains runnable priority, leases, sources and native cursors", () => {
  expect(execFileSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_strategy_priority.py"], {
    encoding: "utf8", timeout: 20_000, stdio: ["ignore", "pipe", "pipe"],
  })).toBe("");
});
