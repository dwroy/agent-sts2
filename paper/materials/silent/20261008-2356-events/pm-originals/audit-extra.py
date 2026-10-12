import json,pathlib,datetime,collections,re
P=pathlib.Path('learner/runs/20261008-231302-postmortem');runs={}
with pathlib.Path('logs/runs.jsonl').open() as f:
 f.seek(0)
 for l in f:
  x=json.loads(l)
  if str(x.get('character','')).lower()=='silent':runs[x['run_id']]=x
D={r:json.loads((P/(r+'-subset.json')).read_text()) for r in ['M0GY0A4M2F7H','Z91JN3S3PQX2']}
limits={r:(d['decisions'][0]['ts'],d['decisions'][-1]['ts']) for r,d in D.items()};out={r:[] for r in D}
with pathlib.Path('logs/deepseek-reasoning.jsonl').open() as f:
 f.seek(0)
 for n,l in enumerate(f,1):
  try:x=json.loads(l)
  except ValueError:continue
  for r,(a,b) in limits.items():
   if a<=x.get('ts','')<=b:out[r].append({'line':n,**x})
(P/'reasoning-window-audit.json').write_text(json.dumps({'windows':limits,'matches':out},ensure_ascii=False,indent=2));print('推理窗',[(r,len(v)) for r,v in out.items()])
prior=[]
with pathlib.Path('logs/sl-attempts.jsonl').open() as f:
 f.seek(0)
 for n,l in enumerate(f,1):
  if 'Tungsten Rod' not in l or 'Sandpit' not in l:continue
  x=json.loads(l);r=x.get('run_id');meta=runs.get(r)
  if not meta or meta['ended']>=runs['Z91JN3S3PQX2']['ended']:continue
  prior.append({'line':n,'run':r,'floor':x.get('floor'),'turns':x.get('turns'),'result':x.get('result'),'judge':x.get('judge'),'ended':meta['ended']})
(P/'tungsten-prior-sl.json').write_text(json.dumps(prior,ensure_ascii=False,indent=2));print('更早钨棍沙坑',prior)
for r,d in D.items():
 ds=d['decisions'];meta=runs[r];dt=lambda v:datetime.datetime.fromisoformat(v.replace('Z','+00:00'))
 print('计量',r,'结束-首决策秒',(dt(meta['ended'])-dt(ds[0]['ts'])).total_seconds(),'结束-首观察',(dt(meta['ended'])-dt(ds[0]['observed_ts'])).total_seconds(),'脑延迟ms',sum(x.get('latency_ms',{}).get('deepseek',0) for x in ds),'缓存%',meta['ds_cache_hit']/meta['ds_tokens_in']*100)
 print('代码自选',collections.Counter(x['label'] for x in ds if x['decider']=='code' and x['label'].startswith('combat/') and x['label']!='combat/plan-continue'),'跟随jev计划',sum(x['decider']=='code' and 'Jev-chosen plan' in x.get('rationale','') for x in ds))
 for x in d['states']:
  s=x['state']
  if s['run']['floor'] in [12,13,14,15,17,21,28,33] and s.get('in_combat'):
   pass
