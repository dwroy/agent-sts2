import json,os
from pathlib import Path
p=Path('learner/runs/20261007-074302-postmortem')
ds=[json.loads(x) for x in (p/'decisions.jsonl').open()]
start,end=ds[0]['ts'],ds[-1]['ts']
def lower(f,stamp):
 lo,hi=0,os.fstat(f.fileno()).st_size
 while hi-lo>262144:
  mid=(lo+hi)//2;f.seek(mid);f.readline();pos=f.tell();line=f.readline()
  if not line:hi=mid;continue
  try:t=json.loads(line).get('ts','')
  except ValueError:hi=mid;continue
  if t<stamp:lo=pos
  else:hi=mid
 return lo
for fn in ['states','deepseek-reasoning']:
 count=0
 with open('logs/'+fn+'.jsonl','rb') as f,(p/(fn+'.jsonl')).open('wb') as o:
  offset=lower(f,start);f.seek(offset)
  for line in f:
   try:x=json.loads(line)
   except ValueError:continue
   if x['ts']>end:break
   if x['ts']<start:continue
   if fn=='states' and x.get('state',{}).get('run_id')!='P5HT1272P5SB':continue
   o.write(line);count+=1
 print(fn,'偏移',offset,'抽取',count)
print('首末时间',start,end)
print('决策字段',list(ds[100]))
for x in ds:
 if x['decider']=='codex':
  print('大脑',x['floor'],x['turn'],x['label'],json.dumps(x['chosen'],ensure_ascii=False),x.get('journal'),x.get('rationale'))
 if x.get('hp_guard') or 'guard' in x.get('rationale','').lower():
  print('护栏',x['floor'],x['turn'],x.get('rationale'),[(k,v) for k,v in x.items() if 'guard' in k])
for x in [json.loads(l) for l in (p/'run-plans.jsonl').open()]:print('整局计划',json.dumps(x,ensure_ascii=False))
