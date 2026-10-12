import json,re,hashlib
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2'); out=root/'learner/runs/20261009-171301-postmortem'; run='XW8B5CHJ814J'
summary={}
for name in ['runs','decisions','run-plans','sl-attempts','states']:
    path=root/'logs'/f'{name}.jsonl'; cutoff=path.stat().st_size; offset=0; count=0; first=None; last=None
    with path.open('rb') as src,(out/f'{name}.jsonl').open('w') as dest:
        for n,raw in enumerate(src,1):
            start=offset;offset+=len(raw)
            if offset>cutoff: break
            if run.encode() not in raw: continue
            row=json.loads(raw)
            if name=='states' and (row.get('state') or {}).get('run_id',row.get('run_id'))!=run: continue
            if name in ('decisions','runs','sl-attempts') and row.get('run_id')!=run: continue
            if name=='run-plans' and row.get('run')!=run: continue
            dest.write(json.dumps({'line':n,'offset':start,'record':row},ensure_ascii=False)+'\n')
            count+=1; first=first or row.get('ts'); last=row.get('ts')
    summary[name]={'count':count,'first':first,'last':last,'cutoff_bytes':cutoff}
    print(name,count,first,last,flush=True)
lo=summary['decisions']['first'];hi=summary['decisions']['last'];count=0;offset=0
path=root/'logs/deepseek-reasoning.jsonl';cutoff=path.stat().st_size
with path.open('rb') as src,(out/'deepseek-reasoning.jsonl').open('w') as dest:
    for n,raw in enumerate(src,1):
        start=offset;offset+=len(raw)
        if offset>cutoff: break
        m=re.search(rb'"ts"\s*:\s*"([^"]+)"',raw)
        if not m or not lo<=m.group(1).decode()<=hi: continue
        dest.write(json.dumps({'line':n,'offset':start,'record':json.loads(raw)},ensure_ascii=False)+'\n');count+=1
summary['deepseek-reasoning']={'count':count,'window':[lo,hi],'cutoff_bytes':cutoff}
(out/'extraction-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print('deepseek-reasoning',count,flush=True)
