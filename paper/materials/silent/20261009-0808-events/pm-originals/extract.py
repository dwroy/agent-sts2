import json
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2')
out=root/'learner/runs/20261009-074301-postmortem'
run='RZ6YAC7K89NM'
for name in ['runs','decisions','run-plans','states','brain','sl-attempts','run-config','jev-prompts']:
    src=root/'logs'/f'{name}.jsonl'
    cutoff=src.stat().st_size
    offset=0; count=0
    with src.open('rb') as f, (out/f'{name}.jsonl').open('w') as target:
        for n,line in enumerate(f,1):
            begin=offset; offset+=len(line)
            if offset>cutoff: break
            if run.encode() not in line: continue
            try: row=json.loads(line)
            except ValueError: continue
            # States/brain may carry the run id in a nested object.
            row['_line']=n; row['_offset']=begin
            target.write(json.dumps(row,ensure_ascii=False)+'\n'); count+=1
    print(name,count)
rows=[json.loads(x) for x in (out/'decisions.jsonl').open()]
start=min(x['ts'] for x in rows); end=max(x['ts'] for x in rows)
count=0
with (root/'logs/deepseek-reasoning.jsonl').open('rb') as f, (out/'deepseek-reasoning.jsonl').open('w') as target:
    offset=0
    for n,line in enumerate(f,1):
        begin=offset; offset+=len(line)
        try: row=json.loads(line)
        except ValueError: continue
        ts=row.get('ts','')
        if start<=ts<=end:
            row['_line']=n; row['_offset']=begin
            target.write(json.dumps(row,ensure_ascii=False)+'\n'); count+=1
print('decision window',start,end,'deepseek rows',count)
