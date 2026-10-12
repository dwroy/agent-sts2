import json
from pathlib import Path
p=Path(__file__).parent
for run in ['1913SE84AXQF','Q6M2Y34MWKRE']:
 states=[json.loads(s) for s in (p/f'{run}-states.jsonl').open()]
 report=json.loads((p/f'{run}-resources.json').read_text())
 with (p/f'{run}-compact.txt').open('w') as out:
  for window in report['combats']:
   rows=[s for s in states if window['entry']['line']<=s['_line']<=window['exit']['line']]
   turns={}
   for row in rows:
    s=row['state']
    if s.get('in_combat') and s.get('combat',{}).get('action_readiness',{}).get('can_use_combat_actions') and s['turn'] not in turns:turns[s['turn']]=row
   seq=list(turns.values());hp=[];need=[];damage=[];ref=[]
   for i,row in enumerate(seq):
    s=row['state'];n=(seq[i+1] if i+1<len(seq) else rows[-1])['state']
    need.append(sum(e['current_hp'] for e in s['combat']['enemies']))
    damage.append(need[-1]-sum(e['current_hp'] for e in (n.get('combat') or {}).get('enemies',[])))
    hp.append(s['run']['current_hp']-n['run']['current_hp']);ref.append(row['_line'])
   print('F'+str(window['floor']),'需'+str(need),'净扣'+str(damage),'净损'+str(hp),'轮初行'+str(ref),file=out)
 print((p/f'{run}-compact.txt').read_text())
