import { expect, it } from "vitest";
import { fixtureCommand } from "./fixture-command.js";

it("checks V6 reward computation and consumption without hiding V5 or V6 failures", () => {
  const result = fixtureCommand("python3", ["-B", "tests/v6_module_health_test.py"]);
  expect(result.status, result.stdout + result.stderr).toBe(0);
});
