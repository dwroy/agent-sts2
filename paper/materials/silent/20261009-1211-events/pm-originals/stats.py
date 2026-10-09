from analyze import *
import re,datetime
J=[d for d in D if d['decider']=='jev'];plan=[d for d in J if 'plan-choice' in d['label']]
raw=[]
for d in plan:
 m=re.search(r'Jev chose plan (\d+)/(\d+)',d['rationale']);q=(d.get('questions') or {}).get('plan',{});crit=q.get('criteria',{})
 if not m:continue
 key='plan'+m[1];v=crit.get(key);v=json.loads(v) if v else {};best=[k for k,s in crit.items() if json.loads(s).get('rollout_best')]; raw.append((d,key,v,best))
print('low',len([d for d in J if d.get('confidence') is not None and d['confidence']<.35]),collections.Counter(d['floor'] for d in J if d.get('confidence') is not None and d['confidence']<.35))
print('plan总',len(plan),'可解析',len(raw),'选best',sum(v.get('rollout_best') is True for d,k,v,b in raw),'有best题',sum(bool(b) for d,k,v,b in raw),'选rank1',sum('code rank 1' in d['rationale'] for d,k,v,b in raw),'选best added',sum("rollout's best line, added" in d['rationale'] for d,k,v,b in raw),'SL替换',sum('SL explore' in d['rationale'] for d,k,v,b in raw))
print('总代码',collections.Counter(d['label'] for d in D if d['decider']=='code'))
print('自主与续步')
C=[]
for d in D:
 if d['screen']!='COMBAT':continue
 if d['decider']=='code' and d['label']=='combat/plan-continue' and 'Jev-chosen' in d['rationale']:d['_owner']='jev-plan'
 else:d['_owner']=d['decider']
 if d['_owner']=='code' and d['label'] in ('combat/plan','combat/lethal','combat/least-loss','combat/end_turn','combat/plan-guarded','combat/mod-lethal'):C.append(d)
print('自主决策',len(C),collections.Counter(d['label'] for d in C),'completed/pending',collections.Counter(d['result'].split(':')[0] for d in C))
points=collections.defaultdict(set);execpoints=collections.defaultdict(set)
for d in D:
 if d['screen']=='COMBAT' and d['label'] in ('combat/plan','combat/lethal','combat/least-loss','combat/end_turn','combat/plan-guarded','combat/mod-lethal','combat/plan-choice','combat/plan-choice+potion','combat/plan-choice+potion-lethal'):
  k=(d['floor'],d.get('sl_attempt') or 1,d['turn']);points[k].add('code' if d['_owner']=='code' else 'jev')
  if not d['result'].startswith('not dispatched'):execpoints[k].add('code' if d['_owner']=='code' else 'jev')
print('回合类别',len(points),collections.Counter(','.join(sorted(v)) for v in points.values()),'执行',len(execpoints),collections.Counter(','.join(sorted(v)) for v in execpoints.values()))
print('guard')
for d in D:
 if re.search(r'HP guard|HP-guard|guarded|HP safeguard|护栏',d['rationale'],re.I):print(d['_line'],d['floor'],d['turn'],d.get('sl_attempt'),d['label'],d['rationale'])
print('usage')
for who in ('jev','codex'):
 a=[d for d in D if d['decider']==who];print(who,len(a),'usage',dict(collections.Counter({})))
 for key in ('input_tokens','output_tokens','cache_hit_tokens','reasoning_tokens'):
  print(key,sum((d.get('usage') or {}).get(key,0) or 0 for d in a), 'deepseek',sum((d.get('deepseek') or {}).get(key,0) or 0 for d in a))
print('calls with reason',len([d for d in D if (d.get('deepseek') or {}).get('reason')]),'latency',sum((d.get('deepseek') or {}).get('latency_ms',0) or 0 for d in D))
print('fallback',sum(bool(d.get('fallback')) for d in D),'no_jev',sum(bool(d.get('no_jev')) for d in D))
print('potions all actions')
for d in D:
 if (d.get('chosen') or {}).get('action') in ('use_potion','discard_potion'):print(d['_line'],d['floor'],d['turn'],d.get('sl_attempt'),d['chosen'],d['rationale'],d['result'])
print('belt deltas')
for e in R['resource_changes']:
 a,b=e['from'],e['to']
 if a['potions']!=b['potions']:print(e['combat_sequence'],'F',b['floor'],'T',b['turn'],f"s{a['line']}→s{b['line']}",a['potions'],b['potions'],'重启',e['restart_boundary'],b['ts'])
