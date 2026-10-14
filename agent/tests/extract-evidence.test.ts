import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { characterBuiltins, loadTask, renderTask } from "../../learner/lib/task.js";

describe("run-scoped evidence extraction", () => {
  it("keeps run-plans rows, original offsets and hashes without matching foreign mentions", async () => {
    const { stderr } = await promisify(execFile)("python3", ["-B", "tests/extract_evidence_test.py"], { timeout: 20_000 });
    expect(stderr).toContain("Ran 5 tests");
    expect(stderr).toMatch(/\nOK/);
  }, 30_000);

  it("directs strategy learners to the shared extractor and explicit log identities", () => {
    const prompt = renderTask(loadTask("strategy-proposal", "../learner/tasks"), { runs: "K3676LU8B0UH" }, {
      cwd: "/p/wt", worktree: "/p/wt", project_root: "/p", logs_dir: "/p/logs",
      scratch: "/p/wt/learner/runs/batch", task: "strategy-proposal", ...characterBuiltins("silent"),
    }).prompt;
    expect(prompt).toContain("python3 /p/wt/learner/extract_evidence.py");
    expect(prompt).toContain('run-plans 的 `run`');
    expect(prompt).toContain('--logs "/p/logs" --output "/p/wt/learner/runs/batch/evidence"');
  });
});
