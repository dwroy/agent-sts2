import json, subprocess, pathlib, hashlib
root=pathlib.Path('/home/dw/Projects/agent-sts2'); out=root/'learner/runs/20261009-204303-postmortem'; run='54G5683J0E5S'
for name in ['decisions','states','run-plans','sl-attempts']:
    p=subprocess.Popen(['rg','-n','-b','-F',run,str(root/'logs'/f'{name}.jsonl')],stdout=subprocess.PIPE)
    count=0
    with (out/f'{run}-{name}.jsonl').open('w') as dest:
        for raw in p.stdout:
            line,offset,body=raw.split(b':',2); row=json.loads(body)
            row['_line']=int(line); row['_offset']=int(offset)
            dest.write(json.dumps(row,ensure_ascii=False)+'\n'); count+=1
    print(name,count,'rc',p.wait())
ds=[json.loads(x) for x in (out/f'{run}-decisions.jsonl').open()]; lo=min(x['ts'] for x in ds); hi=max(x['ts'] for x in ds)
p=subprocess.Popen(['rg','-n','-b','2026-10-09T(11|12):',str(root/'logs/deepseek-reasoning.jsonl')],stdout=subprocess.PIPE)
count=0
with (out/f'{run}-deepseek-reasoning.jsonl').open('w') as dest:
    for raw in p.stdout:
        line,offset,body=raw.split(b':',2); row=json.loads(body)
        if lo<=row.get('ts','')<=hi:
            row['_line']=int(line);row['_offset']=int(offset);dest.write(json.dumps(row,ensure_ascii=False)+'\n');count+=1
print('window',lo,hi,'deepseek rows',count,'rc',p.wait())
size=(root/'notes/lessons.md').stat().st_size
h=hashlib.sha256()
with (root/'notes/lessons.md').open('rb') as f:
    for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
(out/'lessons-before.json').write_text(json.dumps({'size':size,'sha256':h.hexdigest()}))
