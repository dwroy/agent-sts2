import json
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2'); out=p/'learner/runs/20261009-071302-postmortem'
needle=b'CSLHFCBSC1UM'
path=p/'logs/states.jsonl'
with path.open('rb') as src,(out/'states.jsonl').open('w') as dest:
    limit=path.stat().st_size; count=0
    for n,line in enumerate(src,1):
        if src.tell()>limit:break
        if needle not in line:continue
        row=json.loads(line)
        if row.get('state',{}).get('run_id',row.get('run_id'))!=needle.decode():continue
        row['_line']=n; row['_offset']=src.tell()-len(line)
        dest.write(json.dumps(row,ensure_ascii=False)+'\n');count+=1
print('states',count)
d=[json.loads(x) for x in (out/'decisions.jsonl').open()]
start,end=d[0]['ts'],d[-1]['ts'];count=0;first=last=None
path=p/'logs/deepseek-reasoning.jsonl'
with path.open('rb') as src,(out/'deepseek-reasoning.jsonl').open('w') as dest:
    src.seek(0)
    for n,line in enumerate(src,1):
        row=json.loads(line);ts=row.get('ts','');first=first or ts;last=ts
        if start<=ts<=end:
            row['_line']=n;dest.write(json.dumps(row,ensure_ascii=False)+'\n');count+=1
print('deepseek-reasoning',count,'file_window',first,last)
