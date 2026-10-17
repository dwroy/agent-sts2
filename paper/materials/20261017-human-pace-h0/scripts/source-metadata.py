"""Bind every target attempt to exact SL/config bytes and the last preceding public run configuration."""
import bisect
import collections
import datetime as dt
import hashlib
import json
from pathlib import Path

OUT=Path(__file__).resolve().parent
ROOT=Path('/home/dw/Projects/agent-sts2')

def time(value):
    stamp=dt.datetime.fromisoformat(value.replace('Z','+00:00'))
    return stamp.replace(tzinfo=dt.timezone.utc) if stamp.tzinfo is None else stamp

def main():
    fights=[json.loads(l) for l in (OUT/'attempts.jsonl').open()];ids={r['run'] for r in fights}
    keys={(r['run'],r['floor'],r['attempt']) for r in fights};cuts=json.loads((OUT/'extraction-summary.json').read_text())['cuts']
    sl={};configs=collections.defaultdict(list);refs=[]
    for name in ['logs/sl-attempts.jsonl','logs/run-config.jsonl']:
        off=0
        with (ROOT/name).open('rb') as h:
            while off<cuts[name]:
                raw=h.readline(cuts[name]-off)
                if not raw.endswith(b'\n'):break
                row=json.loads(raw);ident=row.get('run_id')
                if ident in ids:
                    ref={'path':str(ROOT/name),'offset':off,'len':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
                    if 'sl-attempts' in name and (ident,row.get('floor'),row.get('attempt')) in keys:
                        sl[(ident,row['floor'],row['attempt'])]=ref;refs.append(ref)
                    elif 'run-config' in name:
                        item={'run':ident,'ts':row['ts'],'source':ref,'code':row.get('code'),'knowledge':row.get('knowledge'),'config_sha':row.get('config_sha'),'process':row.get('process')}
                        configs[ident].append(item);refs.append(ref)
                off+=len(raw)
    first={}
    for line in (OUT/'all-target-frame-sources.jsonl').open():
        row=json.loads(line)
        if row['key'] not in first or row['offset']<first[row['key']]['offset']:first[row['key']]=row
    rows=[];missing=collections.Counter()
    for fight in fights:
        entry={k:v for k,v in fight.items() if k not in ['sl','character_mismatch']}
        entry['run_end_code']=entry.pop('run_code')
        entry['sl_source']=sl.get((fight['run'],fight['floor'],fight['attempt']))
        frame=first.get(fight['key']);entry['first_turn_source']=frame
        before=[r for r in configs[fight['run']] if frame and time(r['ts'])<=time(frame['ts'])]
        entry['preceding_config']=max(before,key=lambda r:time(r['ts'])) if before else None
        if not entry['sl_source']:missing['sl_source']+=1
        if not entry['preceding_config']:missing['preceding_config']+=1
        if not frame:missing['turn_endpoint']+=1
        rows.append(entry)
    (OUT/'all-target-attempts-summary.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows))
    (OUT/'all-target-metadata-sources.json').write_text(json.dumps({'sources':refs,'attempts':len(rows),'missing':dict(missing),'rule':'Last preceding config only; ended-run code kept separately, dirty code is not an exact runtime tree. Exact SL/config row hashes do not imply a full-prefix SHA.'},ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'attempts':len(rows),'source_refs':len(refs),'missing':dict(missing)}))

if __name__=='__main__':main()
