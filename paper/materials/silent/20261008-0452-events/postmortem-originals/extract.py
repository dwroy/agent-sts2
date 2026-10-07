import json, re
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2'); out=root/'learner/runs/20261008-041302-postmortem'; run='9Z9H2EXKLF3T'
for name in ['decisions','run-plans','sl-attempts','brain','fight-plans','run-config']:
    path=root/'logs'/f'{name}.jsonl'
    if not path.exists(): continue
    n=0
    with path.open('rb') as f, (out/f'{name}.jsonl').open('w') as dest:
        for line_no,line in enumerate(f,1):
            if run.encode() not in line: continue
            try: row=json.loads(line)
            except ValueError: continue
            if row.get('run_id',row.get('run'))!=run and name not in ['brain','fight-plans']: continue
            row['_line']=line_no; dest.write(json.dumps(row,ensure_ascii=False)+'\n'); n+=1
    print(name,n)
rows=[json.loads(x) for x in (out/'decisions.jsonl').open()]
start=min(r['ts'] for r in rows); end=max(r['ts'] for r in rows)
print('window',start,end)
# Stream time window; reasoning has no run id, never load global file.
with (root/'logs/deepseek-reasoning.jsonl').open('rb') as f, (out/'deepseek-reasoning.jsonl').open('w') as dest:
    n=0
    for line_no,line in enumerate(f,1):
        match=re.search(rb'"ts"\s*:\s*"([^"]+)"',line)
        if not match or not(start<=match[1].decode()<=end): continue
        row=json.loads(line); row['_line']=line_no; dest.write(json.dumps(row,ensure_ascii=False)+'\n'); n+=1
print('reasoning',n)
# Capture run frames by byte-filtered streaming with source line and offset.
with (root/'logs/states.jsonl').open('rb') as f, (out/'states.jsonl').open('w') as dest:
    n=0; offset=0; cutoff=(root/'logs/states.jsonl').stat().st_size
    for line_no,line in enumerate(f,1):
        here=offset; offset+=len(line)
        if offset>cutoff: break
        if run.encode() not in line: continue
        row=json.loads(line); row['_line']=line_no; row['_offset']=here
        dest.write(json.dumps(row,ensure_ascii=False)+'\n'); n+=1
print('states',n)
