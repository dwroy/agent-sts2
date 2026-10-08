import json
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2')
out=root/'learner/runs/20261009-024302-postmortem'
run='PBUBM0LRTEDD'
for name in ['decisions','run-plans','sl-attempts','states']:
    count=0
    with (root/'logs'/f'{name}.jsonl').open('rb') as src,(out/f'{name}.jsonl').open('w') as dst:
        cutoff=(root/'logs'/f'{name}.jsonl').stat().st_size
        while src.tell()<cutoff:
            offset=src.tell(); line=src.readline();count+=1
            if run.encode() not in line:continue
            row=json.loads(line)
            row['_line']=count;row['_offset']=offset
            dst.write(json.dumps(row,ensure_ascii=False)+'\n')
    print(name,'完成')
