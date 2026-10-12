import json,collections
from pathlib import Path
p=Path('learner/runs/20261009-071302-postmortem')
s=[json.loads(x) for x in (p/'states.jsonl').open()]; d=[json.loads(x) for x in (p/'decisions.jsonl').open()]
print('STATE_KEYS',s[-2]['state'].keys())
print('RUN',s[-2]['state']['run'])
print('COMBAT',s[-2]['state']['combat'])
print('FOCUS',[(r['_line'],r['floor'],r['turn'],r['chosen']) for r in d if 'focus' in str(r['questions']).lower() and r['decider']=='jev'][:2])
print('GUARDS',[(r['_line'],r['floor'],r['turn'],r['rationale']) for r in d if 'HP guard' in r['rationale'] or 'guard bound' in r['rationale']])
print('BRAIN')
for r in d:
    if r['decider']=='codex':
        facts=r.get('facts');q=r.get('questions',{})
        print(r['_line'],r['floor'],r['label'],r['rationale'])
        for qq in q.values():
            if isinstance(qq,dict) and 'facts' in qq:
                f=qq['facts'];print('facts keys',list(f) if isinstance(f,dict) else type(f))
print('JEV_SAMPLE')
r=next(r for r in d if r['floor']==17 and r['turn']==3 and r['decider']=='jev');print(json.dumps(r,ensure_ascii=False))
