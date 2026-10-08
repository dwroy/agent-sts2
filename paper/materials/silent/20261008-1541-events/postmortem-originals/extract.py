import json,re
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2')
out=root/'learner/runs/20261008-151301-postmortem'
rid='AD3QSC3P41JU'
window=[]
for name in ['runs','decisions','run-plans','sl-attempts','brain','run-config','states']:
    src=root/'logs'/f'{name}.jsonl'
    if not src.exists(): continue
    n=0
    with src.open('rb') as f,(out/f'{name}.jsonl').open('w') as dst:
        limit=src.stat().st_size
        while f.tell()<limit:
            raw=f.readline(); n+=1
            if rid.encode() not in raw: continue
            row=json.loads(raw)
            if name=='states' and row.get('state',{}).get('run_id',row.get('run_id'))!=rid: continue
            if name not in ['states','run-plans'] and row.get('run_id',row.get('run'))!=rid: continue
            row['_line']=n
            dst.write(json.dumps(row,ensure_ascii=False)+'\n')
            if name=='decisions': window.append(row['ts'])
    print(name, sum(1 for _ in (out/f'{name}.jsonl').open()))
if window:
    lo,hi=min(window),max(window)
    n=0;count=0
    src=root/'logs/deepseek-reasoning.jsonl'
    with src.open('rb') as f,(out/'deepseek-reasoning.jsonl').open('w') as dst:
        limit=src.stat().st_size
        while f.tell()<limit:
            raw=f.readline();n+=1
            m=re.search(rb'"ts"\s*:\s*"([^\"]+)"',raw)
            if not m or not lo<=m.group(1).decode()<=hi: continue
            row=json.loads(raw);row['_line']=n
            dst.write(json.dumps(row,ensure_ascii=False)+'\n');count+=1
    print('window',lo,hi,'deepseek-reasoning',count)
