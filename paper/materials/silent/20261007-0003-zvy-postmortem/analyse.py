import json,collections
from pathlib import Path
P=Path(__file__).parent
D=[json.loads(l) for l in (P/'decisions.jsonl').open()]
S=[json.loads(l) for l in (P/'states.jsonl').open()]
def powers(p):return [(x.get('power_id',x.get('id')),x.get('amount',x.get('stack'))) for x in p]
def snap(x):
 s=x['state'];c=s.get('combat') or {};p=c.get('player') or {};r=s.get('run') or {}
 return {'ts':x['ts'],'screen':x['screen'],'f':r.get('floor'),'t':s.get('turn'),'hp':p.get('current_hp',r.get('current_hp')),'max':r.get('max_hp'),'block':p.get('block'),'energy':p.get('energy'),'powers':powers(p.get('powers',[])),'e':[(e['index'],e['enemy_id'],e['current_hp'],e['max_hp'],e['block'],powers(e['powers']),[(i.get('total_damage'),i.get('hits'),i.get('intent_type')) for i in e['intents']]) for e in c.get('enemies',[])],'ready':c.get('action_readiness',{}).get('can_use_combat_actions')}
E=[];ep=None
for x in S:
 z=snap(x)
 if x['screen']!='COMBAT':continue
 if ep is None or z['f']!=ep['floor'] or (z['t'] is not None and z['t']<ep['lastt']):
  ep={'floor':z['f'],'lastt':z['t'] or 0,'states':[]};E.append(ep)
 ep['states'].append(x);ep['lastt']=z['t'] or ep['lastt']
with (P/'episodes.txt').open('w') as o:
 for i,ep in enumerate(E):
  print('战斗',i+1,'层',ep['floor'],file=o)
  by=collections.defaultdict(list)
  for x in ep['states']:by[x['state']['turn']].append(x)
  for t,ss in by.items():
   ready=[x for x in ss if snap(x)['ready']]
   print('T',t,'首',json.dumps(snap((ready or ss)[0]),ensure_ascii=False),'末',json.dumps(snap((ready or ss)[-1]),ensure_ascii=False),file=o)
json.dump(E,(P/'episodes.json').open('w'),ensure_ascii=False)
with (P/'strategy.txt').open('w') as o:
 for x in D:
  if x['decider']=='codex': print(x['ts'],'F',x['floor'],x['label'],json.dumps(x.get('chosen'),ensure_ascii=False),json.dumps(x.get('journal'),ensure_ascii=False),'模拟',json.dumps(x.get('boss_sim'),ensure_ascii=False),file=o)
with (P/'plans-summary.txt').open('w') as o:
 for l in (P/'plans.jsonl').open():print(json.dumps(json.loads(l),ensure_ascii=False),file=o)
print('战斗',[(e['floor'],e['lastt'],snap(e['states'][0])['hp'],snap(e['states'][-1])['hp']) for e in E])
print('全局Jev',len([x for x in D if x['decider']=='jev']),'低',sum(x['decider']=='jev' and isinstance(x.get('confidence'),(int,float)) and x['confidence']<.35 for x in D))
print('最优字段',collections.Counter(x['rollout_best_chosen'] for x in D if 'rollout_best_chosen' in x))
for f in [8,17,22,33,39,44,48,49]:
 dd=[x for x in D if x['floor']==f];print('层',f,'Jev',sum(x['decider']=='jev' for x in dd),'低',sum(x['decider']=='jev' and isinstance(x.get('confidence'),(int,float)) and x['confidence']<.35 for x in dd),'最优',collections.Counter(x['rollout_best_chosen'] for x in dd if 'rollout_best_chosen' in x),'SL',collections.Counter(x.get('sl_attempt') for x in dd),'reload',sorted(set(x.get('sl_reloads',0) for x in dd)))
print('末牌',[(c['card_id'],c['name'],c['upgraded']) for c in S[-1]['state']['run']['deck']])
print('末遗物',[(c['relic_id'],c['name']) for c in S[-1]['state']['run']['relics']])
print('护栏',[(x['floor'],x['turn'],x.get('hp_guard'),x['rationale']) for x in D if any('guard' in k.lower() for k in x) or 'guard' in x['rationale'].lower()])
print('episode lines',sum(1 for _ in (P/'episodes.txt').open()))
