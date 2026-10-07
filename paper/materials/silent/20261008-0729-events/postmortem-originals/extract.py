import json
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2')
out=root/'learner/runs/20261008-071302-postmortem'
run='PD9AYQVMLQW6'
for name in ['decisions','run-plans','sl-attempts','run-config','brain','jev-prompts','states']:
    path=root/'logs'/f'{name}.jsonl'
    cutoff=path.stat().st_size
    count=0
    with path.open('rb') as src,(out/f'{run}-{name}.jsonl').open('w') as dst:
        pos=0
        for n,line in enumerate(src,1):
            old=pos;pos+=len(line)
            if pos>cutoff:break
            if run.encode() not in line:continue
            try: row=json.loads(line)
            except ValueError:continue
            row['_source_line']=n;row['_source_offset']=old
            dst.write(json.dumps(row,ensure_ascii=False)+'\n');count+=1
    print(name,count,flush=True)
