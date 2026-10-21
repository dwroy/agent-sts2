import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, realpathSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { codexPermissions } from "../../learner/lib/engines.js";

it("attaches only matching pinned tools and retains all private/foreign copies", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_shared_tools.py"], {
    encoding: "utf8", timeout: 30_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stderr).toMatch(/Ran [1-9]\d* tests?\b/);
}, 35_000);

it("keeps shared tool providers read-only in the actual generated learner profile", () => {
  const root = mkdtempSync(join(tmpdir(), "fixed-shared-tools-"));
  try {
    const provider = join(root, "provider");
    const cwd = join(root, "worktree");
    mkdirSync(provider);
    mkdirSync(join(cwd, "agent"), { recursive: true });
    symlinkSync(provider, join(cwd, "agent/node_modules"), "dir");
    const rules = codexPermissions({ engine: "codex", projectRoot: root, cwd, tools: ["Read", "Write"], home: "/fixed-home", keyFiles: [] });
    expect(rules[realpathSync(provider)]).toEqual({ ".": "read", "**/.env": "none", "**/*.env": "none" });
    expect(rules[":project_roots"]).toEqual({ ".": "write" });
  } finally { rmSync(root, { recursive: true, force: true }); }
});
