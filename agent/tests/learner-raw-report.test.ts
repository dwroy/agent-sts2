import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// Fixed completion output and mocked Git/check commands only; no production state or network.
function exercise(output: string, operation = "read", present = true) {
  const script = `
import importlib.util, json, subprocess, sys
from unittest.mock import patch, mock_open
spec = importlib.util.spec_from_file_location("checks", "../ops/learner_checks.py")
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
text, operation, present = json.loads(sys.argv[1])
batch = {"task": "fix-batch", "state": "failed", "rc": 0, "merged": None}
calls = []; events = []
def run(argv, **kwargs):
    calls.append(argv)
    if "rev-parse" in argv:
        return subprocess.CompletedProcess(argv, 0, "b" * 40 + "\\n" + "c" * 40 + "\\n")
    return subprocess.CompletedProcess(argv, 0 if present or argv[0] != "git" else 1)
with patch("builtins.open", mock_open(read_data=text)), patch.object(mod.subprocess, "run", side_effect=run), \\
     patch.object(mod.fcntl, "flock"):
    report = mod.read_report("/fixture/report.out")
    if operation == "finish":
        mod.finish_write_batch("fixed", batch, 0, "/fixture", "/reports", lambda k,t: events.append(k), lambda t: None, run_checks=False)
    elif operation == "recheck":
        code = mod.recheck_write_batch("fixed", batch, "/fixture", "/reports", lambda k,t: events.append(k), lambda t: None)
        batch["recheck_rc"] = code
print(json.dumps({"report": report, "batch": batch, "calls": calls, "events": events}))
`;
  const result = spawnSync("python3", ["-B", "-c", script, JSON.stringify([output, operation, present])], {
    encoding: "utf8", timeout: 5000,
  });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

const report = {
  task: "fix-batch", base: "d".repeat(40), fixes: [{ commit: "a".repeat(40) }],
  merged: "b".repeat(40), tests: { tsc: 0, vitest: 0, cases: 10 },
};
const raw = JSON.stringify(report, null, 2) + "\n\n== 学习者 codex / fixed ==\n状态：success；退出码 0\n";

describe("leading JSON completion reports", () => {
  it("accepts the complete leading object before a launcher summary", () => {
    expect(exercise(" \n" + raw).report).toEqual(report);
  });

  it.each(["fix-batch", "experience-update", "strategy-proposal"])("accepts a raw %s object without a trailer", (task) => {
    expect(exercise(JSON.stringify({ ...report, task })).report.task).toBe(task);
  });

  it("keeps the last valid fenced report as the preferred format", () => {
    const earlier = { ...report, merged: null };
    const text = `${raw}\n\`\`\`json\n${JSON.stringify(earlier)}\n\`\`\`\n\`\`\`json\n${JSON.stringify(report)}\n\`\`\`\n\`\`\`json\n{broken\n\`\`\``;
    expect(exercise(text).report).toEqual(report);
  });

  it.each([
    "", "{broken", JSON.stringify({ task: "postmortem", merged: report.merged }),
    JSON.stringify([report]), JSON.stringify(JSON.stringify(report)),
    "回报示例：\n" + raw, "== launcher ==\n" + raw,
    '{"task":"fix-batch", "merged":',
  ])("rejects malformed, unsupported or embedded output: %s", (text) => {
    expect(exercise(text).report).toEqual({});
  });

  it("recognizes a raw completion only after verifying its live ancestor", () => {
    const success = exercise(raw, "finish");
    expect(success.batch).toMatchObject({ state: "done", merged: report.merged, checks_pending: true });
    expect(success.calls[0]).toContain("merge-base");
    const absent = exercise(raw, "finish", false);
    expect(absent.batch).toMatchObject({ state: "failed", merged: null });
    expect(absent.batch.checks_pending).toBeUndefined();
  });

  it("rechecks raw output while preserving the original failure and requiring every source ancestor", () => {
    const success = exercise(raw, "recheck");
    expect(success.batch).toMatchObject({ state: "failed", merged: null, recheck_rc: 0 });
    expect(success.batch.fallback_checks[0].commits).toEqual([report.fixes[0]!.commit, report.merged]);
    expect(success.events).toEqual(["learner-checks"]);
    const absent = exercise(raw, "recheck", false);
    expect(absent.batch.recheck_rc).toBe(2);
    expect(absent.events).toEqual([]);
    const mismatched = exercise(JSON.stringify({ ...report, task: "experience-update" }), "recheck");
    expect(mismatched.batch.recheck_rc).toBe(2);
    expect(mismatched.calls).toEqual([]);
  });
});
