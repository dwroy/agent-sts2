import json
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2');out=root/'learner/runs/20261008-141302-postmortem'
run='H1T1F8ML9FUE';needle=run.encode();n=0
with (root/'logs/states.jsonl').open('rb') as source,(out/f'{run}-states.jsonl').open('w') as dest:
    for number,line in enumerate(source,1):
        if needle not in line:continue
        row=json.loads(line)
        if (row.get('state') or {}).get('run_id',row.get('run_id'))!=run:continue
        row['_line']=number;dest.write(json.dumps(row,ensure_ascii=False)+'\n');n+=1
print('states',n)
