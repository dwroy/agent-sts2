import json,pathlib,collections
P=pathlib.Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-084303-postmortem'); S=json.loads((P/'states.json').read_text()); D=json.loads((P/'decisions.json').read_text()); L=json.loads((P/'sl.json').read_text()); R=json.loads((P/'ZTRGYYMLR8SC-resources.json').read_text())
def pow(x):return {p['power_id']:p['amount'] for p in x.get('powers',[])}
for c in R['combats']:
 rows=[r for r in S if c['entry']['line']<=r['_line']<=(c['last']['line'])]
 by=collections.defaultdict(list)
 for r in rows:by[r['state']['turn']].append(r)
 print('战斗',c['sequence'],'F',c['floor'])
 for t,rs in by.items():
  a=next((r for r in rs if (r['state'].get('combat') or {}).get('action_readiness',{}).get('can_use_combat_actions')),rs[0]);z=rs[-1]; st=a['state']; en=(st.get('combat') or {}).get('enemies',[])
  first=(a['state'].get('combat') or {}).get('player') or {}; last=(z['state'].get('combat') or {}).get('player') or {}
  print('T',t,'行',a['_line'],z['_line'],'HP',first.get('current_hp'),'→',last.get('current_hp'),'挡',last.get('block'),'玩家增益',pow(first),'→',pow(last),'敌',[(e.get('index'),e['enemy_id'],e['current_hp'],e.get('block'),e.get('move_id'),e.get('intent'),pow(e)) for e in en],'末敌',[(e.get('index'),e['enemy_id'],e['current_hp'],pow(e)) for e in (z['state'].get('combat') or {}).get('enemies',[])])
print('问题结构')
for n in [285163,285357,285301,285405,285745,285360,285427,285621]:
 d=next(x for x in D if x['_line']==n)
 print('决策',n,'boss_sim',d.get('boss_sim'),'sl',d.get('sl_attempt'),d.get('sl_reloads'))
 for k,q in (d.get('questions') or {}).items():
  print('问题',k,'keys',list(q),'criteria',json.dumps(q.get('criteria'),ensure_ascii=False)[:11000])
  f=q.get('facts') or {};print('facts keys',list(f))
  for key in ['act_boss_clock','route_forecasts','routes','act_boss_sim','turn_plans','plan_simulation','focus','combat_plan','combat']:
   if key in f:print(key,json.dumps(f[key],ensure_ascii=False)[:15000])
print('名称')
for s in S:
 for e in (s['state'].get('combat') or {}).get('enemies',[]):
  pass
seen={}
for s in S:
 st=s['state']; r=st.get('run') or {}
 for x in r.get('relics',[]):seen[x.get('relic_id')]=x.get('name')
 for x in r.get('potions',[]):
  if x.get('occupied'):seen[x.get('potion_id')]=x.get('name')
print(seen)
