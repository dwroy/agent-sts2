import json,pathlib,os
p=pathlib.Path('learner/runs/20261007-064303-postmortem')
def lower(f,ts):
 lo,hi=0,os.fstat(f.fileno()).st_size
 while hi-lo>1000000:
  m=(lo+hi)//2;f.seek(m);f.readline();pos=f.tell();line=f.readline()
  if not line:hi=m;continue
  if json.loads(line)['ts']<ts:lo=pos+len(line)
  else:hi=m
 f.seek(lo)
 while True:
  pos=f.tell();line=f.readline()
  if not line or json.loads(line)['ts']>=ts:return pos
windows=[('T082DRCUHRRD','2026-10-04T16:35:35.000Z','2026-10-04T16:36:12.000Z')]
for run,start,end in windows:
 with open('logs/states.jsonl','rb') as f, (p/(run+'.prior-states.jsonl')).open('wb') as out:
  off=lower(f,start);f.seek(off);n=0
  while line:=f.readline():
   r=json.loads(line)
   if r['ts']>end:break
   s=r['state']
   if s.get('run_id')!=run:continue
   out.write(line);n+=1;c=s.get('combat') or {}
   print(run,r['ts'],s.get('run',{}).get('floor'),s.get('turn'),s['screen'],s.get('run',{}).get('current_hp'),c.get('player',{}).get('block'),'敌',[(e['current_hp'],[(x['power_id'],x['amount']) for x in e['powers'] if x['power_id']=='POISON_POWER']) for e in c.get('enemies',[])],'惩罚',[(x['name'],x['card_id'],x['resolved_rules_text']) for x in c.get('hand',[]) if x['card_id'] in ['TOXIC','WITHER']])
  print('偏移',off,'条数',n)
