import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// Exercise completion and retry decisions with fixed reports and Git replies, never real scheduler state.
function complete(options: Record<string, unknown> = {}) {
  const script = `
import importlib.util, json, subprocess, sys
from types import SimpleNamespace
from unittest.mock import patch, mock_open
spec = importlib.util.spec_from_file_location("learn", "../ops/codex-ops-learn.py")
learn = importlib.util.module_from_spec(spec); spec.loader.exec_module(learn)
checks = sys.modules["learner_checks"]
jobs = sys.modules["learner_jobs"]
options = json.loads(sys.argv[1])
base, head, live = "a"*40, "b"*40, "c"*40
task = options.get("task", "fix-batch")
report = {"task": task, "base": base, "fixes": [], "merged": None,
          "tests": {"tsc": 0, "vitest": 0, "cases": 2068}}
report.update(options.get("report", {}))
batch_id = "20261006-040345-fix-batch"
batch = {"task": task, "state": "running", "key": "queue-fixture", "runs": [],
         "worktree": "/fixture/.worktrees/codex-dev"}
batch.update(options.get("batch", {}))
state = {"batches": {batch_id: batch}}
events, inbox, calls = [], [], []
def run(argv, **kwargs):
    calls.append(argv)
    if argv[0] != "git":
        return subprocess.CompletedProcess(argv, options.get("check_rc", 0))
    failure = options.get("git_failure")
    if failure == "timeout":
        raise subprocess.TimeoutExpired(argv, 10)
    if "rev-parse" in argv:
        return subprocess.CompletedProcess(argv, 1 if failure == "missing-head" else 0,
                                           (live if argv[2].endswith("/live") else head) + "\\n")
    if "status" in argv:
        return subprocess.CompletedProcess(argv, 1 if failure == "status-error" else 0,
                                           "?? agent/src/uncommitted.ts\\n" if failure == "dirty" else "")
    if "merge-base" in argv:
        return subprocess.CompletedProcess(argv, 1 if failure == "not-ancestor" else 0)
    if "diff" in argv:
        left, right = argv[5:7]
        unshipped = left == head and right == live
        return subprocess.CompletedProcess(argv, int(failure == ("unshipped" if unshipped else "new-output")))
    raise AssertionError(argv)
learn.ROOT = "/fixture"; learn.DIR = "/fixture/ops/codex-ops"
with patch.object(checks, "read_report", return_value=report), patch.object(checks.subprocess, "run", side_effect=run), \
     patch("builtins.open", mock_open()), patch.object(learn, "load_state", return_value=state), \
     patch.object(learn, "save_state"), patch.object(learn, "enqueue", side_effect=lambda k,t: events.append([k,t])), \
     patch.object(learn, "inbox", side_effect=inbox.append):
    learn.cmd_finish(SimpleNamespace(batch=batch_id, rc=options.get("rc", 0)))
    if options.get("run_checks"):
        checks.finish_write_batch(batch_id, batch, options.get("rc", 0), "/fixture", "/reports",
                                  lambda k,t: events.append([k,t]), inbox.append)
print(json.dumps({"batch": batch, "events": events, "inbox": inbox, "calls": calls,
                  "retryable": jobs.retryable(state, task, "queue-fixture")}))
`;
  const result = spawnSync("python3", ["-B", "-c", script, JSON.stringify(options)], { encoding: "utf8", timeout: 5000 });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

describe("empty fix batch completion", () => {
  it("closes a clean, checked batch whose existing sources are in live without scheduling a retry or full checks", () => {
    const result = complete();
    expect(result.batch).toMatchObject({ state: "done", rc: 0, merged: null,
      no_changes: { base: "a".repeat(40), head: "b".repeat(40), live: "c".repeat(40) } });
    expect(result.batch.retry_at).toBeUndefined();
    expect(result.batch.checks_pending).toBeUndefined();
    expect(result.batch.checks).toBeUndefined();
    expect(result.retryable).toBe(false);
    expect(result.events.map((event: string[]) => event[0])).toEqual(["fix-done"]);
    expect(result.events[0][1]).toContain("已核实无新增产出、自测通过");
    expect(result.calls.every((args: string[]) => args[0] === "git")).toBe(true);
    const diff = result.calls.at(-1);
    expect(diff.slice(3, 8)).toEqual(["diff", "--quiet", "b".repeat(40), "c".repeat(40), "--"]);
    for (const path of ["agent/src", "agent/tests", "learner/tasks", "ops/*.py", "ops/codex", "knowledge/builders"])
      expect(diff).toContain(path);
  });

  it.each(["dirty", "new-output", "unshipped", "not-ancestor", "status-error", "missing-head", "timeout"])(
    "does not accept an empty report when Git evidence is %s", (failure) => {
      const result = complete({ git_failure: failure });
      expect(result.batch.state).toBe("failed");
      expect(result.batch.retry_at).toBeGreaterThan(0);
      expect(result.batch.no_changes).toBeUndefined();
      expect(result.batch.checks_pending).toBeUndefined();
      expect(result.events).toHaveLength(1);
    });

  it.each([
    { fixes: [{ commit: "d".repeat(40) }] },
    { commit: "d".repeat(40) },
    { fixes: null },
    { base: "main" },
    { tests: { tsc: 1, vitest: 0, cases: 2068 } },
    { tests: { tsc: 0, vitest: 1, cases: 2068 } },
    { tests: { tsc: 0, vitest: 0, cases: 0 } },
    { tests: null },
  ])("keeps new output or missing/failed checks pending for repair: %j", (report) => {
    const result = complete({ report });
    expect(result.batch.state).toBe("failed");
    expect(result.batch.retry_at).toBeGreaterThan(0);
    expect(result.batch.no_changes).toBeUndefined();
    expect(result.calls).toEqual([]);
  });

  it.each(["experience-update", "strategy-proposal"])("does not treat %s as an empty fix", (task) => {
    expect(complete({ task }).batch.state).toBe("failed");
  });

  it("does not accept a failed learner or evidence from a different worktree", () => {
    expect(complete({ rc: 1 }).batch.state).toBe("failed");
    expect(complete({ batch: { worktree: "/elsewhere" } }).batch.state).toBe("failed");
  });

  it("still schedules and runs full checks for a real merge, preserving full-suite failure reporting", () => {
    const result = complete({ report: { fixes: [{ commit: "d".repeat(40) }], merged: "e".repeat(40) },
      run_checks: true, check_rc: 1 });
    expect(result.batch).toMatchObject({ state: "done", merged: "e".repeat(40), checks_pending: true, checks: { rc: 1 } });
    expect(result.batch.no_changes).toBeUndefined();
    expect(result.calls.filter((args: string[]) => args[0] === "flock")).toHaveLength(1);
    expect(result.events.at(-1)[0]).toBe("learner-checks");
    expect(result.inbox).toHaveLength(1);
    expect(complete({ rc: 1, report: { merged: "e".repeat(40) } }).batch.state).toBe("failed");
  });
});
