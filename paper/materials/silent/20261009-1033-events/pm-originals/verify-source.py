import json,hashlib
from pathlib import Path
p=Path(__file__).parent;root=p.parents[2];count=0
for name in ['decisions','states','run-plans','sl-attempts']:
 with (root/'logs'/f'{name}.jsonl').open('rb') as raw,(p/f'{name}.jsonl').open() as rows:
  for line in rows:
   row=json.loads(line);meta=row.pop('_source');raw.seek(meta['offset']);b=raw.read(meta['length']);assert hashlib.sha256(b).hexdigest()==meta['sha256'];assert json.loads(b)==row;count+=1
print('来源原字节核验通过',count)
