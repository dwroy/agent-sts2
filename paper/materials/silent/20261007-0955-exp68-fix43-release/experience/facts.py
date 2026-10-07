import bisect,collections,json
from pathlib import Path
O=Path(__file__).parent;N='YLYLZWHA0GKU'
S=[json.loads(l) for l in (O/N/'states.jsonl').open()];D=[json.loads(l) for l in (O/N/'decisions.jsonl').open()];times=[s['ts'] for s in S];SM={s['ts']:s['state'] for s in S}
def powers(x):return {p['power_id']:p['amount'] for p in x.get('powers',[])}
def brief(s):
 c=s.get('combat') or {};p=c.get('player') or {}
 return dict(hp=s['run']['current_hp'],max_hp=s['run']['max_hp'],block=p.get('block'),powers=powers(p),enemies=[dict(index=e['index'],id=e['enemy_id'],hp=e['current_hp'],max_hp=e['max_hp'],block=e['block'],powers=powers(e),intents=e['intents'],move=e.get('move_id')) for e in c.get('enemies',[])])
rows=[]
for d in D:
 if not d.get('chosen') or d['screen']!='COMBAT' or not str(d.get('result','')).startswith('completed'):continue
 b=SM[d['ts']];a=S[min(bisect.bisect_right(times,d['ts']),len(S)-1)]['state'];cid=d.get('expect',{}).get('card',{}).get('id');card=next((c for c in b['combat']['hand'] if c['card_id']==cid),{})
 rows.append(dict(run=N,floor=d['floor'],turn=d['turn'],ts=d['ts'],action=d['chosen']['action'],card=cid,text=card.get('resolved_rules_text'),dynamic=card.get('dynamic_values'),before=brief(b),after=brief(a)))
(O/'new-facts.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
for f in [17,33,39,45]:
 print('F',f)
 for x in rows:
  if x['floor']==f and x['card'] in ['NOXIOUS_FUMES','ACCELERANT','AFTERIMAGE','ANTICIPATE','SURVIVOR','PIERCING_WAIL']:
   print(x['turn'],x['card'],'挡',x['before']['block'],x['after']['block'],'增益',x['before']['powers'],x['after']['powers'])
 print('结算',[(x['turn'],x['before']['hp'],x['before']['max_hp'],x['before']['block'],[(e['hp'],e['powers']) for e in x['before']['enemies']],x['after']['hp'],x['after']['max_hp']) for x in rows if x['floor']==f and x['action']=='end_turn'])
assert all(s['state']['run'].get('character_id','').lower()=='silent' for s in S)
assert all(d['ts'] in SM and d['observed_ts']==next(s['observed_ts'] for s in S if s['ts']==d['ts']) for d in D)
print('状态匹配',len(D),len(S))
