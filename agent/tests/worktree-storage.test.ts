import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { learnerGitRules } from "../../learner/lib/launcher.js";
import { mainCheckout } from "../../learner/lib/engines.js";

it("evicts only idle Git copies and restores SHA verified original inputs without completing failed tasks", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_worktree_storage.py"], {
    encoding: "utf8", timeout: 60_000,
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 20 tests");
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
    // TMPDIR may be inside a real worktree; protect the enclosing main checkout chosen by the launcher.
    const protectedGit = join(mainCheckout(lane), ".git");
    expect(rules[join(git, "worktrees", "lane")]).toBe("write");
    expect(rules[join(git, "worktrees", "fixed")]).toBe("write");
    expect(rules[join(protectedGit, "hooks")]).toBe("read");
    expect(rules[join(protectedGit, "config")]).toBe("read");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
