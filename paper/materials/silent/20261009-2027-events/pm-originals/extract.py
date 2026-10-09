import json,re
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2'); out=root/'learner/runs/20261009-194302-postmortem'
runs=['HXCY44VD9QWU','N8A2W8LH39N0']; windows={}
for name in ['decisions','run-plans','sl-attempts','states']:
 p=root/'logs'/f'{name}.jsonl'; handles={r:(out/f'{r}-{name}.jsonl').open('w') for r in runs}; lohi={r:[] for r in runs}
 # Seek a bounded suffix, then stream. These runs are among the latest finished runs.
 start=max(0,p.stat().st_size-(300_000_000 if name=='states' else 45_000_000))
 with p.open('rb') as f:
  f.seek(start)
  if start: f.readline()
  while True:
   offset=f.tell(); b=f.readline()
   if not b: break
   for r in runs:
    if r.encode() not in b: continue
    d=json.loads(b)
    if name=='states' and d.get('state',{}).get('run_id',d.get('run_id'))!=r: continue
    if name=='run-plans' and d.get('run')!=r: continue
    if name not in ['states','run-plans'] and d.get('run_id')!=r: continue
    d['_offset']=offset; handles[r].write(json.dumps(d,ensure_ascii=False)+'\n'); lohi[r].append(d.get('ts'))
 for h in handles.values():h.close()
 print(name,{r:len(a) for r,a in lohi.items()})
 if name=='decisions':windows={r:[min(a),max(a)] for r,a in lohi.items()}
print('windows',windows)
p=root/'logs/deepseek-reasoning.jsonl'; counts={r:0 for r in runs}
handles={r:(out/f'{r}-reasoning.jsonl').open('w') for r in runs}
with p.open('rb') as f:
 for b in f:
  if not any(t.encode() in b[:100] for t in ['2026-10-09']):continue
  d=json.loads(b); ts=d.get('ts','')
  for r,(lo,hi) in windows.items():
   if lo<=ts<=hi:handles[r].write(json.dumps(d,ensure_ascii=False)+'\n');counts[r]+=1
for h in handles.values():h.close()
print('reasoning',counts)
