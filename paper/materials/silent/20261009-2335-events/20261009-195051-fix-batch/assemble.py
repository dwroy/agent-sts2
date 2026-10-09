import json,pathlib,sys,hashlib,runpy,subprocess,copy
p=pathlib.Path(__file__).resolve().parent;root=p.parents[2];mode=sys.argv[1]
fs=[json.loads(l) for l in (p/'dataset/fights.jsonl').read_text().splitlines()];pairs=[(r['key'],s) for r in fs for s in ('t1','pre')]
def load(directory):
 rows={}
 for f in sorted(directory.glob('results-*.jsonl')):
  for line in f.read_text().splitlines():
   r=json.loads(line);key=(r['key'],r['start']);assert key not in rows,(directory,key);assert r.get('character')=='silent';rows[key]=r
 return rows
base=load(p/'before-parallel');assert set(base)==set(pairs),(len(base),len(pairs))
if mode=='before':
 rows=[base[k] for k in pairs];prov=json.loads((p/'before-provenance.json').read_text());out=p/'before-results.jsonl'
else:
 candidate=load(p/'after-parallel');controls=set(json.loads((p/'control-keys.json').read_text()));targets={r['key'] for r in fs if 'QUEEN' in r['encounter']};expected={(k,s) for k in targets|controls for s in ('t1','pre')};assert set(candidate)==expected
 proof_path=p/'candidate-input-equivalence-proof.json';proof=json.loads(proof_path.read_text());assert proof['head']==(p/'source-commit.txt').read_text().strip();assert proof['allowed_reuse_non_target_fights']==len(fs)-len(targets);assert all(r['identical'] and r['before']==r['after'] for r in proof['valid_non_target_inputs']);assert all(r['identical'] for r in proof['unchanged_errors'])
 def stable(row):
  r=copy.deepcopy(row)
  if 'sim' in r:r['sim'].pop('ms',None)
  return r
 comparisons=[]
 for k in sorted(controls):
  for s in ('t1','pre'):
   eq=stable(base[k,s])==stable(candidate[k,s]);comparisons.append({'key':k,'start':s,'identical_except_ms':eq});assert eq,(k,s)
 rows=[candidate[k] if k[0] in targets else base[k] for k in pairs];out=p/'after-results.jsonl';fn=runpy.run_path(str(root/'agent/tools/boss-sim/refresh-silent.py'))['model_fingerprint'];fp=fn(root,pathlib.Path('/home/dw/Projects/agent-sts2/data/game-data.json'))
 prov={**json.loads((p/'before-provenance.json').read_text()),'simulator_base':(p/'source-commit.txt').read_text().strip(),'input_files':fp,'model_sha256':hashlib.sha256(json.dumps(fp,sort_keys=True).encode()).hexdigest(),'fixed_runner':'unchanged baseline backtest.ts, applied to candidate sources','result_reuse':{'base':json.loads((p/'dispatch-evidence.json').read_text())['dispatch_base'],'reused_non_target_keys':[r['key'] for r in fs if r['key'] not in targets],'controls':comparisons,'isolation':'Only the Silent Queen whole-fight marker and its guarded reads changed. All non-target frozen inputs lack QUEEN and the marker; the extra Strength and lookahead terms are zero. Full base replays for every boss are reused by identical key; candidate controls must reproduce all non-timing fields.'}}
 prov['result_reuse']['all_input_key_proof']={'path':str(proof_path),'sha256':hashlib.sha256(proof_path.read_bytes()).hexdigest(),'valid_non_target_inputs':len(proof['valid_non_target_inputs']),'unchanged_error_fights':len(proof['unchanged_errors']),'target_only_changed_field':'input.fightQueenTorchStrength'}
 (p/'non-target-reuse.json').write_text(json.dumps(prov['result_reuse'],ensure_ascii=False,indent=1)+'\n');(p/'after-provenance.json').write_text(json.dumps(prov,ensure_ascii=False,indent=1)+'\n')
out.write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows));print(mode,len(rows),'records; errors',sum('error' in r for r in rows))
