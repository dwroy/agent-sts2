import { describe, expect, it } from "vitest";

import { ACTIONS, validateRequest } from "../../ops/codex/lib.js";

describe("eval-metrics broker boundary", () => {
  it.each(["ironclad", "silent", "regent", "necrobinder", "defect"])("accepts the character %s and a canonical ascension", (character) => {
    for (const ascension of ["0", "3", "999"]) {
      expect(validateRequest({ action: "eval-metrics", args: [character, ascension] })).toEqual({ ok: true, action: "eval-metrics", args: [character, ascension] });
    }
  });

  it.each([
    [], ["silent"], ["silent", "3", "extra"], ["all", "3"], ["SILENT", "3"],
    ["silent..", "3"], ["../silent", "3"], ["silent\n", "3"], ["silent", "-1"],
    ["silent", "03"], ["silent", "3.0"], ["silent", "3e0"], ["silent", "1000"],
    ["silent", "3\n"], ["silent", "3;touch"], ["silent", "--no-calibration"],
  ])("rejects parameters %j before executing an action", (...args) => {
    expect(validateRequest({ action: "eval-metrics", args }).ok).toBe(false);
  });

  it("bounds the complete evaluation and rejects extra caller options", () => {
    expect(ACTIONS["eval-metrics"]).toEqual({ args: 2, ms: 600_000 });
    expect(validateRequest({ action: "eval-metrics", args: ["silent", "3", "--db", "elsewhere"] }).ok).toBe(false);
  });
});
