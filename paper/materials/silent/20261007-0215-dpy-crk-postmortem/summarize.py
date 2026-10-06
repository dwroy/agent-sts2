import json,collections
from pathlib import Path
P=Path('/home/dw/Projects/agent-sts2/learner/runs/20261007-014302-postmortem')
D=[json.loads(l) for l in (P/'decisions.jsonl').open()]
def dump(x):return json.dumps(x,ensure_ascii=False)
def power(p):return [(x.get('id',x.get('power_id')),x.get('amount'),x.get('name')) for x in p]
def compact(x):
 s=x['state'];c=s.get('combat') or {};p=c.get('player') or {};r=s.get('run') or {}
 return {'ts':x['ts'],'screen':s['screen'],'floor':r.get('floor'),'turn':s.get('turn'),'hp':p.get('current_hp',r.get('current_hp')),'block':p.get('block'),'energy':p.get('energy'),'powers':power(p.get('powers',[])),'enemies':[{k:e.get(k) for k in ['index','enemy_id','name','current_hp','block','is_alive','move_id']}|{'powers':power(e.get('powers',[])),'intents':e.get('intents')} for e in c.get('enemies',[])],'hand':[(h.get('index'),h.get('card_id'),h.get('name'),h.get('energy_cost'),h.get('upgraded')) for h in c.get('hand',[])]}
for run in ['DPYF2BAA3DKT','CRK2HNYKSCZC']:
 ds=[x for x in D if x['run_id']==run]
 S=[json.loads(l) for l in (P/(run+'-states.jsonl')).open()]
 S=[x for x in S if x['state'].get('run_id')==run]
 with (P/(run+'-brain.txt')).open('w') as out:
  for d in ds:
   if d['decider']=='codex':
    out.write(dump({k:d.get(k) for k in ['ts','floor','label','chosen','journal','rationale']})+'\n')
 with (P/(run+'-combat.txt')).open('w') as out:
  for d in ds:
   if d['label'].startswith('combat') or d['screen']=='GAME_OVER':
    chosen=d.get('answers',{}).get('plan',{}).get('choice');opts=(d.get('questions',{}).get('plan') or {}).get('criteria',{})
    out.write(dump({k:d.get(k) for k in ['ts','floor','turn','sl_attempt','sl_reloads','label','decider','expect','chosen','rationale','rollout_best_chosen']}|{'choice':chosen,'predicted':json.loads(opts[chosen]) if chosen in opts else None})+'\n')
 with (P/(run+'-states-compact.jsonl')).open('w') as out:
  for s in S:out.write(dump(compact(s))+'\n')
 print(run,'SL',collections.Counter((x.get('sl_attempt'),x.get('sl_reloads')) for x in ds if x['floor'] in [48,11]))
 print('最终牌组',[(x['card_id'],x['name'],x.get('upgraded')) for x in S[-1]['state']['run']['deck']])
 print('遗物',[(x.get('relic_id'),x.get('name'),x.get('counter')) for x in S[-1]['state']['run']['relics']])
 for floor in ([17,25,27,31,33,42,48] if run.startswith('DP') else [2,3,6,8,11]):
  ss=[s for s in S if s['state'].get('run',{}).get('floor')==floor and s['state'].get('combat') and s['state'].get('turn') and s['state']['combat'].get('hand')]
  groups=[];last=None
  for x in ss:
   t=x['state']['turn']
   if last is None or t<last:groups.append([])
   groups[-1].append(x);last=t
  print('战斗',floor,'段',len(groups))
  for i,g in enumerate(groups):
   turns=collections.OrderedDict()
   for x in g:turns.setdefault(x['state']['turn'],[]).append(x)
   print('尝试',i+1)
   for t,arr in turns.items():
    a=compact(arr[0]);b=compact(arr[-1])
    print('T',t,'首',a['hp'],a['block'],[(e['enemy_id'],e['current_hp'],e['block'],e['powers']) for e in a['enemies']],'尾',b['hp'],b['block'],[(e['enemy_id'],e['current_hp'],e['block'],e['powers'],[(it.get('total_damage'),it.get('intent_type')) for it in e['intents']]) for e in b['enemies']])
