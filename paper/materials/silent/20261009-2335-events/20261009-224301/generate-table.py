import json
from pathlib import Path
P=Path('learner/runs/20261009-224302-postmortem');S=[json.loads(x)for x in(P/'states.jsonl').open()];R=json.loads((P/'Q389KW7SVWKH-resources.json').read_text())
def belt(x):return '空'if not x['potions']else '、'.join('槽'+str(i)+'='+v for i,v in x['potions'])
with(P/'资源表.md').open('w')as f:
 f.write('| 层／尝试 | 敌人（含实见后续实体） | 进→离HP／上限；净变化 | 药槽进→离 | 结果／states行／UTC起止 |\n|---|---|---|---|---|\n')
 for c in R['combats']:
  a=c['entry'];b=c.get('exit')or c['last'];names=[]
  for s in S:
   if a['line']<=s['_line']<=b['line']:
    for e in(s['state'].get('combat')or{}).get('enemies',[]):
     q=(e['name'],e['enemy_id'])
     if q not in names:names.append(q)
  attempt=c['sequence']-16 if c['floor']==48 else 1
  enemy='／'.join(n+' '+i for n,i in names)
  hp=f"{a['hp']}/{a['max_hp']}→{b['hp']}/{b['max_hp']}"
  if c['exit']:
   net=b['hp']-a['hp'];hp+=f'；{net:+d}'
   outcome='实际死亡'if c['floor']==48 else'获胜'
  else:
   hp+=f"（末可见）；截至此帧{b['hp']-a['hp']:+d}，离场净变化未记录";outcome='判死读档；缺退出帧'
  evidence=f"{outcome}；s{a['line']}→s{b['line']}；{a['ts']}→{b['ts']}"
  f.write(f"| F{c['floor']}／{attempt} | {enemy} | {hp} | {belt(a)}→{belt(b)} | {evidence} |\n")
