import json,pathlib,subprocess,shutil
O=pathlib.Path(__file__).parent
ROOT=pathlib.Path('/home/dw/Projects/agent-sts2')
OLD=O.parent/'20261007-052654-experience-update'
NEW=['HSX4HYATB4E2','WYB0NCD6W83J']
rows=[json.loads(s) for s in (ROOT/'logs/runs.jsonl').open()]
target=next(r for r in rows if r['run_id']==NEW[-1])
runs=[r for r in rows if (r.get('character') or '').lower()=='silent' and r['ended']<=target['ended']]
assert [r['run_id'] for r in runs[:-2]]==json.load(open(OLD/'runs.json'))
assert all(next(r for r in runs if r['run_id']==n)['character'].lower()=='silent' for n in NEW)
(O/'runs.json').write_text(json.dumps([r['run_id'] for r in runs])+'\n')
(O/'run-metadata.json').write_text(json.dumps(runs,ensure_ascii=False,indent=2)+'\n')
shutil.copyfile(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json',O/'experience-before.json')
for r in runs:
 d=O/r['run_id'];d.mkdir(exist_ok=True)
 if r['run_id'] not in NEW:
  for name in ['states.jsonl','decisions.jsonl','brain.jsonl','sl-attempts.jsonl','completed-runs.json']:(d/name).symlink_to(OLD/r['run_id']/name)
 else:
  for name in ['decisions','brain','sl-attempts','run-plans']:
   with (d/(name+'.jsonl')).open('w') as h:
    q=subprocess.run(['nice','-n','19','rg','--fixed-strings',r['run_id'],str(ROOT/'logs'/(name+'.jsonl'))],stdout=h)
    assert q.returncode in [0,1]
  (d/'completed-runs.json').write_text(json.dumps([x for x in runs if x['ended']<=r['ended']],ensure_ascii=False)+'\n')
 code=(OLD/'QNTW139MGECA/analyze.py').read_text().replace("RUN = 'QNTW139MGECA'",repr(r['run_id']).join(["RUN = ",""]))
 (d/'analyze.py').write_text(code)
handles={n:(O/n/'states.jsonl').open('wb') for n in NEW}; offsets={n:[] for n in NEW}
with (ROOT/'logs/states.jsonl').open('rb') as f:
 f.seek(8137440636);f.readline()
 while True:
  off=f.tell();line=f.readline()
  if not line:break
  s=json.loads(line)
  if s['ts']>target['ended'][:19]+'.999Z':break
  state=s.get('state',{});run=state.get('run_id')
  if run in NEW and state.get('run',{}).get('character_id','').lower()=='silent':handles[run].write(line);offsets[run].append(off)
for n,h in handles.items():h.close()
(O/'new-state-offsets.json').write_text(json.dumps({n:dict(first=v[0],last=v[-1],n=len(v)) for n,v in offsets.items()})+'\n')
for r in runs:
 d=O/r['run_id']
 with (d/'analysis.log').open('w') as h:subprocess.run(['nice','-n','19','python3',str(d/'analyze.py')],stdout=h,stderr=subprocess.STDOUT,check=True)
 print('复算',r['run_id'],flush=True)
for name in ['audit.py','summarize.py','slices.py','merge-live.py']:
 code=(OLD/name).read_text()
 if name=='audit.py':code=code.replace('2026-10-06T21:03:12.594Z',target['ended'])
 if name=='summarize.py':code=code.replace('20261007-045607-experience-update','20261007-052654-experience-update').replace('QNTW139MGECA/completed-runs.json','WYB0NCD6W83J/completed-runs.json')
 (O/name).write_text(code)
for name in ['audit.py','summarize.py']:
 with (O/(name+'.log')).open('w') as h:subprocess.run(['nice','-n','19','python3',str(O/name)],stdout=h,stderr=subprocess.STDOUT,check=True)
print('全部复算完成',flush=True)
