import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("append-only learning provenance correction", () => {
  it("corrects first run, ascension and prior note with evidence validation while retaining every original row", () => {
    const script = `
import importlib.util,json,os,tempfile
from unittest.mock import patch
s=importlib.util.spec_from_file_location("ledger","../learner/ledger.py")
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
runs={"SILENT000001":{"character":"SILENT","ascension":0},"SILENT000003":{"character":"SILENT","ascension":1},"SILENT000004":{"character":"SILENT","ascension":2},"IRON00000001":{"character":"IRONCLAD","ascension":9}}
item={"character":"silent","kind":"mechanic","claim":"固定测试结论","evidence":[{"run":"SILENT000004"},{"run":"SILENT000001"}],"first_run":"SILENT000004","prior":"unknown","prior_note":"原说明","status":"observed","by":"learner:test"}
with tempfile.TemporaryDirectory() as root,patch.object(m,"load_runs",return_value=runs),patch.object(m,"load_versions",return_value=None),patch.object(m,"now_local",return_value="2026-10-05T00:00:00+08:00"):
 path=os.path.join(root,"ledger.jsonl");m.append("add",[item],path)
 before=open(path,"rb").read()
 m.append("update",[{"id":"silent-0001","by":"learner:test","first_run":"SILENT000001","prior_note":"依据既有证据更正"}],path)
 rows=m.read_rows(path);folded=m.fold(rows)["silent-0001"]
 assert (folded["first_run"],folded["asc"],folded["prior_note"])==("SILENT000001",0,"依据既有证据更正")
 assert open(path,"rb").read().startswith(before)
 assert rows[0][1]["first_run"]=="SILENT000004" and rows[1][1]["op"]=="update"
 assert not m.check_file(path,runs=runs,versions=None)
 valid=open(path,"rb").read()
 for bad in [{"first_run":"IRON00000001"},{"first_run":"NOTARUN00001"},{"first_run":"SILENT000003"},{"first_run":[]},{"asc":1},{"asc":True},{"asc":21},{"prior_note":42}]:
  try: m.append("update",[{"id":"silent-0001","by":"learner:test",**bad}],path)
  except m.LedgerError: pass
  else: raise AssertionError(bad)
  assert open(path,"rb").read()==valid
 # New supporting evidence can accompany the correction atomically.
 m.append("update",[{"id":"silent-0001","by":"learner:test","first_run":"SILENT000003","asc":1,"evidence":[{"run":"SILENT000003","floor":12,"turn":6}]}],path)
 assert m.fold(m.read_rows(path))["silent-0001"]["asc"]==1
 print(json.dumps({"rows":len(m.read_rows(path)),"original_preserved":True}))
`;
    const result = spawnSync("python3", ["-B", "-c", script], { encoding: "utf8", timeout: 5000 });
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ rows: 3, original_preserved: true });
  });
});
