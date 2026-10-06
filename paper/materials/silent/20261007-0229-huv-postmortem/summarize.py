import json, pathlib,collections
p=pathlib.Path(__file__).parent
D=[json.loads(l) for l in (p/'decisions.jsonl').open()]
S=[json.loads(l) for l in (p/'states.jsonl').open()]
T={s['ts']:s['state'] for s in S}
print('对齐',sum(d['ts'] in T for d in D),len(D),'states局号',collections.Counter(s['state'].get('run_id') for s in S))
with (p/'combat.txt').open('w') as w:
 for i,d in enumerate(D):
  if not d['label'].startswith(('combat/','selection/')) or not d.get('turn'): continue
  s=T.get(d['ts'],{}); c=s.get('combat')or{}; pl=c.get('player')or{}
  fp=json.loads(d['fingerprint'])
  crit=d.get('questions',{}).get('plan',{}).get('criteria',{})
  key=d.get('answers',{}).get('plan',{}).get('choice')
  try: pred=json.loads(crit[key])
  except (KeyError,TypeError): pred={}
  en=[{'id':e['enemy_id'],'hp':e['current_hp'],'block':e['block'],'powers':e.get('powers'),'move':e.get('move_id'),'intents':e['intents']} for e in c.get('enemies',[])]
  row={'i':i,'floor':d['floor'],'turn':d['turn'],'ts':d['ts'],'sl':d.get('sl_reloads'),'label':d['label'],'by':d['decider'],'hp':fp['hp'],'energy':fp['player'],'powers':pl.get('powers'),'en':en,'chosen':d.get('chosen'),'why':d['rationale'],'best':d.get('rollout_best_chosen'),'pred':pred}
  w.write(json.dumps(row,ensure_ascii=False)+'\n')
for d in D:
 if 'guard' in d['rationale'].lower() or 'override' in d['rationale'].lower() or d.get('sl_retry'):
  print(d['floor'],d['turn'],d['label'],d['rationale'],str(d.get('sl_retry'))[:1600])
