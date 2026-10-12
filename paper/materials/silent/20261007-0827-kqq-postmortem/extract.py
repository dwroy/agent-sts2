import json,os
from pathlib import Path
out=Path('learner/runs/20261007-081301-postmortem')
ds=[json.loads(x) for x in (out/'decisions.jsonl').open()]
run='KQQELQSZ382Z';start=ds[0]['ts'];end=ds[-1]['ts']
for filename,lower in [('states','2026-10-06T23:27:20.000Z'),('deepseek-reasoning',start)]:
 path=Path('logs')/(filename+'.jsonl');size=path.stat().st_size
 with path.open('rb') as f:
  lo=0;hi=size
  while hi-lo>65536:
   mid=(lo+hi)//2;f.seek(mid);f.readline();line=f.readline()
   if not line:hi=mid;continue
   obj=json.loads(line)
   if obj['ts']<lower:lo=f.tell()
   else:hi=mid
  offset=max(0,lo-65536);f.seek(offset)
  if offset:f.readline()
  scanned=0;n=0
  with (out/(filename+'.jsonl')).open('wb') as dest:
   while True:
    line=f.readline()
    if not line:break
    scanned+=1;obj=json.loads(line);ts=obj['ts']
    if ts>end:break
    if ts<lower:continue
    if filename=='states' and obj['state'].get('run_id')!=run:continue
    dest.write(line);n+=1
  print(filename,'起点字节',offset,'扫描行',scanned,'抽取行',n)
