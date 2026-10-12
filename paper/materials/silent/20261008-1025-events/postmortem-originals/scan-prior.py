import json,re
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2');out=p/'learner/runs/20261008-094302-postmortem'
ids=set()
with (p/'notes/lessons.md').open() as h:
 for line in h:
  m=re.match(r'^## ([A-Z0-9]{12})（A\d+，静默猎手',line)
  if m:ids.add(m[1])
rows={};counts={}
needle=re.compile(rb'"run_id"\s*:\s*"([A-Z0-9]{12})"')
with (p/'logs/states.jsonl').open('rb') as h:
 for n,line in enumerate(h,1):
  if b'INFECTION' not in line and b'PHROG_PARASITE' not in line:continue
  m=needle.search(line)
  if not m or m[1].decode() not in ids:continue
  x=json.loads(line);s=x.get('state') or {};run=s.get('run') or {}
  if str(run.get('character_id')).lower()!='silent':continue
  c=s.get('combat') or {};cards=[v for v in c.get('hand',[]) if v.get('card_id')=='INFECTION'];en=c.get('enemies',[])
  ident=s.get('run_id');key=(ident,run.get('floor'))
  if any(e.get('enemy_id')=='PHROG_PARASITE' for e in en) or cards:
   row={'run':ident,'line':n,'ts':x['ts'],'floor':run.get('floor'),'turn':s.get('turn'),'hp':run.get('current_hp'),'block':(c.get('player') or {}).get('block'),'energy':(c.get('player') or {}).get('energy'),'infection':len(cards),'hand':[(q.get('card_id'),q.get('energy_cost'),q.get('playable')) for q in c.get('hand',[])],'enemies':[(e.get('enemy_id'),e.get('current_hp'),e.get('max_hp')) for e in en]}
   rows.setdefault(key,[]).append(row)
result=[{'run':key[0],'floor':key[1],'first':v[0],'first_infection':next((x for x in v if x['infection']),None),'frames':len(v),'pass_windows':[{'from':a,'to':b} for a,b in zip(v,v[1:]) if b['turn']!=a['turn'] and a['energy']==3 and any(q[0]=='DEADLY_POISON' and q[2] for q in a['hand']) and a['hand']==b['hand']]} for key,v in rows.items()]
result.sort(key=lambda x:x['first']['ts'])
(out/'prior-infection-phrog.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
for x in result:print(x['run'],'F',x['floor'],'首帧',x['first']['line'],x['first']['ts'],'首感染',x['first_infection'],'帧数',x['frames'])
