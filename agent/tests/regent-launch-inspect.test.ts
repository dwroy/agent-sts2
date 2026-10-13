import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { ACTIONS, validateRequest } from "../../ops/codex/lib.js";

describe("Regent read-only native inspection", () => {
  it("accepts only the zero-argument bounded capability", () => {
    expect(ACTIONS["regent-launch-inspect"]).toEqual({ args: 0, ms: 30_000 });
    expect(validateRequest({ action: "regent-launch-inspect", args: [] }).ok).toBe(true);
    for (const args of [["34676"], ["http://127.0.0.1:8080"], ["launch"], ["anything;true"]]) {
      expect(validateRequest({ action: "regent-launch-inspect", args }).ok).toBe(false);
    }
  });

  it("rejects foreign identity and removes credentials and gameplay from metadata", () => {
    const result = spawnSync("python3", ["-B", "../ops/tests/test_regent_launch_inspect.py"], { encoding: "utf8", timeout: 5000 });
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stderr).toContain("OK");
  });
});
