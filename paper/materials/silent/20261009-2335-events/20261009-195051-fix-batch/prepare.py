import hashlib,json,pathlib,sys
root=pathlib.Path.cwd(); p=root/'learner/runs/20261009-195053-boss-sim-batch'; a=root/'experiments/boss-sim/silent/e918959162ed7c88e3f8d995163e1a65d77963b8533a7a26050fbfa222261491'
sys.path.insert(0,str(root/'agent/tools/boss-sim'))
from silent_calibration import frozen_split
fs=[json.loads(l) for l in (p/'dataset/fights.jsonl').read_text().splitlines()];e=json.loads((p/'dispatch-evidence.json').read_text());split=frozen_split(fs,e['split'])
(p/'split.json').write_text(json.dumps(split,indent=1)+'\n')
old=json.loads((a/'provenance.json').read_text()); diff=[]
for rel,h in old['input_files'].items():
 f=root/rel if not rel.startswith('/') else pathlib.Path(rel)
 if f.exists() and hashlib.sha256(f.read_bytes()).hexdigest()!=h: diff.append(rel)
 elif not f.exists():diff.append('MISSING:'+rel)
print('fingerprint changed',diff)
(p/'old-model-diff.json').write_text(json.dumps(diff,indent=1)+'\n')
oldfs=[json.loads(l) for l in (a/'fights.jsonl').read_text().splitlines()]; oldturn={x['key']:x for l in (a/'turns.jsonl').read_text().splitlines() if (x:=json.loads(l))};ts={x['key']:x for l in (p/'dataset/turns.jsonl').read_text().splitlines() if (x:=json.loads(l))}
assert fs[:len(oldfs)]==oldfs
assert all(ts[k]==v for k,v in oldturn.items())
new=[r['key'] for r in fs[len(oldfs):]]
keys=[r['key'] for r in fs if 'QUEEN' in r['encounter']]+new
# Check four unchanged, non-target cases at their original dataset indices.
controls=[r['key'] for r in oldfs if 'QUEEN' not in r['encounter']][:4]
(p/'replay-keys.json').write_text(json.dumps(keys+controls,indent=1)+'\n');(p/'control-keys.json').write_text(json.dumps(controls,indent=1)+'\n')
print('frozen',len(fs),'old equal',len(oldfs),'new',new,'replay',len(keys+controls))
(p/'reuse-check.json').write_text(json.dumps({'old_inputs_order_identical':True,'old_turns_identical':True,'old_n':len(oldfs),'new_keys':new,'control_keys':controls,'replay_keys':keys,'fingerprint_changed':diff},indent=1)+'\n')
