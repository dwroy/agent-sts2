import json,os,collections
root='learner/runs/20261007-051302-postmortem/'
a=[json.loads(x) for x in open(root+'decisions.jsonl')]
start=min(d.get('observed_ts',d['ts']) for d in a); end=a[-1]['ts']
p='logs/states.jsonl'
with open(p,'rb') as f:
 lo,hi=0,os.path.getsize(p)
 while hi-lo>1048576:
  mid=(lo+hi)//2;f.seek(mid);f.readline();pos=f.tell();line=f.readline()
  ts=json.loads(line)['ts']
  if ts<start:lo=pos
  else:hi=mid
 f.seek(lo)
 if lo:f.readline()
 n=0;first=None;last=None
 with open(root+'states.jsonl','wb') as out:
  while True:
   pos=f.tell();line=f.readline()
   if not line:break
   d=json.loads(line)
   if d['ts']>end:break
   if d['ts']>=start and d.get('session')=='singleplayer/run' and d['state'].get('run_id')=='QNTW139MGECA':
    out.write(line);n+=1;first=pos if first is None else first;last=f.tell()
 print('状态窗',start,end,'帧',n,'字节',first,last)
s=[json.loads(x) for x in open(root+'states.jsonl')]
for d in s:
 if d['state'].get('combat'):
  c=d['state']['combat'];print('战斗结构',json.dumps(c,ensure_ascii=False)[:6500]);break
for d in a:
 if 'rollout' in d:
  print('推演结构',json.dumps({k:v for k,v in d.items() if k in ['floor','turn','chosen','rationale','questions','answers','rollout','rollout_best_chosen','focus','potions']},ensure_ascii=False)[:7500]);break
