import json, pathlib, subprocess
root=pathlib.Path('/home/dw/Projects/agent-sts2')
out=root/'learner/runs/20261009-031301-postmortem'
run='FU8ZUQHBHNV9'
for name in ['decisions','states','run-plans','sl-attempts','runs']:
    rows=[]
    p=subprocess.Popen(['rg','-n','-F',run,str(root/'logs'/f'{name}.jsonl')],stdout=subprocess.PIPE,text=True)
    for raw in p.stdout:
        lineno, text=raw.split(':',1)
        row=json.loads(text)
        ident=row.get('run_id',row.get('run',(row.get('state') or {}).get('run_id')))
        if ident==run:
            row['_line']=int(lineno)
            rows.append(row)
    p.wait()
    (out/f'{name}.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
    print(name,len(rows), 'lines', [rows[0]['_line'], rows[-1]['_line']] if rows else [])
    if rows: print('sample_keys',list(rows[0]))
