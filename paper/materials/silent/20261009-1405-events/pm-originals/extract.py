import json, pathlib, re
root=pathlib.Path('/home/dw/Projects/agent-sts2'); out=root/'learner/runs/20261009-134301-postmortem'; run='NBJBVSBNPYQB'
for name in ('runs','decisions','run-plans','states','sl-attempts','run-config','codex-calls'):
    path=root/'logs'/f'{name}.jsonl'; cutoff=path.stat().st_size; count=0; offset=0
    with path.open('rb') as src, (out/f'{name}.jsonl').open('w') as dest:
        for no,line in enumerate(src,1):
            start=offset; offset+=len(line)
            if offset>cutoff: break
            if run.encode() not in line: continue
            try: row=json.loads(line)
            except ValueError: continue
            if row.get('run_id',row.get('run',(row.get('state') or {}).get('run_id')))!=run: continue
            row['_line']=no;row['_offset']=start;dest.write(json.dumps(row,ensure_ascii=False)+'\n');count+=1
    print(name,count,flush=True)
