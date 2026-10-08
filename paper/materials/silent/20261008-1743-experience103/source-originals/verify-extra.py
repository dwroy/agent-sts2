import bisect
import json
from pathlib import Path

O=Path(__file__).parent
checks=[]
def powers(e):return {p['power_id']:p['amount'] for p in e.get('powers',[])}
def check(name,condition,data):
    assert condition,(name,data)
    checks.append(dict(name=name,data=data,passed=True))
for n in ['BJLTVSYXCSGS','Y5H4CFAQ2WTG']:
    ss=[json.loads(l) for l in (O/n/'states.jsonl').open()];ds=[json.loads(l) for l in (O/n/'decisions.jsonl').open()];ts=[s['ts'] for s in ss]
    def frame(d):
        i=bisect.bisect_left(ts,d['ts']);assert ts[i]==d['ts']
        return ss[i]['state'],ss[i+1]['state']
    def card(d):return (d.get('expect',{}).get('card') or {}).get('id')
    if n.startswith('BJL'):
        s=next(s['state'] for s in ss if s['state']['run']['floor']==42 and s['state'].get('combat'))
        check('三敌开场各1人工制品',len(s['combat']['enemies'])==3 and all(powers(e).get('ARTIFACT_POWER')==1 for e in s['combat']['enemies']),s['combat']['enemies'])
        for attempt in [1,3]:
            d=next(d for d in ds if d['floor']==42 and d['turn']==2 and d.get('sl_attempt')==attempt and card(d)=='DEFEND_SILENT' and str(d['result']).startswith('completed'))
            b,z=frame(d);r=next(r for r in b['run']['relics'] if r['relic_id']=='IRON_CLUB')
            check('铁棒第4张额外抽蜃景试'+str(attempt),r['stack']==3 and len(z['combat']['hand'])==len(b['combat']['hand']) and any(c['card_id']=='MIRAGE' for c in z['combat']['hand']),dict(ts=d['ts'],before=b['combat']['hand'],after=z['combat']['hand']))
        d=next(d for d in ds if d['floor']==42 and d['turn']==2 and d.get('sl_attempt')==3 and (d.get('chosen') or {}).get('action')=='end_turn')
        b,z=frame(d)
        check('轮初抱抱无毒方柱58到55',b['combat']['enemies'][2]['current_hp']==58 and not powers(b['combat']['enemies'][2]).get('POISON_POWER') and z['combat']['enemies'][2]['current_hp']==55,dict(ts=d['ts'],before=b['combat']['enemies'][2],after=z['combat']['enemies'][2]))
        # The two attempts share the state before any turn-two card, not just the displayed HP.
        openings=[]
        for attempt in [1,3]:
            d=next(d for d in ds if d['floor']==42 and d['turn']==2 and d.get('sl_attempt')==attempt and (d.get('chosen') or {}).get('action')=='play_card')
            b,z=frame(d);openings.append(dict(hp=b['run']['current_hp'],energy=b['combat']['player']['energy'],hand=[(c['card_id'],c['upgraded']) for c in b['combat']['hand']],enemies=[e['current_hp'] for e in b['combat']['enemies']]))
        check('SL首末试T2同首手/能量/血量',openings[0]==openings[1],openings)
    else:
        d=next(d for d in ds if d['floor']==33 and d['turn']==1 and (d.get('chosen') or {}).get('action')=='confirm_selection')
        b,z=frame(d);before=b['combat']['enemies'][0]['current_hp'];after=z['combat']['enemies'][0]['current_hp']
        selects=[d for d in ds if d['floor']==33 and d['turn']==1 and (d.get('chosen') or {}).get('action')=='select_deck_card']
        check('铜钹确认五弃341到326',len(selects)==5 and before==341 and after==326,dict(ts=d['ts'],selected=len(selects),before=before,after=after))
        d=next(d for d in ds if d['floor']==33 and d['turn']==3 and (d.get('chosen') or {}).get('action')=='select_deck_card')
        b,z=frame(d);check('铜钹单弃214到211',b['combat']['enemies'][0]['current_hp']==214 and z['combat']['enemies'][0]['current_hp']==211,dict(ts=d['ts'],before=b['combat']['enemies'][0]['current_hp'],after=z['combat']['enemies'][0]['current_hp']))
        check('末轮没有计算下注实出',not any(d['floor']==33 and d['turn']==10 and card(d)=='CALCULATED_GAMBLE' and str(d.get('result')).startswith('completed') for d in ds),dict(floor=33,turn=10))
(O/'extra-numbers-checked.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
print('补充逐帧核验通过',len(checks),'项')
