import json,collections,re,datetime
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-221302-postmortem')
def read(name): return [json.loads(x) for x in (p/f'{name}.jsonl').open()]
s=read('states'); d=read('decisions'); plans=read('run-plans'); b=read('brain'); sl=read('sl-attempts'); resources=json.loads((p/'R3AJCGQGGMR4-resources.json').read_text())
with (p/'audit.txt').open('w') as out:
 def say(*args): print(*args,file=out)
 say('遗物',[(x.get('name'),x.get('relic_id'),x.get('counter')) for x in s[-1]['state']['run']['relics']])
 for row in plans: say('plan',row['_line'],row['floor'],row['trigger'],row['plan'])
 for row in d:
  if row['decider']=='codex': say('brain决定',row['_line'],row['floor'],row['label'],row.get('chosen'),row['rationale'])
 for row in sl: say('SL',row['_line'],row['floor'],row['attempt'],row['result'],row.get('turns'),row.get('end_hp'),row.get('judge'),row.get('explore'))
 for c in resources['combats']:
  frames=[x for x in s if c['entry']['line']<=x['_line']<=(c['exit'] or c['last'])['line']]
  turns=[]
  for row in frames:
   st=row['state']; cp=st.get('combat') or {}; pl=cp.get('player') or {}; es=cp.get('enemies',[])
   if st.get('in_combat') and es:
    t=st.get('turn')
    if not turns or turns[-1]['turn']!=t: turns.append({'turn':t,'entry':row,'last':row})
    else: turns[-1]['last']=row
  say('战斗概要',c['sequence'],c['floor'],c['enemies'])
  for i,t in enumerate(turns):
   a=t['entry']; z=turns[i+1]['entry'] if i+1<len(turns) else c['exit'] and next((x for x in frames if x['_line']==c['exit']['line']),None)
   ac=a['state']['combat']; last=t['last']['state']['combat']; ap=ac['player']; lp=last['player']
   def es(cp): return [(e['enemy_id'],e['current_hp'],e['max_hp'],e['block'],e['is_alive']) for e in cp['enemies']]
   say('T',t['turn'],'s',a['_line'],t['last']['_line'],'HP',ap['current_hp'],z['state']['run']['current_hp'] if z else None,'挡',lp['block'],'敌前',es(ac),'敌后',es(z['state']['combat']) if z and z['state'].get('combat') and z['state']['combat'].get('enemies') else [],'末意图',[(e['enemy_id'],e.get('move_id'),[(i.get('damage'),i.get('hits')) for i in e.get('intents',[])],[(x['power_id'],x['amount']) for x in e['powers']]) for e in last['enemies']])
  for row in frames:
   if c['floor'] in [43,45]:
    cp=row['state'].get('combat') or {}; pl=cp.get('player') or {}
    say('完整重点s',row['_line'],'T',row['state'].get('turn'),'HP',pl.get('current_hp'),'B',pl.get('block'),'N',pl.get('energy'),'手',[(x['card_id'],x.get('energy_cost'),x.get('resolved_rules_text')) for x in cp.get('hand',[])],'P',[(x['power_id'],x['amount']) for x in pl.get('powers',[])])
 for ev in resources['resource_changes']:
  a,z=ev['from'],ev['to']
  if a['potions']!=z['potions'] or ev['combat_sequence'] is None: say('资源变化',ev)
 for row in d:
  if re.search('guard|override|replac|护栏',row['rationale'],re.I): say('覆盖',row['_line'],row['floor'],row['turn'],row['rationale'],row.get('journal'))
 say('统计',collections.Counter(x['decider'] for x in d),'低信心',sum(x['decider']=='jev' and (x.get('confidence') or 0)<.35 for x in d))
 for row in d:
  if row['decider']=='jev' and 'combat/plan-choice' in row['label']:
   say('JEV指标',row['_line'],row['floor'],row['turn'],row['journal'])
(p/'turn-audit.json').write_text(json.dumps({'combats':resources['combats']},ensure_ascii=False,indent=2)+'\n')
print('已保存 audit.txt')
