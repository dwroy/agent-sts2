import json,subprocess
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2'); out=p/'learner/runs/20261008-221302-postmortem'
runs=[]
with (p/'logs/runs.jsonl').open('rb') as h:
 h.seek(0)
 for raw in h:
  r=json.loads(raw)
  if str(r.get('character','IRONCLAD')).lower()=='silent' and r['ended']<'2026-10-08T13:21:06.033Z': runs.append(r)
runs.sort(key=lambda r:r['ended'])
records={}; last={}; offset=0
with (p/'logs/states.jsonl').open('rb') as h:
 h.seek(0)
 for n,raw in enumerate(h,1):
  at=offset;offset+=len(raw)
  if b'AXEBOT' not in raw: continue
  row=json.loads(raw);s=row.get('state',{});run=s.get('run') or {}; ts=row.get('ts','')
  if str(run.get('character_id','')).lower()!='silent' or ts>='2026-10-08T13:21:06.033Z': continue
  rid=s.get('run_id')
  rr=next((r for r in runs if r['run_id']==rid),None) if rid else next((r for r in runs if r['ended']>=ts),None)
  if not rr: continue
  rid=rr['run_id']; c=s.get('combat') or {};es=[e for e in c.get('enemies',[]) if e.get('enemy_id')=='AXEBOT'];
  if not es:continue
  e=es[0]; sig=(e['max_hp'],e['current_hp'],tuple((x['power_id'],x['amount']) for x in e['powers']))
  event={'run':rid,'asc':rr['ascension'],'ts':ts,'line':n,'offset':at,'floor':run['floor'],'turn':s.get('turn'),'hp':run['current_hp'],'enemy':e}
  a=records.setdefault(rid,{'metadata':rr,'first':event,'max_hp_changes':[],'last':event})
  if rid not in last or last[rid][0]!=e['max_hp']: a['max_hp_changes'].append(event)
  a['last']=event;last[rid]=sig
(out/'prior-axebot.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
for rid,a in records.items(): print(rid,a['metadata']['ascension'],'floor',a['first']['floor'],'maxHP',[(x['line'],x['turn'],x['enemy']['max_hp']) for x in a['max_hp_changes']])
