/** Learning and developer seats remain separate; all launches use fixed inputs. */
import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

it("enforces configurable shared learning admission and the original tick report", () => {
  expect(execFileSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_learning_concurrency.py"], {
    encoding: "utf8", timeout: 15_000,
  })).toBe("");
});
