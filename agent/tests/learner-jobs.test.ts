import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { ACTIONS, opsExtraRules, validateRequest } from "../../ops/codex/lib.js";

function scenario(name: string) {
  const script = `
import sys, json, importlib.util, subprocess
from unittest.mock import patch, mock_open
from types import SimpleNamespace
spec = importlib.util.spec_from_file_location("jobs", "../ops/learner_jobs.py")
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
state = {"batches": {}}; calls=[]
def start(argv, **kw):
    calls.append(argv); return SimpleNamespace(pid=123)
with patch.object(m, "available", return_value=True), patch.object(m.subprocess, "Popen", side_effect=start), patch.object(m, "fix_key", return_value=None), patch.object(m.subprocess, "run", return_value=subprocess.CompletedProcess([],0,"1\\nSILENT000001\\n","")):
    first = m.check_jobs(state, "/fixture", "/scripts", "silent", lambda pid: True, "fixed")
    second = m.check_jobs(state, "/fixture", "/scripts", "silent", lambda pid: True, "later")
    batch=next(iter(state["batches"].values())); batch.update(state="done")
    third=m.check_jobs(state, "/fixture", "/scripts", "silent", lambda pid: False, "later")
    batch.update(state="failed",retry_at=m.time.time()+3600)
    early=m.check_jobs(state, "/fixture", "/scripts", "silent", lambda pid: False, "early")
    batch["retry_at"]=0
    retry=m.check_jobs(state, "/fixture", "/scripts", "silent", lambda pid: False, "retry")
print(json.dumps({"first":first,"second":second,"third":third,"early":early,"retry":retry,"calls":calls}))
`;
  const result = spawnSync("python3", ["-B", "-c", script, name], { encoding: "utf8", timeout: 5000 });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

describe("automatic learner write jobs", () => {
  it("an open fix queue launches one fix job, and a busy worktree launches none", () => {
    const script = `
import importlib.util, json
from unittest.mock import patch
from types import SimpleNamespace
s=importlib.util.spec_from_file_location("jobs","../ops/learner_jobs.py")
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
state={"batches":{}};calls=[]
def start(argv,**kw): calls.append(argv);return SimpleNamespace(pid=456)
with patch.object(m,"pending",return_value=[]),patch.object(m,"fix_key",return_value="fixed-queue"),patch.object(m,"available",return_value=True),patch.object(m.subprocess,"Popen",side_effect=start):
 a=m.check_jobs(state,"/fixture","/scripts","silent",lambda pid:True,"first")
 b=m.check_jobs(state,"/fixture","/scripts","silent",lambda pid:True,"second")
with patch.object(m,"available",return_value=False):
 blocked=m.dispatch_write({"batches":{}},"/fixture","/scripts","fix-batch","silent",[],"key","ops",lambda pid:False,"blocked")
print(json.dumps({"a":a,"b":b,"blocked":blocked,"calls":calls}))
`;
    const result = spawnSync("python3", ["-B", "-c", script], { encoding: "utf8", timeout: 5000 });
    expect(result.status, result.stderr).toBe(0);
    const data = JSON.parse(result.stdout);
    expect(data.a.fixes).not.toBeNull();
    expect(data.b.fixes).toBeNull();
    expect(data.blocked).toBeNull();
    expect(data.calls).toHaveLength(1);
    expect(data.calls[0].slice(-2)).toEqual(["fix-batch", "/fixture/.worktrees/codex-fix-silent-first"]);
  });

  it("one pending run launches experience-update; busy, completed and early retries do not launch it again", () => {
    const result = scenario("per-run");
    expect(result.first.experience[0]).toContain("experience-update");
    expect(result.second.experience).toBeNull();
    expect(result.third.experience).toBeNull();
    expect(result.early.experience).toBeNull();
    expect(result.retry.experience).not.toBeNull();
    expect(result.calls[0].slice(-4)).toEqual(["SILENT000001", "silent", "experience-update", "/fixture/.worktrees/exp"]);
  });

  it("allows write and merge fallback actions and scheduler edits while protecting git configuration", () => {
    expect(validateRequest({ action: "experience-update", args: ["SILENT000001"] }).ok).toBe(true);
    expect(validateRequest({ action: "fix-batch" }).ok).toBe(true);
    expect(ACTIONS["learner-merge"]).toBeDefined();
    expect(validateRequest({ action: "learner-merge", args: ["bad;command"] }).ok).toBe(false);
    const rules = opsExtraRules("/fixture");
    expect(rules["/fixture/ops/learner_jobs.py"]).toBeUndefined();
    expect(rules["/fixture/ops/learner_checks.py"]).toBeUndefined();
    expect(rules["/fixture/.git"]).toBe("write");
    expect(rules["/fixture/.git/hooks"]).toBe("read");
    expect(rules["/fixture/.git/config"]).toBe("read");
  });
});


describe("learner TUI fallback policy", () => {
  it("routes real learners through the original herdr command host while preserving other settings", () => {
    const script = `
import importlib.util, json, tempfile, os, subprocess
from pathlib import Path
from unittest.mock import patch
s=importlib.util.spec_from_file_location("jobs","../ops/learner_jobs.py")
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
results=[]
with tempfile.TemporaryDirectory() as d:
 Path(d,"hosting").write_text("learners=herdr\\nlearner_tui=off\\nbrain_view=herdr\\n")
 def run(argv,**kw):
  results.append(argv);return subprocess.CompletedProcess(argv,0,"w1:p2 123\\n","")
 with patch.dict(os.environ,{},clear=True),patch.object(m.subprocess,"run",side_effect=run),patch.object(m.subprocess,"Popen",side_effect=AssertionError("unexpected detached or interactive launch")):
  pid,pane=m.start_learner(["bash","/scripts/codex-ops-learner.sh","batch"],"/root","/scripts",d,"learner-batch")
  assert m.hosting(d,"brain_view","CODEX_OPS_BRAIN_VIEW","off")=="herdr"
 print(json.dumps({"pid":pid,"pane":pane,"calls":results}))
`;
    const result = spawnSync("python3", ["-B", "-c", script], { encoding: "utf8", timeout: 5000 });
    expect(result.status, result.stderr).toBe(0);
    const value = JSON.parse(result.stdout);
    expect(value.pid).toBe(123);
    expect(value.pane).toBe("w1:p2");
    expect(value.calls).toHaveLength(1);
    expect(value.calls[0].slice(2, 4)).toEqual(["run", "learner-batch"]);
    expect(value.calls[0]).toContain("--close-on-exit");
    expect(value.calls[0]).not.toContain("open-pane");
  });
});
