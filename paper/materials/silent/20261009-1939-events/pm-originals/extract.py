import json,re,hashlib
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2'); out=root/'learner/runs/20261009-191302-postmortem'; run='HNX4A2WBC34W'
manifest=[]; selected={}
for name in ['runs','decisions','run-plans','sl-attempts','states']:
 p=root/'logs'/f'{name}.jsonl'; rows=[]; pos=0; cutoff=p.stat().st_size
 with p.open('rb') as f, (out/f'{name}.jsonl').open('wb') as dst:
  for n,b in enumerate(f,1):
   at=pos;pos+=len(b)
   if pos>cutoff:break
   if run.encode() not in b:continue
   d=json.loads(b)
   match=d.get('run_id')==run or d.get('run')==run or (d.get('state') or {}).get('run_id')==run
   if not match:continue
   d['_line']=n;d['_offset']=at; rows.append(d);dst.write((json.dumps(d,ensure_ascii=False)+'\n').encode())
   manifest.append({'source':str(p),'line':n,'offset':at,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
 selected[name]=rows
 print(name,len(rows),flush=True)
ds=selected['decisions'];a=min(d['ts'] for d in ds);z=max(d['ts'] for d in ds)
count=0;pos=0;p=root/'logs/deepseek-reasoning.jsonl'
with p.open('rb') as f,(out/'deepseek-reasoning.jsonl').open('wb') as dst:
 for n,b in enumerate(f,1):
  at=pos;pos+=len(b)
  m=re.search(rb'"ts"\s*:\s*"([^"]+)"',b)
  if not m or not a<=m.group(1).decode()<=z:continue
  d=json.loads(b);d['_line']=n;d['_offset']=at;dst.write((json.dumps(d,ensure_ascii=False)+'\n').encode());count+=1
  manifest.append({'source':str(p),'line':n,'offset':at,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
(out/'source-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('window',a,z,'reasoning',count,flush=True)
print('decision sample',json.dumps(ds[0],ensure_ascii=False)[:6000])
print('state sample',json.dumps(selected['states'][0],ensure_ascii=False)[:7500])
print('SL',json.dumps(selected['sl-attempts'],ensure_ascii=False)[:6500])
