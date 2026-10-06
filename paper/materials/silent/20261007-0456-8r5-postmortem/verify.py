import json,sys,collections
sys.path.insert(0,'learner/runs/20261007-044301-postmortem')
from analyse import ds,ss,powers
byts={x['ts']:x['state'] for x in ss}
assert len(ds)==653 and len(ss)==671
entry=next(x for x in ds if x['floor']==35 and x['label'].startswith('combat/'))
assert json.loads(entry['fingerprint'])['hp']==62
last=byts['2026-10-06T20:36:20.118Z']['combat'];dead=ss[-1]['state']['combat']
assert (last['player']['current_hp'],last['player']['block'],last['enemies'][0]['intents'][0]['total_damage'])==(6,13,42)
assert 42-13==29 and 6-29==-23 and dead['player']['current_hp']==0 and dead['enemies'][0]['current_hp']==29
assert powers(last['player']['powers'])['FRAIL_POWER']==1
assert sum(z['current_value'] for h in last['hand'] for z in h.get('dynamic_values',[]))==0
assert sum(x.get('rollout_best_chosen') is True for x in ds if x['label'].startswith('combat/plan-choice'))==84
assert sum(x.get('rollout_best_chosen') is False for x in ds if x['label'].startswith('combat/plan-choice'))==7
assert sum('HP guard' in x['rationale'] for x in ds)==2
assert sum(x['decider']=='jev' and x.get('confidence') is not None and x['confidence']<.35 for x in ds)==7
assert sum(x.get('expect',{}).get('card',{}).get('id')=='GRAND_FINALE' and x.get('chosen',{}).get('action')=='play_card' for x in ds)==1
assert byts['2026-10-06T20:32:05.593Z']['agent_view']['combat']['draw']==[]
assert byts['2026-10-06T20:32:05.593Z']['combat']['enemies'][0]['current_hp']-byts['2026-10-06T20:32:08.071Z']['combat']['enemies'][0]['current_hp']==75
assert not any(x['floor']==35 and x.get('expect',{}).get('card',{}).get('id') in ['SERPENT_FORM','FOOTWORK'] for x in ds)
assert powers(byts['2026-10-06T20:35:44.224Z']['combat']['enemies'][0]['powers'])['STRENGTH_POWER']==18
assert powers(byts['2026-10-06T20:35:45.257Z']['combat']['enemies'][0]['powers'])['STRENGTH_POWER']==14
print('关键证据核验通过：62血进场；T7为6血/13挡/42攻击/需损29/差23/敌剩29；两次护栏；收场实扣75；末战未建步法或群蛇。')
print('Jev原答最优84/91=',round(84/91*100,2),'，扣除护栏未替换的原答82/91=',round(82/91*100,2))
print('无Jev轮32/105；自主代码145条/103轮；非结束自主代码覆盖38轮。')
