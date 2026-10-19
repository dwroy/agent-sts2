"""Independent read-only verification of the one authorized R2 dispatch."""
import collections, hashlib, json, pathlib, subprocess
ROOT=pathlib.Path('/home/dw/Projects/agent-sts2')
RUN=ROOT/'learner/runs/20261019-191321-36f2fdf6-0f25-4cf0-a330-b92cbd315341-v6-reflex-distill-r2'
OUT=pathlib.Path(__file__).resolve().parent
load=lambda p:json.loads(p.read_bytes())
def sha(p,limit=None):
 h=hashlib.sha256()
 with p.open('rb') as f:
  while limit is None or limit>0:
   b=f.read(min(8388608,limit) if limit is not None else 8388608)
   if not b: break
   h.update(b)
   if limit is not None: limit-=len(b)
  if limit is not None and limit: raise ValueError('short frozen prefix')
 return h.hexdigest()
mfile=ROOT/'ops/codex-ops/learner/v6-reflex-distill-r2-20261019-1913.inputs.json'
m=load(mfile); r=load(RUN/'result.json'); checks=[]
assert sha(mfile)==r['input_sha256']=='a2597441d19f5472b91d45ca7a6f9fa7dcf55026cdfde38de8aec8af11acc271'
for group,entries in [('frozen',m['files']),('artifacts',r['artifacts'])]:
 for i,e in enumerate(entries):
  p=pathlib.Path(e['path']); ok=p.stat().st_size==e['bytes'] and sha(p)==e['sha256']
  checks.append(dict(group=group,path=str(p),ok=ok)); assert ok,str(p)
 print(group,len(entries),'SHA verified',flush=True)
for entry in load(RUN/'input-final-verification.json')['prefixes']:
 p=pathlib.Path(entry['source']); start,limit=entry['range']; assert start==0
 assert limit==m['log_byte_limits'][p.name]
 assert sha(p,limit)==entry['sha256']==entry['initial_prefix_sha256'],str(p)
print('frozen prefixes verified',flush=True)
formal=[]
for e in load(ROOT/'paper/materials/2026-10-19-v6-reflex-distill-r2/formal-knowledge-check.json'):
 for base in [ROOT,ROOT/'.worktrees/v6-reflex-distill-r2-20261019']:
  p=base/e['path']; ok=sha(p)==e['expected']; formal.append(dict(path=str(p),ok=ok)); assert ok,str(p)
c=load(RUN/'conversion-full.json'); original=load(ROOT/'knowledge/characters/silent/experience.json')
original=original.get('entries',original.get('experience',[])) if isinstance(original,dict) else original
assert len(c)==len({e['experience_id'] for e in c})==244
byid={e['id']:e for e in original}
assert {e['experience_id'] for e in c}==set(byid)
assert all(e['original']==byid[e['experience_id']] for e in c)
assert set(r['covered_runs'])=={v['run_id'] for v in m['runs']}
v=load(RUN/'validation.json'); argv=v['argv']; proc=subprocess.run(argv,cwd=v['cwd'],capture_output=True,text=True)
(OUT/'validation.stdout').write_text(proc.stdout);(OUT/'validation.stderr').write_text(proc.stderr);assert proc.returncode==0
native=ROOT/'ops/codex-ops/accounts/codex1/learner/sessions/2026/10/19/rollout-2026-10-19T19-13-24-01a153dd-c08a-7532-b716-200ac1204f73.jsonl'
contexts=[]
for line in native.open():
 q=json.loads(line)
 if q.get('type')=='turn_context':
  z=q['payload'];contexts.append({k:z.get(k) for k in ['model','effort','cwd']})
assert contexts and all(c['model']=='gpt-6.1-sol' and c['effort']=='xhigh' for c in contexts)
summary=dict(status='independently_verified',manifest_sha256=sha(mfile),frozen_files=len(m['files']),artifacts=len(r['artifacts']),artifact_bytes=sum(x['bytes'] for x in r['artifacts']),runs=len(r['covered_runs']),experiences=len(c),conversion_counts=dict(collections.Counter(e['status'] for e in c)),counts=r['counts'],formal_knowledge=formal,native_turn_context=contexts,validation_exit_code=proc.returncode,published=False,parent_completed=False)
(OUT/'checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n');(OUT/'verification.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(json.dumps(summary,ensure_ascii=False))
