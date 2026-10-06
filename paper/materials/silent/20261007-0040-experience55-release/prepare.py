import json,subprocess
from pathlib import Path
O=Path(__file__).parent
ROOT=O.parents[2]
runs=json.load(open(O/'runs.json'))
(O/'run-patterns.txt').write_text('\n'.join(runs)+'\n')
for name in ['decisions','brain','run-plans','sl-attempts']:
 handles={r:(O/r/(name+'.jsonl')).open('w') for r in runs}
 p=subprocess.Popen(['rg','-F','-f',str(O/'run-patterns.txt'),str(ROOT/'logs'/(name+'.jsonl'))],stdout=subprocess.PIPE,text=True)
 for line in p.stdout:
  x=json.loads(line);run=x.get('run_id') or x.get('run')
  if run in handles:handles[run].write(line)
 assert p.wait()==0
 for h in handles.values():h.close()
for run in runs:
 for name in ['extract','analyze']:
  with (O/run/(name+'.log')).open('w') as h:subprocess.run(['python3',str(O/run/(name+'.py'))],stdout=h,stderr=subprocess.STDOUT,check=True)
 print('已重抽',run,flush=True)
for name in ['audit','summarize','slices']:
 args=['before'] if name=='slices' else []
 with (O/(name+'.log')).open('w') as h:subprocess.run(['python3',str(O/(name+'.py')),*args],stdout=h,stderr=subprocess.STDOUT,check=True)
 print('完成',name,flush=True)
