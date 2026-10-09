import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { validateRequest } from "../../ops/codex/lib.js";
import { loadTask, renderTask, characterBuiltins } from "../../learner/lib/task.js";

describe("two proposal workers", () => {
  it("claims disjoint inputs, retains active ownership and bootstraps the second slot", () => {
    const result = spawnSync("python3", ["-B", "../ops/tests/test_strategy_concurrency.py"], { encoding: "utf8", timeout: 30_000 });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toContain("Ran 6 tests");
  });
  it("binds the task and full-check broker to the registered second-slot batch", () => {
    const batch = "20261009-120000-s2-strategy-proposal";
    expect(validateRequest({ action: "learner-recheck", args: [batch] }).ok).toBe(true);
    for (const invalid of ["20261009-120000-s3-strategy-proposal", "20261009-120000-s2-fix-batch"])
      expect(validateRequest({ action: "learner-recheck", args: [invalid] }).ok).toBe(false);
    const task = renderTask(loadTask("strategy-proposal", "../learner/tasks"), { runs: "SILENT000001", batch }, {
      cwd: "/fixture", worktree: "/fixture", project_root: "/fixture", logs_dir: "/fixture/logs",
      scratch: "/fixture/scratch", task: "strategy-proposal", ...characterBuiltins("silent"),
    });
    expect(task.prompt).toContain(batch);
    expect(task.prompt).toContain("不领取其他批次");
    expect(task.prompt).toContain("不要把临时副本命名为可执行 .ts");
  });
});
