import json,re
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2')
out=root/'learner/runs/20261008-171302-postmortem'
rid='SY0WMJNNVRLM'
for name in ['decisions','run-plans','sl-attempts','states']:
    src=root/'logs'/f'{name}.jsonl'
    total=0
    with src.open('rb') as f,(out/f'{rid}-{name}.jsonl').open('w') as dest:
        offset=0; cutoff=src.stat().st_size
        for n,line in enumerate(f,1):
            at=offset;offset+=len(line)
            if offset>cutoff:break
            if rid.encode() not in line:continue
            try:r=json.loads(line)
            except ValueError:continue
            actual=r.get('run_id',r.get('run'))
            if name=='states':actual=(r.get('state') or {}).get('run_id',r.get('run_id'))
            if actual!=rid:continue
            r['_line']=n;r['_offset']=at
            dest.write(json.dumps(r,ensure_ascii=False)+'\n');total+=1
    print(name,total)
dec=[json.loads(l) for l in (out/f'{rid}-decisions.jsonl').open()]
ts=[r['ts'] for r in dec];start,end=min(ts),max(ts)
print('window',start,end)
src=root/'logs/deepseek-reasoning.jsonl'
# Read the tail at a byte offset; expand only if its first timestamp is in the window.
size=src.stat().st_size;span=8*1024*1024
while True:
    offset=max(0,size-span);match=[];first=None;last=None
    with src.open('rb') as f:
        f.seek(offset)
        if offset:f.readline()
        while f.tell()<size:
            at=f.tell();line=f.readline()
            try:r=json.loads(line)
            except ValueError:continue
            t=r.get('ts')
            if t:first=first or t;last=t
            if t and start<=t<=end:r['_offset']=at;match.append(r)
    if offset==0 or (first and first<start):break
    span*=2
with (out/f'{rid}-reasoning.jsonl').open('w') as f:
    for r in match:f.write(json.dumps(r,ensure_ascii=False)+'\n')
with (out/'extraction-window.json').open('w') as f:
    json.dump({'run':rid,'first_decision':start,'last_decision':end,'reasoning_seek':offset,'reasoning_tail_first':first,'reasoning_tail_last':last,'reasoning_matches':len(match)},f,ensure_ascii=False,indent=2)
print('reasoning',len(match),'tail',first,last,'offset',offset)
