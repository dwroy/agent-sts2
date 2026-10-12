import json
from pathlib import Path
from collections import Counter,defaultdict
out=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-141302-postmortem');run='AF76L5UTPP8U'
def rows(n):return [json.loads(l) for l in (out/f'{run}-{n}.jsonl').open()]
ds=rows('decisions');ss=rows('states')
print('STATE TOP KEYS',list(ss[-2]));print('STATE KEYS',list(ss[-2]['state']));print('COMBAT KEYS',list(ss[-2]['state']['combat']))
for r in ss:
 s=r['state'];ru=s.get('run') or {};c=s.get('combat') or {}
 if ru.get('floor')==23:
  print('STATE',r['_line'],r['ts'],s.get('screen'),'turn',s.get('turn'),'HP',ru.get('current_hp'),'combat',json.dumps(c,ensure_ascii=False),'potions',ru.get('potions'))
for r in ds:
 if r['floor']==23:
  print('DECISION',r['_line'],r['ts'],r['turn'],r['label'],r['decider'],r['chosen'],r.get('rationale'))
  print('EXTRA',json.dumps({k:v for k,v in r.items() if k not in ['questions','fingerprint','rationale','journal','expect','result','_offset']},ensure_ascii=False))
  print('QUESTIONS',json.dumps(r.get('questions'),ensure_ascii=False))
print('CONFIG',json.dumps(rows('run-config'),ensure_ascii=False))
