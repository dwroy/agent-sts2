import json, subprocess
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2')
out=root/'learner/runs/20261008-221302-postmortem'
run='R3AJCGQGGMR4'
for name in ['decisions','states','run-plans','sl-attempts','brain','runs']:
    count=0
    proc=subprocess.Popen(['rg','-n','-F',run,str(root/'logs'/f'{name}.jsonl')],stdout=subprocess.PIPE,text=True)
    with (out/f'{name}.jsonl').open('w') as dest:
        for raw in proc.stdout:
            number,line=raw.split(':',1)
            row=json.loads(line)
            if name=='states': ident=row.get('state',{}).get('run_id',row.get('run_id'))
            elif name=='run-plans': ident=row.get('run')
            else: ident=row.get('run_id',row.get('run'))
            if ident!=run: continue
            row['_line']=int(number)
            dest.write(json.dumps(row,ensure_ascii=False)+'\n')
            count+=1
    proc.wait()
    print(name,count)
d=[json.loads(x) for x in (out/'decisions.jsonl').open()]
start,end=min(x['ts'] for x in d),max(x['ts'] for x in d)
count=0; maximum=''; offset=0
with (root/'logs/deepseek-reasoning.jsonl').open('rb') as src, (out/'deepseek-reasoning.jsonl').open('w') as dest:
    src.seek(0)
    for number,raw in enumerate(src,1):
        pos=offset; offset+=len(raw)
        try: row=json.loads(raw)
        except ValueError: continue
        ts=row.get('ts',''); maximum=max(maximum,ts)
        if start<=ts<=end:
            row.update(_line=number,_offset=pos)
            dest.write(json.dumps(row,ensure_ascii=False)+'\n'); count+=1
summary={'run':run,'decision_window':[start,end],'deepseek_rows':count,'deepseek_max_ts':maximum}
(out/'extraction.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(summary)
