"""Verify the exact r1 dispatch and save source-version excerpts; no predictions."""
import collections,gzip,hashlib,json,subprocess
from pathlib import Path
ROOT=Path('/home/dw/Projects/agent-sts2')
OUT=ROOT/'.worktrees/codex-strategy-silent-20261012-024317/learner/runs/20261016-135541-9b95a56c-ddfa-4e65-b94d-cbe7a5f57947-strategy-proposal/learner-results'
B=ROOT/'paper/materials/20261016-global-build-g3b'
def sha(b):return hashlib.sha256(b).hexdigest()
def dump(n,d):(OUT/n).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
at=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %Z'],text=True).strip();print(at)
p=B/'ops-dispatch/input-r1.json';raw=p.read_bytes();assert sha(raw)=='090156079b1e5da5efe292c5be3249cd4a517bd933be9865b1b39983422248de';request=json.loads(raw)
assert request['same_thread']=='01a12c46-fef2-7282-b689-1fd8b4e0450b' and request['parent_batch']=='20261012-024317-strategy-proposal'
checks=[{'path':str(p),'bytes':len(raw),'sha256':sha(raw)}]
for x in [request['input'],request['manifest'],*request['artifacts'],*request['authorization'],request['original_owner_log']]:
 p=ROOT/x['path'];raw=p.read_bytes();assert sha(raw)==x['sha256'] and len(raw)==x['bytes'],str(p);checks.append({'path':str(p),'bytes':len(raw),'sha256':sha(raw)})
m=json.loads((ROOT/request['manifest']['path']).read_text());p=B/'coordination/anchor-index.json';raw=p.read_bytes();assert sha(raw)=='724e2996f7634079901a6ff25838f4a15b5e8a2b85a012714ae500015a40791d';checks.append({'path':str(p),'sha256':sha(raw),'bytes':len(raw)})
anchors=json.loads(raw);assert len(anchors)==1371 and {a['source']['off'] for a in anchors}=={a['off'] for a in m['raw_construction_record_index']}
for k,v in m['source_bounds'].items():
 st=(ROOT/v['path']).stat();assert st.st_size>=v['complete_prefix_bytes'] and st.st_ino==v['inode'] and st.st_dev==v['device'],k
rows=[];commits=set()
with gzip.open(B/'inputs/construction-records.jsonl.gz','rt') as f:
 for line in f:
  r=json.loads(line);assert r['config']['character'].lower()=='silent' and r['config']['ascension']==10
  commits.add(r['config']['code']['commit']);rows.append(r)
assert len(rows)==1371
history=[];(OUT/'historical-source').mkdir(exist_ok=True)
paths=['agent/src/construction/planner.ts','agent/src/construction/adapter.ts','agent/src/construction/admission.ts','agent/src/hand/screens/route-plan.ts','agent/src/sim/route-map.ts','knowledge/characters/silent/construction-templates.json']
for c in sorted(commits):
 for name in paths:
  p=subprocess.run(['git','show',c+':'+name],cwd=ROOT,capture_output=True)
  if p.returncode!=0:
   assert name=='agent/src/construction/admission.ts',(c,name,p.stderr.decode())
   history.append({'commit':c,'source_path':name,'absent_at_original_commit':True,'git_show_exit_code':p.returncode});continue
  h=sha(p.stdout);target=OUT/'historical-source'/(h+'.txt')
  if not target.exists():target.write_bytes(p.stdout)
  blob=subprocess.check_output(['git','rev-parse',c+':'+name],cwd=ROOT,text=True).strip();history.append({'commit':c,'source_path':name,'git_blob':blob,'sha256':h,'bytes':len(p.stdout),'saved_copy':str(target)})
dump('historical-source-manifest.json',history)
dump('input-verification.json',{'at':at,'dispatch_input_sha256':checks[0]['sha256'],'data_manifest_sha256':request['manifest']['sha256'],'inputs':checks,'anchors':1371,'unique_runs':len(m['selected_runs']),'old_head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'no_input_repair_or_new_revision':True,'raw_bounds':m['source_bounds']})
print(json.dumps({'inputs_verified':len(checks),'anchors':len(rows),'source_commits':len(commits),'source_blobs':len({x['sha256'] for x in history if 'sha256' in x})}))
