import json, collections, pathlib, datetime
P=pathlib.Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-044302-postmortem')
def rows(name):
    for raw in (P/name).open():
        n,s=raw.split(':',1)
        obj=json.loads(s); obj['_line']=int(n); yield obj
D=list(rows('decisions-numbered.jsonl'))
print('决策统计',len(D),D[0]['ts'],D[-1]['ts'],collections.Counter(d['decider'] for d in D))
print('用时秒',(datetime.datetime.fromisoformat(D[-1]['ts'])-datetime.datetime.fromisoformat(D[0]['ts'])).total_seconds())
print('药水与护栏')
for d in D:
    if d['chosen'].get('action') in ['use_potion','discard_potion'] or any(x in d.get('rationale','').lower() for x in ['guard','override','focus','rollout','five-turn']):
        print(d['_line'],d['floor'],d.get('turn'),d['label'],d['chosen'],d.get('rationale'))
print('大脑决定')
for d in D:
    if d['decider']=='codex': print(d['_line'],d['floor'],d['label'],d['chosen'],d['rationale'])
print('SL')
for s in rows('sl-numbered.jsonl'): print(json.dumps(s,ensure_ascii=False))
print('状态首帧')
for s in rows('states-numbered.jsonl'):
    print(json.dumps(s,ensure_ascii=False)[:17000]); break
print('末战决策')
for d in D:
    if d['floor']==31: print(d['_line'],d.get('turn'),d['label'],d['chosen'],d['rationale'])
