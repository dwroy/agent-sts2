import json
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2'); out=root/'learner/runs/20261008-004302-postmortem'; rid='G33HU22H2543'
for name in ['decisions','run-plans','sl-attempts','states']:
    count=0; offset=0
    with (root/'logs'/f'{name}.jsonl').open('rb') as src, (out/f'{rid}-{name}.jsonl').open('w') as dst:
        limit=(root/'logs'/f'{name}.jsonl').stat().st_size
        for lineno,raw in enumerate(src,1):
            start=offset; offset+=len(raw)
            if offset>limit: break
            if rid.encode() not in raw: continue
            try: row=json.loads(raw)
            except ValueError: continue
            if name=='states' and row.get('state',{}).get('run_id',row.get('run_id'))!=rid: continue
            if name=='run-plans' and row.get('run')!=rid: continue
            if name not in ['states','run-plans'] and row.get('run_id')!=rid: continue
            row['_line']=lineno;row['_offset']=start
            dst.write(json.dumps(row,ensure_ascii=False)+'\n'); count+=1
    print(name,count,flush=True)
ds=[json.loads(s) for s in (out/f'{rid}-decisions.jsonl').open()]
window=(min(r['ts'] for r in ds),max(r['ts'] for r in ds)); count=0
with (root/'logs/deepseek-reasoning.jsonl').open('rb') as src,(out/f'{rid}-reasoning.jsonl').open('w') as dst:
    for lineno,raw in enumerate(src,1):
        try: row=json.loads(raw)
        except ValueError: continue
        if window[0]<=row.get('ts','')<=window[1]:
            row['_line']=lineno;dst.write(json.dumps(row,ensure_ascii=False)+'\n');count+=1
print('window',window,'reasoning',count)
print('decision keys',list(ds[0]));print('first',json.dumps(ds[0],ensure_ascii=False)[:3500]);print('last',json.dumps(ds[-1],ensure_ascii=False)[:2000])
