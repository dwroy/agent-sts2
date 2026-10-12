import json,os,collections,datetime
from pathlib import Path
p=Path('learner/runs/20261007-071302-postmortem')
ids=['02HB4L0C3C67','T3FW7R2R2306']
ds=[json.loads(s) for s in (p/'decisions.jsonl').open()]
def seek_ts(h,ts):
 lo,hi=0,os.fstat(h.fileno()).st_size
 while hi-lo>1000000:
  m=(lo+hi)//2;h.seek(m);h.readline();pos=h.tell();line=h.readline()
  try:t=json.loads(line)['ts']
  except Exception:hi=m;continue
  if t<ts:lo=pos
  else:hi=m
 h.seek(max(0,lo-1000000))
 if h.tell():h.readline()
 return h.tell()
for run in ids:
 a=[d for d in ds if d['run_id']==run]
 start=min(d.get('observed_ts',d['ts']) for d in a);end=a[-1]['ts']
 start=(datetime.datetime.fromisoformat(start.replace('Z','+00:00'))-datetime.timedelta(seconds=60)).isoformat(timespec='milliseconds').replace('+00:00','Z')
 with open('logs/states.jsonl','rb') as h,(p/(run+'-states.jsonl')).open('wb') as out:
  off=seek_ts(h,start);n=0
  while line:=h.readline():
   ob=json.loads(line)
   if ob['ts']<start:continue
   if ob['ts']>end:break
   s=ob['state']
   if s.get('run_id')==run or json.loads(ob.get('fingerprint','{}')).get('run')==run:out.write(line);n+=1
  print(run,'状态起始偏移',off,'帧数',n)
 with open('logs/deepseek-reasoning.jsonl','rb') as h,(p/(run+'-reasoning.jsonl')).open('wb') as out:
  off=seek_ts(h,start);n=0
  while line:=h.readline():
   ob=json.loads(line)
   if ob['ts']<a[0]['ts']:continue
   if ob['ts']>end:break
   out.write(line);n+=1
  print(run,'DeepSeek推理窗条数',n)
 summary=[]
 for d in a:
  if not d['label'].startswith('combat/') and not d['label'].startswith('selection/choose'):
   f=json.loads(d['fingerprint'])
   summary.append({k:d.get(k) for k in ['ts','floor','turn','label','decider','chosen','journal','rationale','boss_sim','route_change']})
   summary[-1]['hp']=f['hp']
 (p/(run+'-choices.json')).write_text(json.dumps(summary,ensure_ascii=False,indent=2))
 stats={'决策数':len(a),'起止':[a[0]['ts'],a[-1]['ts']],'分工':dict(collections.Counter(d['decider'] for d in a)), '低信心':[(d['floor'],d['turn'],d['label'],d['confidence']) for d in a if d['decider']=='jev' and d.get('confidence') is not None and d['confidence']<.35]}
 combat=[d for d in a if d['label'].startswith('combat/')]
 jev=[d for d in combat if d['decider']=='jev']
 stats['推演标记']=dict(collections.Counter(str(d.get('rollout_best_chosen')) for d in jev))
 stats['自主战斗']=dict(collections.Counter(d['label'] for d in combat if d['decider']=='code' and d['label']!='combat/plan-continue'))
 rounds=set((d['floor'],d['turn']) for d in combat);jrounds=set((d['floor'],d['turn']) for d in jev)
 auto=[d for d in combat if d['decider']=='code' and d['label']!='combat/plan-continue']
 stats['回合数']={'总数':len(rounds),'无Jev':len(rounds-jrounds),'有代码自主':len(set((d['floor'],d['turn']) for d in auto)),'有代码非结束自主':len(set((d['floor'],d['turn']) for d in auto if d['chosen']['action']!='end_turn'))}
 stats['护栏']=[{k:d.get(k) for k in ['floor','turn','label','rationale','hp_guard','hp_guard_override']} for d in a if any('guard' in k for k in d) or 'guardrail' in d['rationale'].lower()]
 stats['focus']=[{'floor':d['floor'],'turn':d['turn'],'answers':d.get('answers'),'questions':d.get('questions')} for d in combat if any('focus' in v for q in d.get('questions',{}).values() for v in q.get('criteria',{}).values())]
 stats['SL']=max(d.get('sl_reloads',0) for d in a)
 stats['末战选线']=[{'turn':d['turn'],'rationale':d['rationale'],'best':d.get('rollout_best_chosen'),'chosen':d['chosen'],'criteria':{k:json.loads(v) for q in d.get('questions',{}).values() for k,v in q.get('criteria',{}).items()}} for d in combat if d['floor']==max(x['floor'] for x in combat) and d['label']!='combat/plan-continue']
 (p/(run+'-stats.json')).write_text(json.dumps(stats,ensure_ascii=False,indent=2))
 print(run,json.dumps({k:v for k,v in stats.items() if k not in ['focus','末战选线']},ensure_ascii=False))
