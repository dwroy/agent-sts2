import json,os
from pathlib import Path
P=Path('/home/dw/Projects/agent-sts2/learner/runs/20261007-014302-postmortem')
D=[json.loads(l) for l in (P/'decisions.jsonl').open()]
windows={r:(min(x['observed_ts'] or x['ts'] for x in D if x['run_id']==r),max(x['ts'] for x in D if x['run_id']==r)) for r in ['DPYF2BAA3DKT','CRK2HNYKSCZC']}
def lower(f,key):
 lo=0;hi=os.fstat(f.fileno()).st_size
 while hi-lo>65536:
  mid=(lo+hi)//2;f.seek(mid);f.readline();at=f.tell();line=f.readline()
  if not line:hi=mid;continue
  try:ts=json.loads(line).get('ts','')
  except:hi=mid;continue
  if ts<key:lo=at+len(line)
  else:hi=mid
 f.seek(max(0,lo-65536))
 if f.tell():f.readline()
 while True:
  at=f.tell();line=f.readline()
  if not line:return at
  if json.loads(line).get('ts','')>=key:return at
for kind in ['states','deepseek-reasoning']:
 with open('/home/dw/Projects/agent-sts2/logs/'+kind+'.jsonl','rb') as f:
  for r,(start,end) in windows.items():
   start=start[:17]+'00.000Z';end=end[:17]+'59.999Z'
   offset=lower(f,start);f.seek(offset);count=0;size=0
   with (P/(r+'-'+kind+'.jsonl')).open('wb') as out:
    while line:=f.readline():
     x=json.loads(line);ts=x.get('ts','')
     if ts>end:break
     if ts>=start:
      out.write(line);count+=1;size+=len(line)
   print(r,kind,'offset',offset,'count',count,'bytes',size)
