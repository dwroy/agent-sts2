exec(open(__file__.replace('detail.py','inspect.py')).read().split("mode=sys.argv[1]")[0])
mode=sys.argv[1]
if mode=='statekeys':
 s=next(x['state'] for x in S if x['state']['run']['floor']==45 and (x['state'].get('combat') or {}).get('hand'))
 print('combat',s['combat'].keys()); print('player',s['combat'].get('player'));print('enemy',s['combat']['enemies']);print('hand',s['combat']['hand']); print('relics',s['run'].get('relics'))
elif mode=='state':
 floors=set(map(int,sys.argv[2:]))
 for x in S:
  s=x['state'];r=s['run'];c=s.get('combat') or {}
  if r['floor'] not in floors:continue
  print('s',x['_source']['line'],x['ts'][11:],s.get('turn'),s['screen'],'HP',r['current_hp'],r['max_hp'],'P',[(z['index'],z.get('potion_id')) for z in r.get('potions',[]) if z.get('occupied')], 'player',c.get('player'), 'powers',c.get('player_powers'),'enemies',[(z.get('enemy_id'),z.get('current_hp'),z.get('block'),z.get('powers'),z.get('intents')) for z in c.get('enemies',[])],'hand',[(z.get('index'),z.get('card_id'),z.get('energy_cost')) for z in c.get('hand',[])])
elif mode=='dec':
 floors=set(map(int,sys.argv[2:]))
 for d in D:
  if d.get('floor') in floors:
   print('d',d['_source']['line'],d.get('turn'),d.get('label'),d.get('decider'),d.get('chosen'),d.get('rationale'),'journal',d.get('journal'),'jev',d.get('jev'))
   if 'plan-choice' in d['label']:
    print('q',json.dumps(d.get('questions'),ensure_ascii=False))
elif mode=='brain':
 for d in D:
  if d.get('decider')=='codex':print('d',d['_source']['line'],'F',d['floor'],d['label'],d.get('chosen'),d.get('rationale'))
elif mode=='plan':
 for line in (p/'run-plans.jsonl').open():
  d=json.loads(line); print(d['_source']['line'],json.dumps({k:v for k,v in d.items() if k not in ['_source','previous']},ensure_ascii=False))
elif mode=='potion':
 for d in D:
  if d.get('chosen',{}).get('action') in ['use_potion','discard_potion']: print(d['_source']['line'],d['floor'],d['turn'],d.get('chosen'),d.get('rationale'))
elif mode=='sl':
 for line in (p/'sl-attempts.jsonl').open():
  d=json.loads(line); print('keys',d.keys());print(json.dumps({k:v for k,v in d.items() if k in ['floor','attempt','result','reason','death','started_at','ended_at','checkpoint','judge','hp']},ensure_ascii=False))
