import json,re,collections
from pathlib import Path
p=Path(__file__).parent
d=[json.loads(l) for l in (p/'decisions.jsonl').open()]
s=[json.loads(l) for l in (p/'states.jsonl').open()]
# Retain every selected raw frame separately; compact per-turn views for manual checking.
for x in s:
 st=x['state']; run=st.get('run') or {}
 if run.get('floor') not in [8,17,23,30,31] or not st.get('combat'):continue
 if run['floor']==31 or x['_line'] in [313677,313698,313783,313814,313973,314015]:
  enemies=st['combat'].get('enemies') or []
  player=st['combat'].get('player',{})
  print('帧',x['_line'],x['ts'],run['floor'],st.get('turn'),'HP',run.get('current_hp'),'player',player,'敌',[(e.get('index'),e.get('name'),e.get('enemy_id'),e.get('current_hp'),e.get('block'),e.get('intents'),e.get('powers')) for e in enemies])
print('STAT',collections.Counter((x['decider'],x['label']) for x in d))
print('HP护栏',[(x['_line'],x['floor'],x['turn'],x['rationale']) for x in d if re.search('guard|HP floor|HP-floor',x.get('rationale',''),re.I)])
plans=[x for x in d if x['decider']=='jev' and x['label'].startswith('combat/')]
print('PLANSTATS',len(plans),sum('code rank 1' in x['rationale'] and not 'code rank 10' in x['rationale'] for x in plans),sum(x.get('rollout_best_chosen') is True for x in plans),sum(x.get('rollout_best_chosen') is not None for x in plans),collections.Counter(str(x.get('rollout_best_chosen')) for x in plans))
print('JEVCACHE',collections.Counter(tuple(sorted((x.get('usage') or {}).keys())) for x in d if x['decider']=='jev'))
print('代码自主turn',sorted({(x['floor'],x['turn'],x.get('sl_attempt')) for x in d if x['decider']=='code' and x['label'].startswith('combat/') and x['label']!='combat/plan-continue'},key=str))
print('饮药',[(x['_line'],x['floor'],x['turn'],x['chosen'],x['rationale']) for x in d if x.get('chosen',{}).get('action') in ['use_potion','discard_potion']])
for x in d:
 if x['floor'] in [30,31] and x['label'].startswith('combat/plan-choice'):
  a=(x.get('answers') or {}).get('plan',{}).get('choice');o=(x.get('questions') or {}).get('plan',{}).get('options',{});v=o.get(a)
  if isinstance(v,str):
   try:v=json.loads(v)
   except ValueError:pass
  print('选择',x['_line'],x['floor'],x['turn'],x.get('sl_attempt'),a,x.get('focus'),v)
