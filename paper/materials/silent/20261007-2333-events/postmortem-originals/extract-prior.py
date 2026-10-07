import json
from pathlib import Path
p=Path(__file__).parent;root=p.parents[2];run='Y6GM2CHWJBEY'
for name in ['decisions','states']:
 with (root/'logs'/f'{name}.jsonl').open('rb') as f,(p/f'{run}-all-{name}.jsonl').open('w') as out:
  for n,line in enumerate(f,1):
   if run.encode() not in line:continue
   try:r=json.loads(line)
   except ValueError:continue
   if (r.get('state') or {}).get('run_id',r.get('run_id'))!=run:continue
   r['_line']=n;out.write(json.dumps(r,ensure_ascii=False)+'\n')
 print(name,'完成',flush=True)
