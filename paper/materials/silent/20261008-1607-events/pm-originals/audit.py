import json,collections
from pathlib import Path
p=Path(__file__).parent
S={x['_line']:x for x in map(json.loads,(p/'states.jsonl').open())};D={x['_line']:x for x in map(json.loads,(p/'decisions.jsonl').open())};R=json.loads((p/'9DAS5L8YM1CN-resources.json').read_text())
def hp(n):return S[n]['state']['run']['current_hp']
def enemy(n):return [(e['enemy_id'],e['current_hp']) for e in (S[n]['state'].get('combat') or {}).get('enemies',[])]
def power(n,key):return next((x['amount'] for x in S[n]['state']['combat']['player']['powers'] if x['power_id']==key),0)
assert [(c['floor'],c['entry']['hp'],(c['exit'] or c['last'])['hp']) for c in R['combats']]==[(2,56,48),(3,69,17),(5,17,17),(6,17,17),(12,53,26),(14,62,48),(17,70,28),(19,61,38),(21,38,25),(22,25,2),(23,2,2),(23,2,2),(23,2,2),(23,2,0)]
assert all(c['entry_is_turn_one'] for c in R['combats'])
assert all(c['entry']['max_hp']==70 for c in R['combats'])
assert [hp(n) for n in [299905,299906,299913,299924,299925,299958,299963,299964]]==[2,2,2,2,2,2,2,0]
assert len(S[299905]['state']['combat']['hand'])==4 and len(S[299906]['state']['combat']['hand'])==7
assert all(c['card_id']=='SHIV' and c['upgraded'] for c in S[299906]['state']['combat']['hand'][-3:])
assert [enemy(n)[0][1] for n in [299909,299910,299911,299912]]==[31,25,19,13]
assert S[299924]['state']['combat']['player']['block']==6
assert S[299963]['state']['combat']['player']['block']==12
assert power(299959,'DEXTERITY_POWER')==5 and power(299963,'DEXTERITY_POWER')==1 and power(299963,'STRENGTH_POWER')==-4
assert [enemy(n)[0][1] for n in [299956,299957,299960,299961,299962,299963]]==[126,95,95,90,86,81]
assert [enemy(n)[0][1] for n in [299864,299865,299866,299867,299868]]==[84,60,60,58,56]
assert [enemy(n)[0][1] for n in [299913,299914,299915,299916,299917]]==[38,32,32,30,26]
assert (hp(299871),hp(299891),hp(299925))==(33,25,2)
for a,b,delta in [(299594,299595,21),(299705,299706,36),(299745,299746,36),(299772,299773,22),(299817,299818,33)]:assert hp(b)-hp(a)==delta
assert len(D)==387 and len(S)==396
J=[d for d in D.values() if d['decider']=='jev'];Q=[d for d in J if 'plan' in d.get('questions',{})]
assert len(J)==120 and sum(d.get('confidence',1)<.35 for d in J)==13 and len(Q)==106
assert sum('code rank 1' in d['rationale'] for d in Q)==80
assert sum(json.loads(d['questions']['plan']['criteria'][d['answers']['plan']['choice']]).get('rollout_best') is True for d in Q)==94
assert len([d for d in D.values() if 'HP guard:' in d['rationale']])==1
assert len([d for d in D.values() if d.get('chosen',{}).get('action')=='use_potion'])==8
assert not any(d.get('chosen',{}).get('action')=='discard_potion' for d in D.values())
assert len(R['sl_events'])==6 and [x['result'] for x in R['sl_events']]==['won','won','predicted_death','predicted_death','predicted_death','died']
assert (D[292659]['questions']['plan']['criteria']['plan2'] and json.loads(D[292659]['questions']['plan']['criteria']['plan2'])['damage_dealt'])==24
assert json.loads(D[292705]['questions']['plan']['criteria']['plan1'])['damage_dealt']==8
print('关键入口、逐步伤害、药水、SL、护栏和统计核验通过')
