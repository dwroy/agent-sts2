import json, subprocess
from pathlib import Path
base=Path('/home/dw/Projects/agent-sts2')
out=base/'learner/runs/20261008-194301-postmortem'
run='CNKR125PFHJ5'
for name in ['decisions','run-plans','sl-attempts','states']:
    process=subprocess.Popen(['rg','-n','-F',run,str(base/'logs'/f'{name}.jsonl')],stdout=subprocess.PIPE,text=True)
    count=0
    with (out/f'{run}-{name}.jsonl').open('w') as target:
        for raw in process.stdout:
            line,payload=raw.split(':',1)
            row=json.loads(payload)
            row['_line']=int(line)
            target.write(json.dumps(row,ensure_ascii=False)+'\n')
            count+=1
    process.wait()
    print(name,count)
d=[json.loads(x) for x in (out/f'{run}-decisions.jsonl').open()]
print('window',d[0]['ts'],d[-1]['ts'])
print('first decision',json.dumps(d[0],ensure_ascii=False)[:4000])
s=next(json.loads(x) for x in (out/f'{run}-states.jsonl').open())
print('state schema',json.dumps(s,ensure_ascii=False)[:6000])
