import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

it("admits frozen backfill only after normal work and consumes actual native starts once", () => {
  const output = execFileSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_strategy_backfill.py"], {
    encoding: "utf8", timeout: 30_000, stdio: ["ignore", "pipe", "pipe"],
  });
  expect(output).toBe("");
});
