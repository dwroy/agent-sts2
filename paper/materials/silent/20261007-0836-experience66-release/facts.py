import bisect, collections, hashlib, json, os
from pathlib import Path

O = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
RUN = 'P5HT1272P5SB'
A = json.load(open(O / 'audit.json'))
S = [json.loads(l) for l in (O / RUN / 'states.jsonl').open()]
D = [json.loads(l) for l in (O / RUN / 'decisions.jsonl').open()]
assert len(D) == 409 and len(S) == 423
assert all(s['state']['run']['character_id'].lower() == 'silent' for s in S)
sm = {s['observed_ts']: s for s in S}
for d in D:
    assert d['observed_ts'] in sm
    assert d['fingerprint'] == sm[d['observed_ts']]['fingerprint']
assert sum(f['death'] for f in A['fights'] if f['run'] == RUN) == 1
assert len([f for f in A['fights'] if f['run'] == RUN]) == 12
expected = {
    8: ([90,74,56,20], [16,18,36,20], [1,5,15,0]),
    17: ([324,300,261,233,186,172,151,144,113,113,100,96,79,66,38,32,7], [24,39,28,47,14,21,7,31,0,13,4,17,13,28,6,25,7], [0,10,0,7,4,1,0,0,0,0,11,0,2,4,12,0,0]),
    23: ([134,78,30], [56,48,30], [0,12,0]),
    25: ([129,129,115,96,83,75,69,69,52], [21,14,40,34,8,6,0,38,14], [0,3,0,5,0,14,0,15,3]),
}
rounds = {}
for floor, want in expected.items():
    xs = [x['state'] for x in S if x['state']['run']['floor'] == floor and x['state'].get('combat')]
    need, damage, loss = [], [], []
    for t in sorted({x['turn'] for x in xs}):
        before = next(x for x in xs if x['turn'] == t)
        after = next((x for x in xs if x['turn'] == t+1), xs[-1])
        n = sum(e['current_hp'] for e in before['combat']['enemies'])
        z = sum(e['current_hp'] for e in after['combat']['enemies'])
        extra = 21 if floor == 25 and t in [1,3,4,8] else 0
        need.append(n); damage.append(n-z+extra)
        loss.append(before['combat']['player']['current_hp']-after['combat']['player']['current_hp'])
    assert (need, damage, loss) == want, floor
    rounds[floor] = dict(need=need, damage=damage, loss=loss)
cards = [x for x in A['cards'] if x['run'] == RUN]
def brief(s):
    c=s.get('combat') or {};p=c.get('player') or {}
    return dict(hp=s['run']['current_hp'],block=p.get('block'),energy=p.get('energy'),powers={x['power_id']:x['amount'] for x in p.get('powers',[])},enemies=c.get('enemies',[]))
times=[s['observed_ts'] for s in S]
pending=[]
for d in D:
    card=(d.get('expect') or {}).get('card',{}).get('id')
    if not d.get('chosen') or d['chosen']['action']!='play_card' or card not in ['NIGHTMARE','ABUNDANCE'] or not d.get('result','').startswith('pending'):continue
    i=bisect.bisect_left(times,d['observed_ts']);before=S[i]['state']
    after=next(x['state'] for x in S[i+1:] if x['state']['run']['floor']==d['floor'] and x['state']['turn']==d['turn'] and x['state']['screen']=='COMBAT' and x['state'].get('combat') and (card!='NIGHTMARE' or any(p['power_id']=='NIGHTMARE_POWER' and p['amount']==3 for p in x['state']['combat']['player']['powers'])))
    hand=next(c for c in before['combat']['hand'] if c['card_id']==card)
    row=dict(run=RUN,floor=d['floor'],turn=d['turn'],ts=d['ts'],card=card,text=hand['resolved_rules_text'],before=brief(before),after=brief(after),result=d['result'])
    pending.append(row);cards.append(row)
(O/'pending-resolved-mechanisms.json').write_text(json.dumps(pending,ensure_ascii=False,indent=2)+'\n')
ids = ['FOOTWORK','NIGHTMARE','ABUNDANCE','ABRASIVE','FASTEN','EXPOSE','DEFEND_SILENT','BACKFLIP','NEUTRALIZE']
actions = {c:[x for x in cards if x['card'] == c] for c in ids}
assert actions['FOOTWORK'] and actions['NIGHTMARE'] and actions['ABRASIVE'] and actions['FASTEN'] and actions['EXPOSE']
last = next(x for x in actions['DEFEND_SILENT'] if x['floor'] == 25 and x['turn'] == 9)
assert last['before']['powers']['DEXTERITY_POWER'] == 4
assert last['before']['powers']['FASTEN_POWER'] == 4
assert last['after']['block']-last['before']['block'] == 13
thorns = next(x for x in A['ends'] if x['run'] == RUN and x['floor'] == 25 and x['turn'] == 8)
assert thorns['before']['powers']['THORNS_POWER'] == 6
assert thorns['before']['powers']['DEXTERITY_POWER'] == 4
assert thorns['after']['hp'] == 3
nightmare = next(x for x in actions['NIGHTMARE'] if x['floor']==25)
assert nightmare['after']['powers']['NIGHTMARE_POWER'] == 3
copy_state = next(x['state'] for x in S if x['state']['run']['floor'] == 25 and x['state']['turn'] == 2)
assert sum(c['card_id'] == 'ABUNDANCE' for c in copy_state['combat']['hand']) == 3
assert copy_state['combat']['player']['powers']
assert all('消耗' in x['text'] for x in actions['EXPOSE'])
abrasive_copies=[x for x in actions['ABRASIVE'] if x['floor']==19 and x['turn']==2]
assert len(abrasive_copies)==3
assert [x['after']['powers']['THORNS_POWER'] for x in abrasive_copies]==[12,18,24]
assert [x['after']['powers']['DEXTERITY_POWER'] for x in abrasive_copies]==[2,3,4]
assert all(x['before']['energy']==x['after']['energy']==3 for x in abrasive_copies)
hsx = [x for x in A['cards'] if x['run'] == 'HSX4HYATB4E2' and x['floor'] == 31 and x['turn'] == 2]
assert any(x['card'] == 'FASTEN' and x['after']['powers'].get('FASTEN_POWER') == 4 for x in hsx)
assert any(x['card'] == 'DEFEND_SILENT' and x['after']['block']-x['before']['block'] == 18 for x in hsx)
quotes = [dict(ts=d['ts'],floor=d['floor'],label=d['label'],journal=d.get('journal'),rationale=d.get('rationale'),questions=d.get('questions')) for d in D if d['decider'] == 'codex' and d['floor'] in [1,9,16,17,18,22,24]]
(O/'new-mechanism-facts.json').write_text(json.dumps(dict(rounds=rounds,actions=actions,nightmare_next_hand=copy_state['combat']['hand'],hsx_fasten=hsx),ensure_ascii=False,indent=2)+'\n')
(O/'journal-quotes.json').write_text(json.dumps(quotes,ensure_ascii=False,indent=2)+'\n')

start, end = D[0]['ts'], D[-1]['ts']
def lower(f, stamp):
    lo, hi = 0, os.fstat(f.fileno()).st_size
    while hi-lo > 262144:
        mid = (lo+hi)//2; f.seek(mid); f.readline(); pos=f.tell(); line=f.readline()
        if not line: hi=mid; continue
        t=json.loads(line).get('ts','')
        if t < stamp: lo=pos
        else: hi=mid
    return lo
with (ROOT/'logs/deepseek-reasoning.jsonl').open('rb') as f, (O/RUN/'deepseek-reasoning.jsonl').open('wb') as out:
    offset=lower(f,start);f.seek(offset); count=0
    for line in f:
        x=json.loads(line)
        if x['ts'] > end: break
        if x['ts'] >= start: out.write(line);count+=1
assert count == 0
(O/'deepseek-window-check.json').write_text(json.dumps(dict(start=start,end=end,offset=offset,count=count))+'\n')
(O/'state-role-check.json').write_text(json.dumps(dict(states=len(S),decisions=len(D),fingerprints=len(D),silent=True))+'\n')
print('423静默帧、409决策指纹、四场逐轮数组、复制三张、勒紧13挡、荆棘6与旧HSX实际18挡重核通过；同窗DeepSeek0。')
