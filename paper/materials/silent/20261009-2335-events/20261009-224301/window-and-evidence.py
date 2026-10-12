import json,re,collections,datetime
from pathlib import Path
P=Path('learner/runs/20261009-224302-postmortem');D=[json.loads(x) for x in(P/'decisions.jsonl').open()]
start,end=D[0]['ts'],D[-1]['ts'];path=Path('logs/deepseek-reasoning.jsonl');size=path.stat().st_size;matches=0;times=[]
with path.open('rb')as f,(P/'deepseek-window.jsonl').open('w')as out:
 f.seek(0);offset=0
 for n,line in enumerate(f,1):
  off=offset;offset+=len(line)
  if offset>size:break
  m=re.search(rb'"ts"\s*:\s*"([^"]+)"',line[:500])
  if not m:continue
  ts=m[1].decode();times.append(ts)
  if start<=ts<=end:
   row=json.loads(line);row['_line']=n;row['_offset']=off;out.write(json.dumps(row,ensure_ascii=False)+'\n');matches+=1
summary={'from':start,'to':end,'cutoff':size,'matches':matches,'earliest':min(times),'latest':max(times)}
(P/'deepseek-window-audit.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(summary)
T=lambda s:datetime.datetime.fromisoformat(s.replace('Z','+00:00'))
print('秒',(T(end)-T(start)).total_seconds(),'分钟',(T(end)-T(start)).total_seconds()/60)
print('缓存',3472896/6465234*100,'最佳',133/144*100)
print('非安全固定比例codefirstrank',sum(re.search(r'code rank 1(?:\b)',d['rationale'])is not None for d in D if 'rollout_best_chosen'in d))
