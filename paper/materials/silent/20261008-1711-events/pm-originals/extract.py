import json
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2'); out=root/'learner/runs/20261008-164302-postmortem'; run='Y5H4CFAQ2WTG'
rows={}
for name in ['decisions','run-plans','sl-attempts','runs','states']:
    picked=[]
    with (root/'logs'/f'{name}.jsonl').open('rb') as f, (out/f'{name}.jsonl').open('w') as dst:
        for n,b in enumerate(f,1):
            if run.encode() not in b: continue
            try:r=json.loads(b)
            except ValueError:continue
            if r.get('run_id',r.get('run',(r.get('state') or {}).get('run_id'))) != run:continue
            r['_line']=n;dst.write(json.dumps(r,ensure_ascii=False)+'\n');picked.append(r)
    rows[name]=picked
    print(name,len(picked),list(picked[0]) if picked else [],flush=True)
a=rows['decisions'][0]['ts'];b=rows['decisions'][-1]['ts'];count=0
with (root/'logs/deepseek-reasoning.jsonl').open('rb') as f,(out/'deepseek-reasoning.jsonl').open('w') as dst:
    for n,line in enumerate(f,1):
        try:r=json.loads(line)
        except ValueError:continue
        if a<=r.get('ts','')<=b:r['_line']=n;dst.write(json.dumps(r,ensure_ascii=False)+'\n');count+=1
print('reasoning',count,'window',a,b)
for name in ['decisions','run-plans','states']:
    if rows[name]:print(name,'sample',json.dumps(rows[name][0],ensure_ascii=False)[:10000])
