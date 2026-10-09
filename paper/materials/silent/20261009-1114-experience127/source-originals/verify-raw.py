import json,hashlib,collections
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');PM=ROOT/'learner/runs/20261009-101302-postmortem';N='E6DYYXRX7GVE'
checks=[]
def check(name,b):
 assert b,name
 checks.append(name)
for name in ['states','decisions','run-plans','sl-attempts']:
 source=[json.loads(s) for s in (PM/(name+'.jsonl')).open()]
 with (ROOT/'logs'/(name+'.jsonl')).open('rb') as f:
  clean=[]
  for x in source:
   m=x['_source'];f.seek(m['offset']);line=f.readline();raw=json.loads(line)
   check(name+':'+str(m['line']),len(line)==m['length'] and hashlib.sha256(line).hexdigest()==m['sha256'] and raw=={k:v for k,v in x.items() if k!='_source'})
   clean.append(raw)
 if name in ['states','decisions','sl-attempts','run-plans']:
  check(name+'抽取全等',clean==[json.loads(s) for s in (O/N/(name+'.jsonl')).open()])
(O/'raw-verification.json').write_text(json.dumps({'checks':len(checks),'passed':checks},ensure_ascii=False,indent=2)+'\n')
print('原记录seek/SHA/抽取核验',len(checks),'项通过')
