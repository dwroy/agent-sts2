import json,collections,re
from pathlib import Path
p=Path('learner/runs/20261007-044301-postmortem')
ds=[json.loads(x) for x in (p/'decisions.jsonl').open()];ss=[json.loads(x) for x in (p/'states.jsonl').open()]
def powers(xs):return {x['power_id']:x['amount'] for x in xs or []}
def compact(x):
 s=x['state'];c=s.get('combat') or {};u=c.get('player') or {}
 return {'ts':x['ts'],'screen':s['screen'],'F':s['run']['floor'],'T':s.get('turn'),'hp':u.get('current_hp'),'block':u.get('block'),'energy':u.get('energy'),'powers':powers(u.get('powers')),'enemies':[(e['name'],e['enemy_id'],e['current_hp'],e['block'],powers(e['powers']),[(i.get('total_damage'),i.get('label')) for i in e['intents']]) for e in c.get('enemies',[])],'hand':[(z['name'],z['card_id'],z['energy_cost']) for z in c.get('hand',[])]}
if __name__=='__main__':
 for x in ds:
  if x['decider']=='codex' and x['floor']>=12:print('大脑',x['ts'],x['floor'],x['label'],x.get('chosen'),x.get('rationale'))
 print('末遗物',json.dumps(ss[-1]['state']['run']['relics'],ensure_ascii=False))
 print('末牌组',[(x['name'],x['card_id'],x['upgraded']) for x in ss[-1]['state']['run']['deck']])
 for floor in [17,25,33,35]:
  rows=[x for x in ss if x['state']['run']['floor']==floor and (x['state'].get('combat') or {}).get('enemies')]
  prev=None
  for i,x in enumerate(rows):
   s=x['state'];key=(s['screen'],s.get('turn'))
   if s['screen']=='COMBAT' and (prev is None or s['turn']!=prev['state']['turn']):print('轮初',compact(x))
   if i==len(rows)-1 or rows[i+1]['state'].get('turn')!=s.get('turn') or (rows[i+1]['state']['screen']!='COMBAT' and s['screen']=='COMBAT'):print('轮末',compact(x))
   prev=x
 print('计数',collections.Counter(x['decider'] for x in ds))
 print('自主标签',collections.Counter(x['label'] for x in ds if x['decider']=='code' and x['label'].startswith('combat/')))
 print('SL',collections.Counter((x['floor'],str(x.get('sl_attempt')),x.get('sl_reloads')) for x in ds if x['label'].startswith('combat/') and x['label']!='combat/plan-continue'))
 for x in ds:
  if any('guard' in str(k).lower() for k in x) or 'guard' in x['rationale'].lower():print('护栏',json.dumps(x,ensure_ascii=False))
