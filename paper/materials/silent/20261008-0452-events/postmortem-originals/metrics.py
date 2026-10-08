import json,re,collections,datetime
from pathlib import Path
p=Path('learner/runs/20261008-041302-postmortem')
d=[json.loads(l) for l in (p/'decisions.jsonl').open()];s=[json.loads(l) for l in (p/'states.jsonl').open()];r=json.loads((p/'9Z9H2EXKLF3T-resources.json').read_text())
print('deciders',collections.Counter(x['decider'] for x in d));j=[x for x in d if x['decider']=='jev'];plans=[x for x in j if x['label'].startswith('combat/plan-choice')]
print('JEV',len(j),'低',sum((x.get('confidence') or 0)<.35 for x in j),'plans',len(plans),'rank1',sum('code rank 1' in x.get('rationale','') for x in plans),'rolloutflag',collections.Counter(x.get('rollout_best_chosen') for x in plans),'nojev',sum(x.get('no_jev',False) for x in d),'fallback',sum(x.get('fallback',False) for x in d))
print('JEVusage',sum(x.get('usage',{}).get('input_tokens',0) for x in j),sum(x.get('usage',{}).get('output_tokens',0) for x in j))
print('time', (datetime.datetime.fromisoformat(d[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(d[0]['ts'].replace('Z','+00:00'))).total_seconds())
# Distinguish continued model plans from code decisions; attempt and turn define a round.
key=lambda x:(x['floor'],x.get('sl_attempt') or 1,x['turn'])
selfrows=[x for x in d if x['screen']=='COMBAT' and x['decider']=='code' and not x.get('rationale','').startswith('continuing the Jev-chosen plan')]
active=[x for x in selfrows if x['label']!='combat/end_turn' and x['label']!='combat/plan-continue']
print('code combat acts',len(selfrows),'active',len(active),'active rounds',len(set(map(key,active))),'including end',len(set(map(key,selfrows))),'no Jev combat round',len(set(map(key,selfrows))-set(key(x) for x in j if x['label'].startswith('combat/'))))
print('modelcontinuations raw code',sum(x.get('rationale','').startswith('continuing the Jev-chosen plan') for x in d),'codecont',sum(x.get('rationale','').startswith('continuing the code-chosen plan') for x in d))
print('FOCUS')
for x in plans:
 opts=x.get('questions',{}).get('plan',{}).get('criteria',{});a=x.get('answers',{}).get('plan',{}).get('choice');parsed={}
 for k,v in opts.items():
  try: parsed[k]=json.loads(v) if isinstance(v,str) else v
  except (ValueError,TypeError): continue
 focus={k:v for k,v in parsed.items() if isinstance(v,dict) and 'focus' in v}
 if focus:print(x['_line'],x['floor'],x['turn'],a,'selected',parsed.get(a,{}).get('focus'),'choices',{k:v['focus'] for k,v in focus.items()})
print('ARRAYS')
for b in r['combats']:
 if b['floor'] not in [17,31,33,35,38,39,45,48]:continue
 frames=[x for x in s if b['entry']['line']<=x['_line']<=(b['exit'] or b['last'])['line']];groups={}
 for x in frames:
  if not x['state'].get('in_combat'):continue
  groups.setdefault(x['state']['turn'],[]).append(x)
 hp=[]; need=[]; losses=[]
 for t,g in groups.items():
  st=g[0]['state'];a=next((a for a in b['enemy_hp_audit']['turns'] if a['turn']==t),{})
  hp.append(st['run']['current_hp']);need.append(a.get('live_enemy_hp_start'));losses.append(a.get('net_live_enemy_hp_loss'))
 end=(b['exit'] or b['last'])['hp'];net=[a-bb for a,bb in zip(hp,hp[1:]+[end])]
 print('F',b['floor'],'sequence',b['sequence'],'hp',hp,'end',end,'hp net',net,'need',need,'enemy net',losses,'gaps',[(a['turn'],a['gaps']) for a in b['enemy_hp_audit']['turns'] if a['gaps']])
print('PROJECTIONS')
for x in d:
 if x['decider']!='codex':continue
 for k,q in x.get('questions',{}).items():
  crit=q.get('criteria',{});
  for op,v in crit.items():
   if op!='state' and x['label']!='rest/plan': continue
   try:v=json.loads(v) if isinstance(v,str) else v
   except ValueError:continue
   if not isinstance(v,dict):continue
   def walk(obj,prefix=''):
    for a,b in obj.items():
     if a in ['act_boss_clock','act_boss_sim','route_hp','route_projection','route_hp_projection','route_hp_by_choice','boss_sim','boss_sim_input','hp_after','hp_after_rest','route_to_boss','projected_hp','hp_projection','route']:print(x['_line'],x['floor'],x['label'],op,prefix+a,str(b)[:2200])
     elif isinstance(b,dict):walk(b,prefix+a+'.')
   walk(v)
# Resource movement ledger with decision attribution around each belt change.
print('BELT')
for event in r['resource_changes']:
 if event['from']['potions']==event['to']['potions']:continue
 a=event['from'];b=event['to'];print('L',a['line'],'→',b['line'],'F/T',b['floor'],b['turn'],'slot',a['potions'],'→',b['potions'],'hp',a['hp'],'→',b['hp'],'restart',event['restart_boundary'])
