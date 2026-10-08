import subprocess,json,re
from pathlib import Path
p=Path('learner/runs/20261008-194301-postmortem')
ids=[]
for line in Path('notes/lessons.md').open():
 if line.startswith('## ') and '静默猎手' in line and '无厌沙虫' in line:
  m=re.match(r'## ([A-Z0-9]{12})',line)
  if m and m[1]!='CNKR125PFHJ5':ids.append(m[1])
results=[]
for run in ids:
 proc=subprocess.Popen(['rg','-n','-F',run,'logs/decisions.jsonl'],stdout=subprocess.PIPE,text=True)
 rows=[]
 for line in proc.stdout:
  number,raw=line.split(':',1);a=json.loads(raw)
  if a.get('label')!='combat/play' or a.get('floor')!=33:continue
  fp=json.loads(a.get('fingerprint','{}'));q=a.get('questions',{}).get('play',{}).get('criteria',{})
  end=json.loads(q.get('end_turn','{}'))
  rows.append({'line':int(number),'turn':a.get('turn'),'powers':fp.get('powers'),'enemies':fp.get('enemies'),'end':end,'choice':a.get('chosen')})
 proc.wait();results.append({'run':run,'single_action':rows})
(p/'prior-sandworm-single-action.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(results,ensure_ascii=False))
