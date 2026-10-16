import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("checks G2 shadow coverage, retained unknowns and real observation timing on fixed inputs", () => {
  const result = execFileSync("/usr/bin/python3", ["-B", fileURLToPath(new URL("./global_build_health_test.py", import.meta.url))], { encoding: "utf8" });
  expect(result).toBe("");
});
