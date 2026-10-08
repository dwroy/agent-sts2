import json,collections,datetime
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-164302-postmortem')
def rows(n):return [json.loads(l) for l in (p/n).open()]
d=rows('decisions.jsonl');s=rows('states.jsonl');brain=rows('brain-Y5H4CFAQ2WTG.jsonl');res=json.loads((p/'Y5H4CFAQ2WTG-resources.json').read_text());jev=[r for r in d if r['decider']=='jev'];plans=[r for r in jev if r['label'].startswith('combat/plan-choice')]
focus=[];guards=[]
for a in plans:
 criteria=a.get('questions',{}).get('plan',{}).get('criteria',{});key=a.get('answers',{}).get('plan',{}).get('choice');parsed={k:json.loads(v) for k,v in criteria.items()};original=parsed.get(key,{})
 if any('focus' in v for v in parsed.values()):focus.append({'d':a['_line'],'floor':a['floor'],'turn':a['turn'],'candidates':[(k,v.get('focus')) for k,v in parsed.items() if 'focus' in v],'original_focus':original.get('focus')})
 if 'HP guard' in a['rationale']:guards.append({'d':a['_line'],'floor':a['floor'],'turn':a['turn'],'original':{k:v for k,v in original.items() if k not in ['rollout','rollout_turns','history_estimate','rollout_other_orders','rollout_kill_order']},'alternatives':{k:{a:b for a,b in v.items() if a in ['plays','hp_lost','damage_dealt','block_gained','cards_drawn','scaling_gained']} for k,v in parsed.items()},'rationale':a['rationale']})
usage={role:{key:sum(a.get('usage',{}).get(key,0) or 0 for a in seq) for key in ['input_tokens','output_tokens','cache_hit_tokens']} for role,seq in [('brain',brain),('jev',jev)]}
aut=[a for a in d if a['decider']=='code' and a['label'].startswith('combat/') and a['label']!='combat/plan-continue']
summary={'focus':focus,'guards':guards,'usage':usage,'duration_seconds':(datetime.datetime.fromisoformat(d[-1]['ts'])-datetime.datetime.fromisoformat(d[0]['ts'])).total_seconds(),'observed_duration_seconds':(datetime.datetime.fromisoformat(d[-1]['ts'])-datetime.datetime.fromisoformat(d[0]['observed_ts'])).total_seconds(),'raw_deciders':dict(collections.Counter(a['decider'] for a in d)),'autonomous_decisions':len(aut),'autonomous_rounds':len({(a['floor'],a['turn']) for a in aut}),'jev_plan_continues':sum(a['label']=='combat/plan-continue' and 'Jev-chosen' in a['rationale'] for a in d),'code_plan_continues':sum(a['label']=='combat/plan-continue' and 'code-chosen' in a['rationale'] for a in d),'low_confidence':[(a['_line'],a['floor'],a['turn'],a['confidence']) for a in jev if a['confidence']<.35],'plan_count':len(plans),'rollout_best_count':sum(a.get('rollout_best_chosen') is True for a in plans),'fallback':sum(a['fallback'] is True for a in d)}
(p/'audit.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(json.dumps(summary,ensure_ascii=False,indent=2))
print('deaths')
for a,b in zip(s,s[1:]):
 st=a['state'];en=(st.get('combat') or {}).get('enemies') or [];aft=(b['state'].get('combat') or {}).get('enemies') or []
 if st['run']['floor']!=b['state']['run']['floor']:continue
 old={(e['enemy_id'],e['name']):e for e in en};new={(e['enemy_id'],e['name']):e for e in aft}
 for k,v in old.items():
  if v.get('is_alive') and (k not in new or not new[k].get('is_alive')):print(st['run']['floor'],st['turn'],a['_line'],b['_line'],k,'removed or dead')
print('potions names')
print(sorted({(x['potion_id'],x['name']) for a in s for x in a['state']['run']['potions'] if x['occupied']}))
