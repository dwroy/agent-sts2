import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

it("publication waiting isolates candidate learning, game admission and publication writers", () => {
  expect(execFileSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_publication_gate.py"], {
    encoding: "utf8", timeout: 15_000,
  })).toBe("");
});
