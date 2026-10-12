import json, re
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2')
out=p/'learner/runs/20261008-094302-postmortem'
runs=['K2JAGKVJAWZJ','79UCJ0K6R9C1']
windows={}
for name in ['decisions','run-plans','states','sl-attempts','runs']:
    files={r:(out/f'{r}-{name}.jsonl').open('w') for r in runs}
    counts=dict.fromkeys(runs,0)
    src=p/'logs'/f'{name}.jsonl'
    cutoff=src.stat().st_size
    offset=0
    with src.open('rb') as h:
        for n,line in enumerate(h,1):
            start=offset; offset+=len(line)
            if offset>cutoff: break
            selected=[r for r in runs if r.encode() in line]
            if not selected: continue
            try: row=json.loads(line)
            except ValueError: continue
            ident=row.get('run_id') or row.get('run')
            if isinstance(ident,dict): ident=ident.get('run_id')
            if not ident: ident=(row.get('state') or {}).get('run_id')
            if ident not in selected: continue
            row['_line']=n;row['_offset']=start
            files[ident].write(json.dumps(row,ensure_ascii=False)+'\n');counts[ident]+=1
            if name=='decisions':
                ts=row.get('ts')
                if ts: windows.setdefault(ident,[]).append(ts)
    for f in files.values(): f.close()
    print(name,counts,flush=True)
files={r:(out/f'{r}-deepseek-reasoning.jsonl').open('w') for r in runs}
counts=dict.fromkeys(runs,0)
with (p/'logs/deepseek-reasoning.jsonl').open('rb') as h:
    for n,line in enumerate(h,1):
        match=re.search(rb'"ts"\s*:\s*"([^\"]+)"',line)
        if not match: continue
        ts=match[1].decode()
        selected=[r for r in runs if windows[r][0]<=ts<=windows[r][-1]]
        if not selected: continue
        row=json.loads(line);row['_line']=n
        for r in selected: files[r].write(json.dumps(row,ensure_ascii=False)+'\n');counts[r]+=1
for f in files.values(): f.close()
print('deepseek-reasoning',counts,flush=True)
print('windows',{r:[v[0],v[-1]] for r,v in windows.items()},flush=True)
