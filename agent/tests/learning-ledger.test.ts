/**
 * The learning ledger for the paper (learner/ledger.py, paper/materials/learning/README.md) and the per-ascension
 * learning curve (eval/learning-curve.py): the Python suite tests/learning_ledger_test.py; and the learner tasks that
 * write the ledger say how (every character: the instruction is character-neutral). Temp files only; no LLM.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { characterBuiltins, loadTask, renderTask } from "../../learner/lib/task.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TASKS = join(ROOT, "..", "learner", "tasks");
const BUILTINS = { cwd: "/p/wt", worktree: "/p/wt", project_root: "/p", logs_dir: "/p/logs", scratch: "/p/learner/runs/x", task: "t" };
const SETS: Record<string, Record<string, string>> = { postmortem: { runs: "AAAAAAAAAAAA" }, "experience-update": { runs: "AAAAAAAAAAAA" } };

describe("learning ledger", () => {
  it("passes tests/learning_ledger_test.py", () => {
    const out = spawnSync("python3", [join(ROOT, "tests/learning_ledger_test.py")], { encoding: "utf8" });
    expect(out.status, out.stderr).toBe(0);
  }, 30_000);

  it("the ledger file is valid JSONL as committed", () => {
    const text = readFileSync(join(ROOT, "..", "paper", "materials", "learning", "ledger.jsonl"), "utf8");
    for (const line of text.split("\n").filter((l) => l.trim())) expect(() => JSON.parse(line)).not.toThrow();
  });

  for (const character of ["silent", "ironclad"]) {
    it(`${character}: post-mortem, experience update, mechanics audit and fix batch write the ledger through learner/ledger.py`, () => {
      for (const name of ["postmortem", "experience-update", "mechanics-audit", "fix-batch"]) {
        const prompt = renderTask(loadTask(name, TASKS), SETS[name] ?? {}, { ...BUILTINS, ...characterBuiltins(character) }).prompt;
        expect(prompt, name).toContain("python3 /p/learner/ledger.py");
        expect(prompt, name).toContain("/p/paper/materials/learning/ledger.jsonl");
        expect(prompt, name).not.toMatch(/\{\{/);
      }
      const postmortem = renderTask(loadTask("postmortem", TASKS), SETS["postmortem"]!, { ...BUILTINS, ...characterBuiltins(character) }).prompt;
      expect(postmortem).toContain("（第一次遇到）");
      expect(postmortem).toContain("（之前学过：<账本 id>，<eval 版本>）");
      expect(postmortem).toContain(`find --character ${character}`);
      expect(postmortem).toContain('"ledger": {"added"');
    });
  }
});
