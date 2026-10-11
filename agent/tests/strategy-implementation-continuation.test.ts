import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { validateRequest } from "../../ops/codex/lib.js";

it("resumes the frozen implementation once while preserving waiting proposals and bounded failure history", () => {
  expect(validateRequest({ action: "strategy-proposal", args: ["ops-20261012-quantitative-continuation"] }).ok).toBe(true);
  expect(validateRequest({ action: "strategy-proposal", args: ["ops-unregistered-continuation"] }).ok).toBe(false);
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_strategy_implementation_continuation.py"], {
    encoding: "utf8", timeout: 60_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stderr).toMatch(/Ran [1-9]\d* tests/);
}, 65_000);
