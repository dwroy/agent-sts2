import json
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2')
out=root/'learner/runs/20261007-224302-postmortem'
runs=['1913SE84AXQF','Q6M2Y34MWKRE']
for name in ['runs','decisions','run-plans','sl-attempts','states']:
    handles={r:(out/f'{r}-{name}.jsonl').open('w') for r in runs}
    counts={r:0 for r in runs}
    offset=0
    path=root/'logs'/f'{name}.jsonl'
    cutoff=path.stat().st_size
    with path.open('rb') as f:
        for n,line in enumerate(f,1):
            start=offset;offset+=len(line)
            if offset>cutoff:break
            matches=[r for r in runs if r.encode() in line]
            if not matches:continue
            try:row=json.loads(line)
            except ValueError:continue
            rid=row.get('run_id',row.get('run'))
            if name=='states':rid=(row.get('state') or {}).get('run_id',rid)
            if rid not in matches:continue
            row['_line']=n;row['_offset']=start
            handles[rid].write(json.dumps(row,ensure_ascii=False)+'\n');counts[rid]+=1
    for f in handles.values():f.close()
    print(name,counts,flush=True)
