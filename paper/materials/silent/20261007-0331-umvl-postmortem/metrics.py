exec(open('learner/runs/20261007-031302-postmortem/analyze.py').read().split('groups=')[0])
from datetime import datetime
print('DURATION',(datetime.fromisoformat(d[-1]['ts'].replace('Z','+00:00'))-datetime.fromisoformat(d[0]['ts'].replace('Z','+00:00'))).total_seconds())
brain=[json.loads(x) for x in (p/'brain.jsonl').open()]
print('BRAIN ENGINES',collections.Counter(x['engine'] for x in brain))
print('TOKENS',collections.Counter({k:sum(x.get('usage',{}).get(k,0) or 0 for x in d if x['decider']=='jev') for k in ['input_tokens','output_tokens','cache_hit_tokens']}))
print('BRAIN TOKENS',[(k,sum(x.get('usage',{}).get(k,0) or 0 for x in brain)) for k in ['input_tokens','output_tokens','cache_hit_tokens']])
combat=[x for x in d if x['label'].startswith('combat/')]
def key(x):return (x['floor'],x.get('sl_reloads',0) or 0,x['turn'])
allturns={key(x) for x in combat};jevturns={key(x) for x in combat if x['decider']=='jev'}
code=[x for x in combat if x['decider']=='code' and x['label']!='combat/plan-continue'];codeplay=[x for x in code if x['chosen']['action']!='end_turn']
print('ROUNDS',len(allturns),'pure code',len(allturns-jevturns),'code unique',len({key(x) for x in code}),len(code),'code nonend',len(codeplay),len({key(x) for x in codeplay}))
print('CONTINUE',collections.Counter('Jev' if 'Jev-chosen' in x['rationale'] else 'code' for x in combat if x['label']=='combat/plan-continue'))
print('F48 METRICS',collections.Counter(x.get('rollout_best_chosen') for x in combat if x['decider']=='jev' and x['floor']==48),len([x for x in d if x['decider']=='jev' and x['floor']==48 and x['confidence']<.35]))
for x in d:
 if x['decider']=='codex' and x['label']=='rest/plan':
  a=before(x);i=bisect.bisect_right(st,x['observed_ts']); b=s[i]['state'];
  print('REST',x['floor'],a['run']['current_hp'],a['run']['max_hp'],'next',b['run']['current_hp'],b['run']['max_hp'],x['chosen'],x.get('boss_sim'))
  if x['floor'] in [16,28,32,42,44,47]:
   print('OPTIONS',json.dumps(x['questions'],ensure_ascii=False)[:10000])
with (p/'brain-facts.txt').open('w') as out:
 for x in brain:
  out.write(f'{x["ts"]} {x["label"]}\n')
  out.write(json.dumps(x.get('question'),ensure_ascii=False)+'\n')
  out.write(json.dumps(x.get('memory'),ensure_ascii=False)+'\n')
  out.write(json.dumps(x.get('payload'),ensure_ascii=False)+'\n')
