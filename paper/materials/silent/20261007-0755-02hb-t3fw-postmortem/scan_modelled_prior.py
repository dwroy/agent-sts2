import sys,json,re
from pathlib import Path
p=Path('learner/runs/20261007-071302-postmortem');found=[];n=0
for l in sys.stdin:
 ob=json.loads(l)
 if ob.get('label') not in ['combat/plan-choice','combat/plan-choice+potion']:continue
 rq=ob.get('request') or {};s=json.dumps(rq,ensure_ascii=False)
 if not re.search(r'not_modelled.{0,100}POISON_POWER',s):continue
 aa=ob.get('answers') or {};ch=(aa.get('plan') or {}).get('choice');q=(rq.get('questions') or {}).get('plan') or {};v=q.get('criteria',{}).get(ch)
 if not v:continue
 try:v=json.loads(v)
 except Exception:continue
 if '中毒' not in v.get('enemies_after',''):continue
 n+=1
 if len(found)<8:found.append(ob)
with (p/'first-modelled-poison-prompts.jsonl').open('w') as h:
 for ob in found:h.write(json.dumps(ob,ensure_ascii=False)+'\n')
print('已有毒预测但仍折扣的更早题数',n)
for ob in found:
 rq=ob['request'];q=rq['questions']['plan'];ch=ob['answers']['plan']['choice'];v=json.loads(q['criteria'][ch]);print(ob['run_id'],ob['ts'],ob['floor'],ob['turn'],{k:v.get(k) for k in ['plays','damage_dealt','enemies_after','unmodelled_cards']},'敌',rq['state'].get('enemies'))
