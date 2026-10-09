import json, pathlib, hashlib
root=pathlib.Path('/home/dw/Projects/agent-sts2')
out=root/'learner/runs/20261009-144301-postmortem'
run='833ZM0MJGWHC'
for name in ['runs','decisions','run-plans','states','sl-attempts','brain','run-config']:
    path=root/'logs'/f'{name}.jsonl'
    if not path.exists(): continue
    count=0; offset=0; cutoff=path.stat().st_size
    with path.open('rb') as f, (out/f'{name}.jsonl').open('w') as target:
        for lineno,raw in enumerate(f,1):
            pos=offset;offset+=len(raw)
            if offset>cutoff: break
            if run.encode() not in raw: continue
            row=json.loads(raw)
            if row.get('run_id') != run and row.get('run') != run and (row.get('state') or {}).get('run_id')!=run: continue
            row.update(_line=lineno,_offset=pos,_bytes=len(raw),_sha256=hashlib.sha256(raw).hexdigest())
            target.write(json.dumps(row,ensure_ascii=False)+'\n');count+=1
    print(name,count,flush=True)
