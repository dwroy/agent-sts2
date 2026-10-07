import json,re,subprocess
from pathlib import Path
p=Path('learner/runs/20261007-074302-postmortem')
text=Path('notes/lessons.md').read_text();ids=[]
for header in re.findall(r'(?m)^## ([^\n]+)',text):
 if '静默猎手' in header:ids.append(header[:12])
(p/'silent-prior-ids.txt').write_text('\n'.join(ids)+'\n')
print('同角色旧复盘局数',len(ids))
proc=subprocess.Popen(['nice','-n','10','rg','-F','-f',str(p/'silent-prior-ids.txt'),'logs/decisions.jsonl'],stdout=subprocess.PIPE)
out=[]
for line in proc.stdout:
 try:d=json.loads(line)
 except ValueError:continue
 if d['ts']>='2026-10-06T23:01:58.297Z':continue
 for q in d.get('questions',{}).values():
  for key,value in q.get('criteria',{}).items():
   if not isinstance(value,str) or '暴露' not in value or 'upgrade' not in value:continue
   try:v=json.loads(value)
   except ValueError:continue
   u=v.get('upgrade','');parts=u.split(' -> ')
   if len(parts)!=2 or '消耗' not in parts[0] or '消耗' in parts[1]:continue
   out.append({'run':d['run_id'],'floor':d['floor'],'ts':d['ts'],'label':d['label'],'key':key,'preview':u,'picked':d.get('deepseek',{}).get('choice')==key,'reason':d.get('journal',{}).get('reason')})
proc.wait()
(p/'expose-preview-history.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print('先前暴露升级缺消耗题面',len(out),'涉及局',len(set(x['run'] for x in out)))
for x in sorted(out,key=lambda x:x['ts'])[:8]:print(json.dumps(x,ensure_ascii=False))
print('实际选中的早局')
for x in sorted((x for x in out if x['picked']),key=lambda x:x['ts'])[:8]:print(json.dumps(x,ensure_ascii=False))
