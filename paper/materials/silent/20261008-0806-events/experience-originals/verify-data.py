import collections,json,hashlib,bisect
from pathlib import Path
O=Path(__file__).parent
N='GXNKW8X1XYJP'
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
def powers(x):return {p['power_id']:p['amount'] for p in x.get('powers',[])}
def allcards(s):
    result=list((s.get('combat') or {}).get('hand',[]))
    view=(s.get('agent_view') or {}).get('combat') or {}
    for k in ['draw','discard','exhaust']:
        for group in view.get(k,[]):
            for cid in group.get('card_ids',[]):
                result.append(dict(card_id=cid,upgraded='+' in group['line'].split(' [')[0],resolved_rules_text=group['line']))
    return result
dampen=[]
for run in R:
    seen=[];previous=None;pairs=[]
    for line in (O/run/'states.jsonl').open():
        x=json.loads(line);s=x['state'];c=s.get('combat') or {}
        assert s['run']['character_id'].lower()=='silent'
        if not powers(c.get('player') or {}).get('DAMPEN_POWER'):
            if c:previous=x
            continue
        deck=s['run'].get('deck',[])
        upgraded={a['card_id'] for a in deck if a.get('upgraded')}
        cards=allcards(s)
        changed=[dict(id=a['card_id'],text=a.get('resolved_rules_text'),dynamic=a.get('dynamic_values')) for a in cards if a['card_id'] in upgraded and not a.get('upgraded')]
        if changed:seen.append(dict(ts=x['ts'],floor=s['run']['floor'],turn=s['turn'],changed=changed))
        if previous and previous['state']['run']['floor']==s['run']['floor']:
            before=collections.Counter((a['card_id'],bool(a.get('upgraded'))) for a in allcards(previous['state']))
            after=collections.Counter((a['card_id'],bool(a.get('upgraded'))) for a in cards)
            ids={a['card_id'] for a in cards}
            shifts=[dict(id=i,upgraded_before=before[i,True],upgraded_after=after[i,True],ordinary_before=before[i,False],ordinary_after=after[i,False]) for i in ids if before[i,True]>after[i,True] and after[i,False]>before[i,False] and before[i,True]+before[i,False]==after[i,True]+after[i,False]]
            if shifts:
                pairs.append(dict(before_ts=previous['ts'],after_ts=x['ts'],floor=s['run']['floor'],shifts=shifts))
                previous=None
    if seen and pairs:dampen.append(dict(run=run,asc=R[run]['ascension'],frames=seen,conserved_pairs=pairs))
(O/'dampen-history.json').write_text(json.dumps(dampen,ensure_ascii=False,indent=2)+'\n')
print('抑制改标支持局',[(r['run'],r['asc'],len(r['frames'])) for r in dampen])
F=json.load(open(O/N/'facts.json'))
S=[json.loads(s) for s in (O/N/'states.jsonl').open()]
D=[json.loads(s) for s in (O/N/'decisions.jsonl').open()]
M={s['ts']:s['state'] for s in S}
for turn,hp,enemy in [(5,54,130),(6,54,10)]:
    end=next(r for r in F if r['floor']==33 and r['turn']==turn and r['action']=='end_turn')
    assert end['after']['hp']==hp and end['after']['enemies'][0]['hp']==enemy
assert next(r for r in F if r['floor']==33 and r['turn']==5 and r['action']=='end_turn')['before']['enemies'][0]['hp']==214
paired=[]
for att in [2,4]:
    begin=next(d for d in D if d['floor']==45 and d['turn']==2 and (d.get('sl_attempt') or 1)==att)
    s=M[begin['ts']];c=s['combat'];assert s['run']['current_hp']==2
    assert powers(c['player'])['DEXTERITY_POWER']==3 and powers(c['player'])['STRENGTH_POWER']==1
    assert [e['current_hp'] for e in c['enemies']]==[84,84,77]
    first3=next(d for d in D if d['floor']==45 and d['turn']==3 and (d.get('sl_attempt') or 1)==att)
    z=M[first3['ts']];expected=(3,0,218) if att==2 else (13,7,226)
    assert (z['run']['current_hp'],z['combat']['player']['block'],sum(e['current_hp'] for e in z['combat']['enemies']))==expected
    paired.append(dict(attempt=att,start_hand=sorted(a['card_id'] for a in c['hand']),start_hp=2,start_powers=powers(c['player']),t3_hp=expected[0],t3_block=expected[1],t3_enemy_hp=expected[2],ts=begin['ts']))
assert paired[0]['start_hand']==paired[1]['start_hand']
last=next(r for r in F if r['floor']==45 and r['attempt']==4 and r['turn']==3 and r['action']=='end_turn')
assert last['before']['hp']==13 and last['before']['block']==23 and last['before']['powers']['PLATING_POWER']==2
assert last['after']['hp']==0 and [e['hp'] for e in last['after']['enemies']]==[38,76,67]
assert sum(i['damage']*i.get('hits',1) for e in last['before']['enemies'] for i in e['intents'] if i.get('damage'))==40
(O/'sl-paired-facts.json').write_text(json.dumps(paired,ensure_ascii=False,indent=2)+'\n')
print('同盘T2两线、T3血挡、恶魔84毒与97净扣、末战实死通过')
