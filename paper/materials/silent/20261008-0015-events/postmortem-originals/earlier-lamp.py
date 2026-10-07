import json
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2');p=root/'learner/runs/20261007-234302-postmortem';rid='K3676LU8B0UH'
for name in ['decisions','states']:
 off=0;lim=(root/'logs'/f'{name}.jsonl').stat().st_size
 with (root/'logs'/f'{name}.jsonl').open('rb') as f,(p/f'prior-lamp-{name}.jsonl').open('w') as w:
  for n,z in enumerate(f,1):
   start=off;off+=len(z)
   if off>lim:break
   if rid.encode() not in z:continue
   x=json.loads(z);v=(x.get('state') or {}).get('run_id') if name=='states' else x.get('run_id')
   if v!=rid:continue
   x['_line']=n;x['_offset']=start;w.write(json.dumps(x,ensure_ascii=False)+'\n')
 print(name,'done',flush=True)
