import json, pathlib, re
root=pathlib.Path('/home/dw/Projects/agent-sts2')
out=root/'learner/runs/20261008-014304-postmortem'
rid='RC61MFQM63Y6'
for name in ['decisions','run-plans','sl-attempts','states']:
    count=0; times=[]; first=None
    with (root/'logs'/f'{name}.jsonl').open('rb') as src, (out/f'{rid}-{name}.jsonl').open('w') as dst:
        for n,line in enumerate(src,1):
            if rid.encode() not in line: continue
            row=json.loads(line)
            match=row.get('run_id',row.get('run'))==rid or (row.get('state') or {}).get('run_id')==rid
            if not match: continue
            dst.write(json.dumps({'line':n,'data':row},ensure_ascii=False)+'\n')
            count+=1
            if row.get('ts'):times.append(row['ts'])
            if first is None:first=row
    print(name, count,'window',min(times) if times else None,max(times) if times else None,'keys',list(first or {}))
    if name=='decisions':window=(min(times),max(times))
count=0; last=None
with (root/'logs/deepseek-reasoning.jsonl').open('rb') as src, (out/f'{rid}-deepseek-reasoning.jsonl').open('w') as dst:
    for n,line in enumerate(src,1):
        row=json.loads(line);ts=row.get('ts', '')
        last=ts
        if window[0]<=ts<=window[1]:
            dst.write(json.dumps({'line':n,'data':row},ensure_ascii=False)+'\n');count+=1
print('deepseek-reasoning',count,'last',last)
