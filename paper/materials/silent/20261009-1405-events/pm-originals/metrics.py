import json,pathlib,re,collections,datetime,sys
p=pathlib.Path(__file__).parent;ds=[json.loads(l) for l in (p/'decisions.jsonl').open()];ss=[json.loads(l) for l in (p/'states.jsonl').open()];rc=json.load((p/'NBJBVSBNPYQB-resources.json').open())
choices=[d for d in ds if d['decider']=='jev' and d['label'].startswith('combat/plan-choice')]
first=best=eligible=0; selected=[]
for d in choices:
 m=re.search(r'Jev chose plan (\d+)/(\d+)',d['rationale']); key='plan'+m[1] if m else None
 q=d['questions'].get('plan',{});crit=q.get('criteria',{}); opts={}
 for k,v in crit.items():
  try:opts[k]=json.loads(v) if isinstance(v,str) else v
  except ValueError:continue
 bs=d.get('boss_sim') or {}; b=bs.get('rollout_own_best'); tied=bs.get('rollout_own_tied',[])
 if key=='plan1':first+=1
 if b:
  eligible+=1;best+=key==b or key in tied
 selected.append({'d':d['_line'],'floor':d['floor'],'turn':d['turn'],'attempt':d.get('sl_attempt'),'choice':key,'reference':b,'tied':tied,'option':opts.get(key),'boss':bs,'journal':d.get('journal'),'rationale':d['rationale']})
(p/'choices.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2)+'\n')
print('JEV',len(choices),'rank1',first,'best',best,'eligible',eligible,'low all',sum(d['decider']=='jev' and isinstance(d.get('confidence'),(float,int)) and d['confidence']<.35 for d in ds),'low combat',sum(isinstance(d.get('confidence'),(float,int)) and d['confidence']<.35 for d in choices))
turns=collections.defaultdict(set);auto=set()
for d in ds:
 if d['label'].startswith('combat/'):
  k=(d['floor'],d.get('sl_attempt') or 1,d['turn']);turns[k].add(d['decider'])
  if d['decider']=='code' and d['label'] in ('combat/plan','combat/lethal','combat/least-loss'):auto.add(k)
print('turns',len(turns),'auto any',len(auto),'full code',sum('jev' not in v for v in turns.values()),'jev continuations',sum(d['label']=='combat/plan-continue' and d.get('reused_answer') for d in ds))
print('critical hp/enemy turns')
for c in rc['combats']:
 if c['floor'] not in (12,17,33,42,45,48,49):continue
 obs=c['enemy_hp_audit']['observations'];by=collections.defaultdict(list)
 for o in obs:by[o['turn']].append(o)
 print('F',c['floor'],'seq',c['sequence'],'auditturns',[(t['turn'],t['live_enemy_hp_start'],t['live_enemy_hp_end'],t['visible_enemy_hp_loss_lower_bound'],t['observed_hp_added'],t['gaps']) for t in c['enemy_hp_audit']['turns']])
print('HP changes outside combat')
for e in rc['resource_changes']:
 if e['combat_sequence'] is None: print(e['from'],e['to'],'restart',e['restart_boundary'])
print('potion acts')
for d in ds:
 if d['chosen'].get('action') in ('use_potion','discard_potion','buy_potion') or (d['label']=='reward/claim' and 'Potion' in d['rationale']):print(d['_line'],d['floor'],d['turn'],d.get('sl_attempt'),d['chosen'],d['rationale'])
print('criteria route/rest key excerpts')
for d in ds:
 if d['floor'] in (1,18,34,43,47) and d['label'] in ('map/route-plan','event/act-plan','rest/plan'):
  crit=d['questions']['pick']['criteria']; print('d',d['_line'],'crit keys',list(crit))
  for k,v in crit.items():
   print(k,str(v)[:1700])
print('state agent_view',ss[-20]['state'].get('agent_view'))
