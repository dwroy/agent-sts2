import json,os,collections
root='learner/runs/20261007-051302-postmortem/'
byrun=collections.defaultdict(list)
for l in open(root+'prior-tunneler-decisions.jsonl'):
 d=json.loads(l)
 if d['screen']=='COMBAT':byrun[d['run_id']].append(d)
result=[]
for run,ds in byrun.items():
 floors={d['floor']for d in ds if '地道虫'in d['rationale']}
 ds=[d for d in ds if d['floor']in floors]
 if not ds:continue
 start=min(d['observed_ts']for d in ds);end=max(d['ts']for d in ds)
 ss=[]
 with open('logs/states.jsonl','rb')as f:
  lo=0;hi=os.path.getsize('logs/states.jsonl')
  while hi-lo>1048576:
   mid=(lo+hi)//2;f.seek(mid);f.readline();pos=f.tell();d=json.loads(f.readline())
   if d['ts']<start:lo=pos
   else:hi=mid
  f.seek(lo)
  if lo:f.readline()
  for line in f:
   d=json.loads(line)
   if d['ts']>end:break
   if d['ts']>=start and (d['state'].get('run_id')==run or run in d.get('fingerprint','')):
    ss.append(d)
 with open(root+'prior-'+run+'-tunneler-states.jsonl','w')as out:
  for d in ss:out.write(json.dumps(d,ensure_ascii=False)+'\n')
 prev=None;found=[]
 for st in ss:
  s=st['state'];c=s.get('combat')
  if not c:continue
  enemies=[e for e in c['enemies']if e.get('enemy_id')=='TUNNELER']
  if not enemies:continue
  e=enemies[0];burrow=any(x['power_id']=='BURROWED_POWER'for x in e['powers'])
  if prev and prev[1]and not burrow and e['current_hp']>0 and e['block']==0:
   old=prev[0];found.append({'before':old,'after':{'ts':st['ts'],'floor':s['run']['floor'],'turn':s['turn'],'enemy_hp':e['current_hp'],'block':e['block'],'intent':e['intent'],'intents':e['intents'],'player_hp':c['player']['current_hp']}})
  prev=({'ts':st['ts'],'floor':s['run']['floor'],'turn':s['turn'],'enemy_hp':e['current_hp'],'block':e['block'],'intent':e['intent'],'intents':e['intents'],'player_hp':c['player']['current_hp']},burrow)
 print(run,'帧',len(ss),'非致死破盾取消',json.dumps(found,ensure_ascii=False))
 result.append({'run':run,'window':[start,end],'frames':len(ss),'events':found})
with open(root+'prior-tunneler-audit.json','w')as out:json.dump(result,out,ensure_ascii=False,indent=2)
