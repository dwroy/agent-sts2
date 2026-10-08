import json
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2')
out=root/'learner/runs/20261009-071302-postmortem'
run=b'CSLHFCBSC1UM'
for name in ('decisions','run-plans','sl-attempts','runs'):
    count=0
    with (root/f'logs/{name}.jsonl').open('rb') as src, (out/f'{name}.jsonl').open('w') as dest:
        cutoff=(root/f'logs/{name}.jsonl').stat().st_size
        for line_no,line in enumerate(src,1):
            if src.tell()>cutoff: break
            if run not in line: continue
            row=json.loads(line)
            if row.get('run_id',row.get('run')) != run.decode(): continue
            row['_line']=line_no
            dest.write(json.dumps(row,ensure_ascii=False)+'\n'); count+=1
    print(name,count)
rows=[json.loads(x) for x in (out/'decisions.jsonl').open()]
print('time',rows[0]['ts'],rows[-1]['ts'])
print('first',json.dumps(rows[0],ensure_ascii=False))
for name in ('run-plans','sl-attempts'):
    for line in (out/f'{name}.jsonl').open():
        row=json.loads(line)
        print(name,'line',row['_line'],'keys',list(row))
        if name=='sl-attempts': print({k:v for k,v in row.items() if k not in ('path','retry')})
