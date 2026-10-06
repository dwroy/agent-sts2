import json,pathlib,os
p=pathlib.Path('learner/runs/20261007-061301-postmortem')
runs=['HSX4HYATB4E2','WYB0NCD6W83J']
def lower(f,ts):
 lo,hi=0,os.fstat(f.fileno()).st_size
 while hi-lo>1000000:
  m=(lo+hi)//2;f.seek(m);f.readline();pos=f.tell();line=f.readline()
  if not line:hi=m;continue
  d=json.loads(line)
  if d['ts']<ts:lo=pos+len(line)
  else:hi=m
 f.seek(lo)
 if lo: pass
 while True:
  pos=f.tell();line=f.readline()
  if not line:return pos
  if json.loads(line)['ts']>=ts:return pos
for run in runs:
 ds=[json.loads(l) for l in (p/(run+'.decisions.jsonl')).open()]
 start=min(d.get('observed_ts',d['ts']) for d in ds);end=ds[-1]['ts']
 for source in ['states','deepseek-reasoning']:
  with open('logs/'+source+'.jsonl','rb') as f:
   offset=lower(f,start);f.seek(offset);count=0
   with (p/(run+'.'+source+'.jsonl')).open('wb') as out:
    while True:
     line=f.readline()
     if not line:break
     d=json.loads(line)
     if d['ts']>end:break
     if source=='states' and d.get('state',{}).get('run_id')!=run:continue
     out.write(line);count+=1
   print(run,source,'偏移',offset,'条数',count)
