import json
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2'); out=root/'learner/runs/20261009-154302-postmortem'; run='64R0P0MTZWAX'
for name in ['decisions','run-plans','sl-attempts','states','run-config']:
    path=root/'logs'/f'{name}.jsonl'
    if not path.exists(): continue
    cutoff=path.stat().st_size; offset=0; count=0
    with path.open('rb') as src, (out/f'{name}.jsonl').open('w') as dest:
        for num,line in enumerate(src,1):
            start=offset; offset+=len(line)
            if offset>cutoff: break
            if run.encode() not in line: continue
            row=json.loads(line); row['_line']=num; row['_offset']=start
            dest.write(json.dumps(row,ensure_ascii=False)+'\n'); count+=1
    print(name,count)
ds=[json.loads(x) for x in (out/'decisions.jsonl').open()]; lo=min(x['ts'] for x in ds); hi=max(x['ts'] for x in ds)
count=0
with (root/'logs/deepseek-reasoning.jsonl').open('rb') as src,(out/'deepseek-window.jsonl').open('w') as dest:
    offset=0
    for num,line in enumerate(src,1):
        start=offset; offset+=len(line)
        row=json.loads(line)
        if lo<=row.get('ts','')<=hi:
            row['_line']=num; row['_offset']=start; dest.write(json.dumps(row,ensure_ascii=False)+'\n'); count+=1
print('decision_window',lo,hi,'deepseek_reasoning',count)
