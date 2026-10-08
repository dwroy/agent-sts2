import json, collections
from pathlib import Path
p=Path('learner/runs/20261007-221303-postmortem')
def rows(name):
 for line in (p/name).open():
  n,s=line.split(':',1); r=json.loads(s);r['_line']=int(n);yield r
D=list(rows('decisions-lines.jsonl'))
print('WINDOW',D[0]['ts'],D[-1]['ts'],'decisions',len(D))
print('COUNTS',dict(collections.Counter(d['decider'] for d in D)))
print('LABELS',dict(collections.Counter((d['label'],d['decider']) for d in D)))
print('LOW',dict(collections.Counter(d['floor'] for d in D if d['decider']=='jev' and isinstance(d.get('confidence'),(int,float)) and d['confidence']<.35)))
print('USAGE', {k:sum((d.get('usage') or {}).get(k,0) or 0 for d in D) for k in ['input_tokens','output_tokens','cache_hit_tokens']})
for d in D:
 if d['decider']=='codex' or any(w in d['label'] for w in ['potion','least-loss','lethal']) and d['floor']!=33:
  print('D',d['_line'],d['ts'],d['floor'],d['turn'],d['label'],json.dumps(d['chosen'],ensure_ascii=False),d.get('rationale'), 'journal',json.dumps(d.get('journal'),ensure_ascii=False))
  if d.get('boss_sim'):print('BOSS_SIM',json.dumps(d['boss_sim'],ensure_ascii=False))
for r in rows('plans-lines.jsonl'):print('PLAN',r['_line'],r['floor'],json.dumps(r['plan'],ensure_ascii=False))
S=list(rows('sl-lines.jsonl'))
for r in S:
 print('SL',r['_line'],json.dumps({k:v for k,v in r.items() if k not in ['initial_state','deck','decision_snapshots','turns','trajectory','initial_state_snapshot','initial_deck','decision_trace']},ensure_ascii=False)[:15000])
with (p/'decisions-summary.txt').open('w') as f:
 for d in D:f.write(json.dumps({k:v for k,v in d.items() if k in ['_line','ts','floor','turn','label','decider','chosen','rationale','confidence','sl_attempt','sl_reloads','result','journal','focus']},ensure_ascii=False)+'\n')
