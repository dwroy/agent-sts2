import json,re,collections,datetime
from pathlib import Path
p=Path('learner/runs/20261009-071302-postmortem');d=[json.loads(x) for x in (p/'decisions.jsonl').open()];s=[json.loads(x) for x in (p/'states.jsonl').open()]
for name in ('ledger-sl-search','ledger-boss-search'):
    rows=json.loads((p/f'{name}.json').read_text());print(name,[(r['id'],r['claim'][:160]) for r in rows])
j=[r for r in d if r['decider']=='jev'];plans=[r for r in j if 'plan' in r.get('questions',{})];roll=[r for r in plans if (r.get('rollout') or {}).get('available')]; print('COUNTS',len(j),len(plans),len(roll),sum(r.get('rollout_best_chosen') is True for r in roll));print('LOW',[(r['_line'],r['floor'],r['turn'],r['confidence']) for r in j if r.get('confidence',1)<.35]);print('RANK1',sum(bool(re.search(r'code rank 1\b',r['rationale'])) for r in plans),'of',len(plans));print('CONTINUE',collections.Counter(r['rationale'].startswith('continuing the Jev-chosen plan') for r in d if r['label']=='combat/plan-continue'))
print('CODE_TURNS',len({(r['floor'],r.get('sl_attempt') or 0,r['turn']) for r in d if r['turn'] and r['label'].startswith('combat/') and r['decider']=='code' and not r['rationale'].startswith('continuing the Jev-chosen plan')}));print('CODE_FIRST_TURNS',len({(r['floor'],r.get('sl_attempt') or 0,r['turn']) for r in d if r['turn'] and r['label'].startswith('combat/') and r['decider']=='code' and not r['rationale'].startswith('continuing')}))
print('FOCUS',[(r['_line'],r['floor'],r['turn'],r['questions'].get('focus'),r.get('answers',{}).get('focus')) for r in j if 'focus' in r.get('questions',{})])
print('USAGE', {k:sum((r.get('usage') or {}).get(k,0) for r in j) for k in ('input_tokens','output_tokens','cache_hit_tokens')});print('BRAIN_USAGE',{k:sum((r.get('usage') or {}).get(k,0) for r in d if r.get('deepseek')) for k in ('input_tokens','output_tokens','cache_hit_tokens','reasoning_tokens')});print('ELAPSED',(datetime.datetime.fromisoformat(d[-1]['ts'])-datetime.datetime.fromisoformat(d[0]['ts'])).total_seconds(),(datetime.datetime.fromisoformat(d[-1]['ts'])-datetime.datetime.fromisoformat(d[0]['observed_ts'])).total_seconds())
print('ROUTE')
r=next(r for r in d if r['label']=='map/route-plan')
for k,q in r['questions'].items():
    print('Q',k,'keys',q.keys());
    for kk,v in q.get('criteria',{}).items():
        vv=json.loads(v) if isinstance(v,str) else v;print(kk,vv)
print('PLANQUESTIONS')
for line in (p/'run-plans.jsonl').open():
    r=json.loads(line);q=r.get('question');print('P',r['_line'],type(q),str(q)[-3000:])
print('SELECTED_T2_T3')
for r in d:
    if r['floor']==17 and ((r.get('sl_attempt')==4 and r['turn']==2) or (r.get('sl_attempt')==6 and r['turn']==3)):
        print(r['_line'],r['label'],r['rationale'],r['chosen']);print('roll',r.get('rollout'));print('B2_KEYS',(r.get('boss_sim') or {}).keys())
        for k,v in (r.get('questions',{}).get('plan',{}).get('criteria') or {}).items():
            v=json.loads(v); print(k,{kk:v.get(kk) for kk in ('plays','hp_lost','damage_dealt','block_gained','rollout_best','whole_fight_sim')})
