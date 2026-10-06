import json,os,datetime
from pathlib import Path
p=Path('learner/runs/20261007-044301-postmortem')
ds=[json.loads(x) for x in (p/'decisions.jsonl').open()]
start=(datetime.datetime.fromisoformat(ds[0]['ts'].replace('Z','+00:00'))-datetime.timedelta(seconds=3)).isoformat(timespec='milliseconds').replace('+00:00','Z')
end=(datetime.datetime.fromisoformat(ds[-1]['ts'].replace('Z','+00:00'))+datetime.timedelta(seconds=3)).isoformat(timespec='milliseconds').replace('+00:00','Z')
def lower(f,target,size):
 lo,hi=0,size
 while hi-lo>250000:
  mid=(lo+hi)//2;f.seek(mid);f.readline();line=f.readline()
  if not line:hi=mid;continue
  obj=json.loads(line)
  if obj['ts']<target:lo=f.tell()
  else:hi=mid
 return max(0,lo-250000)
for name in ['states.jsonl','deepseek-reasoning.jsonl']:
 size=os.path.getsize('logs/'+name);count=0
 with open('logs/'+name,'rb') as f,(p/name).open('wb') as out:
  pos=lower(f,start,size);f.seek(pos)
  if pos:f.readline()
  actual_start=f.tell()
  while line:=f.readline():
   o=json.loads(line);ts=o['ts']
   if ts>end:break
   if ts<start:continue
   if name=='states.jsonl' and o.get('state',{}).get('run_id')!='8R5CXD5C8PW8':continue
   out.write(line);count+=1
  print(name,'开始偏移',actual_start,'截止偏移',f.tell(),'条数',count)
