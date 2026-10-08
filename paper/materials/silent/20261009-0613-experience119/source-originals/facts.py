import json,bisect,collections
from pathlib import Path
O=Path(__file__).parent;N='0DJ6GFZZ0TG9';P=O/N
S=[json.loads(l) for l in (P/'states.jsonl').open()];D=[json.loads(l) for l in (P/'decisions.jsonl').open()];T=[x['ts'] for x in S];M={x['ts']:x['state'] for x in S}
def power(e):return {p['power_id']:p['amount'] for p in e.get('powers',[])}
def brief(s):
 c=s.get('combat') or {};p=c.get('player') or {}
 return {'hp':s['run']['current_hp'],'max':s['run']['max_hp'],'block':p.get('block'),'powers':power(p),'enemies':[{k:e.get(k) for k in ['enemy_id','index','current_hp','block','move_id','is_alive']}|{'powers':power(e),'intents':e.get('intents')} for e in c.get('enemies',[])]}
rows=[]
for d in D:
 if d['floor'] not in [9,17,33] or not d.get('chosen'):continue
 action=d['chosen']['action'];ident=(d.get('expect') or {}).get('card',{}).get('id')
 if action=='use_potion' or ident in ['SERPENT_FORM','SPEEDSTER','EXTERMINATE','ADRENALINE','EXPERTISE','HAZE','SNAKEBITE'] or (d['floor']==17 and d['turn']==8) or (d['floor']==33 and d['turn']==6):
  a=M[d['ts']];b=S[min(bisect.bisect_right(T,d['ts']),len(S)-1)]['state']
  rows.append({'floor':d['floor'],'turn':d['turn'],'ts':d['ts'],'action':action,'card':ident,'potion':(d.get('expect') or {}).get('potion'),'before':brief(a),'after':brief(b)})
assert len(S)==414 and len(D)==401
assert all(x['state']['run']['character_id'].lower()=='silent' and x['state']['run_id']==N for x in S)
(O/'new-state-facts.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
for r in rows:
 print(r['floor'],r['turn'],r['action'],r['card'],r['potion'],r['before'],r['after'])
print('原帧',len(S),'决策',len(D),'主题动作',len(rows))
