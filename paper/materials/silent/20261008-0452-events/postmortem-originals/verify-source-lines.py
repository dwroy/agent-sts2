import json,sys
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-041302-postmortem')
name=sys.argv[1]
expected={x['_line']:{k:v for k,v in x.items() if k!='_line'} for x in (json.loads(l) for l in (p/(name+'.jsonl')).open())}
seen=0
for l in sys.stdin:
 n,s=l.split(':',1);n=int(n);x=json.loads(s)
 assert n in expected,(name,n)
 assert x==expected[n],(name,n)
 seen+=1
assert seen==len(expected),(name,seen,len(expected))
print(name+'原始日志逐条复核 '+str(seen)+' 条，抽取内容及行号一致')
