import json,pathlib,collections
p=pathlib.Path('learner/runs/20261009-204303-postmortem');r='54G5683J0E5S'
ds=[json.loads(l) for l in (p/f'{r}-decisions.jsonl').open()];ss=[json.loads(l) for l in (p/f'{r}-states.jsonl').open()];a=json.load((p/f'{r}-resources.json').open())
with (p/'decisions-compact.txt').open('w') as f:
 for i,d in enumerate(ds,1):
  f.write(f"d{i} 原行{d['_line']} {d['ts']} F{d['floor']}T{d['turn']} {d['decider']} {d['label']} {json.dumps(d['chosen'],ensure_ascii=False)} {d['rationale']}\n")
  for k in d:
   if k not in ['questions','fingerprint','rationale','journal','chosen','expect','deepseek'] and (k.startswith(('hp_','rollout','combat','plan','boss','route','kill')) or 'guard' in k): f.write(k+' '+json.dumps(d[k],ensure_ascii=False)+'\n')
with (p/'states-compact.txt').open('w') as f:
 for x in ss:
  s=x['state'];c=s.get('combat') or {};v=c.get('player') or {};run=s.get('run') or {}
  f.write(f"s{x['_line']} {x['ts']} F{run.get('floor')}T{s.get('turn')} {s.get('screen')} HP{run.get('current_hp')}/{run.get('max_hp')} B{v.get('block')} E{v.get('energy')} P{[(i['power_id'],i.get('amount')) for i in v.get('powers',[])]} 药{[(i['index'],i['potion_id']) for i in run.get('potions',[]) if i.get('occupied')]}\n")
  if c:
   f.write(' 敌'+str([(e['index'],e['enemy_id'],e.get('name'),e['current_hp'],e['max_hp'],e.get('block'),e.get('move_id'),[(i['power_id'],i.get('amount')) for i in e.get('powers',[])],[(i.get('damage'),i.get('hits'),i.get('intent_type')) for i in e.get('intents',[])]) for e in c.get('enemies',[])])+'\n')
   f.write(' 手牌'+str([(i['index'],i['card_id'],i.get('name'),i.get('energy_cost')) for i in c.get('hand',[])])+'\n')
print('combat sample keys',[(i+1,list(d)) for i,d in enumerate(ds) if d['label']=='combat/plan-choice'][-1]);print('hpchanges')
for ch in a['resource_changes']:
 if ch['combat_sequence'] is None:print(ch)
print('turn audit final')
for c in a['combats']:
 if c['floor']>=42:
  for t in c['enemy_hp_audit']['turns']:print(c['floor'],t)
print('last deck/relics',[(i.get('name'),i.get('card_id'),i.get('upgraded')) for i in ss[-1]['state']['run']['deck']],[(i.get('name'),i.get('relic_id'),i.get('counter')) for i in ss[-1]['state']['run']['relics']])
