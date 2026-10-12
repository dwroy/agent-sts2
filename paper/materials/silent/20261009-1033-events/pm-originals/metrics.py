exec(open(__file__.replace('metrics.py','inspect.py')).read().split("mode=sys.argv[1]")[0])
from datetime import datetime
R=json.load((p/'E6DYYXRX7GVE-resources.json').open())
if sys.argv[1]=='stats':
 print('raw deciders',collections.Counter(d['decider'] for d in D)); print('low',[(n,sum(d.get('decider')=='jev' and isinstance(d.get('confidence'),(int,float)) and d['confidence']<n for d in D)) for n in [0.35,0.4]])
 plans=[d for d in D if d.get('decider')=='jev' and 'plan-choice' in d['label']]
 print('plan',len(plans),'keys',plans[0].keys())
 print('rollout fields',[(d['_source']['line'],d.get('rollout')) for d in plans[:2]])
 print('best flags',collections.Counter(str((d.get('rollout') or {}).get('rollout_best_chosen')) for d in plans)); print('rank1',sum('code rank 1' in d.get('rationale','') for d in plans))
 print('guard',[(d['_source']['line'],d['floor'],d['turn'],d['rationale']) for d in D if any(t in d.get('rationale','').lower() for t in ['guard','replaced','hp-preservation'])])
 self=[d for d in D if d['decider']=='code' and d['label'] in ['combat/plan','combat/lethal','combat/least-loss']]
 print('self',len(self),collections.Counter(d['label'] for d in self),'turns',len(set((d['floor'],d['turn']) for d in self)))
 print('fallback',sum(bool(d.get('fallback')) for d in D),'nojev',sum(bool(d.get('no_jev')) for d in D))
 print('usage',dict((k,sum(d.get('usage',{}).get(k,0) for d in D if d['decider']=='jev')) for k in ['input_tokens','output_tokens','cache_hit_tokens','reasoning_tokens']))
 print('brain',dict((k,sum((d.get('deepseek') or {}).get(k,0) for d in D)) for k in ['input_tokens','output_tokens','cache_hit_tokens','reasoning_tokens','latency_ms']))
 print('duration',(datetime.fromisoformat(D[-1]['ts'])-datetime.fromisoformat(D[0]['ts'])).total_seconds())
 print('sl reload counters',collections.Counter(str(d.get('sl_reloads')) for d in D))
 for c in R['combats']:print('net',c['floor'],c['sequence'],c['observed_net_hp_loss'])
 print('focussed')
 for d in plans:
  rr=d.get('rollout') or {}
  if any('focus' in str(k).lower() for k in d): print(d['_source']['line'],[(k,v) for k,v in d.items() if 'focus' in k.lower()])
elif sys.argv[1]=='turns':
 for c in R['combats']:
  obs=c['enemy_hp_audit']['observations']; rows=[x for x in S if c['entry']['line']<=x['_source']['line']<=c['last']['line']]
  first={}
  for x in rows:
   s=x['state']; combat=s.get('combat') or {}
   if not combat.get('hand') or s['turn'] in first: continue
   first[s['turn']]=x
  print('\nF',c['floor'],'seq',c['sequence'])
  turns=list(first)
  for i,t in enumerate(turns):
   x=first[t]; s=x['state']; cs=s['combat']; total=sum(z['current_hp'] for z in cs['enemies'] if z['is_alive'])
   following=first[turns[i+1]] if i+1<len(turns) else next((x for x in S if c['exit'] and x['_source']['line']==c['exit']['line']),rows[-1])
   after=following['state'];remain=sum(z['current_hp'] for z in (after.get('combat') or {}).get('enemies',[]) if z['is_alive'])
   transitions=[a for a,b in zip(obs,obs[1:]) if a['turn']==t]
   print(t,x['_source']['line'],'hp',s['run']['current_hp'],'need',total,'net enemy',total-remain,'hp_net',s['run']['current_hp']-after['run']['current_hp'],'after',following['_source']['line'])
elif sys.argv[1]=='chosen':
 for d in D:
  if d.get('floor') not in set(map(int,sys.argv[2:])) or 'plan-choice' not in d['label']:continue
  q=(d.get('questions') or {}).get('plan') or {};cr={k:json.loads(v) for k,v in q.get('criteria',{}).items()}
  print('d',d['_source']['line'],'T',d['turn'],d['rationale'],'rollout',d.get('rollout'),'sim',d.get('boss_sim'))
  for k,v in cr.items():print(k,{k:v[k] for k in ['plays','hp_lost','damage_dealt','rollout_best','rollout_turns','unmodelled_cards'] if k in v})
