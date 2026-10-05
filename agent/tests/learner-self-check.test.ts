import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The scheduler is exercised with fixed reports and mocked commands: no LLM, network or live checkout.
function finish(task: string, merged: unknown, checkRc = 0) {
  const script = `
import sys, json, importlib.util, subprocess
from unittest.mock import patch, mock_open
spec = importlib.util.spec_from_file_location("checks", "../ops/learner_checks.py")
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
task, merged, rc = json.loads(sys.argv[1])
batch = {"task": task}; events = []; inbox = []; calls = []
def run(argv, **kw):
    calls.append(argv)
    return subprocess.CompletedProcess(argv, 0 if argv[0] == "git" else rc)
with patch.object(mod, "read_report", return_value={"task": task, "merged": merged}), patch.object(mod.subprocess, "run", side_effect=run), patch("builtins.open", mock_open()):
    mod.finish_write_batch("fixed", batch, 0, "/fixture", "/reports", lambda k,t: events.append([k,t]), inbox.append)
print(json.dumps({"batch": batch, "events": events, "inbox": inbox, "calls": calls}))
`;
  const result = spawnSync("python3", ["-B", "-c", script, JSON.stringify([task, merged, checkRc])], { encoding: "utf8", timeout: 5000 });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

describe("learner self-check completion", () => {
  it.each(["experience-update", "fix-batch", "strategy-proposal"])("%s emits completion and runs the full suite after a verified live merge", (task) => {
    const result = finish(task, "a".repeat(40));
    expect(result.events.map((event: string[]) => event[0])).toEqual([task === "fix-batch" ? "fix-done" : task === "strategy-proposal" ? "strategy-done" : "experience-done", "learner-checks"]);
    expect(result.batch.checks.rc).toBe(0);
    expect(result.calls[1].slice(0, 3)).toEqual(["flock", "/fixture/ops/live-merge.lock", "bash"]);
    expect(result.calls[1].at(-1)).toContain("npx tsc -p tsconfig.json --noEmit");
    expect(result.calls[1].at(-1)).toContain("npx vitest run --maxWorkers=2");
    expect(result.calls[1].at(-1)).not.toContain("--exclude");
  });

  it("a failed full suite reaches both the inbox and the ops queue without an automatic rollback", () => {
    const result = finish("fix-batch", "b".repeat(40), 1);
    expect(result.batch.checks.rc).toBe(1);
    expect(result.inbox).toHaveLength(1);
    expect(result.events.at(-1)[1]).toContain("运维会话决定回滚还是派修复");
    expect(result.calls.flat().join(" ")).not.toMatch(/reset|revert/);
  });

  it("an unmerged report emits completion without checking another branch", () => {
    const result = finish("experience-update", null);
    expect(result.calls).toEqual([]);
    expect(result.events).toHaveLength(1);
    expect(result.batch.merged).toBeNull();
  });

  it("the sandbox command excludes exactly the fixed subprocess suites and typechecks first", () => {
    const command = readFileSync("tools/test-sandbox.sh", "utf8");
    const excluded = [...command.matchAll(/--exclude (\S+)/g)].map((match) => match[1]);
    expect(excluded).toContain("tests/brain-codex.test.ts");
    expect(excluded).toContain("tests/learner.test.ts");
    expect(excluded).toContain("tests/mod-client.test.ts");
    expect(excluded).not.toContain("tests/turn-start-settle.test.ts");
    expect(excluded.every((name) => name.startsWith("tests/") && name.endsWith(".test.ts"))).toBe(true);
    expect(command.indexOf("npx tsc")).toBeLessThan(command.indexOf("npx vitest"));
  });
});
