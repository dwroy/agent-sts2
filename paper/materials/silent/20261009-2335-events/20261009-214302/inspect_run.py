import json,sys
from pathlib import Path
p=Path(__file__).parent
S=[json.loads(x) for x in (p/'states.jsonl').open()];D=[json.loads(x) for x in (p/'decisions.jsonl').open()]
mode=sys.argv[1]
if mode=='states':
 floor=int(sys.argv[2]); seen=set()
 for r in S:
  st=r['state'];c=st.get('combat')
  if st['run']['floor']!=floor or not c:continue
  print('s'+str(r['_source_line']),r['ts'],'T'+str(st['turn']),st['screen'],'HP/挡',c.get('player',{}).get('current_hp'),c.get('player',{}).get('block'),'增益',[(x['power_id'],x['amount']) for x in c.get('player',{}).get('powers',[])],'敌',[(e['enemy_id'],e['current_hp'],e['block'],[(x['power_id'],x['amount']) for x in e.get('powers',[])],[(i.get('damage'),i.get('hits')) for i in e.get('intents',[])]) for e in c.get('enemies',[])])
elif mode=='questions':
 for r in D:
  if (int(sys.argv[2])==r['floor']) and r.get('questions'):
   print('\nd'+str(r['_source_line']),r['label'],r['rationale'])
   for name,q in r['questions'].items():
    print(name,'选项',q.get('options'))
    for key,val in q.get('criteria',{}).items():
     print(key,val)
   if sys.argv[2]=='24':
    break
elif mode=='sl':
 for r in map(json.loads,(p/'sl-attempts.jsonl').open()):
  print('sl'+str(r['_source_line']),json.dumps({k:v for k,v in r.items() if k not in ['draws','explore','_offset']},ensure_ascii=False))
elif mode=='relics':
 for r in S:
  st=r['state'];run=st['run'];relics=run.get('relics',[]);key=json.dumps(relics,ensure_ascii=False)
  if not hasattr(sys,'last') or sys.last!=key:
   print('s'+str(r['_source_line']),'F',run['floor'],[(x.get('relic_id'),x.get('name'),x.get('description')) for x in relics]);sys.last=key
elif mode=='brain':
 for r in D:
  if r['decider']=='codex' and r.get('questions'):
   print('d'+str(r['_source_line']),'F',r['floor'],r['label'],r['rationale'])
   print('boss',json.dumps(r.get('boss_sim'),ensure_ascii=False)[:2500])
   if r['label']=='rest/plan':
    for key,val in r['questions']['pick']['criteria'].items():
     if key=='o0':print('休息',val)
