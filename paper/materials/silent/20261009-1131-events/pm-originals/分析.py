import json,pathlib,collections,re,datetime
p=pathlib.Path(__file__).parent;r='XZUJR08FW801'
d=[json.loads(x) for x in (p/f'{r}-decisions.jsonl').open()]
s=[json.loads(x) for x in (p/f'{r}-states.jsonl').open()]
res=json.load((p/f'{r}-resources.json').open())
with (p/'关键帧.txt').open('w') as out:
 for floor in [14,17,25,27,29]:
  print('关键战',floor,file=out);last=None
  for x in s:
   a=x['state'];c=a.get('combat')
   if a['run']['floor']!=floor or not c: continue
   pl=c.get('player',{});es=c.get('enemies',[])
   enemies=[(e['name'],e['enemy_id'],e['current_hp'],e.get('block'),[(w['power_id'],w['amount']) for w in e['powers']],[(i.get('total_damage'),i.get('intent_type')) for i in e['intents']]) for e in es]
   sig=(a.get('turn'),a['run']['current_hp'],pl.get('block'),enemies)
   if sig==last: continue
   print(x['_line'],x['ts'],a['screen'],sig,'玩家增益',[(w['power_id'],w['amount']) for w in pl.get('powers',[])], '已出',pl.get('cards_played_this_turn'),file=out)
   last=sig
with (p/'方案.txt').open('w') as out:
 for x in d:
  if x['floor'] not in [24,25,27,28,29] or not x.get('questions'):continue
  print('决策',x['_line'],x['floor'],x['turn'],x['label'],x['rationale'],file=out)
  for key,q in x['questions'].items():
   print('题字段',key,list(q),file=out)
   options=q.get('options') or (q.get('query') or {}).get('options') or (q.get('input') or {}).get('options') or {}
   for k,v in options.items():
    try:a=json.loads(v)
    except (ValueError,TypeError):print(k,str(v)[:400],file=out);continue
    print(k,{k:a.get(k) for k in ['plays','hp_lost','dmg','hp_after','enemies_after','enemy_threat_next','rollout_best','rollout','rollout_turns','potions_used','block_wasted']},file=out)
print('已保存关键帧和方案')
x=next(x for x in d if x['_line']==311199);print('题字段',json.dumps(x['questions'],ensure_ascii=False)[:900])
for line in (p/f'{r}-run-plans.jsonl').open():
 x=json.loads(line);print('计划',x['_line'],json.dumps(x,ensure_ascii=False)[:1300])
print('资源变化')
for x in res['resource_changes']:
 a=x['from'];b=x['to'];print(a['line'],b['line'],b['ts'],b['floor'],b['turn'],f"{a['hp']}/{a['max_hp']}->{b['hp']}/{b['max_hp']}",a['potions'],'->',b['potions'],'SL',x['restart_boundary'])
