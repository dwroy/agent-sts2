import json, pathlib, os
root=pathlib.Path('/home/dw/Projects/agent-sts2')
out=root/'learner/runs/20261007-021301-postmortem'
start='2026-10-06T17:27:19.000Z'; end='2026-10-06T18:00:36.000Z'
for name in ['states','deepseek-reasoning']:
 path=root/'logs'/f'{name}.jsonl'
 size=path.stat().st_size
 with path.open('rb') as f:
  first=json.loads(f.readline())
  f.seek(max(0,size-1500000)); f.readline()
  last=None
  for line in f:
   try: last=json.loads(line)
   except ValueError: pass
  print(name,'键',list(first),'首尾',first.get('ts'),last.get('ts'))
  lo=0; hi=size
  while hi-lo>2000000:
   mid=(lo+hi)//2; f.seek(mid); f.readline(); pos=f.tell(); line=f.readline()
   try: row=json.loads(line)
   except ValueError: hi=mid; continue
   ts=row.get('ts','')
   if ts<start: lo=pos
   else: hi=mid
  f.seek(lo)
  if lo: f.readline()
  count=0; begin=None; stop=None
  with (out/f'{name}.jsonl').open('wb') as w:
   while True:
    pos=f.tell(); line=f.readline()
    if not line: break
    try: row=json.loads(line)
    except ValueError: continue
    ts=row.get('ts','')
    if ts>end: stop=pos; break
    if ts>=start:
     if begin is None: begin=pos
     w.write(line); count+=1
  print(name,'起止偏移',begin,stop,'条数',count)
