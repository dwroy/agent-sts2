import json
from pathlib import Path
base=Path('/home/dw/Projects/agent-sts2')
out=base/'learner/runs/20261009-091302-postmortem'
ids=['VAC6Z1PZ1QJG','NG1FBJTSRLHS']
windows={}
for name in ['decisions','run-plans','sl-attempts','states']:
    handles={r:(out/f'{r}-{name}.jsonl').open('w') for r in ids}
    counts={r:0 for r in ids}
    with (base/f'logs/{name}.jsonl').open('rb') as f:
        offset=0
        for line_no,line in enumerate(f,1):
            for r in ids:
                if r.encode() not in line: continue
                row=json.loads(line)
                row['_line']=line_no; row['_offset']=offset
                handles[r].write(json.dumps(row,ensure_ascii=False)+'\n'); counts[r]+=1
                if name=='decisions':
                    ts=row['ts']; w=windows.setdefault(r,[ts,ts]); w[0]=min(w[0],ts); w[1]=max(w[1],ts)
            offset+=len(line)
    for h in handles.values(): h.close()
    print(name,counts,flush=True)
handles={r:(out/f'{r}-deepseek-reasoning.jsonl').open('w') for r in ids}
counts={r:0 for r in ids}
with (base/'logs/deepseek-reasoning.jsonl').open('rb') as f:
    offset=0
    for line_no,line in enumerate(f,1):
        row=json.loads(line); ts=row.get('ts','')
        for r,(start,end) in windows.items():
            if start<=ts<=end:
                row['_line']=line_no;row['_offset']=offset
                handles[r].write(json.dumps(row,ensure_ascii=False)+'\n');counts[r]+=1
        offset+=len(line)
for h in handles.values():h.close()
(out/'windows.json').write_text(json.dumps(windows,ensure_ascii=False,indent=2)+'\n')
print('reasoning',counts,'windows',windows)
