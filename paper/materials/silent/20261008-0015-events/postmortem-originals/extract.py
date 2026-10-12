import json
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2'); out=root/'learner/runs/20261007-234302-postmortem'; run='NHA2KW0RB7VP'
for name,field in [('decisions','run_id'),('states',None),('run-plans','run'),('sl-attempts','run_id')]:
    count=0; offset=0
    p=root/'logs'/f'{name}.jsonl'; limit=p.stat().st_size
    with p.open('rb') as f, (out/f'{name}.jsonl').open('w') as w:
        for n,line in enumerate(f,1):
            start=offset; offset+=len(line)
            if offset>limit: break
            if run.encode() not in line: continue
            r=json.loads(line)
            key=(r.get('state') or {}).get('run_id',r.get('run_id')) if name=='states' else r.get(field)
            if key!=run: continue
            r['_line']=n; r['_offset']=start
            w.write(json.dumps(r,ensure_ascii=False)+'\n'); count+=1
    print(name,count,flush=True)
ds=[json.loads(x) for x in (out/'decisions.jsonl').open()]; lo=min(x['ts'] for x in ds); hi=max(x['ts'] for x in ds)
count=0; last=None
with (root/'logs/deepseek-reasoning.jsonl').open('rb') as f, (out/'deepseek-reasoning.jsonl').open('w') as w:
    for n,line in enumerate(f,1):
        r=json.loads(line); ts=r.get('ts',''); last=ts
        if lo<=ts<=hi: r['_line']=n; w.write(json.dumps(r,ensure_ascii=False)+'\n'); count+=1
print('reasoning',count,'window',lo,hi,'last',last)
