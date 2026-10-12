import json
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2');rid='SY0WMJNNVRLM';out=p/'learner/runs/20261008-171302-postmortem'
rows=[]
with (p/'logs/brain.jsonl').open() as f,(out/f'{rid}-brain.jsonl').open('w') as d:
 for n,l in enumerate(f,1):
  if rid not in l:continue
  r=json.loads(l);r['_line']=n;d.write(json.dumps(r,ensure_ascii=False)+'\n');rows.append(r)
print('brain',len(rows))
if rows:
 print('keys',rows[0].keys())
 for r in rows:
  fact=r.get('facts',{})
  if not fact and isinstance(r.get('request'),dict):fact=r['request'].get('facts',{})
  print('b',r['_line'],'floor',r.get('floor'),'label',r.get('label'),'keys',list(fact),'clock',fact.get('act_boss_clock'))
