import json,os
from pathlib import Path
P=Path('/home/dw/Projects/agent-sts2/learner/runs/20261007-084302-postmortem')
D=[json.loads(l) for l in (P/'decisions.jsonl').open()]
def locate(f,target,size):
 lo,hi=0,size
 while hi-lo>131072:
  mid=(lo+hi)//2; f.seek(mid);f.readline();pos=f.tell();line=f.readline()
  if not line: hi=mid;continue
  x=json.loads(line)
  if x['ts']<target: lo=pos
  else: hi=mid
 return lo
for name,start,end in [('states','2026-10-06T23:55:40.000Z','2026-10-07T00:32:29.000Z'),('deepseek-reasoning',D[0]['ts'],D[-1]['ts'])]:
 count=0
 with open('/home/dw/Projects/agent-sts2/logs/'+name+'.jsonl','rb') as f, (P/(name+'.jsonl')).open('wb') as out:
  size=os.fstat(f.fileno()).st_size;offset=locate(f,start,size);f.seek(offset)
  for line in f:
   x=json.loads(line)
   if x['ts']>end:break
   if x['ts']<start:continue
   if name=='states' and (x['state'].get('run_id')!='YLYLZWHA0GKU' or x.get('session')!='singleplayer/run'):continue
   out.write(line);count+=1
 print(name,'offset',offset,'count',count)
S=[json.loads(l) for l in (P/'states.jsonl').open()]
for x in [S[0],next(x for x in S if x['state'].get('in_combat') and x['state']['run']['floor']==45),S[-1]]:
 s=x['state'];print('state',x['ts'],s['screen'],'run keys',list(s['run']),'combat',json.dumps(s.get('combat'),ensure_ascii=False)[:5000])
