exec(open('/home/dw/Projects/agent-sts2/learner/runs/20261007-234302-postmortem/inspect.py').read().split("print('DECISION KEYS'")[0])
for x in d:
 if x['floor']==33 and x['label'] not in ['combat/plan-continue','selection/choose']:
  a=x.get('answers',{}).get('plan',{}).get('choice'); raw=x.get('questions',{}).get('plan',{}).get('criteria',{}).get(a,'{}'); sel=json.loads(raw)
  print(x['_line'],'a',x.get('sl_attempt'),'T',x['turn'],x['label'],x['rationale'],'sel',{k:sel.get(k) for k in ['hp_lost','damage_dealt','block_gained','focus']},'best',x.get('rollout_best_chosen'))
print('FOCUS')
focus_questions=focus_options=focus_selected=0
for x in d:
 criteria=x.get('questions',{}).get('plan',{}).get('criteria',{});opts={k:json.loads(v) for k,v in criteria.items()}
 f={k:v for k,v in opts.items() if v.get('focus')}; a=x.get('answers',{}).get('plan',{}).get('choice')
 if f: focus_questions+=1;focus_options+=len(f)
 if a in f: focus_selected+=1;print(x['_line'],x['floor'],x['turn'],x.get('sl_attempt'),f[a]['focus'])
print('focus counts',focus_questions,focus_options,focus_selected)
print('GUARD KEYS',[k for k in set().union(*(x.keys() for x in d)) if any(z in k for z in ['guard','override'])])
print('OTHER INTERVENTION',[(x['_line'],x['rationale']) for x in d if any(t in x['rationale'].lower() for t in ['sl ','sl:','guard','overrid','safety'])])
print('REST QUESTIONS')
for x in d:
 if x['label'] in ['map/route-plan','rest/plan'] or x['_line']==276958:
  print(x['_line'],'F',x['floor'],json.dumps(x.get('questions'),ensure_ascii=False)[:35000])
print('RELICS',[(a['name'],a['relic_id'],a.get('rules_text'),a.get('resolved_rules_text')) for a in s[-1]['state']['run'].get('relics',[])])
print('USAGE SAMPLE',next(x['usage'] for x in d if x['decider']=='codex'))
print('FINAL ENEMIES',s[-1]['state'].get('combat'))
