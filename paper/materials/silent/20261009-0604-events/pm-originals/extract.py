import json, subprocess
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2')
out=root/'learner/runs/20261009-054302-postmortem'
run='KSX97DF5H3NY'
for name in ['decisions','states','run-plans','sl-attempts','runs']:
    dest=out/(name+'.jsonl')
    with dest.open('w') as f:
        p=subprocess.Popen(['rg','-n','-F',run,str(root/'logs'/(name+'.jsonl'))],stdout=subprocess.PIPE,text=True)
        for row in p.stdout:
            n,body=row.split(':',1)
            try:d=json.loads(body)
            except ValueError:continue
            if name not in ['states','run-plans'] and d.get('run_id')!=run:continue
            if name=='run-plans' and d.get('run')!=run:continue
            if name=='states' and (d.get('state') or {}).get('run_id',d.get('run_id'))!=run:continue
            d['_line']=int(n)
            f.write(json.dumps(d,ensure_ascii=False)+'\n')
        p.wait()
ds=[json.loads(s) for s in (out/'decisions.jsonl').open()]
a,b=ds[0]['ts'],ds[-1]['ts']
with (out/'reasoning.jsonl').open('w') as f:
    with (root/'logs/deepseek-reasoning.jsonl').open() as src:
        for n,s in enumerate(src,1):
            try:d=json.loads(s)
            except ValueError:continue
            if a<=d.get('ts','')<=b:
                d['_line']=n
                f.write(json.dumps(d,ensure_ascii=False)+'\n')
print(json.dumps({'first':a,'last':b,'decisions':len(ds),'files':{p.name:p.stat().st_size for p in out.glob('*.jsonl')}},ensure_ascii=False))
