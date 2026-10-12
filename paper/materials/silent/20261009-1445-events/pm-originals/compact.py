import json
from pathlib import Path
from collections import Counter,defaultdict
out=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-141302-postmortem');run='AF76L5UTPP8U'
def rows(n):return [json.loads(l) for l in (out/f'{run}-{n}.jsonl').open()]
def powers(ps):return {p['power_id']:p.get('amount') for p in ps}
def enemies(es):return [{'i':e['index'],'id':e['enemy_id'],'name':e['name'],'hp':e['current_hp'],'max':e['max_hp'],'b':e['block'],'alive':e['is_alive'],'powers':powers(e['powers']),'move':e.get('move_id'),'damage':sum((i.get('total_damage') or 0) for i in e.get('intents',[]))} for e in es]
ds=rows('decisions');ss=rows('states')
for r in ss:
 s=r['state'];c=s.get('combat') or {};p=c.get('player') or {};f=(s.get('run') or {}).get('floor')
 if f==23:
  print('S',r['_line'],r['ts'],s['screen'],'T',s['turn'],'P',p.get('current_hp'),p.get('block'),p.get('energy'),powers(p.get('powers',[])),'E',enemies(c.get('enemies',[])),'H',[(h['card_id'],h['name'],h.get('energy_cost'),h.get('resolved_rules_text')) for h in c.get('hand',[])])
for r in ds:
 if r['floor']==23:
  print('D',r['_line'],'T',r['turn'],r['label'],r['chosen'],r['rationale'])
  for k in ['rollout','rollout_best_chosen','chosen_order','focus','hp_guard','boss_sim','combat_judge','solver','sl_attempt','sl_reloads']:
   if k in r: print(k,json.dumps(r[k],ensure_ascii=False))
  qs=r.get('questions') or {}
  for key,q in qs.items():print('Q',key,'criteria',q.get('criteria'))
