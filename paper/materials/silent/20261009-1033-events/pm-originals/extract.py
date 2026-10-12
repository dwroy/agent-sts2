import json,hashlib
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2'); out=root/'learner/runs/20261009-101302-postmortem'; run='E6DYYXRX7GVE'
for name,key in [('decisions','run_id'),('states','run_id'),('run-plans','run'),('sl-attempts','run_id')]:
    path=root/'logs'/f'{name}.jsonl'; count=0; bounds=[]; limit=path.stat().st_size
    with path.open('rb') as f,(out/f'{name}.jsonl').open('w') as g:
        offset=0
        for n,line in enumerate(f,1):
            pos=offset; offset+=len(line)
            if offset>limit: break
            if run.encode() not in line: continue
            row=json.loads(line)
            actual=(row.get('state') or {}).get('run_id',row.get('run_id')) if name=='states' else row.get(key)
            if actual!=run: continue
            row['_source']={'line':n,'offset':pos,'length':len(line),'sha256':hashlib.sha256(line).hexdigest()}
            g.write(json.dumps(row,ensure_ascii=False)+'\n'); count+=1
            if name=='decisions': bounds.append(row['ts'])
    print(name,count)
    if name=='decisions': window=(min(bounds),max(bounds))
count=0
with (root/'logs/deepseek-reasoning.jsonl').open('rb') as f,(out/'deepseek-reasoning.jsonl').open('w') as g:
    offset=0
    for n,line in enumerate(f,1):
        pos=offset;offset+=len(line)
        # Timestamp text avoids parsing outside the window.
        if b'2026-10-09' not in line: continue
        row=json.loads(line)
        if window[0]<=row.get('ts','')<=window[1]:
            row['_source']={'line':n,'offset':pos,'length':len(line),'sha256':hashlib.sha256(line).hexdigest()};g.write(json.dumps(row,ensure_ascii=False)+'\n');count+=1
print('window',window,'reasoning',count)
