import json, pathlib, subprocess, shutil
O=pathlib.Path(__file__).parent
ROOT=pathlib.Path('/home/dw/Projects/agent-sts2')
OLD=ROOT/'learner/runs/20261007-073027-experience-update'
NEW=['P5HT1272P5SB']
rows=[json.loads(s) for s in (ROOT/'logs/runs.jsonl').open()]
target=next(r for r in rows if r['run_id']==NEW[-1])
assert all(next(r for r in rows if r['run_id']==n).get('character','').lower()=='silent' for n in NEW)
runs=[r for r in rows if (r.get('character') or '').lower()=='silent' and r.get('ended') and r['ended']<=target['ended']]
assert [r['run_id'] for r in runs[:-1]]==json.load(open(OLD/'runs.json'))
(O/'runs.json').write_text(json.dumps([r['run_id'] for r in runs])+'\n')
(O/'run-metadata.json').write_text(json.dumps(runs,ensure_ascii=False,indent=2)+'\n')
shutil.copyfile(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json',O/'experience-before.json')
for r in runs:
 d=O/r['run_id'];d.mkdir(exist_ok=True)
 if r['run_id'] not in NEW:
  for name in ['states.jsonl','decisions.jsonl','brain.jsonl','sl-attempts.jsonl','completed-runs.json']:(d/name).symlink_to(OLD/r['run_id']/name)
  shutil.copyfile(OLD/r['run_id']/'analyze.py',d/'analyze.py')
 else:
  for name in ['decisions','brain','sl-attempts','run-plans','jev-prompts']:
   with (d/(name+'.jsonl')).open('w') as h:
    q=subprocess.run(['nice','-n','19','rg','--fixed-strings',r['run_id'],str(ROOT/'logs'/(name+'.jsonl'))],stdout=h)
    assert q.returncode in [0,1]
  (d/'completed-runs.json').write_text(json.dumps([x for x in runs if x['ended']<=r['ended']],ensure_ascii=False)+'\n')
  code=(OLD/'T3FW7R2R2306/analyze.py').read_text().replace("RUN = 'T3FW7R2R2306'",'RUN = '+repr(r['run_id']))
  (d/'analyze.py').write_text(code)
handles={n:(O/n/'states.jsonl').open('wb') for n in NEW}; offsets={n:[] for n in NEW}
with (ROOT/'logs/states.jsonl').open('rb') as f:
 f.seek(8206441331)
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
for name in ['audit.py','summarize.py','slices.py']:
 code=(OLD/name).read_text()
 if name=='audit.py':code=code.replace('2026-10-06T22:57:51.524Z',target['ended'])
 if name=='summarize.py':code=code.replace('20261007-070019-experience-update','20261007-073027-experience-update').replace('T3FW7R2R2306/completed-runs.json','P5HT1272P5SB/completed-runs.json')
 (O/name).write_text(code)
for name in ['audit.py','summarize.py']:
 with (O/(name+'.log')).open('w') as h:subprocess.run(['nice','-n','19','python3',str(O/name)],stdout=h,stderr=subprocess.STDOUT,check=True)
print('全部复算完成',flush=True)
