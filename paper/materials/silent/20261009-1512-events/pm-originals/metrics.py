import json,pathlib,collections,datetime,re
p=pathlib.Path(__file__).parent;root=p.parents[2];load=lambda n:[json.loads(l) for l in (p/f'{n}.jsonl').open()]
d=load('decisions');s=load('states');bs=load('brain');rc=json.load((p/'833ZM0MJGWHC-resources.json').open())
jev=[r for r in d if r['decider']=='jev']; scored=[r for r in jev if isinstance(r.get('rollout_best_chosen'),bool)]; nonend=[r for r in scored if (r.get('answers',{}).get('plan',{}).get('choice') or '')!='end_turn']
code=[r for r in d if r['decider']=='code'];jcontinue=[r for r in code if 'continuing the Jev-chosen plan' in r['rationale']];initiators=[r for r in code if r['label'].startswith('combat/') and r['label']!='combat/plan-continue'];
combat_turns=set();jev_turns=set();own_turns=set()
for r in d:
 if r['label'].startswith(('combat/','selection/')) and r.get('turn') is not None:
  key=(r['floor'],r.get('sl_attempt'),r['turn']);combat_turns.add(key)
  if r['decider']=='jev':jev_turns.add(key)
for r in initiators:own_turns.add((r['floor'],r.get('sl_attempt'),r['turn']))
metrics={'deciders_raw':dict(collections.Counter(r['decider'] for r in d)), 'jev_continues':len(jcontinue),'jev':len(jev),'low_confidence':[{'line':r['_line'],'floor':r['floor'],'turn':r['turn'],'attempt':r.get('sl_attempt'),'label':r['label'],'confidence':r['confidence']} for r in jev if r.get('confidence') is not None and r['confidence']<.35],'rollout_best':[sum(r['rollout_best_chosen'] for r in scored),len(scored)],'nonend_best':[sum(r['rollout_best_chosen'] for r in nonend),len(nonend)],'code_initiator_labels':dict(collections.Counter(r['label'] for r in initiators)),'code_initiators':len(initiators),'code_initiator_turns':len(own_turns),'total_combat_turns':len(combat_turns),'no_jev_turns':len(combat_turns-jev_turns),'guard_lines':[r['_line'] for r in d if 'HP guard:' in r['rationale']],'fallback':sum(bool(r.get('fallback')) for r in d),'usage_jev':{k:sum(r.get('usage',{}).get(k,0) or 0 for r in jev) for k in ('input_tokens','output_tokens')},'usage_brain':{k:sum(r.get('usage',{}).get(k,0) or 0 for r in d if r['decider']=='codex') for k in ('input_tokens','output_tokens','cache_hit_tokens')},'duration_seconds':(datetime.datetime.fromisoformat(d[-1]['ts'])-datetime.datetime.fromisoformat(d[0]['ts'])).total_seconds()}
(p/'metrics.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2));print(json.dumps(metrics,ensure_ascii=False,indent=2))
with (p/'turn-budgets.json').open('w') as f:
 allrows=[]
 for c in rc['combats']:
  if c['floor'] not in (17,33,42,48,49):continue
  frames=[r for r in s if c['entry']['ts']<=r['ts']<=(c['exit'] or c['last'])['ts']];gs={}
  for r in frames:
   if r['state']['in_combat']:gs.setdefault(r['state']['turn'],[]).append(r)
  for t,rs in gs.items():
   es=[r for r in d if c['entry']['ts']<=r['ts']<=c['last']['ts'] and r.get('turn')==t and r.get('chosen',{}).get('action')=='end_turn']
   end=next((r for r in rs if es and r['ts']==es[-1]['ts']),rs[-1]);start=rs[0];nex=next((r for r in frames if r['ts']>end['ts'] and (r['state']['turn']>t or not r['state']['in_combat'])),None)
   alive=lambda r:[e for e in r['state']['combat']['enemies'] if e.get('is_alive')]
   summary={'combat':c['sequence'],'floor':c['floor'],'turn':t,'start':start['_line'],'end':end['_line'],'next':nex['_line'] if nex else None,'hp_start':start['state']['run']['current_hp'],'hp_end':end['state']['run']['current_hp'],'hp_next':nex['state']['run']['current_hp'] if nex else None,'need':sum(e['current_hp'] for e in alive(start)),'enemy_end':[(e['index'],e['current_hp'],e['max_hp']) for e in alive(end)],'enemy_next':[(e['index'],e['current_hp'],e['max_hp']) for e in alive(nex)] if nex else None,'block':end['state']['combat']['player']['block'],'incoming':sum(sum(i.get('total_damage') or 0 for i in e['intents']) for e in alive(end)),'same_hp_cap':nex is not None and [(e['index'],e['max_hp']) for e in alive(start)]==[(e['index'],e['max_hp']) for e in alive(nex)]}
   allrows.append(summary)
 json.dump(allrows,f,ensure_ascii=False,indent=2)
