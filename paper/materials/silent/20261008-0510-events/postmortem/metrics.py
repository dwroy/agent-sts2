import json,pathlib,collections,datetime
P=pathlib.Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-044302-postmortem')
def rows(name):
 for raw in (P/name).open():
  n,t=raw.split(':',1);d=json.loads(t);d['_line']=int(n);yield d
D=list(rows('decisions-numbered.jsonl'));S=list(rows('states-numbered.jsonl')); R=json.loads((P/'7X0W3U8TVA2A-resources.json').read_text())
J=[d for d in D if d['decider']=='jev'];Q=[d for d in J if d['label'].startswith('combat/plan-choice')]
low=[d for d in J if isinstance(d.get('confidence'),(int,float)) and d['confidence']<.35]
bools=collections.Counter(d.get('rollout_best_chosen','absent')for d in Q)
print('Jev',len(J),'low',len(low),'plan-choice',len(Q),'bestflag',dict(bools),'rank1',sum('code rank 1' in d['rationale'] for d in Q))
print('末战同统计',dict(collections.Counter(d.get('rollout_best_chosen','absent') for d in Q if d['floor']==31)))
print('focus',sum(bool(d.get('focus'))for d in Q),'values',collections.Counter(str(d.get('focus'))for d in Q))
print('护栏',[(d['_line'],d['floor'],d.get('turn'),d['rationale'])for d in D if 'guard' in d['rationale'].lower() or 'override' in d['rationale'].lower()])
turns=collections.defaultdict(list)
for d in D:
 if d['label'].startswith('combat/'):turns[(d['floor'],d['turn'])].append(d)
auto=[key for key,ds in turns.items()if not any(x['decider']=='jev'for x in ds)]
starts=[key for key,ds in turns.items()if any(x['decider']=='code'and x['label']in ['combat/plan','combat/lethal','combat/least-loss','combat/end_turn']for x in ds)]
print('回合',len(turns),'代码自启',len(starts),'完全无Jev',len(auto),'自主keys',starts)
for group,name in [(J,'Jev'),([d for d in D if d.get('deepseek',{}).get('tokens')],'大脑决策')]:
 sums=collections.Counter()
 for d in group:
  for k,v in d.get('usage',{}).items():
   if isinstance(v,(int,float)):sums[k]+=v
 print(name,len(group),dict(sums))
print('战斗轮表')
for w in R['combats']:
 frames=[s for s in S if w['entry']['line']<=s['_line']<=w['exit']['line']]
 byturn=collections.defaultdict(list)
 for d in frames:
  s=d['state'];c=s.get('combat')
  if c and s.get('in_combat')and c.get('hand'):byturn[s['turn']].append(d)
 starts=[ls[0]for ls in byturn.values()]
 summary=[]
 for k,d in enumerate(starts):
  s=d['state'];n=starts[k+1]if k+1<len(starts)else frames[-1]; e=sum(x['current_hp']for x in s['combat']['enemies']if x['is_alive']);nc=n['state'].get('combat')or {};ne=sum(x['current_hp']for x in nc.get('enemies',[])if x['is_alive'])
  # Infer no enemy damage: visible HP decreases and observed additions only.
  within=[x for x in frames if d['_line']<=x['_line']<=n['_line']]
  decreases=adds=0;restarts=[]
  for a,b in zip(within,within[1:]):
   ea={x['enemy_id']:x for x in (a['state'].get('combat')or{}).get('enemies',[])};eb={x['enemy_id']:x for x in (b['state'].get('combat')or{}).get('enemies',[])}
   for ident in ea.keys()&eb.keys():
    old,new=ea[ident],eb[ident]
    if sum(x['enemy_id']==ident for x in (a['state'].get('combat')or{}).get('enemies',[]))>1 or sum(x['enemy_id']==ident for x in (b['state'].get('combat')or{}).get('enemies',[]))>1:continue
    delta=old['current_hp']-new['current_hp']
    decreases+=max(0,delta);adds+=max(0,-delta)
    if not old['is_alive']and new['is_alive']:restarts.append((b['_line'],ident,new['current_hp']))
  summary.append({'turn':s['turn'],'line':d['_line'],'hp':s['run']['current_hp'],'need':e,'net_enemy_decrease':e-ne,'hp_loss':s['run']['current_hp']-n['state']['run']['current_hp'],'visible_hp_loss_lower_bound':decreases,'observed_hp_added':adds,'revivals':restarts})
 print(w['floor'],summary)
 w['verified_outcome']='lost'if w['floor']==31 else'won'; w['turn_summary']=summary
(P/'resources-verified.json').write_text(json.dumps(R,ensure_ascii=False,indent=2)+'\n')
(P/'metrics.json').write_text(json.dumps({'jev_calls':len(J),'jev_low':len(low),'plan_calls':len(Q),'bestflag':dict(bools),'turn_count':len(turns),'code_start_turns':len([key for key,ds in turns.items()if any(x['decider']=='code'and x['label']in ['combat/plan','combat/lethal','combat/least-loss']for x in ds)]),'code_only_turns':len(auto)},ensure_ascii=False,indent=2)+'\n')
