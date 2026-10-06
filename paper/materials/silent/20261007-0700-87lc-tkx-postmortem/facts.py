import json,pathlib,collections,datetime
p=pathlib.Path('learner/runs/20261007-064303-postmortem')
for run,fs in [('87LCSDR5P3DL',[6,8,9]),('TKXQ6L4N9A6U',[8,17,19,21,22])]:
 ds=[json.loads(l) for l in (p/(run+'.decisions.jsonl')).open()]
 ss=[json.loads(l) for l in (p/(run+'.states.jsonl')).open()]
 print('\n局',run)
 for floor in fs:
  rows=[r for r in ss if r['state'].get('run',{}).get('floor')==floor]
  ready=[r for r in rows if r['state'].get('in_combat') and r['state'].get('combat',{}).get('action_readiness',{}).get('can_use_combat_actions')]
  turns=collections.OrderedDict()
  for r in ready:turns.setdefault(r['state']['turn'],[]).append(r)
  firsts=[v[0]['state'] for v in turns.values()];end=rows[-1]['state']
  print('层',floor,'轮初需',[sum(e['current_hp'] for e in s['combat']['enemies']) for s in firsts], '轮初血',[s['combat']['player']['current_hp'] for s in firsts], '战后血',end['run']['current_hp'],'末敌',[(e['current_hp'],e['max_hp']) for e in (end.get('combat') or {}).get('enemies',[])])
  if floor in [8,9,22]:
   for t,rs in turns.items():
    if floor==8 and run=='TKXQ6L4N9A6U':continue
    a,b=rs[0]['state'],rs[-1]['state'];print('轮',t,'初末毒',[[[x['amount'] for x in e['powers'] if x['power_id']=='POISON_POWER'] for e in s['combat']['enemies']] for s in [a,b]],'末来袭',[(e['current_hp'],[i['total_damage'] for i in e['intents']]) for e in b['combat']['enemies']])
 for line in (p/(run+'.brain.jsonl')).open():
  b=json.loads(line)
  if b['label']=='rest/plan':
   key=b['answer']['choice'];o=json.loads(b['options'][key]);print('营火题',b['ts'],key,'参考',o.get('boss_sim_hp_reference'),'模拟',o.get('boss_sim'));f=b.get('payload',{}).get('facts',{});print('facts键',list(f));print('boss_sim',str(f.get('act_boss_sim'))[:1300])
 js=[json.loads(l) for l in (p/(run+'.jev-prompts.jsonl')).open()]
 for j in js:
  if (run=='87LCSDR5P3DL' and j['floor'] in [8,9] and j['turn'] in [1,3] or run=='TKXQ6L4N9A6U' and j['floor']==22 and j['turn'] in [1,3]) and j['label'].startswith('combat/plan-choice'):
   choice=j['answers']['plan']['choice'];opts=j['request']['questions']['plan']['criteria'];o=json.loads(opts[choice]);print('题面原选',j['ts'],j['floor'],j['turn'],choice,{k:o.get(k) for k in ['plays','hp_lost','damage_dealt','focus','rollout_kill_order']})
 jev=[d for d in ds if d['decider']=='jev'];fight=[d for d in jev if d['label'].startswith('combat/plan-choice')]
 print('末战选线',collections.Counter(d.get('rollout_best_chosen') for d in fight if d['floor']==fs[-1]),'低信心分工',collections.Counter('战斗' if d['label'].startswith('combat/') else '选择' for d in jev if d.get('confidence',1)<.35),'token',sum(d['usage']['input_tokens'] for d in jev),sum(d['usage']['output_tokens'] for d in jev))
 print('终局牌',[ (x['name'],x['card_id']) for x in ss[-1]['state']['run']['deck']][13:]);print('终局遗物',[(x['name'],x['relic_id']) for x in ss[-1]['state']['run']['relics']])
