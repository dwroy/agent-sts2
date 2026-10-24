import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

it("publication waiting isolates candidate learning, game admission and publication writers", () => {
  expect(execFileSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_publication_gate.py"], {
    encoding: "utf8", timeout: 15_000,
  })).toBe("");
});

it("composes real publication admission with the per-batch registration barrier", () => {
  expect(execFileSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_publication_registration_pipeline.py"], {
    encoding: "utf8", timeout: 30_000,
  })).toBe("");
}, 35_000);
