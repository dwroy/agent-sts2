import json,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=O.parents[2];NEW=['DPYF2BAA3DKT','CRK2HNYKSCZC']
for name in ['decisions','brain','run-plans','sl-attempts']:
 handles={r:(O/r/(name+'.jsonl')).open('w') for r in NEW}
 p=subprocess.Popen(['rg','-F','-e',NEW[0],'-e',NEW[1],str(ROOT/'logs'/(name+'.jsonl'))],stdout=subprocess.PIPE,text=True)
 for line in p.stdout:
  x=json.loads(line);r=x.get('run_id') or x.get('run')
  if r in handles:handles[r].write(line)
 assert p.wait()==0
 for h in handles.values():h.close()
for r in NEW:
 with (O/r/'extract.log').open('w') as h:subprocess.run(['python3',str(O/r/'extract.py')],stdout=h,stderr=subprocess.STDOUT,check=True)
 print('抽取完成',r,flush=True)
for r in json.load(open(O/'runs.json')):
 with (O/r/'analyze.log').open('w') as h:subprocess.run(['python3',str(O/r/'analyze.py')],stdout=h,stderr=subprocess.STDOUT,check=True)
for name in ['audit','summarize','slices']:
 with (O/(name+'.log')).open('w') as h:subprocess.run(['python3',str(O/(name+'.py')),*(['before'] if name=='slices' else [])],stdout=h,stderr=subprocess.STDOUT,check=True)
 print('完成',name,flush=True)
