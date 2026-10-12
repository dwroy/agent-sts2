import json,collections
from pathlib import Path
O=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-161301-postmortem')
D=[]
for l in (O/'decisions.numbered.jsonl').open():
 n,t=l.split(':',1);x=json.loads(t);x['_line']=int(n);D.append(x)
S={json.loads(l)['line']:json.loads(l)['data'] for l in (O/'states.selected.jsonl').open()}
def crit(d):
 return [(k,json.loads(v) if v.startswith('{') else v) for q in (d.get('questions') or {}).values() for k,v in q.get('criteria',{}).items()]
R=json.loads((O/'rounds.json').read_text()); print('ROUNDS',sum(len(r['rounds']) for r in R))
print('FOCUS')
for d in D:
 cc=[(k,v) for k,v in crit(d) if isinstance(v,dict) and 'focus' in v]
 if cc:
  import re
  chosen=re.search(r'chose (plan \d+|plan\d+)',d['rationale']); key=chosen[1].replace(' ','') if chosen else None
  print(d['_line'],d['floor'],d['turn'], 'options',[(k,v['focus']) for k,v in cc],'pick',key,'focus',next((v['focus'] for k,v in cc if k==key),None))
print('BRAIN facts')
for d in D:
 if d['label'] not in ['rest/plan','map/route-plan','event/act-plan']:continue
 print('D',d['_line'],d['floor'],'keys',d.keys())
 for key in ['route_projection','route_hp','act_boss_clock','boss_sim','state','facts']:
  if key in d:print(key,d[key])
 for k,v in crit(d):
  if isinstance(v,dict) and (k=='o0' or k in ['o1:c10'] or d['label'] in ['event/act-plan','map/route-plan']):print('option',k,v)
print('POTIONS')
for d in D:
 if d['chosen']['action']!='use_potion':continue
 nexts=[(n,x) for n,x in S.items() if x['ts']>=d['observed_ts'] and x['ts']<=d['ts']]
 # closest observation at/before decision observation, then next raw frame
 before=max([(n,x) for n,x in S.items() if x['ts']<=d['observed_ts']],key=lambda t:t[0]);after=S.get(before[0]+1)
 def cs(x):
  c=x['state'].get('combat') or {};return {'hand':[(z['card_id'],z['name']) for z in c.get('hand',[])],'enemy':[(e['current_hp'],[(p['power_id'],p['amount']) for p in e['powers']]) for e in c.get('enemies',[])],'player':c.get('player')}
 print(d['_line'],d['floor'],d['turn'],d['chosen'],'s',before[0],before[0]+1,'hand',len(cs(before[1])['hand']),len(cs(after)['hand']) if after else None,'enemy',cs(before[1])['enemy'],cs(after)['enemy'] if after else None)
print('PLANS')
for l in (O/'plans.numbered.jsonl').open():
 n,t=l.split(':',1);x=json.loads(t);print(n,x)
print('DSREQ SAMPLE')
x=json.loads((O/'brain.selected.jsonl').read_text().splitlines()[0]);print('b',x['line'],'keys',x['data'].keys())
print('CHOICES relevant')
for d in D:
 if d['_line'] in [316351,316394,316407,316408,316441,316467,316501,316506,316512,316519,316524,316528]:
  print('D',d['_line'],d['rationale'],'best',d.get('rollout_best_chosen'))
  for k,v in crit(d):
   if isinstance(v,dict):print(k,{kk:vv for kk,vv in v.items() if kk in ['plays','hp_lost','damage_dealt','rollout_best','rollout_tied','block_gained','enemies_after','focus','scaling_gained','result','simulated']})
