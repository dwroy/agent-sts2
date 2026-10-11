import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { validateRequest } from "../../ops/codex/lib.js";

it("binds the approved implementation through the existing broker and host before model start", () => {
  expect(validateRequest({ action: "strategy-proposal", args: ["roy-20261011-silent-core-cycle-quantitative-learning"] }).ok).toBe(true);
  expect(validateRequest({ action: "strategy-proposal", args: ["roy-unregistered-implementation"] }).ok).toBe(false);
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_strategy_implementation.py"], {
    encoding: "utf8", timeout: 60_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stderr).toMatch(/Ran [1-9]\d* tests/);
}, 65_000);
