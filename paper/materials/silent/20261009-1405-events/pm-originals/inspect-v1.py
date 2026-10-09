import json,pathlib,collections,datetime,importlib.util
p=pathlib.Path(__file__).parent;ds=[json.loads(l) for l in (p/'decisions.jsonl').open()];ss=[json.loads(l) for l in (p/'states.jsonl').open()]
for d in ds:
 if d['label']=='rest/plan':
  o=json.loads(d['questions']['pick']['criteria']['o0']);print('REST',d['_line'],d['floor'],d['chosen'],o.get('boss_sim_hp_reference'),o.get('boss_sim'))
print('GUARD OPTIONS')
for d in ds:
 if 'HP guard:' in d['rationale']:
  opts=d['questions']['plan']['criteria'];print('d',d['_line']);
  for key in ('plan1','plan4'):
   x=json.loads(opts[key]);print(key,{k:x.get(k) for k in ('plays','hp_lost','damage_dealt','block_gained','strength_gained','enemies_after','rollout','rollout_kill_order')})
print('F49 FIRST TWO T1')
for d in ds:
 if d['_line'] in (313856,313870,313927):
  print(d['_line'],'bs',d.get('boss_sim'))
  for k,v in d['questions']['plan']['criteria'].items():
   x=json.loads(v);print(k,{a:x.get(a) for a in ('plays','hp_lost','damage_dealt','strength_gained','focus','rollout_best','rollout','rollout_kill_order')})
print('USED USAGE')
print('usage examples',[(d['_line'],d['decider'],d['usage']) for d in ds if d.get('usage')][:2]); print('coder',[(d['_line'],d['usage']) for d in ds if d['decider']=='codex' and d.get('usage')][:2])
print('CODEx schema')
x=json.loads((p/'codex-calls.jsonl').open().readline());print(list(x))
print('WINDOW TIME',(datetime.datetime.fromisoformat(ds[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(ds[0]['ts'].replace('Z','+00:00'))).total_seconds(),ss[0]['ts'])
spec=importlib.util.spec_from_file_location('ledger','learner/ledger.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
rows=mod.read_rows('paper/materials/learning/ledger.jsonl');cut=datetime.datetime.fromisoformat(ss[0]['ts'].replace('Z','+00:00'))
frozen=mod.fold([r for r in rows if datetime.datetime.fromisoformat(r['ts'])<cut]);(p/'ledger-before-run.json').write_text(json.dumps({k:v for k,v in frozen.items() if k in ('silent-0079','silent-0228','silent-0069')},ensure_ascii=False,indent=2)+'\n')
print('FROZEN',[(k,v.get('status'),v.get('version')) for k,v in frozen.items() if k in ('silent-0079','silent-0228','silent-0069')])
