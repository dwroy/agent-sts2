import json,pathlib,re,collections,subprocess
p=pathlib.Path('learner/runs/20261008-051302-postmortem');ld=lambda n:[json.loads(s) for s in (p/(n+'.jsonl')).open()];d=ld('decisions');s=ld('states');b=ld('brain')
for line in [282138,282429,282430]:
 for r in d:
  if r['_line']==line:
   print('DETAIL',line,r['rationale']);print('JOURNAL',json.dumps(r['journal'],ensure_ascii=False));
   print('QUESTIONS',json.dumps(r.get('questions'),ensure_ascii=False)[:1200]);print('OPTIONS',json.dumps(r.get('options'),ensure_ascii=False)[:6500])
for r in d:
 if r['floor']==23 and r.get('turn') in [3,5] and r['label']=='combat/plan-choice': print('PLAN23',r['_line'],r['rationale'],json.dumps(r['journal'],ensure_ascii=False)[:1600])
combat=[r for r in d if r['decider']=='jev' and r['label'].startswith('combat/')];print('METRICS',len(combat),collections.Counter(str(r['journal'].get('rollout_best_chosen')) for r in combat));print('FOCUSASK',sum('focus' in json.dumps(r.get('options',{})) for r in combat));print('FOCUSPICK',sum('focus' in json.dumps(r.get('chosen',{})) for r in combat))
print('BRAINUSE',{k:sum(r['usage'].get(k,0) or 0 for r in b) for k in b[0]['usage']});print('DURATION',d[0]['ts'],d[-1]['ts'])
for r in s:
 if r['_line'] in [288591,288679,288704,288705,288751,288759,288760,288762,288763,288914,288915]:
  co=r['state'].get('combat') or {};print('STATEDETAIL',r['_line'],r['state']['run']['current_hp'],'PLAYER',co.get('player'),'ENEMIES',json.dumps(co.get('enemies'),ensure_ascii=False)[:3500])
print('RELICS',[(x['relic_id'],x['name']) for x in s[-1]['state']['run'].get('relics',[])]);print('CARDS',[(x.get('card_id'),x.get('upgraded')) for x in s[-1]['state']['run'].get('deck',[])])
for term,ident in [('护栏','silent-0125'),('SL','silent-0079'),('地道虫','silent-0019')]:
 r=next(x for x in json.loads((p/('ledger-'+term+'.json')).read_text()) if x['id']==ident)
 print('OLD',ident,r['first_run'],r['prior'],r['history'][-10:]);print('RECENTEVIDENCE',r['evidence'][-2:])
