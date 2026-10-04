import { describe, expect, it } from "vitest";
import { characterBuiltins, loadTask, renderTask } from "../../learner/lib/task.js";

describe("learner live task defaults", () => {
  it.each(["fix-batch", "experience-update"])("%s defaults to self-merge with a knowledge-safe rollback and release evidence", (task) => {
    const spec = loadTask(task, "../learner/tasks");
    const rendered = renderTask(spec, task === "experience-update" ? { runs: "SILENT000001" } : {}, {
      cwd: "/fixture/wt", worktree: "/fixture/wt", project_root: "/fixture", logs_dir: "/fixture/logs", scratch: "/fixture/scratch", task,
      ...characterBuiltins("silent"),
    });
    expect(rendered.values.merge).toBe("live");
    for (const text of ["flock /fixture/ops/live-merge.lock", "先提交刷新过的知识数据", "回退到第 3 步", "保留刷新数据", "bash tools/test-sandbox.sh", "decision-log.md", "eval/versions.json", "证据局号", "账本 id"]) {
      expect(rendered.prompt).toContain(text);
    }
    expect(rendered.prompt).not.toMatch(/merge = v3|v3-merge\.lock/);
  });
});
