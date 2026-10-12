import json,pathlib,re,collections,datetime
root=pathlib.Path('/home/dw/Projects/agent-sts2');p=root/'learner/runs/20261008-014304-postmortem'
decisions=[json.loads(l) for l in (p/'RC61MFQM63Y6-decisions.jsonl').open()]
states=[json.loads(l) for l in (p/'RC61MFQM63Y6-states.jsonl').open()]
brains=[json.loads(l) for l in (p/'RC61MFQM63Y6-brain.jsonl').open()]
report={'projections':[],'mechanics':[],'potion_events':[]}
for x in brains:
 d=x['data'];pay=d.get('payload') or {};facts=pay.get('facts') or {};rr=pay.get('route_review') or pay.get('route_map') or {};pf=rr.get('plan_facts') or {}
 if pf and facts.get('floor') in [2,24,27,28,29]:
  slim={'line':x['line'],'floor':facts.get('floor'),'arrival':pf.get('arrival'),'boss':pf.get('boss'),'if_option':pf.get('if_option')};report['projections'].append(slim);print('PROJECTION',slim)
 if d['label']=='rest/plan' and str(facts.get('floor'))=='16':
  print('F16 SIM',x['line'],d.get('options',{}).get('o1:c10'))
focus=collections.Counter();selected_focus=0;plan_questions=0;roll_selected=roll_count=0
for x in decisions:
 d=x['data'];crit=(d.get('questions',{}).get('plan') or {}).get('criteria') or {};m=re.search(r'Jev chose plan (\d+)/',d['rationale'])
 for k,v in crit.items():
  if not k.startswith('plan'):continue
  try:q=json.loads(v)
  except ValueError:continue
  if q.get('focus'):
   focus[q['focus']]+=1
   if m and k=='plan'+m[1]:selected_focus+=1
 if d['decider']=='jev' and d['label'].startswith('combat/plan-choice'):
  plan_questions+=1;bs=d.get('boss_sim') or {};best=bs.get('rollout_own_best');ties=bs.get('rollout_own_tied') or []
  if best or ties:
   roll_count+=1;roll_selected+=bool(m and ('plan'+m[1]==best or 'plan'+m[1] in ties))
report['jev']={'plan_questions':plan_questions,'code_rank1':sum(bool(re.search(r'code rank 1(?:\D|$)',x['data']['rationale'])) for x in decisions if x['data']['decider']=='jev' and x['data']['label'].startswith('combat/plan-choice')),'rollout_best_available':roll_count,'rollout_best_chosen':roll_selected,'selected_focus':selected_focus,'focus':dict(focus)}
print('JEV',report['jev'])
for line in [285049,285491,285514,285517]:
 a=next(x['data']['state'] for x in states if x['line']==line)
 print('STATE',line,'hp',a['run']['current_hp'],'max',a['run']['max_hp'],'relics',[(r['relic_id'],r['name']) for r in a['run']['relics']],'hand',[(c['card_id'],c.get('upgraded')) for c in (a.get('combat') or {}).get('hand',[])], 'player',(a.get('combat') or {}).get('player'))
for x in states:
 a=x['data']['state']
 if 285283<=x['line']<=285285 or 285336<=x['line']<=285340 or 285411<=x['line']<=285415:
  pl=(a.get('combat') or {}).get('player',{});slim={'line':x['line'],'hp':a['run']['current_hp'],'block':pl.get('block'),'powers':pl.get('powers'),'hand':[(c['card_id'],c.get('resolved_rules_text')) for c in (a.get('combat') or {}).get('hand',[])]};report['mechanics'].append(slim)
print('FIRST OBSERVED',states[0]['data']['observed_ts'])
print('BRAINS',collections.Counter(x['data'].get('engine') for x in brains),'counts',collections.Counter(x['data'].get('label') for x in brains))
print('CACHE',sum((x['data'].get('usage') or {}).get('inputTokens',x['data'].get('input_tokens',0)) for x in brains),sum((x['data'].get('usage') or {}).get('outputTokens',x['data'].get('output_tokens',0)) for x in brains),sum((x['data'].get('usage') or {}).get('cacheHitTokens',x['data'].get('cache_hit_tokens',0)) for x in brains))
audit=json.load((p/'resources-audited.json').open())
for combat in audit:
 cs=[x for x in states if combat['entry']['line']<=x['line']<=(combat['exit'] or combat['turns'][-1]['pre_end'])['line']]
 union={e['enemy_id']:e['name'] for x in cs for e in (x['data']['state'].get('combat') or {}).get('enemies',[])}
 combat['all_enemies']=union
 if combat['floor'] in [12,21]:print('UNION',combat['floor'],union)
(p/'resources-final.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
(p/'final-evidence.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
