import json,subprocess,pathlib,collections
root=pathlib.Path('/home/dw/Projects/agent-sts2'); out=root/'learner/runs/20261008-051302-postmortem'; run='MTQ0EUBJ3R6T'
for name in ['decisions','states','brain','run-plans','sl-attempts']:
    p=out/(name+'.jsonl')
    with p.open('w') as w:
        proc=subprocess.Popen(['rg','-n','-F',run,str(root/'logs'/(name+'.jsonl'))],stdout=subprocess.PIPE,text=True)
        n=0
        for s in proc.stdout:
            number,raw=s.split(':',1);r=json.loads(raw);r['_line']=int(number)
            w.write(json.dumps(r,ensure_ascii=False)+'\n');n+=1
        proc.wait();print(name,n)
rows=[json.loads(s) for s in (out/'decisions.jsonl').open()]
print('WINDOW',rows[0]['ts'],rows[-1]['ts']);print('FIRST',json.dumps(rows[0],ensure_ascii=False)[:1800]);print('LAST',json.dumps(rows[-1],ensure_ascii=False)[:1800])
print('COUNTS',collections.Counter((r['decider'],r['label']) for r in rows))
print('BRAIN_SAMPLE',next((out/'brain.jsonl').open())[:1700]);print('STATE_SAMPLE',next((out/'states.jsonl').open())[:2000])
