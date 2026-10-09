import json,collections
from pathlib import Path
p=Path(__file__).parent
for run in ['HXCY44VD9QWU','N8A2W8LH39N0']:
 ds=[json.loads(s) for s in (p/f'{run}-decisions.jsonl').open()]; ss=[json.loads(s) for s in (p/f'{run}-states.jsonl').open()]; rc=json.load((p/f'{run}-resources.json').open())
 out=[]
 def emit(tag,data):out.append(tag+' '+json.dumps(data,ensure_ascii=False))
 for i,d in enumerate(ds,1):
  if d['decider']=='codex' or any(x in d.get('rationale','').lower() for x in ['guard','mismatch','drink','discard potion','focus']):
   emit('D'+str(i),{k:d.get(k) for k in ['ts','floor','turn','label','decider','chosen','rationale','confidence','result','_offset']})
  if d.get('boss_sim'):emit('SIM'+str(i),d['boss_sim'])
  if d.get('route_plan'):emit('ROUTE'+str(i),d['route_plan'])
 for w in rc['combats']:
  emit('FIGHT', {k:v for k,v in w.items() if k not in ['enemy_hp_audit','changes']})
  emit('TURN_AUDIT',[{k:v for k,v in t.items() if k!='transitions'} for t in w['enemy_hp_audit']['turns']])
 for c in rc['resource_changes']:emit('CHANGE',c)
 for i,d in enumerate(ss,1):
  s=d['state'];c=s.get('combat') or {};pl=c.get('player') or {}
  if s.get('in_combat') and (not i or ss[i-2]['state'].get('turn')!=s.get('turn') or ss[i-2]['state'].get('run',{}).get('floor')!=s.get('run',{}).get('floor')) or i>=len(ss)-2:
   emit('S'+str(i),{'offset':d['_offset'],'ts':d['ts'],'floor':s.get('run',{}).get('floor'),'turn':s.get('turn'),'hp':s.get('run',{}).get('current_hp'),'block':pl.get('block'),'energy':pl.get('energy'),'powers':pl.get('powers'),'enemies':[{k:e.get(k) for k in ['index','enemy_id','name','current_hp','max_hp','block','powers','intents','move_id']} for e in c.get('enemies',[])],'hand':[{k:a.get(k) for k in ['card_id','name','energy_cost','description','can_play']} for a in c.get('hand',[])]})
 (p/f'{run}-summary.txt').write_text('\n'.join(out)+'\n')
 print(run,'summary lines',len(out),'size',sum(map(len,out)))
 print('combat decisions',collections.Counter(d['decider'] for d in ds if d['label'].startswith('combat/')))
 print('code turns',len(set((d['floor'],d.get('sl_attempt'),d['turn']) for d in ds if d['decider']=='code' and d['label'].startswith('combat/') and d['label']!='combat/plan-continue')))
 print('labels',collections.Counter(d['label'] for d in ds))
 print('low',sum(d['decider']=='jev' and isinstance(d.get('confidence'),(int,float)) and d['confidence']<.35 for d in ds))
