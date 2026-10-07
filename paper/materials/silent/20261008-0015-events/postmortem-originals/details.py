exec(open('/home/dw/Projects/agent-sts2/learner/runs/20261007-234302-postmortem/inspect.py').read().split("print('DECISION KEYS'")[0])
print('PLAN KEYS')
for z in (p/'run-plans.jsonl').open():
 x=json.loads(z); print(x.keys()); print(json.dumps({k:v for k,v in x.items() if k not in ['context','prompt','questions']},ensure_ascii=False)[:9000])
print('KEY DECISIONS')
for x in d:
 if (x['floor']==33 or x['floor'] in [17,30]) and x['label']!='combat/plan-continue':
  selected={}
  a=x.get('answers',{}).get('plan',{}).get('choice')
  if a:
   raw=x.get('questions',{}).get('plan',{}).get('criteria',{}).get(a)
   try: selected=json.loads(raw or '{}')
   except: selected={'raw':raw}
  print(x['_line'],x['floor'],x['turn'],x.get('sl_attempt'),x['decider'],x['label'],x['chosen'],x['rationale'],x.get('rollout_best_chosen'),'sel',json.dumps(selected,ensure_ascii=False)[:1700])
print('STATS')
j=[x for x in d if x['decider']=='jev']; pick=[x for x in j if x['label'].startswith('combat/plan-choice')]; rb=[x for x in pick if isinstance(x.get('rollout_best_chosen'),bool)]
print('JEV',len(j),'low',[(x['_line'],x['floor'],x['turn'],x['label'],x['confidence']) for x in j if x['confidence']<.35],'choices',len(pick),'best_bool',len(rb),'true',sum(x['rollout_best_chosen'] for x in rb))
print('focus',sum('focus:' in str(x.get('questions')) for x in pick),[(x['_line'],x.get('journal')) for x in pick if 'focus:' in str(x.get('journal'))])
print('CONTINUE',collections.Counter('jev' if 'Jev-chosen' in x['rationale'] else 'code' for x in d if x['label']=='combat/plan-continue'))
codes=[x for x in d if x['decider']=='code' and x['label'].startswith('combat/') and x['label']!='combat/plan-continue']; other=[x for x in codes if x['chosen'].get('action')!='end_turn']
print('CODE',len(codes),'rounds',len({(x['floor'],x.get('sl_attempt'),x['turn']) for x in codes}),'nonend',len(other),'rounds',len({(x['floor'],x.get('sl_attempt'),x['turn']) for x in other}))
print('USAGE', {who:{k:sum((x.get('usage') or {}).get(k,0) or 0 for x in d if x['decider']==who) for k in ['input_tokens','output_tokens','cached_input_tokens','cache_hit_tokens']} for who in ['jev','codex']})
print('CODELABELS',collections.Counter((x['label'],x['chosen'].get('action')) for x in codes))
