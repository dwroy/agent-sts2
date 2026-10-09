import json,pathlib,collections,re,sys
p=pathlib.Path(__file__).parent
D=[json.loads(l) for l in (p/'decisions.jsonl').open()]
S=[json.loads(l) for l in (p/'states.jsonl').open()]
R=json.load((p/'9663Y88TYK73-resources.json').open())
mode=sys.argv[1]
if mode=='resources':
 for c in R['combats']:
  print('战斗',c['sequence'],c['floor'],c['enemies'],'进',c['entry'],'离',c['exit'],'末',c['last'],'净损',c['observed_net_hp_loss'],'结尾',c['end'])
  print('回合',[(t['turn'],t['live_enemy_hp_start'],t['visible_enemy_hp_loss_lower_bound'],t['gaps']) for t in c['enemy_hp_audit']['turns']])
 print('非战斗资源')
 for e in R['resource_changes']:
  if e['combat_sequence'] is None:print(e)
elif mode=='brain':
 for r in D:
  if r['decider']=='codex':print(r['_line'],'F',r['floor'],r['label'],r['chosen'],r['rationale'])
 print('计划')
 for l in (p/'plans.jsonl').open():
  r=json.loads(l);print(json.dumps(r,ensure_ascii=False))
elif mode=='late':
 for r in S:
  s=r['state'];run=s['run'];c=s.get('combat') or {}
  if run['floor']>=43:
   print(r['_line'],r['ts'],'F',run['floor'],'T',s.get('turn'),s['screen'],'HP',run['current_hp'],'B',c.get('player'),'敌',[(e.get('name'),e.get('enemy_id'),e.get('current_hp'),e.get('block'),e.get('intents'),e.get('powers')) for e in c.get('enemies',[])],'手',[(x.get('name'),x.get('card_id'),x.get('energy_cost')) for x in c.get('hand',[])])
elif mode=='stats':
 print('deciders',collections.Counter(r['decider'] for r in D))
 low=[r for r in D if r['decider']=='jev' and isinstance(r.get('confidence'),(int,float)) and r['confidence']<.35];print('low',len(low))
 plans=[r for r in D if r['decider']=='jev' and r['label'].startswith('combat/plan')];print('plans',len(plans),'ranks',collections.Counter(re.search(r'code rank ([^ ;]+)',r['rationale']).group(1) if re.search(r'code rank ([^ ;]+)',r['rationale']) else '?' for r in plans))
 code=[r for r in D if r['decider']=='code' and r['label'].startswith('combat/')];print('code combat',len(code),collections.Counter(r['label'] for r in code),'distinct',len(set((r['floor'],r.get('sl_attempt'),r['turn']) for r in code)))
 for r in D:
  if re.search(r'guard|护栏|focus|clock|project',r['rationale'],re.I):print('特殊',r['_line'],r['floor'],r['turn'],r['rationale'])
 print('饮药')
 for r in D:
  if r['chosen'].get('action') in ['use_potion','discard_potion']:print(r['_line'],r['floor'],r['turn'],r.get('sl_attempt'),r['chosen'],r['rationale'])
elif mode=='deathdec':
 for r in D:
  if r['floor']==46:print(r['_line'],'T',r['turn'],'尝试',r['sl_attempt'],r['label'],r['chosen'],r['rationale'])
