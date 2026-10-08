import subprocess,json,pathlib
out=pathlib.Path('learner/runs/20261009-031301-postmortem')
selected=[]
p=subprocess.Popen(['rg','-n','-F','C48LLXBGKXQ9','logs/decisions.jsonl'],stdout=subprocess.PIPE,text=True)
for raw in p.stdout:
 n,t=raw.split(':',1);r=json.loads(t)
 if r.get('expect',{}).get('card',{}).get('id')=='BLADE_DANCE' or any('刀刃之舞' in str(v) for v in r.get('questions',{}).get('plan',{}).get('criteria',{}).values()):
  selected.append({'_line':int(n),**r})
p.wait();(out/'prior-blade-decisions.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2)+'\n')
print('MATCHES',len(selected))
for r in selected[:12]:
 print(r['_line'],r['floor'],r.get('turn'),r['label'],r['chosen'],r['rationale'])
 for k,v in r.get('questions',{}).get('plan',{}).get('criteria',{}).items():
  try:v=json.loads(v)
  except:continue
  if '刀刃之舞' in v.get('plays',''):print(k,{a:v.get(a) for a in ['plays','cards_drawn','damage_dealt','hp_lost','rollout']})
