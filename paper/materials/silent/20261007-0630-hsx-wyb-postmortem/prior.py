import json,pathlib,os
p=pathlib.Path('learner/runs/20261007-061301-postmortem')
ds=[json.loads(l) for l in (p/'R0HEV5E3QT6G.F8.decisions.jsonl').open()]
start=ds[0]['observed_ts'];end=ds[-1]['ts']
with open('logs/states.jsonl','rb') as f:
 lo,hi=0,os.fstat(f.fileno()).st_size
 while hi-lo>1000000:
  m=(lo+hi)//2;f.seek(m);f.readline();pos=f.tell();line=f.readline()
  if json.loads(line)['ts']<start:lo=pos+len(line)
  else:hi=m
 f.seek(lo);rows=[]
 with (p/'R0HEV5E3QT6G.F8.states.jsonl').open('wb') as out:
  for l in f:
   d=json.loads(l)
   if d['ts']>end:break
   if d['ts']>=start and d['state'].get('run_id')=='R0HEV5E3QT6G':out.write(l);rows.append(d)
old=None
for r in rows:
 s=r['state'];c=s.get('combat',{});es=c.get('enemies',[])
 if not es:continue
 simple=(s.get('turn'),c.get('player',{}).get('current_hp'),[(e['max_hp'],e['current_hp'],e['block'],[(x['power_id'],x['amount']) for x in e['powers']]) for e in es])
 if simple!=old:print(simple);old=simple
