import collections,json
from pathlib import Path
O=Path(__file__).parent;A=json.load(open(O/'audit.json'));cases=[];E=json.load(open(O.parents[2]/'knowledge/characters/silent/experience.json'));support=set(next(e['evidence'] for e in E['entries'] if e['id']=='silent-strength-weak-observation'))
for r in A['ends']:
 for e in r['before']['enemies']:
  ritual=e['powers'].get('RITUAL_POWER',0)
  if not ritual:continue
  z=next((z for z in r['after']['enemies'] if z['id']==e['id'] and z['index']==e['index']),None)
  if not z or not z['alive'] or z['powers'].get('RITUAL_POWER')!=ritual:continue
  restoring=sum(e['powers'].get(k,0) for k in ['PIERCING_WAIL_POWER','DARK_SHACKLES_POWER','SHACKLING_POTION_POWER'] if k not in z['powers'])
  delta=z['powers'].get('STRENGTH_POWER',0)-e['powers'].get('STRENGTH_POWER',0)
  cases.append(dict(run=r['run'],floor=r['floor'],turn=r['turn'],attempt=r['attempt'],ts=r['ts'],enemy=e['id'],ritual=ritual,restoring=restoring,delta=delta,death=r['after']['hp']==0,matched=delta==ritual+restoring))
valid=[r for r in cases if not r['death']];bad=[r for r in valid if not r['matched']];observed={r['run'] for r in valid}; assert not bad
result=dict(cases=cases,matched_live_pairs=len(valid),independent_runs=len(observed),formula_runs_in_entry=len(observed&support),outside_entry=sorted(observed-support),restore_pairs=sum(r['restoring']>0 for r in valid),truncated_death_pairs=sum(r['death'] for r in cases),contradicting=bad)
(O/'ritual-final-check.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print({k:v for k,v in result.items() if k!='cases'})
