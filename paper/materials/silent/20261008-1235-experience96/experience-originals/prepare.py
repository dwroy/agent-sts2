import json,pathlib,subprocess,shutil
from pathlib import Path
O=pathlib.Path(__file__).parent
ROOT=pathlib.Path('/home/dw/Projects/agent-sts2')
OLD=Path('/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-111006-experience-update')
NEW=['9R916WW0V65N']
rows=[json.loads(s) for s in (ROOT/'logs/runs.jsonl').open()]
targets={n:next(r for r in rows if r['run_id']==n) for n in NEW}
assert all(r['character'].lower()=='silent' for r in targets.values())
cutoff=max(r['ended'] for r in targets.values())
runs=[r for r in rows if (r.get('character') or '').lower()=='silent' and r.get('ended') and r['ended']<=cutoff]
oldruns=json.load(open(OLD/'runs.json'))
assert [r['run_id'] for r in runs if r['run_id'] not in NEW]==oldruns
(O/'runs.json').write_text(json.dumps([r['run_id'] for r in runs])+'\n')
(O/'run-metadata.json').write_text(json.dumps(runs,ensure_ascii=False,indent=2)+'\n')
shutil.copyfile(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json',O/'experience-before.json')
for i,r in enumerate(runs):
 n=r['run_id'];d=O/n;d.mkdir(exist_ok=True)
 if n not in NEW:
  for name in ['states.jsonl','decisions.jsonl','brain.jsonl','sl-attempts.jsonl','completed-runs.json']:
   if not (d/name).exists():(d/name).symlink_to((OLD/n/name).resolve(strict=True))
  shutil.copyfile(OLD/n/'analyze.py',d/'analyze.py')
 else:
  for name in ['decisions','brain','sl-attempts','run-plans','jev-prompts']:
   with (d/(name+'.jsonl')).open('w') as h:
    q=subprocess.run(['nice','-n','19','rg','--fixed-strings',n,str(ROOT/'logs'/(name+'.jsonl'))],stdout=h)
    assert q.returncode in [0,1]
  (d/'completed-runs.json').write_text(json.dumps(runs[:i+1],ensure_ascii=False)+'\n')
  (d/'analyze.py').write_text((OLD/'K2JAGKVJAWZJ/analyze.py').read_text().replace("RUN = 'K2JAGKVJAWZJ'",'RUN = '+repr(n)).replace('z = st(rr[-1])', "z = st(rr[-1]) if rr else next(s for s in floors[floor] if s.get('combat'))").replace("sl['turns']","sl.get('turns')"))
  ds=[json.loads(s) for s in (d/'decisions.jsonl').open()]
  lower=min(x['ts'] for x in ds)
  for filename in ['states','deepseek-reasoning']:
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
    with (d/(filename+'.jsonl')).open('wb') as h:
     while True:
      off=f.tell();line=f.readline()
      if not line:break
      x=json.loads(line)
      if x['ts']>r['ended']:break
      if x['ts']<lower:continue
      if filename=='states' and (x['state'].get('run_id')!=n or (x['state'].get('run',{}).get('character_id') or '').lower()!='silent'):continue
      h.write(line);offsets.append(off)
    (d/(filename+'-offsets.json')).write_text(json.dumps(dict(seek=offset,first=offsets[0] if offsets else None,last=offsets[-1] if offsets else None,n=len(offsets)))+'\n')
for r in runs:
 d=O/r['run_id']
 with (d/'analysis.log').open('w') as h:subprocess.run(['nice','-n','19','python3',str(d/'analyze.py')],stdout=h,stderr=subprocess.STDOUT,check=True)
for name in ['audit.py','summarize.py']:
 with (O/(name+'.log')).open('w') as h:subprocess.run(['nice','-n','19','python3',str(O/name)],stdout=h,stderr=subprocess.STDOUT,check=True)
print('全部复算完成',len(runs),'局',cutoff)
