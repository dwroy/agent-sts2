import json, pathlib, sys, collections, datetime, re
P=pathlib.Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-231302-postmortem')
RUNS=['M0GY0A4M2F7H','Z91JN3S3PQX2']
def rows(name):
    with (P/(name+'-matched.txt')).open() as f:
        for line in f:
            n,s=line.split(':',1); x=json.loads(s);x['_line']=int(n);yield x
D=list(rows('decisions'));S=list(rows('states'));L=list(rows('sl'));B=list(rows('plans'))
for run in RUNS:
    ds=[x for x in D if x.get('run_id')==run];ss=[x for x in S if x['state'].get('run_id')==run];ls=[x for x in L if x['run_id']==run];bs=[x for x in B if x['run']==run]
    out={'decisions':ds,'states':ss,'sl':ls,'plans':bs}
    (P/(run+'-subset.json')).write_text(json.dumps(out,ensure_ascii=False))
    print('\n局',run,'决策',len(ds),'状态',len(ss),'首末',ds[0]['ts'],ds[-1]['ts'],'观察开始',ds[0].get('observed_ts'))
    print('低信心',sum(x.get('decider')=='jev' and x.get('confidence') is not None and x['confidence']<.35 for x in ds),'代码标签',dict(collections.Counter(x['label'] for x in ds if x['decider']=='code')))
    print('SL',[(x['_line'],x['floor'],x['attempt'],x['result'],x.get('turns'),x.get('end_hp'),x.get('incoming'),x.get('give_up_reason')) for x in ls])
    print('大脑决策')
    for x in ds:
        if x['decider']=='codex':print(x['_line'],x['floor'],x['label'],x.get('chosen'),(x.get('journal') or {}))
    print('方案')
    for x in bs:print(x['_line'],x['floor'],x.get('trigger'),x['plan'])
    print('护栏')
    for x in ds:
        if re.search('guard|HP.safe|override|veto',json.dumps({k:v for k,v in x.items() if k not in ['questions','fingerprint','journal']},ensure_ascii=False),re.I):
            print(x['_line'],x['floor'],x['turn'],x['rationale'],{k:v for k,v in x.items() if any(t in k.lower() for t in ['guard','override','focus'])})
