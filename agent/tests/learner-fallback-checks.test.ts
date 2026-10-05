import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { ACTIONS, validateRequest } from "../../ops/codex/lib.js";

describe("fallback merge full checks", () => {
  it("verifies every source under the live lock, deduplicates checked trees and preserves failures", () => {
    const script = `
import importlib.util,json,subprocess
from unittest.mock import patch,mock_open
s=importlib.util.spec_from_file_location("checks","../ops/learner_checks.py")
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
report={"task":"experience-update","merged":None,"commit":"c"*40}
batch={"task":"experience-update","state":"failed","merged":None,"rc":0,"checks":{"rc":1,"merged":"a"*40}}
events=[];inbox=[];calls=[];locked=False;present=False;tree="1"*40;code=1
def lock(*args):
 global locked
 locked=True
def run(argv,**kw):
 assert locked,"all verification and tests must be inside the live lock"
 calls.append(argv)
 if "merge-base" in argv: return subprocess.CompletedProcess(argv,0 if present else 1)
 if "rev-parse" in argv: return subprocess.CompletedProcess(argv,0,"b"*40+"\\n"+tree+"\\n")
 assert argv[0]=="bash" and "--exclude" not in argv[-1]
 return subprocess.CompletedProcess(argv,code)
def check():
 global locked
 locked=False
 return m.recheck_write_batch("fixed",batch,"/fixture","/reports",lambda k,t:events.append([k,t]),inbox.append)
with patch.object(m,"read_report",return_value=report),patch.object(m.subprocess,"run",side_effect=run),patch.object(m.fcntl,"flock",side_effect=lock),patch("builtins.open",mock_open()):
 absent=check();assert not events and not batch.get("fallback_checks")
 present=True
 failed=check();repeat=check()
 tree="2"*40;code=0
 repaired=check();duplicate=check()
 # A partially merged fix batch must not run checks or be accepted.
 report.update(task="fix-batch",fixes=[{"commit":"d"*40}]);batch["task"]="fix-batch"
 present=False;partial=check()
print(json.dumps(dict(absent=absent,failed=failed,repeat=repeat,repaired=repaired,duplicate=duplicate,partial=partial,batch=batch,events=events,inbox=inbox,calls=calls)))
`;
    const result = spawnSync("python3", ["-B", "-c", script], { encoding: "utf8", timeout: 5000 });
    expect(result.status, result.stderr).toBe(0);
    const data = JSON.parse(result.stdout);
    expect([data.absent, data.partial]).toEqual([2, 2]);
    expect([data.failed, data.repeat, data.repaired, data.duplicate]).toEqual([1, 1, 0, 0]);
    expect(data.batch).toMatchObject({ state: "failed", merged: null, rc: 0, checks: { rc: 1, merged: "a".repeat(40) } });
    expect(data.batch.fallback_checks.map((entry: { rc: number }) => entry.rc)).toEqual([1, 0]);
    expect(data.calls.filter((argv: string[]) => argv[0] === "bash")).toHaveLength(2);
    expect(data.events.map((event: string[]) => event[0])).toEqual(["learner-checks", "learner-checks"]);
    expect(data.inbox).toHaveLength(1);
  });

  it("accepts only a write batch id and allows enough time for the full suite", () => {
    expect(ACTIONS["learner-recheck"].ms).toBeGreaterThan(3_600_000);
    expect(validateRequest({ action: "learner-recheck", args: ["20261005-051301-experience-update"] }).ok).toBe(true);
    for (const batch of ["../batch", "main", "20261005-051301-postmortem", "20261005-051301-fix-batch;bad"]) {
      expect(validateRequest({ action: "learner-recheck", args: [batch] }).ok).toBe(false);
    }
  });
});
