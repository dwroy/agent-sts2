import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { characterBuiltins, loadTask, renderTask } from "../../learner/lib/task.js";
import { validateRequest } from "../../ops/codex/lib.js";

describe("core-build study orchestration", () => {
  it("checks frozen history, isolated writers, completion proofs and one-time notifications", () => {
    const result = spawnSync("python3", ["-B", "tests/core_build_jobs_test.py"], { encoding: "utf8", timeout: 30000 });
    expect(result.status, result.stdout + result.stderr).toBe(0);
  });

  it("renders a knowledge-only task and restricts notification actions to registered batch syntax", () => {
    const spec = loadTask("silent-historical-core-builds", "../learner/tasks");
    const task = renderTask(spec, { evidence: "/fixture/input.json", batch: "20261009-210000-fix-batch" }, {
      cwd: "/fixture/worktree", worktree: "/fixture/worktree", project_root: "/fixture", logs_dir: "/fixture/logs",
      scratch: "/fixture/scratch", task: "silent-historical-core-builds", ...characterBuiltins("silent"),
    });
    expect(spec.efforts.codex).toBe("xhigh");
    expect(task.prompt).toContain("不能截取最近十局");
    expect(task.prompt).toContain("不修改 agent/");
    expect(task.prompt).not.toContain("{{");
    expect(validateRequest({ action: "core-build-notify", args: ["20261009-210000-fix-batch"] }).ok).toBe(true);
    expect(validateRequest({ action: "core-build-notify", args: ["other"] }).ok).toBe(false);
  });
});
