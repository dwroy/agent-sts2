import json
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2');out=p/'learner/runs/20261009-071302-postmortem';needle=b'CSLHFCBSC1UM'
for name in ('brain','run-config','codex-calls'):
    count=0;path=p/f'logs/{name}.jsonl'
    with path.open('rb') as src,(out/f'{name}.jsonl').open('w') as dest:
        cutoff=path.stat().st_size
        for n,line in enumerate(src,1):
            if src.tell()>cutoff:break
            if needle not in line:continue
            row=json.loads(line);row['_line']=n;dest.write(json.dumps(row,ensure_ascii=False)+'\n');count+=1
    print(name,count)
    if count:
        r=json.loads((out/f'{name}.jsonl').open().readline());print('keys',list(r))
        if name=='brain':print('field sizes',{k:len(str(v)) for k,v in r.items()})
