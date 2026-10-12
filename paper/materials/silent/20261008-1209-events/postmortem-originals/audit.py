import collections,datetime,json,re
from pathlib import Path
P=Path(__file__).parent
D=[dict(json.loads(z.split(':',1)[1]),line=int(z.split(':',1)[0])) for z in (P/'decisions-lines.txt').open()]
S=[dict(json.loads(z.split(':',1)[1]),line=int(z.split(':',1)[0])) for z in (P/'states-lines.txt').open()]
R=json.loads((P/'9R916WW0V65N-resources.json').read_text())
byline={x['line']:x for x in S}
# Associate every action with the first subsequent observed frame, preserving missing observations.
steps=[]
for x in D:
 f=[s for s in S if s.get('observed_ts',s['ts'])==x.get('observed_ts')]
 # Decisions are written at action dispatch; the next log frame is the direct observable result.
 before=next((s for s in reversed(S) if s['ts']<=x['ts']),None)
 after=next((s for s in S if s['ts']>x['ts']),None)
 steps.append({'decision_line':x['line'],'floor':x['floor'],'turn':x['turn'],'attempt':x.get('sl_attempt'),'label':x['label'],'chosen':x.get('chosen'),'rationale':x.get('rationale'),'before_line':before['line'] if before else None,'after_line':after['line'] if after else None})
turns=[]
for c in R['combats']:
 frames=[s for s in S if c['entry']['line']<=s['line']<=((c.get('exit') or c['last'])['line'])]
 groups=[]
 for s in frames:
  t=s['state']['turn']
  if not groups or t!=groups[-1][0]:groups.append((t,[]))
  groups[-1][1].append(s)
 for i,(t,fs) in enumerate(groups):
  if t is None:continue
  a=fs[0]['state'];b=groups[i+1][1][0]['state'] if i+1<len(groups) else fs[-1]['state']
  end=fs[-1]['state'];pl=(end.get('combat') or {}).get('player') or {}
  ah=a['run']['current_hp'];bh=b['run']['current_hp']
  eh=lambda st:[(z['enemy_id'],z['current_hp'],z['max_hp'],z['is_alive']) for z in (st.get('combat') or {}).get('enemies',[])]
  healing=[]
  for old,new in zip(fs,fs[1:]):
   h0=old['state']['run']['current_hp'];h1=new['state']['run']['current_hp']
   if h1>h0:healing.append([new['line'],h1-h0])
  # Preserve visible damage, phase changes, and enemy totals separately.
  turns.append({'sequence':c['sequence'],'floor':c['floor'],'turn':t,'start_line':fs[0]['line'],'last_line':fs[-1]['line'],'next_line':groups[i+1][1][0]['line'] if i+1<len(groups) else None,'hp_start':ah,'hp_next':bh,'net_hp_loss':ah-bh,'block_last':pl.get('block'),'powers_last':{z['power_id']:z['amount'] for z in pl.get('powers',[])},'enemies_start':eh(a),'enemies_next':eh(b),'healing_in_frames':healing})
J=[x for x in D if x['decider']=='jev'];JP=[x for x in J if x['label'].startswith('combat/plan-choice')]
bo=[x for x in JP if type(x.get('rollout_best_chosen'))==bool]
focus=[x for x in JP if x.get('focus')];focuschosen=0
for x in focus:
 ans=x.get('answers',{}).get('plan',{}).get('choice')
 focuschosen+=ans in x['focus']
code=[x for x in D if x['decider']=='code' and x['label'].startswith('combat/') and x['label']!='combat/plan-continue']
groups=collections.defaultdict(set)
for x in D:
 if x['label'].startswith(('combat/','selection/')) and x['turn'] is not None:
  groups[(x['floor'],x.get('sl_attempt') or 1,x['turn'])].add(x['decider'])
ct={(x['floor'],x.get('sl_attempt') or 1,x['turn']) for x in code}
rank=[int(m.group(1)) for x in JP if (m:=re.search(r'; code rank (\d+)',x['rationale']))]
stats={'decisions':len(D),'jev_calls':len(J),'jev_low':sum(x.get('confidence',1)<.35 for x in J),'jev_plan_questions':len(JP),'rollout_flags':len(bo),'rollout_best':sum(x['rollout_best_chosen'] for x in bo),'rank_questions':len(rank),'rank1':rank.count(1),'focus_questions':len(focus),'focus_chosen':focuschosen,'code_combat_decisions':len(code),'code_turns':len(ct),'code_only_turns':sum(groups[t]=={'code'} for t in ct),'code_mixed_turns':sum(groups[t]!={'code'} for t in ct),'code_labels':dict(collections.Counter(x['label'] for x in code)),'code_continues_jev':sum('Jev-chosen' in x.get('rationale','') for x in D if x['label']=='combat/plan-continue'),'code_continues_code':sum('code-chosen' in x.get('rationale','') for x in D if x['label']=='combat/plan-continue'),'hp_guards':[(x['line'],x['rationale']) for x in D if 'HP guard:' in x.get('rationale','')],'drink_actions':sum((x.get('chosen') or {}).get('action')=='use_potion' for x in D),'discard_actions':sum((x.get('chosen') or {}).get('action')=='discard_potion' for x in D),'elapsed_seconds':(datetime.datetime.fromisoformat(D[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(D[0]['ts'].replace('Z','+00:00'))).total_seconds()}
(P/'audit.json').write_text(json.dumps({'stats':stats,'turns':turns,'action_frame_links':steps},ensure_ascii=False,indent=2)+'\n')
print(json.dumps(stats,ensure_ascii=False,indent=2))
for t in turns:
 if t['floor'] in [17,33,42,43,45,48,49]:
  print('回合',t['sequence'],t['floor'],t['turn'],'HP',t['hp_start'],t['hp_next'],'挡',t['block_last'],'敌',t['enemies_start'],'→',t['enemies_next'],'源',t['start_line'],t['last_line'])
