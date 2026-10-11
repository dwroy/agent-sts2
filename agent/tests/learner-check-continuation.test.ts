import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { validateRequest } from "../../ops/codex/lib.js";

it("binds host supplements to original coverage and exact sources without repeating full checks", () => {
  const result = spawnSync("python3", ["-B", "../ops/tests/test_learner_check_continuation.py"], {
    encoding: "utf8", timeout: 20_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stderr).toContain("OK");
});

it("accepts only a write batch plus a content digest through the existing recheck broker", () => {
  const batch = "20261011-181302-fix-batch";
  expect(validateRequest({ action: "learner-recheck", args: [batch] }).ok).toBe(true);
  expect(validateRequest({ action: "learner-recheck", args: [batch + ":" + "a".repeat(64)] }).ok).toBe(true);
  for (const token of [batch + ":main", batch + ":" + "a".repeat(40), batch + ":../manifest.json", batch + ":a;cmd"]) {
    expect(validateRequest({ action: "learner-recheck", args: [token] }).ok).toBe(false);
  }
});
