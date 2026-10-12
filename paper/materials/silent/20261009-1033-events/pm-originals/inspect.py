import json,collections,sys
from pathlib import Path
p=Path(__file__).parent
D=[json.loads(x) for x in (p/'decisions.jsonl').open()]; S=[json.loads(x) for x in (p/'states.jsonl').open()]
mode=sys.argv[1]
if mode=='keys':
 for name in ['decisions','states','run-plans','sl-attempts']:
  rows=[json.loads(x) for x in (p/(name+'.jsonl')).open()]
  print(name,len(rows)); print(json.dumps(rows[0] if rows else {},ensure_ascii=False)[:11000])
elif mode=='chain':
 R=json.load((p/'E6DYYXRX7GVE-resources.json').open())
 for c in R['combats']:
  print(c['sequence'],c['floor'],c['enemies'],'entry',c['entry'],'exit',c['exit'],'end',c['end'])
 print('sl',json.dumps(R['sl_events'],ensure_ascii=False))
 print('outside changes')
 for e in R['resource_changes']:
  if e['combat_sequence'] is None:print(json.dumps(e,ensure_ascii=False))
elif mode=='dec':
 floors={int(x) for x in sys.argv[2:]}
 for d in D:
  if d.get('floor') in floors:print(json.dumps(d,ensure_ascii=False))
elif mode=='short':
 for d in D:
  if d.get('decider')=='codex' or 'potion' in str(d.get('chosen')) or 'guard' in str(d.get('rationale','')).lower():
   print(d['_source']['line'],d.get('floor'),d.get('turn'),d.get('label'),json.dumps(d.get('chosen'),ensure_ascii=False),d.get('rationale'),json.dumps(d.get('journal'),ensure_ascii=False))
elif mode=='states':
 floors={int(x) for x in sys.argv[2:]}
 for s in S:
  a=s['state'];r=a.get('run',{});c=a.get('combat') or {}
  if r.get('floor') not in floors:continue
  print(json.dumps({'line':s['_source']['line'],'ts':s['ts'],'screen':a.get('screen'),'turn':a.get('turn'),'hp':r.get('current_hp'),'max':r.get('max_hp'),'potions':r.get('potions'),'player':c.get('player'),'enemies':c.get('enemies'),'hand':c.get('hand'),'other':{k:v for k,v in c.items() if k not in ['player','enemies','hand','draw_pile','discard_pile','exhaust_pile']}},ensure_ascii=False))
