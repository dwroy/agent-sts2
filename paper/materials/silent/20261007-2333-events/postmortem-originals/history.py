import json,re,subprocess
from pathlib import Path
p=Path(__file__).parent;root=p.parents[2]
words=['REGEN_POTION','再生药水','CORPSE_SLUG','噬尸蛞蝓','DEXTERITY_POTION','TERROR_EEL','PUNCH_CONSTRUCT','DECIMILLIPEDE','复制药水','磨蚀','HP护栏']
sections=[];cur=[];title=''
with (root/'notes/lessons.md').open() as f:
 for line in f:
  if line.startswith('## '):
   if '静默猎手' in title:sections.append((title,''.join(cur)))
   title=line.strip();cur=[]
  cur.append(line)
 if '静默猎手' in title:sections.append((title,''.join(cur)))
with (p/'history.txt').open('w') as f:
 for word in words:
  print('\n词',word,file=f)
  for title,body in sections:
   hits=[m.start() for m in re.finditer(re.escape(word),body)]
   if hits:
    print(title,file=f)
    for pos in hits[:3]:print(body[max(0,pos-180):pos+350].replace('\n',' '),file=f)
for word in ['再生','REGEN','噬尸蛞蝓','CORPSE_SLUG','磨蚀','复制药水','骇鳗','残杀','少挡','爆发','即期']:
 result=subprocess.run(['python3',str(root/'learner/ledger.py'),'find','--character','silent','--text',word,'--json'],capture_output=True,text=True)
 (p/f'ledger-find-{word}.json').write_text(result.stdout)
 try:entries=json.loads(result.stdout)
 except ValueError: print(word,result.stdout[:400]);continue
 print(word,[(e['id'],e['kind'],e['status'],e.get('version'),e['claim'][:75]) for e in entries])
print('历史保存',p/'history.txt')
