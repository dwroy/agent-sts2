import json,collections,re
from pathlib import Path
p=Path('learner/runs/20261009-071302-postmortem');d=[json.loads(x) for x in (p/'decisions.jsonl').open()];s=[json.loads(x) for x in (p/'states.jsonl').open()]
k=lambda r:(r['floor'],r.get('sl_attempt') or 0,r['turn'])
combat=[r for r in d if r['turn'] and r['label'].startswith('combat/')];allturn={k(r) for r in combat};jevturn={k(r) for r in combat if r['decider']=='jev'};print('TURNS',len(allturn),len(jevturn),len(allturn-jevturn));print('BOSS_JEV',len([r for r in d if r['floor']==17 and r['decider']=='jev']),sum(r.get('rollout_best_chosen') is True for r in d if r['floor']==17 and r['decider']=='jev'))
print('ROUTE')
r=next(r for r in d if r['label']=='map/route-plan')
for k,q in r['questions'].items():
    for kk,v in q.get('criteria',{}).items():print(kk,v)
print('PLANQUESTIONS')
for line in (p/'run-plans.jsonl').open():
    r=json.loads(line);q=r.get('question');print('P',r['_line'],type(q),str(q)[-5500:])
print('SELECTED')
for r in d:
    if r['floor']==17 and ((r.get('sl_attempt')==4 and r['turn']==2) or (r.get('sl_attempt')==6 and r['turn']==3)):
        print(r['_line'],r['label'],r['rationale'],r['chosen']);print('roll',r.get('rollout'))
        for k,v in (r.get('questions',{}).get('plan',{}).get('criteria') or {}).items():
            v=json.loads(v);print(k,{kk:v.get(kk) for kk in ('plays','hp_lost','damage_dealt','block_gained','rollout_best','whole_fight_sim')})
print('BOSS_LAST',s[-1]['state']['combat']['enemies'])
print('REST9',next(r['rationale'] for r in d if r['label']=='rest/plan' and r['floor']==9))
print('STATEVIEW',s[0]['state']['agent_view'])
