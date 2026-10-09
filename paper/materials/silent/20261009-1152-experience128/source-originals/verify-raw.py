import json,hashlib
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');PM=ROOT/'learner/runs/20261009-104301-postmortem';N='XZUJR08FW801'
checks=[]
for name in ['states','decisions','run-plans','sl-attempts']:
 clean=[]
 with (ROOT/'logs'/(name+'.jsonl')).open('rb') as f:
  for line in (PM/(N+'-'+name+'.jsonl')).open():
   x=json.loads(line);off=x.pop('_offset');num=x.pop('_line');f.seek(off);raw=f.readline()
   assert json.loads(raw)==x,(name,num);clean.append(x);checks.append({'文件':name,'行':num,'偏移':off,'sha256':hashlib.sha256(raw).hexdigest()})
 assert clean==[json.loads(s) for s in (O/N/(name+'.jsonl')).open()],name
 checks.append({'文件':name,'抽取全等':True})
(O/'raw-verification.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n');print('原件核验',len(checks),'项通过')
