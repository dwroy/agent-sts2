import sys,json
from pathlib import Path
p=Path('learner/runs/20261007-071302-postmortem')
count=0;found=[]
for l in sys.stdin:
 ob=json.loads(l)
 if ob.get('label') not in ['combat/plan-choice','combat/plan-choice+potion']:continue
 s=json.dumps(ob.get('request'),ensure_ascii=False)
 if 'not_modelled' not in s or 'POISON_POWER' not in s:continue
 # 仅保留明确把中毒列作未建模的题面。
 import re
 if not re.search(r'not_modelled.{0,100}POISON_POWER',s):continue
 count+=1
 if len(found)<24:found.append(ob)
with (p/'prior-poison-prompts.jsonl').open('w') as h:
 for ob in found:h.write(json.dumps(ob,ensure_ascii=False)+'\n')
print('同项更早题数',count)
for ob in found:
 print(ob['run_id'],ob['ts'],ob['floor'],ob['turn'],ob['label'],ob.get('answers'))
