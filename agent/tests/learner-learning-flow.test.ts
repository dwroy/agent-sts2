import { describe, expect, it } from "vitest";
import { characterBuiltins, loadTask, renderTask } from "../../learner/lib/task.js";

describe("evidence-linked learner task contract", () => {
  const builtins = {
    cwd: "/fixture/wt", worktree: "/fixture/wt", project_root: "/fixture", logs_dir: "/fixture/logs",
    scratch: "/fixture/runs/task", task: "fixture", ...characterBuiltins("silent"),
  };

  it("renders the independent observed-level audit without future rules", () => {
    const spec = loadTask("ascension-audit", "../learner/tasks");
    const task = renderTask(spec, { runs: "SILENT000001", previous_ascension: "9", target_ascension: "10" }, builtins);
    expect(task.prompt).toContain("A9 → A10");
    expect(task.prompt).toContain("尚未出现的机制写未知");
    expect(task.prompt).toContain("只做独立审计和提案");
    expect(task.prompt).toContain("不造eval版本");
    expect(task.prompt).not.toContain("{{");
    expect(task.prompt).not.toContain("characters/ironclad");
  });

  it("requires actual winning-fight resources and labels missing counterfactuals", () => {
    const task = renderTask(loadTask("postmortem", "../learner/tasks"), { runs: "SILENT000001" }, builtins);
    expect(task.prompt).toContain("resource_chain.py");
    expect(task.prompt).toContain("包括赢的战斗");
    expect(task.prompt).toContain("不能把赢的战斗省掉");
    expect(task.prompt).toContain("不从未记录的反事实声称");
    expect(task.prompt).toContain("code_proposals");
  });

  it("every gameplay learning task carries Roy's authority and a code proposal link", () => {
    for (const name of ["postmortem", "experience-update", "experience-asc-audit", "fix-batch", "strategy-proposal", "mechanics-audit"]) {
      const spec = loadTask(name, "../learner/tasks");
      expect(spec.body, name).toContain("code_proposals");
      expect(spec.body, name).toContain("implementation_domains");
      expect(spec.body, name).toContain("有足够理由和自己核实的数据");
      expect(spec.body, name).toContain("notes/for-dai.md 与 ops/inbox-dev.md");
      expect(spec.body, name).not.toContain("不许写喝药规则");
      expect(spec.body, name).not.toContain("git -c user.");
    }
  });
});
