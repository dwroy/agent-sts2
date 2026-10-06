import json,os
BASE='learner/runs/20261007-004301-postmortem/'
LOW='2026-10-06T15:37:00';HIGH='2026-10-06T16:20:00'
def lower_bound(f,size,target):
 lo,hi=0,size
 while hi-lo>200000:
  mid=(lo+hi)//2;f.seek(mid);f.readline();pos=f.tell();line=f.readline()
  if not line:hi=mid;continue
  t=json.loads(line).get('ts','')
  if t<target:lo=pos
  else:hi=mid
 f.seek(lo)
 if lo:f.readline()
 return f.tell()
for name in ['states','deepseek-reasoning']:
 path='logs/'+name+'.jsonl';size=os.path.getsize(path);count=0
 with open(path,'rb') as f,open(BASE+name+'.jsonl','wb') as out:
  start=lower_bound(f,size,LOW)
  while f.tell()<size:
   pos=f.tell();line=f.readline();d=json.loads(line);t=d.get('ts','')
   if t>HIGH:break
   if LOW<=t<=HIGH:
    out.write(line);count+=1
  print(name,'bytes',start,f.tell(),'count',count,'first-offset',start)
