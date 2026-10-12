import json,re
from pathlib import Path
from datetime import datetime
p=Path(__file__).resolve().parent;rid='SY0WMJNNVRLM'
s=[json.loads(l) for l in (p/f'{rid}-states.jsonl').open()];by={r['_line']:r for r in s}
d=[json.loads(l) for l in (p/f'{rid}-decisions.jsonl').open()];db={r['_line']:r for r in d}
rc=json.load(open(p/f'{rid}-resources.json'))
assert len(d)==636 and len(s)==722 and len(rc['combats'])==20
assert all(c['entry_is_turn_one'] for c in rc['combats'])
assert [(c['floor'],c['entry']['hp'],(c['exit'] or c['last'])['hp']) for c in rc['combats']]==[(2,56,54),(3,54,54),(4,54,49),(6,49,39),(9,53,12),(14,33,33),(17,54,14),(19,58,47),(20,47,17),(21,17,1),(21,17,9),(21,17,3),(30,64,70),(31,70,46),(33,70,4),(33,70,5),(33,70,4),(33,70,4),(33,70,5),(33,70,0)]
a=by[301839]['state']['combat'];z=by[301840]['state']['combat']
assert a['player']['current_hp']==11 and a['player']['block']==7
assert a['enemies'][0]['current_hp']==196 and z['enemies'][0]['current_hp']==179
assert a['enemies'][0]['intents'][0]['damage']==15 and a['enemies'][0]['intents'][0]['hits']==2
assert z['player']['current_hp']==0 and next(p['amount'] for p in z['enemies'][0]['powers'] if p['power_id']=='SANDPIT_POWER')==2
assert 30-7==23 and 23-11+1==13
expected_start=[341,311,296,290,274,255,240,232,205];expected_dmg=[30,15,6,16,19,15,8,27,26]
starts=[301785,301793,301800,301807,301812,301817,301823,301829,301834]
assert [by[n]['state']['combat']['enemies'][0]['current_hp'] for n in starts]==expected_start
ends=starts[1:]+[301840]
assert [by[a]['state']['combat']['enemies'][0]['current_hp']-by[b]['state']['combat']['enemies'][0]['current_hp'] for a,b in zip(starts,ends)]==expected_dmg
assert sum(expected_dmg)==162 and 162/9==18
for before,after,nextturn in [(301594,301595,301596),(301637,301638,301639),(301680,301681,301682),(301723,301724,301725),(301765,301766,301767),(301810,301811,301812)]:
 assert by[before]['state']['combat']['enemies'][0]['move_id']=='SALIVATE_MOVE'
 assert by[after]['state']['combat']['player']['current_hp']==by[before]['state']['combat']['player']['current_hp']
 assert any(x['power_id']=='INTANGIBLE_POWER' and x['amount']==1 for x in by[after]['state']['combat']['player']['powers'])
 assert not any(x['power_id']=='INTANGIBLE_POWER' for x in by[nextturn]['state']['combat']['player']['powers'])
assert not [x for r in s if r['state']['run']['floor']==33 for x in (r['state'].get('combat') or {}).get('player',{}).get('powers',[]) if x['power_id']=='STRENGTH_POWER']
for n in [301521,301548]:
 assert next(x['amount'] for x in by[n]['state']['combat']['player']['powers'] if x['power_id']=='STRENGTH_POWER')==4
assert len([x for x in d if x['decider']=='jev' and x['confidence']<.35])==34
assert len([x for x in d if x['decider']=='jev' and x.get('rollout',{}).get('available')])==163
assert sum(x.get('rollout_best_chosen') is True for x in d if x['decider']=='jev' and x.get('rollout',{}).get('available'))==147
assert len([x for x in d if 'HP guard:' in x['rationale']])==1
assert len([x for x in d if x['chosen']['action']=='use_potion'])==14
assert sum([21,21,21,36,31,24])==154
summary=json.load(open(p/'summary.json'))
assert summary['usage']['jev']['input']==907321 and summary['usage']['jev']['output']==8900
assert summary['usage']['codex']['input']==4854235 and summary['usage']['codex']['output']==9013 and summary['usage']['codex']['cache']==3230720
assert 916221+4854235+9013==5779469
assert len([json.loads(l) for l in (p/f'{rid}-brain.jsonl').open()])==37
assert summary['duration']['decision_seconds']==2072.241
print('关键数字核验通过：资源20窗口、死亡、逐轮扣血、药水、力量、HP护栏、调用、token。')
