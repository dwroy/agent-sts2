import json,collections,re,datetime
from pathlib import Path
p=Path(__file__).parent;D=[json.loads(x) for x in (p/'decisions.jsonl').open()];S=[json.loads(x) for x in (p/'states.jsonl').open()];R=json.loads((p/'J8PHG72DGD90-resources.json').read_text())
def live(s):return sum(e['current_hp'] for e in (s.get('combat') or {}).get('enemies',[]) if e['is_alive'])
def powers(a):return [(x.get('power_id'),x.get('amount')) for x in a.get('powers',[])]
for c in R['combats']:
 rows=[x for x in S if c['entry']['line']<=x['_line']<=(c['exit'] or c['last'])['line']]
 first={}
 for row in rows:
  if row['state'].get('in_combat'):first.setdefault(row['state']['turn'],row)
 fs=list(first.values());end=rows[-1];progress=[];loss=[]
 for a,b in zip(fs,fs[1:]+[end]):progress.append(live(a['state'])-live(b['state']));loss.append(a['state']['run']['current_hp']-b['state']['run']['current_hp'])
 print('TURN',c['sequence'],'F',c['floor'],'need',[live(x['state']) for x in fs],'progress',progress,'netloss',loss,'lines',[x['_line'] for x in fs])
 if c['sequence']==20:
  for x in fs+[end]:
   s=x['state'];b=s.get('combat') or {};print('FINALTURN',x['_line'],s['turn'],s['run']['current_hp'], 'player',b.get('player'), 'enemy',[{k:e.get(k) for k in ['index','enemy_id','name','current_hp','block','powers','intents','move_id']} for e in b.get('enemies',[])])
print('DRINKS')
for d in D:
 if d['chosen'].get('action') in ['use_potion','discard_potion']:print(d['_line'],d['floor'],d['turn'],d.get('sl_attempt'),d['chosen'],d['rationale'])
print('COUNTS',collections.Counter(d['decider'] for d in D))
print('LOW',collections.Counter(d['label'] for d in D if d['decider']=='jev' and (d.get('confidence') or 0)<0.35))
print('rollout bool fields',[(k,d[k]) for d in D for k in d if 'rollout_best' in k][:3])
print('end decision keys',D[-20].keys())
for d in D:
 if d['decider']=='jev' and 'plan-choice' in d['label']:
  v=d.get('jev') or {}; print('ONE JEV',json.dumps(d,ensure_ascii=False)[-3800:]);break
