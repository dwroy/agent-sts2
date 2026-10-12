import json
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2')
out=root/'learner/runs/20261008-141302-postmortem'
run='H1T1F8ML9FUE'
for name in ['decisions','run-plans','brain','sl-attempts','jev-prompts','run-config','codex-calls']:
    count=0
    with (root/'logs'/f'{name}.jsonl').open() as source, (out/f'{run}-{name}.jsonl').open('w') as dest:
        for number,line in enumerate(source,1):
            if run not in line: continue
            row=json.loads(line)
            row['_line']=number
            dest.write(json.dumps(row,ensure_ascii=False)+'\n')
            count+=1
    print(name,count)
with (root/'logs/deepseek-reasoning.jsonl').open('rb') as source:
    source.seek(max(0,(root/'logs/deepseek-reasoning.jsonl').stat().st_size-200000))
    source.readline()
    last=None
    for line in source:
        try: row=json.loads(line)
        except ValueError: continue
        last={k:row.get(k) for k in ['ts','label','engine']}
(out/'deepseek-tail-check.json').write_text(json.dumps(last,ensure_ascii=False)+'\n')
print('deepseek last',last)
