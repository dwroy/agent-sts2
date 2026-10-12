import json, collections
from pathlib import Path
p=Path('learner/runs/20261008-194301-postmortem'); run='CNKR125PFHJ5'
d=[json.loads(x) for x in (p/f'{run}-decisions.jsonl').open()]; s=[json.loads(x) for x in (p/f'{run}-states.jsonl').open()]; r=json.loads((p/f'{run}-resources.json').read_text())
def short_state(row):
 st=row['state']; co=st.get('combat') or {}; pl=co.get('player') or {}; ru=st['run']
 return {'line':row['_line'],'ts':row['ts'],'f':ru['floor'],'t':st.get('turn'),'screen':st['screen'],'hp':ru['current_hp'],'max':ru['max_hp'],'player':pl,'enemies':co.get('enemies'),'hand':[{k:c.get(k) for k in ['index','card_id','name','energy_cost','resolved_rules_text']} for c in co.get('hand',[])]}
print('DECISION SCHEMA',list(d[0]))
for name in ['run-plans','sl-attempts']:
 print(name)
 for row in map(json.loads,(p/f'{run}-{name}.jsonl').open()): print(json.dumps(row,ensure_ascii=False))
print('RESOURCES')
for c in r['combats']:
 print(json.dumps({k:v for k,v in c.items() if k not in ['changes','enemy_hp_audit']},ensure_ascii=False))
print('RESOURCE CHANGES')
for c in r['resource_changes']:print(json.dumps(c,ensure_ascii=False))
print('F33 DECISIONS')
for row in d:
 if row['floor']==33: print(json.dumps({k:v for k,v in row.items() if k in ['_line','ts','turn','label','decider','chosen','rationale','confidence','fallback','journal','result','usage']},ensure_ascii=False))
print('F33 STATES')
for row in s:
 if row['state']['run']['floor']==33: print(json.dumps(short_state(row),ensure_ascii=False))
print('STRATEGY')
for row in d:
 if row['decider']=='codex':print(json.dumps({k:v for k,v in row.items() if k in ['_line','floor','turn','label','chosen','rationale','journal','result']},ensure_ascii=False))
