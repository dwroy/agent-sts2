import json,re
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2'); out=root/'learner/runs/20261008-024302-postmortem'; run='BTSRF7JL1W1Y'
for name in ['runs','decisions','run-plans','sl-attempts','brain']:
    matched=[]; offset=0
    with (root/'logs'/f'{name}.jsonl').open('rb') as f:
        for n,line in enumerate(f,1):
            pos=offset; offset+=len(line)
            if run.encode() not in line: continue
            try: obj=json.loads(line)
            except ValueError: continue
            obj['_line']=n; obj['_offset']=pos; matched.append(obj)
    (out/f'{run}-{name}.json').write_text(json.dumps(matched,ensure_ascii=False,indent=2)+'\n')
    print(name,len(matched),list(matched[0]) if matched else [])
ds=json.loads((out/f'{run}-decisions.json').read_text()); start=ds[0]['ts']; end=ds[-1]['ts']; matched=[]
with (root/'logs/deepseek-reasoning.jsonl').open('rb') as f:
    for n,line in enumerate(f,1):
        try: obj=json.loads(line)
        except ValueError: continue
        if start<=obj.get('ts','')<=end: obj['_line']=n; matched.append(obj)
(out/f'{run}-deepseek-reasoning.json').write_text(json.dumps(matched,ensure_ascii=False,indent=2)+'\n')
print('window',start,end,'deepseek-reasoning',len(matched))
