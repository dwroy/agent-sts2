import json
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2');out=root/'learner/runs/20261007-234302-postmortem'
runs={}
with (root/'logs/runs.jsonl').open() as f:
 for z in f:
  x=json.loads(z)
  if str(x.get('character','')).lower()=='silent' and x.get('ended','')<='2026-10-07T15:19:58.532Z': runs[x['run_id']]=x
prev={};found=[];limit=(root/'logs/states.jsonl').stat().st_size;off=0
with (root/'logs/states.jsonl').open('rb') as f:
 for n,z in enumerate(f,1):
  off+=len(z)
  if off>limit:break
  if b'CRUSHER' not in z or b'WEAK_POWER' not in z:continue
  x=json.loads(z);st=x.get('state') or {};rid=st.get('run_id');c=st.get('combat') or {};es=c.get('enemies') or []
  if rid not in runs:continue
  en=next((e for e in es if e.get('enemy_id')=='CRUSHER'),None)
  if not en or en.get('move_id')!='ENLARGING_STRIKE_MOVE':continue
  pw={a['power_id']:a['amount'] for a in en.get('powers',[])};atk=sum(a.get('total_damage') or 0 for a in en.get('intents',[]))
  cur={'run':rid,'floor':st['run']['floor'],'turn':st.get('turn'),'line':n,'ts':x['ts'],'attack':atk,'powers':pw,'hp':st['run']['current_hp'],'block':c.get('player',{}).get('block'),'es':[(e['enemy_id'],e['current_hp'],sum(a.get('total_damage') or 0 for a in e.get('intents',[]))) for e in es]}
  old=prev.get(rid)
  if old and old['floor']==cur['floor'] and old['turn']==cur['turn'] and old['powers']==pw and old['attack']==1 and atk==2 and pw.get('WEAK_POWER',0)>0:
   found.append({'before':old,'after':cur,'asc':runs[rid]['ascension']})
  prev[rid]=cur
(out/'prior-rounding.json').write_text(json.dumps(found,ensure_ascii=False,indent=2)+'\n')
print('found',len(found));print(json.dumps(found[:3],ensure_ascii=False))
