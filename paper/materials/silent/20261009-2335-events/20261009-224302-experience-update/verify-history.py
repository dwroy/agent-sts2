import hashlib
import json
from pathlib import Path

O=Path(__file__).parent.resolve()
RAW=Path('/home/dw/Projects/agent-sts2/logs/states.jsonl')
rows=[]
for run in json.load(open(O/'runs.json')):
    with (O/run/'states.jsonl').open('rb') as h:
        expected=json.loads(h.readline())
    ts=expected['ts']
    with RAW.open('rb') as h:
        lo=0;hi=RAW.stat().st_size
        while hi-lo>65536:
            mid=(lo+hi)//2;h.seek(mid);h.readline();line=h.readline()
            if not line:hi=mid;continue
            if json.loads(line)['ts']<ts:lo=h.tell()
            else:hi=mid
        pos=max(0,lo-65536);h.seek(pos)
        if pos:h.readline()
        while True:
            offset=h.tell();raw=h.readline()
            assert raw,run
            actual=json.loads(raw)
            if actual['ts']>ts:raise AssertionError((run,ts,actual['ts']))
            if actual['ts']!=ts or actual['state'].get('run_id')!=run:continue
            assert actual==expected
            assert actual['state']['run']['character_id'].lower()=='silent'
            rows.append(dict(run=run,ts=ts,offset=offset,sha256=hashlib.sha256(raw).hexdigest()))
            break
(O/'historical-source-verification.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print('历史逐局首状态原日志seek核验',len(rows),'局全等')
