import json, subprocess
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2'); out=root/'learner/runs/20261008-154302-postmortem'; run='9DAS5L8YM1CN'
for name in ['runs','decisions','run-plans','states','sl-attempts']:
    n=0
    with (out/(name+'.jsonl')).open('w') as w:
        p=subprocess.Popen(['rg','-n','-F',run,str(root/'logs'/(name+'.jsonl'))],stdout=subprocess.PIPE,text=True)
        for line in p.stdout:
            num,raw=line.split(':',1); row=json.loads(raw); row['_line']=int(num)
            if name=='states' and row.get('state',{}).get('run_id',row.get('run_id'))!=run: continue
            w.write(json.dumps(row,ensure_ascii=False)+'\n'); n+=1
        p.wait()
    print(name,n)
# Read the last physical reasoning line by seeking; this file stopped before this run.
p=root/'logs/deepseek-reasoning.jsonl'
with p.open('rb') as f:
    f.seek(max(0,p.stat().st_size-1000000)); f.readline()
    last=None
    for line in f:
        try: last=json.loads(line)
        except ValueError: pass
print('reasoning_last_ts',last.get('ts') if last else None)
