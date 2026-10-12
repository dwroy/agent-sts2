from pathlib import Path
import json, collections
root=Path('/home/dw/Projects/agent-sts2'); out=root/'learner/runs/20261009-094302-postmortem'; rid='NTMAU4XZ2NN2'
rows=[]
with (root/'logs/states.jsonl').open('rb') as f:
    for n,line in enumerate(f,1):
        if rid.encode() not in line: continue
        r=json.loads(line)
        if r.get('state',{}).get('run_id',r.get('run_id'))!=rid: continue
        r['_line']=n;r['_offset']=f.tell()-len(line);rows.append(r)
(out/f'{rid}-states.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print('状态帧',len(rows),list(rows[0]))
print('状态字段',list(rows[0]['state']))
ds=json.loads((out/f'{rid}-decisions.json').read_text())
lo,hi=ds[0]['ts'],ds[-1]['ts']; reason=[];path=root/'logs/deepseek-reasoning.jsonl'
with path.open('rb') as f:
    left,right=0,path.stat().st_size
    while right-left>200000:
        mid=(left+right)//2;f.seek(mid);f.readline();pos=f.tell();line=f.readline()
        if not line: right=mid;continue
        r=json.loads(line)
        if r.get('ts','')<lo:left=pos
        else:right=mid
    f.seek(left)
    if left:f.readline()
    while line:=f.readline():
        pos=f.tell()-len(line);r=json.loads(line)
        if r.get('ts','')>hi:break
        if lo<=r.get('ts','')<=hi:r['_offset']=pos;reason.append(r)
(out/f'{rid}-deepseek-reasoning.json').write_text(json.dumps(reason,ensure_ascii=False,indent=2)+'\n')
print('推理窗',lo,hi,'抽取',len(reason),'扫描起偏移',left,'文件大小',path.stat().st_size)
for d in ds:
 if d['label']=='combat/plan-choice':
  print('选择',d['_line'],d['floor'],d['turn'],d['confidence'],d.get('chosen'),d['rationale'])
for d in ds:
 if d['floor']==14 and d['label']=='combat/plan-choice' and d['turn'] in [2,8,9]:
  print('题',d['_line'],json.dumps(d['questions'],ensure_ascii=False)[:25000])
