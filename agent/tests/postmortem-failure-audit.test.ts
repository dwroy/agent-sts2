import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("postmortem failure proposal audit", () => {
  it("reports verified pre-model refusals without guessing key failure and preserves audit and retry limits", () => {
    const result = spawnSync("python3", ["-B", "../ops/tests/test_postmortem_completion.py"], {
      encoding: "utf8", timeout: 15000,
    });
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stderr).toContain("Ran 9 tests");
  });
});
