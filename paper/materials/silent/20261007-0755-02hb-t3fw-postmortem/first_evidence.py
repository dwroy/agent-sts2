import json,os
from pathlib import Path
p=Path('learner/runs/20261007-071302-postmortem')
start='2026-10-04T14:15:40.000Z';end='2026-10-04T14:16:15.000Z'
with open('logs/states.jsonl','rb') as h,(p/'C48-first-poison-states.jsonl').open('wb') as out:
 lo,hi=0,os.fstat(h.fileno()).st_size
 while hi-lo>1000000:
  m=(lo+hi)//2;h.seek(m);h.readline();pos=h.tell();ob=json.loads(h.readline())
  if ob['ts']<start:lo=pos
  else:hi=m
 h.seek(max(0,lo-1000000))
 if h.tell():h.readline()
 print('首证状态偏移',h.tell())
 while line:=h.readline():
  ob=json.loads(line)
  if ob['ts']<start:continue
  if ob['ts']>end:break
  s=ob['state']
  if s.get('run_id')!='C48LLXBGKXQ9':continue
  out.write(line)
  c=s.get('combat') or {};print(ob['ts'],s.get('turn'),s['run'].get('current_hp'),'敌',[(x['name'],x['enemy_id'],x['current_hp'],x['block']) for x in c.get('enemies',[])],'小刀',[(x['card_id'],x.get('dynamic_values')) for x in c.get('hand',[]) if x['card_id']=='SHIV'])
for l in (p/'C48-decisions.jsonl').open():
 d=json.loads(l)
 if d['floor']==30 and d['turn']==5:
  f=json.loads(d['fingerprint']);print(d['ts'],d['label'],d['rationale'],f['enemies'])
