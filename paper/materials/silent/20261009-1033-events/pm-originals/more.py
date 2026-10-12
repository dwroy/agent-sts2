exec(open(__file__.replace('more.py','inspect.py')).read().split("mode=sys.argv[1]")[0])
if sys.argv[1]=='brain':
 for d in D:
  if d['_source']['line'] not in [310059,310277,310449,310457,310466,310508,310681,310717,310627,310512]:continue
  print(d['_source']['line'],{k:v for k,v in d.items() if any(s in k for s in ['route','clock'])})
  b=d.get('boss_sim') or {};ch=(d.get('deepseek') or {}).get('choice')
  print('chosen',ch,'base',{k:b.get(k) for k in ['boss','entry_hp','samples','requested','timed_out','base','error']},'option',(b.get('options') or {}).get(ch))
  for label,q in d.get('questions',{}).items():
   for key,value in q.get('criteria',{}).items():
    if key==ch:
     v=json.loads(value);print('selected crit',v)
if sys.argv[1]=='best':
 plan=[d for d in D if d['decider']=='jev' and 'plan-choice' in d['label']]
 print('ratio',158/166*100,159/166*100,114/169*100)
 print('F45 plans',len([d for d in plan if d['floor']==45]),collections.Counter(str(d.get('rollout_best_chosen')) for d in plan if d['floor']==45))
 print('F33 code labels',collections.Counter(d['label'] for d in D if d['decider']=='code' and d['floor']==33))
 for d in D:
  if d['label']=='combat/end_turn':print(d['_source']['line'],d['floor'],d['turn'],d.get('sl_attempt'),d['rationale'])
 print('JeV bylabels',collections.Counter(d['label'] for d in D if d['decider']=='jev'))
 print('lowbylabel',collections.Counter(d['label'] for d in D if d['decider']=='jev' and isinstance(d.get('confidence'),(float,int)) and d['confidence']<.35))
