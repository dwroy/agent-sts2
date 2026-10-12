import json
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2'); out=root/'learner/runs/20261009-214303-postmortem'; run='0PH64C4AWAX9'
for name in ['decisions','states','run-plans','sl-attempts','runs']:
    offset=0; count=0
    with (root/'logs'/f'{name}.jsonl').open('rb') as src, (out/f'{name}.jsonl').open('w') as dst:
        cutoff=(root/'logs'/f'{name}.jsonl').stat().st_size
        for num,line in enumerate(src,1):
            start=offset; offset+=len(line)
            if offset>cutoff:break
            if run.encode() not in line:continue
            row=json.loads(line)
            if row.get('run_id',row.get('run',(row.get('state') or {}).get('run_id')))!=run:continue
            row['_source_line']=num;row['_offset']=start
            dst.write(json.dumps(row,ensure_ascii=False)+'\n');count+=1
    print(name,count)
d=[json.loads(x) for x in (out/'decisions.jsonl').open()]; lo=min(x['ts'] for x in d); hi=max(x['ts'] for x in d)
print('window',lo,hi,'decision keys',list(d[0]))
with (root/'logs/deepseek-reasoning.jsonl').open('rb') as src,(out/'reasoning.jsonl').open('w') as dst:
    count=0;offset=0
    for num,line in enumerate(src,1):
        start=offset;offset+=len(line)
        # 时间窗筛选后解析，逐行扫描，不整份载入。
        if b'2026-10-09T13:' not in line:continue
        row=json.loads(line);ts=row.get('ts','')
        if lo<=ts<=hi:
            row['_source_line']=num;row['_offset']=start;dst.write(json.dumps(row,ensure_ascii=False)+'\n');count+=1
    print('reasoning',count)
