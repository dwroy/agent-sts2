import json,pathlib,os
p=pathlib.Path('learner/runs/20261007-061301-postmortem')
ds=[json.loads(l) for l in (p/'53FLQ68CETW0.F48T5.decisions.jsonl').open()]
start=ds[0]['observed_ts'];end=ds[-1]['ts']
with open('logs/states.jsonl','rb') as f:
 lo,hi=0,os.fstat(f.fileno()).st_size
 while hi-lo>1000000:
  m=(lo+hi)//2;f.seek(m);f.readline();pos=f.tell();line=f.readline()
  if json.loads(line)['ts']<start:lo=pos+len(line)
  else:hi=m
 f.seek(lo);rows=[]
 with (p/'53FLQ68CETW0.F48T5.states.jsonl').open('wb') as out:
  for l in f:
   d=json.loads(l)
   if d['ts']>end:break
   if d['ts']>=start and d['state'].get('run_id')=='53FLQ68CETW0':out.write(l);rows.append(d)
目标=[d for d in ds if d.get('expect',{}).get('card',{}).get('id')=='EXPOSE']
for d in 目标:
 print('暴露前后',d.get('sl_attempt'),d['observed_ts'])
 相邻=[r for r in rows if d['observed_ts']<=r['ts'] and r['ts']<=d['ts'][:19]+'.999Z']
 for r in 相邻[:3]:
  c=r['state'].get('combat',{});print(r['ts'],[(e['current_hp'],e['block'],[(x['power_id'],x['amount']) for x in e['powers']]) for e in c.get('enemies',[])])
 后续=[r for r in rows if r['ts']>d['ts']]
 if 后续:
  r=后续[0];c=r['state'].get('combat',{});print('下一帧',r['ts'],[(e['current_hp'],e['block'],[(x['power_id'],x['amount']) for x in e['powers']]) for e in c.get('enemies',[])])
