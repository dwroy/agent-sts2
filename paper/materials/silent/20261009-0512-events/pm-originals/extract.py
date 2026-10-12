import json,re
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2'); out=root/'learner/runs/20261009-044301-postmortem'; run='J8PHG72DGD90'
for name in ('runs','decisions','run-plans','sl-attempts','states'):
    n=0; offset=0; cutoff=(root/'logs'/f'{name}.jsonl').stat().st_size
    with (root/'logs'/f'{name}.jsonl').open('rb') as src, (out/f'{name}.jsonl').open('w') as dst:
        for lineno,line in enumerate(src,1):
            start=offset;offset+=len(line)
            if offset>cutoff: break
            if run.encode() not in line: continue
            row=json.loads(line);row['_line']=lineno;row['_offset']=start
            dst.write(json.dumps(row,ensure_ascii=False)+'\n');n+=1
    print(name,n,flush=True)
d=[json.loads(x) for x in (out/'decisions.jsonl').open()];lo=min(x['ts'] for x in d);hi=max(x['ts'] for x in d)
print('window',lo,hi,flush=True)
p=root/'logs/deepseek-reasoning.jsonl'
with p.open('rb') as src:
    src.seek(max(0,p.stat().st_size-65536));src.readline();last=None
    for line in src:
        try:last=json.loads(line)
        except ValueError:pass
    print('reasoning_last',last.get('ts') if last else None,flush=True)
if last and last.get('ts','')<lo:
    (out/'deepseek-reasoning.jsonl').write_text('')
else:
    with p.open('rb') as src,(out/'deepseek-reasoning.jsonl').open('w') as dst:
        src.seek(max(0,p.stat().st_size-100000000));src.readline()
        for line in src:
            try:row=json.loads(line)
            except ValueError:continue
            if lo<=row.get('ts','')<=hi:dst.write(json.dumps(row,ensure_ascii=False)+'\n')
