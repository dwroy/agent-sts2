import json,pathlib,collections
p=pathlib.Path('learner/runs/20261008-051302-postmortem');b=[json.loads(x) for x in (p/'brain.jsonl').open()];d=[json.loads(x) for x in (p/'decisions.jsonl').open()]
for r in b:
 if r['label'] in ['map/route-plan','event/act-plan','rest/plan','shop/plan']:
  print('BRAIN',r['_line'],r['label'],'KEYS',r['payload'].keys())
  def scan(x,path=''):
   if isinstance(x,dict):
    for k,v in x.items():
     if any(t in k.lower() for t in ['route','clock','projection','simulation','boss_sim']):print(path+'.'+k,json.dumps(v,ensure_ascii=False)[:4000])
     else:scan(v,path+'.'+k)
   elif isinstance(x,list):
    for i,v in enumerate(x):scan(v,path+f'[{i}]')
  scan(r['payload'])
for r in d:
 if r['label']=='map/route-plan' or r['label']=='event/act-plan':print('MAPQUESTION',r['_line'],json.dumps(r['questions'],ensure_ascii=False)[-7000:])
