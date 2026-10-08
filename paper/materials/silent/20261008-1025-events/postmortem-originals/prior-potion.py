import json,re
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2');out=p/'learner/runs/20261008-094302-postmortem'
ids=set()
with (p/'notes/lessons.md').open() as h:
 for line in h:
  m=re.match(r'^## ([A-Z0-9]{12})（A\d+，静默猎手',line)
  if m:ids.add(m[1])
needle=re.compile(rb'"run_id"\s*:\s*"([A-Z0-9]{12})"')
found=[]
with (p/'logs/decisions.jsonl').open('rb') as h:
 for n,line in enumerate(h,1):
  if b'POISON_POTION' not in line:continue
  m=needle.search(line)
  if not m or m[1].decode() not in ids:continue
  x=json.loads(line)
  for q in (x.get('questions') or {}).values():
   if not isinstance(q,dict):continue
   for key,value in (q.get('criteria') or {}).items():
    if not isinstance(value,str):continue
    try:z=json.loads(value)
    except ValueError:continue
    if ('毒药水' in str(z.get('plays','')) or '毒药水' in str(z.get('action',''))) and str(z.get('simulated','')).startswith('no'):
     found.append({'run':x['run_id'],'d':n,'ts':x['ts'],'floor':x['floor'],'turn':x.get('turn'),'key':key,'fact':z,'chosen':x.get('chosen')});break
   else:continue
   break
(out/'prior-poison-unmodelled.json').write_text(json.dumps(found,ensure_ascii=False,indent=2)+'\n')
seen=set()
for x in found:
 if x['run'] in seen:continue
 seen.add(x['run'])
 if len(seen)<9:print({k:v for k,v in x.items() if k!='fact'})
print('总候选题',len(found),'局',len(seen))
