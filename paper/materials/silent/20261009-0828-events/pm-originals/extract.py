import json
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2')
out=root/'learner/runs/20261009-081301-postmortem'
run=b'SDY5T9XCSQN2'
for name in ['decisions','states','run-plans','sl-attempts']:
    count=0
    with (root/'logs'/f'{name}.jsonl').open('rb') as src,(out/f'{name}.jsonl').open('w') as dst:
        offset=0
        for number,line in enumerate(src,1):
            if run in line:
                row=json.loads(line)
                row['_line']=number;row['_offset']=offset
                dst.write(json.dumps(row,ensure_ascii=False)+'\n');count+=1
            offset+=len(line)
    print(name,count,flush=True)
with (out/'decisions.jsonl').open() as f:
    ds=[json.loads(x) for x in f]
start,end=ds[0]['ts'],ds[-1]['ts']
print('决策时间窗',start,end)
with (root/'logs/deepseek-reasoning.jsonl').open('rb') as f:
    f.seek(max(0,(root/'logs/deepseek-reasoning.jsonl').stat().st_size-100000))
    f.readline()
    last=None
    for line in f:
        try:last=json.loads(line)
        except ValueError:pass
print('旧推理日志末条时间',last.get('ts') if last else None)
count=0
with (out/'deepseek-reasoning.jsonl').open('w') as dst:
    if last and last.get('ts','') >= start:
        with (root/'logs/deepseek-reasoning.jsonl').open('rb') as f:
            offset=0
            for number,line in enumerate(f,1):
                row=json.loads(line)
                if start <= row.get('ts','') <= end:
                    row['_line']=number;row['_offset']=offset
                    dst.write(json.dumps(row,ensure_ascii=False)+'\n');count+=1
                offset+=len(line)
print('时间窗推理日志',count)
with (out/'decision-summary.txt').open('w') as f:
    for d in ds:
        brief={k:d.get(k) for k in ['_line','ts','floor','turn','label','decider','chosen','confidence','rationale','journal','result','sl_attempt','sl_reloads']}
        if d.get('deepseek'):brief['大脑']=d['deepseek']
        if d.get('boss_sim'):brief['boss_sim']=d['boss_sim']
        f.write(json.dumps(brief,ensure_ascii=False)+'\n')
