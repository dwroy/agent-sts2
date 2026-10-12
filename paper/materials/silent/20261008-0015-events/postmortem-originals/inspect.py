import json,collections
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261007-234302-postmortem')
d=[json.loads(x) for x in (p/'decisions.jsonl').open()]; s=[json.loads(x) for x in (p/'states.jsonl').open()]; r=json.load((p/'NHA2KW0RB7VP-resources.json').open())
print('DECISION KEYS',d[-10].keys()); print('JOURNAL SAMPLE',json.dumps(next(x for x in d if x['decider']=='jev'),ensure_ascii=False)[:9500]); print('STATE SAMPLE',json.dumps(s[-8],ensure_ascii=False)[:15000])
print('COMBATS')
for c in r['combats']:
 print(json.dumps({k:v for k,v in c.items() if k not in ['changes','outcome']},ensure_ascii=False))
print('SL')
for x in (p/'sl-attempts.jsonl').open():
 row=json.loads(x); print(json.dumps({k:v for k,v in row.items() if k not in ('judge','final_state','start_state')},ensure_ascii=False)[:13000])
print('PLANS')
for x in (p/'run-plans.jsonl').open(): print(x[:10000])
