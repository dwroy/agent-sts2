import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("learner state lock lifetime", () => {
  it("releases the state lock for full checks and preserves concurrent updates when recording results", () => {
    const script = `
import importlib.util,json,os,sys,tempfile,fcntl
from unittest.mock import patch
from types import SimpleNamespace
s=importlib.util.spec_from_file_location("learn","../ops/codex-ops-learn.py")
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
batch_id="20261005-085844-experience-update";events=[];checked=[]
with tempfile.TemporaryDirectory() as root:
 m.ROOT=root;m.DIR=os.path.join(root,"ops","codex-ops");m.STATE=os.path.join(m.DIR,"learn.json")
 m.save_state({"batches":{batch_id:{"task":"experience-update","state":"running","runs":["SILENT000001"]}}})
 def assert_unlocked():
  with open(os.path.join(m.DIR,"learn.lock"),"a") as handle:
   fcntl.flock(handle,fcntl.LOCK_EX|fcntl.LOCK_NB)
 def finish(batch_id,batch,rc,*args,run_checks=True):
  batch.update(state="done",rc=rc,merged="b"*40)
  if run_checks: assert_unlocked()
  else: batch["checks_pending"]=True
 def recheck(batch_id,batch,*args):
  assert_unlocked();checked.append(batch_id)
  concurrent=m.load_state();concurrent["marker"]=99
  concurrent["batches"]["concurrent"]={"task":"fix-batch","state":"running","pid":123}
  m.save_state(concurrent)
  batch["fallback_checks"]=[{"rc":0,"merged":"b"*40,"tree":"c"*40,"log":"fixed.log"}]
  return 0
 with patch.object(m,"finish_write_batch",side_effect=finish),patch.object(m,"recheck_write_batch",side_effect=recheck),patch.object(sys,"argv",["learn","finish","--batch",batch_id,"--rc","0"]):
  assert m.main()==0
 state=m.load_state()
 assert checked==[batch_id]
 assert state["marker"]==99 and state["batches"]["concurrent"]["state"]=="running"
 assert state["batches"][batch_id]["checks"]["rc"]==0
 assert not state["batches"][batch_id]["checks_pending"]
 # The merge request has no state mutation, so it must not wait for the learning lock at all.
 with patch.object(m.fcntl,"flock",side_effect=AssertionError("short request took learning lock")),patch.object(m,"enqueue",side_effect=lambda k,t:events.append(k)),patch.object(sys,"argv",["learn","request-merge","--branch","exp-silent"]):
  assert m.main()==0
 assert events==["manual"]
 print(json.dumps({"checks":checked,"preserved":state["marker"],"events":events}))
`;
    const result = spawnSync("python3", ["-B", "-c", script], { encoding: "utf8", timeout: 5000 });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('"preserved": 99');
  });
});
