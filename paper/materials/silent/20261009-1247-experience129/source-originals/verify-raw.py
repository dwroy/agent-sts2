import json,hashlib
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');PM=ROOT/'learner/runs/20261009-114302-postmortem';N='JBX9JLH46KVN'
checks=[]
for name in ['states','decisions','run-plans','sl-attempts']:
 clean=[]
 with (ROOT/'logs'/(name+'.jsonl')).open('rb') as f:
  for line in (PM/(name+'.match')).open('rb'):
   num,off,content=line.split(b':',2);f.seek(int(off));raw=f.readline()
   assert raw.rstrip(b'\n')==content.rstrip(b'\n'),(name,num)
   clean.append(json.loads(raw));checks.append({'文件':name,'行':int(num),'偏移':int(off),'sha256':hashlib.sha256(raw).hexdigest()})
 assert clean==[json.loads(s) for s in (O/N/(name+'.jsonl')).open()],name
 checks.append({'文件':name,'抽取全等':True})
(O/'raw-verification.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n');print('原件核验',len(checks),'项通过')
