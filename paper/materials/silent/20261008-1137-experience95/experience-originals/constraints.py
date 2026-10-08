import bisect, json
from pathlib import Path
O=Path(__file__).parent
rows=json.load(open(O/'mechanism-actions.json'))
ring=[]
for run in json.load(open(O/'mechanism-counts.json'))['TORIC_TOUGHNESS']['runs']:
    S=[json.loads(s) for s in (O/run/'states.jsonl').open()]
    for r in rows:
        if r['run']!=run or r['card']!='TORIC_TOUGHNESS' or r.get('detail'):continue
        starts=[]
        for turn in [r['turn']+1,r['turn']+2]:
            s=next((s for s in S if s['ts']>r['ts'] and s['state']['run']['floor']==r['floor'] and s['state']['turn']==turn and s['state'].get('combat')),None)
            if s:
                p=s['state']['combat']['player'];starts.append(dict(turn=turn,block=p['block'],powers=p['powers'],ts=s['ts']))
        ring.append(dict(r,next_starts=starts))
(O/'ring-delayed.json').write_text(json.dumps(ring,ensure_ascii=False,indent=2)+'\n')
early=None
for line in (O/'9YBKCNBFP0X5/states.jsonl').open():
    s=json.loads(line)
    if any(c['card_id']=='INFECTION' for c in (s['state'].get('combat') or {}).get('hand',[])):
        early=s;break
assert early and early['state']['run']['ascension']==4
(O/'infection-first-text.json').write_text(json.dumps(early,ensure_ascii=False,indent=2)+'\n')
base=[r for r in rows if r['run']=='NEWRFAYKTQHR' and r['floor']==31 and r['turn']==2 and r.get('detail')]
starts=[next(r for r in base if r['attempt']==a) for a in [1,3,4]]
assert all((r['before']['hp'],r['before']['enemies'][0]['hp'],r['before']['enemies'][0]['powers']['POISON_POWER'])==(28,151,4) for r in starts)
S=[json.loads(s) for s in (O/'NEWRFAYKTQHR/states.jsonl').open()];M={s['ts']:s['state'] for s in S}
hands=[[dict(id=c['card_id'],upgraded=c['upgraded']) for c in M[r['ts']]['combat']['hand']] for r in starts]
assert hands[0]==hands[1]==hands[2]
(O/'prism-t2-same-hand.json').write_text(json.dumps(dict(starts=starts,hands=hands),ensure_ascii=False,indent=2)+'\n')
terminal=next(r for r in rows if r['run']=='79UCJ0K6R9C1' and r['floor']==14 and r['turn']==11 and r['action']=='end_turn' and r.get('detail'))
assert (terminal['before']['hp'],terminal['before']['block'],terminal['after']['hp'])==(2,7,0)
assert [(e['hp'],e['powers'].get('POISON_POWER',0)) for e in terminal['after']['enemies']]==[(8,10),(21,0),(14,0)]
(O/'infection-terminal.json').write_text(json.dumps(terminal,ensure_ascii=False,indent=2)+'\n')
print('坚韧之环延迟帧',len(ring),'早期感染牌文及棱柱三试T2同手核验通过')
