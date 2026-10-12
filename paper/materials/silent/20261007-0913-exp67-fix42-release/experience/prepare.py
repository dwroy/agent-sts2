import json,pathlib,subprocess,shutil
O=pathlib.Path(__file__).parent
ROOT=pathlib.Path('/home/dw/Projects/agent-sts2')
OLD=O.parent/'20261007-075642-experience-update'
NEW='KQQELQSZ382Z'
rows=[json.loads(s) for s in (ROOT/'logs/runs.jsonl').open()]
target=next(r for r in rows if r['run_id']==NEW)
assert target['character'].lower()=='silent'
runs=[r for r in rows if (r.get('character') or '').lower()=='silent' and r.get('ended') and r['ended']<=target['ended']]
assert [r['run_id'] for r in runs[:-1]]==json.load(open(OLD/'runs.json'))
(O/'runs.json').write_text(json.dumps([r['run_id'] for r in runs])+'\n')
(O/'run-metadata.json').write_text(json.dumps(runs,ensure_ascii=False,indent=2)+'\n')
shutil.copyfile(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json',O/'experience-before.json')
for r in runs:
 d=O/r['run_id'];d.mkdir(exist_ok=True)
 if r['run_id']!=NEW:
  for name in ['states.jsonl','decisions.jsonl','brain.jsonl','sl-attempts.jsonl','completed-runs.json']:
   if not (d/name).exists():(d/name).symlink_to(OLD/r['run_id']/name)
  shutil.copyfile(OLD/r['run_id']/'analyze.py',d/'analyze.py')
 else:
  for name in ['decisions','brain','sl-attempts','run-plans','jev-prompts']:
   with (d/(name+'.jsonl')).open('w') as h:
    q=subprocess.run(['nice','-n','19','rg','--fixed-strings',NEW,str(ROOT/'logs'/(name+'.jsonl'))],stdout=h)
    assert q.returncode in [0,1]
  (d/'completed-runs.json').write_text(json.dumps(runs,ensure_ascii=False)+'\n')
  (d/'analyze.py').write_text((OLD/'P5HT1272P5SB/analyze.py').read_text().replace("RUN = 'P5HT1272P5SB'",'RUN = '+repr(NEW)))
for filename,lower in [('states','2026-10-06T23:27:20.000Z'),('deepseek-reasoning','2026-10-06T23:27:46.018Z')]:
 p=ROOT/'logs'/(filename+'.jsonl')
 with p.open('rb') as f:
  lo=0;hi=p.stat().st_size
  while hi-lo>65536:
   mid=(lo+hi)//2;f.seek(mid);f.readline();line=f.readline()
   if not line:hi=mid;continue
   if json.loads(line)['ts']<lower:lo=f.tell()
   else:hi=mid
  offset=max(0,lo-65536);f.seek(offset)
  if offset:f.readline()
  offsets=[]
  with (O/NEW/(filename+'.jsonl')).open('wb') as h:
   while True:
    off=f.tell();line=f.readline()
    if not line:break
    x=json.loads(line)
    if x['ts']>target['ended']:break
    if x['ts']<lower:continue
    if filename=='states' and (x['state'].get('run_id')!=NEW or x['state'].get('run',{}).get('character_id','').lower()!='silent'):continue
    h.write(line);offsets.append(off)
  (O/(filename+'-offsets.json')).write_text(json.dumps(dict(seek=offset,first=offsets[0] if offsets else None,last=offsets[-1] if offsets else None,n=len(offsets)))+'\n')
for r in runs:
 d=O/r['run_id']
 with (d/'analysis.log').open('w') as h:subprocess.run(['nice','-n','19','python3',str(d/'analyze.py')],stdout=h,stderr=subprocess.STDOUT,check=True)
for name in ['audit.py','summarize.py','slices.py']:
 code=(OLD/name).read_text()
 if name=='audit.py':code=code.replace('2026-10-06T23:23:38.170Z',target['ended'])
 if name=='summarize.py':code=code.replace('20261007-073027-experience-update','20261007-075642-experience-update').replace('P5HT1272P5SB/completed-runs.json',NEW+'/completed-runs.json')
 (O/name).write_text(code)
for name in ['audit.py','summarize.py']:
 with (O/(name+'.log')).open('w') as h:subprocess.run(['nice','-n','19','python3',str(O/name)],stdout=h,stderr=subprocess.STDOUT,check=True)
print('全部复算完成',len(runs),'局',target['ended'])
