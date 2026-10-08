import json,collections,re
from pathlib import Path
p=Path(__file__).parent
D=json.loads((p/'decisions.json').read_text()); S=json.loads((p/'states.json').read_text()); R=json.loads((p/'PF90JTU0UZ5M-resources.json').read_text())
byline={x['_line']:x for x in S}
def simple(x):
 s=x['state']; c=s.get('combat') or {};pl=c.get('player') or {}
 return {'s':x['_line'],'T':s['turn'],'hp':s['run']['current_hp'],'block':pl.get('block'),'energy':pl.get('energy'),'pwr':[(v['power_id'],v['amount']) for v in pl.get('powers',[])],'enemies':[(e['index'],e['name'],e['enemy_id'],e['current_hp'],e['block'],e.get('move_id'),[(i.get('damage'),i.get('hits')) for i in e.get('intents',[]) if i.get('damage') is not None],[(v['power_id'],v['amount']) for v in e.get('powers',[])]) for e in c.get('enemies',[])],'hand':[(h['card_id'],h.get('energy_cost')) for h in c.get('hand',[])]}
output=[]
for w in R['combats']:
 if w['floor'] not in [9,17,19,20,21,22]:continue
 rows=[x for x in S if w['entry']['line']<=x['_line']<=(w['exit'] or w['last'])['line']]
 output.append(f"F{w['floor']} sequence{w['sequence']}")
 for x in rows: output.append(json.dumps(simple(x),ensure_ascii=False))
(p/'states-summary.txt').write_text('\n'.join(output))
J=[x for x in D if x['decider']=='jev']; low=[x for x in J if x.get('confidence') is not None and x['confidence']<.35]
print('low',len(low),collections.Counter(x['label'] for x in low))
plan=[x for x in J if x['label'] in ['combat/plan-choice','combat/plan-choice+potion']]
print('plans',len(plan));print('deep keys',collections.Counter(k for x in plan for k in (x.get('deepseek') or {})))
print('example deep',plan[0].get('deepseek'));print('example top row keys',list(plan[0]))
rank=[]
for x in plan:
 m=re.search(r'code rank (\d+)',x.get('rationale',''))
 if m:rank.append(int(m[1]))
print('ranks',len(rank),collections.Counter(rank))
print('guards',[(x['_line'],x['rationale']) for x in D if re.search(r'HP guard|guard bound',x.get('rationale',''),re.I)])
for x in D:
 if x.get('chosen',{}).get('action') in ['use_potion','discard_potion','buy_potion','claim_reward'] and ('potion' in json.dumps(x.get('chosen'))) or 'drink ' in x.get('rationale','').lower():
  print('potion decision',x['_line'],x['floor'],x['turn'],x.get('chosen'),x.get('rationale'))
print('final states')
for x in S[-7:]:print(simple(x))
