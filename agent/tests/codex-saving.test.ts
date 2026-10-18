import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { afterAll, expect, it } from "vitest";

const root = resolve("..");
const tmp = mkdtempSync(join(tmpdir(), "codex-saving-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

it("batches Silent at five, bounds low-volume latency, preserves manual/retry and other characters", () => {
  const result = spawnSync("python3", ["-B", "-c", `
import importlib.util,sys
spec=importlib.util.spec_from_file_location('learning',sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
m.running_batch=lambda state:None
m.postmortem_ids=lambda:set()
m.dispatch=lambda state,runs,character,reason:(runs,reason)
m.time.time=lambda:20000
state={'runs':{},'batches':{}}
rows=[{'run_id':'SILENT000001'}]
m.finished_runs=lambda character:rows
assert m.check_postmortems(state,'silent') is None
assert state['postmortem_wait']['silent']['since']==20000
m.time.time=lambda:27199
assert m.check_postmortems(state,'silent') is None
m.time.time=lambda:27200
assert m.check_postmortems(state,'silent')==(['SILENT000001'],'tick')
assert m.check_postmortems({'runs':{},'batches':{}},'ironclad')==(['SILENT000001'],'tick')
rows.extend({'run_id':'SILENT00000'+str(i)} for i in range(2,6))
assert len(m.check_postmortems({'runs':{},'batches':{}},'silent')[0])==5
rows[:]=[{'run_id':'SILENT000001','ended':'1970-01-01T00:00:00Z'}]
assert m.check_postmortems({'runs':{},'batches':{}},'silent') is not None
rows[0].pop('ended')
assert m.check_postmortems({'runs':{'SILENT000001':{'attempts':1,'retry_at':1}},'batches':{}},'silent') is not None
assert m.check_postmortems({'runs':{'SILENT000001':{'attempts':1,'retry_at':99999}},'batches':{}},'silent') is None
print('batch/retry invariants OK')
`, join(root, "ops/codex-ops-learn.py")], { encoding: "utf8" });
  expect(result.status, result.stderr).toBe(0);
});

it("summary excludes foreign mentions, preserves duplicate outcome evidence and exact byte hashes", () => {
  const result = spawnSync("python3", ["-B", "-c", `
import sys,json,pathlib,hashlib
sys.path.insert(0,sys.argv[1]);from evidence_summary import summarize
p=pathlib.Path(sys.argv[2]);run='SILENT000001'
raws=[{'run_id':'FOREIGN00001','rationale':run},{'run_id':run,'label':'reward/card','decider':'brain'},
      {'run_id':run,'state':{'run_id':'FOREIGN00001'}},{'run_id':run,'label':'hand','fallback':'deadline'}]
data=b''.join((json.dumps(r)+'\\n').encode() for r in raws)
(p/'decisions.jsonl').write_bytes(data+b'{"run_id":"SILENT000001"')
(p/'runs.jsonl').write_text((json.dumps({'run_id':run,'floor':17})+'\\n')*2)
d=summarize(p,[run]);item=d['runs'][run]
assert item['decision_count']==2 and len(item['outcomes'])==2
assert item['fallbacks']=={'deadline':1}
assert d['sources'][1]['incomplete_lines']==1
for ref in (x['ref'] for x in item['last_five_decision_refs']):
 raw=data[ref['offset']:ref['offset']+ref['bytes']]
 assert hashlib.sha256(raw).hexdigest()==ref['sha256']
assert not d['complete_raw_evidence']
(p/'runs.jsonl').unlink();assert summarize(p,[run])['sources'][0]['exists'] is False
print('identity/hash/missing invariants OK')
`, join(root, "learner"), tmp], { encoding: "utf8" });
  expect(result.status, result.stderr).toBe(0);
});

const fake = join(tmp, "native");
writeFileSync(fake, '#!/usr/bin/python3\nimport json,sys\nprint(json.dumps(sys.argv[1:]))\n');
chmodSync(fake, 0o755);
function boundary(args: string[]) {
  return spawnSync("bash", ["-c", 'codex_bin="$1"; shift; . "$1" "${@:2}"', "test", fake,
    join(root, "ops/codex-policy.sh"), ...args], { encoding: "utf8" });
}

it.each(["medium", "high", "xhigh"])("preserves explicit %s at the native boundary, including quoted config", (effort) => {
  const result = boundary(["exec", "-c", `model_reasoning_effort="${effort}"`, "--model", "old", "-"]);
  expect(result.status, result.stderr).toBe(0);
  const args: string[] = JSON.parse(result.stdout);
  expect(args).toContain(`model_reasoning_effort="${effort}"`);
  expect(args).toContain('model="gpt-6.1-sol"');
  expect(args).not.toContain("old");
  expect(args.filter((v) => v.startsWith("model_reasoning_effort="))).toHaveLength(1);
});

it("supports inline effort, defaults to high, rejects invalid effort, and preserves sandbox child arguments", () => {
  expect(JSON.parse(boundary(["exec", "-"]).stdout)).toContain('model_reasoning_effort="high"');
  expect(JSON.parse(boundary(["exec", "--config=model_reasoning_effort=medium", "-"]).stdout)).toContain('model_reasoning_effort="medium"');
  expect(boundary(["exec", "-c", "model_reasoning_effort=unknown"]).status).toBe(2);
  const args: string[] = JSON.parse(boundary(["debug", "--", "-c", "model_reasoning_effort=child"]).stdout);
  expect(args.slice(args.indexOf("--"))).toEqual(["--", "-c", "model_reasoning_effort=child"]);
});

it("ordinary tasks use high and specialists/gameplay retain their separate effort", () => {
  for (const task of ["postmortem", "strategy-proposal", "fix-batch", "experience-update"])
    expect(readFileSync(join(root, `learner/tasks/${task}.md`), "utf8")).toContain("effort.codex: high");
  expect(readFileSync(join(root, "learner/tasks/silent-boss-calibration.md"), "utf8")).toContain("effort.codex: xhigh");
});
