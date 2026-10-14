import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { learnerGitRules } from "../../learner/lib/launcher.js";

it("evicts only idle Git copies and restores SHA verified original inputs without completing failed tasks", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_worktree_storage.py"], {
    encoding: "utf8", timeout: 60_000,
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 18 tests");
}, 65_000);

it("grants exact Git metadata for both the independent instance and learner workspace", () => {
  const root = mkdtempSync(join(tmpdir(), "fixed-storage-grants-"));
  try {
    const lane = join(root, ".worktrees", "lane"), tree = join(lane, ".worktrees", "fixed");
    const git = join(root, ".git");
    mkdirSync(tree, { recursive: true });
    mkdirSync(join(git, "worktrees", "lane"), { recursive: true });
    mkdirSync(join(git, "worktrees", "fixed"), { recursive: true });
    writeFileSync(join(lane, ".git"), `gitdir: ${join(git, "worktrees", "lane")}\n`);
    writeFileSync(join(tree, ".git"), `gitdir: ${join(git, "worktrees", "fixed")}\n`);
    const rules = learnerGitRules(lane, tree);
    expect(rules[join(git, "worktrees", "lane")]).toBe("write");
    expect(rules[join(git, "worktrees", "fixed")]).toBe("write");
    expect(rules[join(git, "hooks")]).toBe("read");
    expect(rules[join(git, "config")]).toBe("read");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
