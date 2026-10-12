import json, subprocess
from pathlib import Path
from collections import Counter
root=Path('/home/dw/Projects/agent-sts2'); out=root/'learner/runs/20261009-141302-postmortem'; run='AF76L5UTPP8U'
for name in ['decisions','states','run-plans','sl-attempts','brain','run-config']:
    p=root/'logs'/f'{name}.jsonl'; n=0
    proc=subprocess.Popen(['rg','-n','-b','-F',run,str(p)],stdout=subprocess.PIPE)
    with (out/f'{run}-{name}.jsonl').open('w') as dest:
        for line in proc.stdout:
            ln,offset,data=line.split(b':',2)
            try:r=json.loads(data)
            except ValueError:continue
            valid=r.get('run_id')==run or r.get('run')==run or (r.get('state') or {}).get('run_id')==run or ((r.get('state') or {}).get('run') or {}).get('run_id')==run
            if not valid: continue
            r['_line']=int(ln);r['_offset']=int(offset)
            dest.write(json.dumps(r,ensure_ascii=False)+'\n');n+=1
    code=proc.wait();print(name,n,'rg_exit',code)
ds=[json.loads(l) for l in (out/f'{run}-decisions.jsonl').open()]
first=min(r['ts'] for r in ds);last=max(r['ts'] for r in ds)
p=root/'logs/deepseek-reasoning.jsonl'
with p.open('rb') as f:
    end=p.stat().st_size;f.seek(max(0,end-1000000));f.readline();tail=[]
    for line in f:
        try:r=json.loads(line)
        except ValueError:continue
        tail.append((r.get('ts'),r))
    newest=tail[-1][0] if tail else None
    print('decision_window',first,last,'deepseek_last',newest)
    # Only the captured tail is inspected; no whole-log read.
    subset=[r for ts,r in tail if ts and first<=ts<=last]
    if newest and newest<first: subset=[]
    elif newest and newest>=first and not subset: raise RuntimeError('Time slice requires wider seek')
(out/f'{run}-deepseek-reasoning.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in subset))
summary={'run':run,'first':first,'last':last,'decisions':len(ds),'deciders':dict(Counter(r['decider'] for r in ds)),'labels':dict(Counter(r['label'] for r in ds)),'low_confidence':[{'line':r['_line'],'floor':r['floor'],'turn':r['turn'],'confidence':r.get('confidence'),'rationale':r.get('rationale')} for r in ds if r['decider']=='jev' and isinstance(r.get('confidence'),(int,float)) and r['confidence']<.35],'deepseek_last':newest,'deepseek_window_records':len(subset)}
(out/'extraction-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False,indent=2))
