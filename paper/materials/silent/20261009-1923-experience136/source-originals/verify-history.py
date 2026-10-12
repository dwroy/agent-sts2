import bisect
import json
from pathlib import Path

O=Path(__file__).parent
ROOT=Path('/home/dw/Projects/agent-sts2')
H=json.load(open(O/'panache-history.json'))
out=[]
for run,floor,turn,card in [('2SU6XN2AEJRD',45,6,'DEFEND_SILENT'),('G403VCZ3BH1B',33,4,'OMNISLICE')]:
    row=next(x for x in H['fifth_card_pairs'] if (x['run'],x['floor'],x['turn'],x['card'])==(run,floor,turn,card))
    states=[json.loads(x) for x in (O/run/'states.jsonl').open()]
    i=bisect.bisect_right([x['ts'] for x in states],row['ts'])-1
    assert states[i]['state']['combat']['player']['cards_played_this_turn']==4
    assert states[i+1]['state']['combat']['player']['cards_played_this_turn']==5
    assert all(x['total']==(10 if card=='DEFEND_SILENT' else 18) for x in row['deltas'])
    target=states[i:i+2]
    with (ROOT/'logs/states.jsonl').open('rb') as f:
        lo,hi=0,(ROOT/'logs/states.jsonl').stat().st_size
        while hi-lo>65536:
            mid=(lo+hi)//2
            f.seek(mid);f.readline();line=f.readline()
            if not line:hi=mid;continue
            if json.loads(line)['ts']<target[0]['ts']:lo=f.tell()
            else:hi=mid
        start=max(0,lo-65536);f.seek(start)
        if start:f.readline()
        matched=[]
        while True:
            off=f.tell();line=f.readline()
            if not line:break
            record=json.loads(line)
            if record['ts']>target[-1]['ts']:break
            for t in target:
                if record['ts']==t['ts']:
                    assert record==t and record['state']['run']['character_id'].lower()=='silent'
                    matched.append(dict(ts=record['ts'],offset=off))
        assert len(matched)==2
    out.append(dict(case=row,source_offsets=matched))
(O/'history-pair-verification.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('两局历史第五张配对/四原帧字节核验通过；其余候选未确证计数/限制，不推广总出牌计数保证触发')
