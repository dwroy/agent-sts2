import bisect
import collections
import hashlib
import json
import subprocess
from pathlib import Path

O=Path(__file__).parent.resolve()
ROOT=Path('/home/dw/Projects/agent-sts2')
RUN='9663Y88TYK73'
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
checks=0
manifest=[]
for filename in ['decisions','brain','run-plans','sl-attempts','jev-prompts']:
    saved=(O/RUN/(filename+'.jsonl')).read_bytes().splitlines(keepends=True)
    q=subprocess.run(['nice','-n','19','rg','--byte-offset','--fixed-strings',RUN,str(ROOT/'logs'/(filename+'.jsonl'))],capture_output=True)
    assert q.returncode in [0,1]
    found=[]
    for line in q.stdout.splitlines(keepends=True):
        off,raw=line.split(b':',1)
        found.append(raw)
        manifest.append(dict(file=filename+'.jsonl',offset=int(off),sha256=hashlib.sha256(raw).hexdigest()))
    assert saved==found,filename
    checks+=len(found)
offset=json.load(open(O/RUN/'states-offsets.json'))['first']
with (ROOT/'logs/states.jsonl').open('rb') as f:
    f.seek(offset)
    for saved in (O/RUN/'states.jsonl').open('rb'):
        off=f.tell();raw=f.readline()
        assert saved==raw
        x=json.loads(raw)
        assert x['state']['run']['character_id'].lower()=='silent'
        assert x['state']['run_id']==RUN
        manifest.append(dict(file='states.jsonl',offset=off,sha256=hashlib.sha256(raw).hexdigest()))
        checks+=3
(O/'original-offsets.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')

def seek_frame(ts,expected):
    p=ROOT/'logs/states.jsonl'
    with p.open('rb') as f:
        lo=0;hi=p.stat().st_size
        while hi-lo>65536:
            mid=(lo+hi)//2;f.seek(mid);f.readline();line=f.readline()
            if not line:hi=mid;continue
            if json.loads(line)['ts']<ts:lo=f.tell()
            else:hi=mid
        pos=max(0,lo-65536);f.seek(pos)
        if pos:f.readline()
        while True:
            off=f.tell();raw=f.readline()
            assert raw
            x=json.loads(raw)
            if x['ts']>ts:raise AssertionError(ts)
            if x['ts']==ts and x['state'].get('run_id')==expected['state']['run_id']:
                assert x==expected
                return dict(ts=ts,run=x['state']['run_id'],offset=off,sha256=hashlib.sha256(raw).hexdigest())

print('原始记录字节偏移核验',len(manifest))
