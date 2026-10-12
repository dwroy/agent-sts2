import collections
import json
from pathlib import Path

O = Path(__file__).parent
C = json.load(open(O / 'changes.json'))
by_id = {c['id']: c['after'] for c in C}
A = json.load(open(O / 'audit.json'))
parameters = {}
for ident, card, power in [('silent-shockwave-duration','SHOCKWAVE',None), ('silent-noxious-fumes-growth','NOXIOUS_FUMES','NOXIOUS_FUMES_POWER'), ('silent-toric-toughness-delayed-block','TORIC_TOUGHNESS','TORIC_TOUGHNESS_POWER'), ('silent-deadly-poison-application','DEADLY_POISON',None)]:
    ev = by_id[ident]['evidence']
    rows = [x for x in A['cards'] if x['run'] in ev and x['card'] == card]
    facts = []
    for row in rows:
        x = dict(run=row['run'],floor=row['floor'],turn=row['turn'],ts=row['ts'],text=row['text'],dynamic=row['dynamic'])
        if power:
            x['before_amount']=row['before']['powers'].get(power,0)
            x['after_amount']=row['after']['powers'].get(power,0)
            x['delta']=x['after_amount']-x['before_amount']
        else:
            x['before_enemies']=row['before']['enemies'];x['after_enemies']=row['after']['enemies']
        facts.append(x)
    parameters[ident]=dict(actions=len(rows),runs=len({x['run'] for x in rows}),delta_distribution=dict(collections.Counter(x['delta'] for x in facts)) if power else None, cases=facts, limitation='净属性变化须分离重放/已有额度/其他来源；主题支持局数不当逐公式独立分母。')

thresholds, ringing, toric_rounds, horn = [], [], [], []
runs=set(n for ident in ['silent-ceremonial-beast-threshold-growth-sl','silent-ceremonial-beast-ringing-one-card','silent-toric-toughness-delayed-block','silent-horn-cleat-second-turn-block'] for n in by_id[ident]['evidence'])
for run in sorted(runs):
    states=[json.loads(s) for s in (O/run/'states.jsonl').open()]
    prev=None;seen_turns=set()
    for x in states:
        s=x['state'];c=s.get('combat')
        if not c or s['screen']!='COMBAT':
            prev=None;continue
        assert s['run']['character_id'].lower()=='silent'
        player={p['power_id']:p['amount'] for p in c['player']['powers']}
        if prev and prev['state']['run']['floor']==s['run']['floor'] and prev['state']['turn']<=s['turn']:
            old=prev['state']['combat']
            a=next((e for e in old['enemies'] if e['enemy_id']=='CEREMONIAL_BEAST'),None)
            b=next((e for e in c['enemies'] if e['enemy_id']=='CEREMONIAL_BEAST'),None)
            if a and b:
                pa={p['power_id']:p['amount'] for p in a['powers']};pb={p['power_id']:p['amount'] for p in b['powers']}
                if 'PLOW_POWER' in pa and 'PLOW_POWER' not in pb:
                    thresholds.append(dict(run=run, floor=s['run']['floor'],turn=s['turn'],ts=x['ts'],before_hp=a['current_hp'],after_hp=b['current_hp'],threshold=pa['PLOW_POWER'],before_strength=pa.get('STRENGTH_POWER',0),after_strength=pb.get('STRENGTH_POWER',0),crossed=a['current_hp']>pa['PLOW_POWER']>=b['current_hp']))
        blocked=[h['card_id'] for h in c['hand'] if h.get('unplayable_preventer_id')=='RINGING_POWER']
        if player.get('RINGING_POWER')==1 and blocked:
            ringing.append(dict(run=run,floor=s['run']['floor'],turn=s['turn'],ts=x['ts'],energy=c['player']['energy'],block=c['player']['block'],blocked=blocked))
        key=(s['run']['floor'],s['turn'])
        if prev and (prev['state']['run']['floor']!=s['run']['floor'] or prev['state']['turn']>s['turn']):seen_turns=set()
        if key not in seen_turns:
            if player.get('TORIC_TOUGHNESS_POWER',0)>0:toric_rounds.append(dict(run=run,floor=key[0],turn=key[1],ts=x['ts'],block=c['player']['block'],powers=player))
            if s['turn']==2 and any(r['relic_id']=='HORN_CLEAT' for r in s['run']['relics']):horn.append(dict(run=run,floor=key[0],ts=x['ts'],block=c['player']['block'],powers=player))
            seen_turns.add(key)
        prev=x
assert any(x['run']=='HXCY44VD9QWU' and x['crossed'] and x['after_strength']==0 for x in thresholds)
data=dict(parameters=parameters,beast_threshold_transitions=thresholds,ringing_blocked_frames=ringing,toric_round_starts=toric_rounds,horn_second_turn_starts=horn,limitation='按同层相邻原帧筛候选，重复SL/帧不当独立局；同时发生其他被动挡时，不把轮初总挡全归一个遗物/能力。')
(O/'historical-parameter-audit.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
summary=dict(cards={k:{x:v for x,v in z.items() if x!='cases'} for k,z in parameters.items()},beast_crossings=len(thresholds),beast_crossing_runs=len({x['run'] for x in thresholds}),ringing_runs=len({x['run'] for x in ringing}),toric_rounds=len(toric_rounds),horn_rounds=len(horn))
(O/'historical-parameter-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False))
