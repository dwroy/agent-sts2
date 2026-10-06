import json, re, os
from pathlib import Path
p=Path('learner/runs/20261007-031302-postmortem')
d=[json.loads(s) for s in (p/'decisions.jsonl').open()]
print('DECISIONS',len(d),d[0]['ts'],d[-1]['ts'])
start='2026-10-06T18:04:20.000Z'; end='2026-10-06T19:08:30.000Z'
def extract(src,dst):
    size=os.path.getsize(src)
    with open(src,'rb') as f:
        lo=0; hi=size
        while hi-lo>200000:
            mid=(lo+hi)//2; f.seek(mid); f.readline(); pos=f.tell(); line=f.readline()
            m=re.search(rb'"ts"\s*:\s*"([^"]+)"',line[:500])
            if not m: raise RuntimeError((pos,line[:200]))
            if m[1].decode()<start: lo=mid
            else: hi=mid
        f.seek(lo)
        if lo: f.readline()
        n=0; first=last=None
        with open(dst,'wb') as out:
            while True:
                pos=f.tell(); line=f.readline()
                if not line: break
                m=re.search(rb'"ts"\s*:\s*"([^"]+)"',line[:500])
                if not m: continue
                ts=m[1].decode()
                if ts>end: break
                if ts>=start:
                    if first is None: first=pos
                    last=f.tell(); n+=1; out.write(line)
        print(src,n,'bytes',first,last)
extract('logs/states.jsonl',p/'states.jsonl')
extract('logs/deepseek-reasoning.jsonl',p/'deepseek-reasoning.jsonl')
s=[json.loads(x) for x in (p/'states.jsonl').open()]
print('STATE KEYS',s[0].keys())
print('FIRST STATE',json.dumps(s[0],ensure_ascii=False)[:6000])
print('DECISION KEYS',d[-1].keys())
print('LAST DECISION',json.dumps(d[-1],ensure_ascii=False)[:3000])
b=[json.loads(x) for x in (p/'brain.jsonl').open()]
print('BRAIN',len(b),'keys',b[0].keys() if b else None)
sl=[json.loads(x) for x in (p/'sl-attempts.jsonl').open()]
print('SL',len(sl));print('\n'.join(json.dumps(x,ensure_ascii=False)[:3500] for x in sl))
