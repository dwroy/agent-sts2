import json
from pathlib import Path
from datetime import datetime,timedelta
root=Path('/home/dw/Projects/agent-sts2');out=root/'learner/runs/20261008-171302-postmortem'
runs={'9YBKCNBFP0X5','1LMBFGSMCWKU','G403VCZ3BH1B','TKXQ6L4N9A6U','YLYLZWHA0GKU','XTSV1U9JD34T'}
uses=[]
with (root/'logs/decisions.jsonl').open() as f:
 for n,l in enumerate(f,1):
  if not any(r in l for r in runs):continue
  r=json.loads(l)
  if r.get('run_id') not in runs:continue
  if r.get('chosen',{}).get('action')=='use_potion' and r.get('expect',{}).get('potion',{}).get('id')=='GHOST_IN_A_JAR':r['_line']=n;uses.append(r)
frames={run:[] for run in runs}
with (root/'logs/states.jsonl').open() as f:
 for n,l in enumerate(f,1):
  if not any(r in l for r in runs):continue
  r=json.loads(l);s=r.get('state') or {};run=s.get('run_id')
  if run not in runs:continue
  t=datetime.fromisoformat(r['ts'])
  if any(u['run_id']==run and datetime.fromisoformat(u['observed_ts'])-timedelta(seconds=1)<=t<=datetime.fromisoformat(u['ts'])+timedelta(seconds=70) for u in uses):r['_line']=n;frames[run].append(r)
summary=[]
for u in uses:
 t=u['observed_ts'];rs=[r for r in frames[u['run_id']] if r['ts']>=t]
 before=next((r for r in rs if r['ts']<=u['ts']),None)
 if not before:before=next((r for r in frames[u['run_id']] if r.get('observed_ts')==t),None)
 def details(r):
  if not r:return None
  c=r['state'].get('combat') or {}
  return {'line':r['_line'],'ts':r['ts'],'turn':r['state'].get('turn'),'hp':(c.get('player') or {}).get('current_hp'),'block':(c.get('player') or {}).get('block'),'powers':[(p['power_id'],p['amount']) for p in (c.get('player') or {}).get('powers',[])],'enemies':[(e['enemy_id'],e['move_id'],[(i.get('damage'),i.get('hits')) for i in e.get('intents',[])]) for e in c.get('enemies',[]) if e['is_alive']]}
 after=next((r for r in rs if r['ts']>u['ts'] and any(p['power_id']=='INTANGIBLE_POWER' for p in (r['state'].get('combat') or {}).get('player',{}).get('powers',[]))),None)
 nxt=next((r for r in rs if r['ts']>u['ts'] and r['state'].get('turn')==(u.get('turn') or 0)+1),None)
 summary.append({'run':u['run_id'],'d':u['_line'],'floor':u['floor'],'turn':u['turn'],'attempt':u.get('sl_attempt'),'before':details(before),'after':details(after),'next_turn':details(nxt)})
(out/'prior-ghost-uses.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
for r in summary:print(json.dumps(r,ensure_ascii=False))
