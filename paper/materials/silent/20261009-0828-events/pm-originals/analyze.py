import json,collections,datetime
from pathlib import Path
p=Path(__file__).parent
ds=[json.loads(x) for x in (p/'decisions.jsonl').open()]
ss=[json.loads(x) for x in (p/'states.jsonl').open()]
r=json.loads((p/'SDY5T9XCSQN2-resources.json').read_text())
def powers(items):return [(x.get('power_id'),x.get('amount')) for x in items]
def slim(row):
 s=row['state'];c=s.get('combat') or {};player=c.get('player') or {}
 return dict(line=row['_line'],ts=row['ts'],floor=(s.get('run') or {}).get('floor'),turn=s.get('turn'),hp=(s.get('run') or {}).get('current_hp'),block=player.get('block'),energy=player.get('energy'),powers=powers(player.get('powers',[])),enemies=[dict(index=e['index'],id=e['enemy_id'],hp=e['current_hp'],block=e['block'],alive=e['is_alive'],move=e.get('move_id'),intents=e.get('intents'),powers=powers(e.get('powers',[]))) for e in c.get('enemies',[])],hand=[(x['index'],x['card_id'],x.get('resolved_rules_text'),x.get('energy_cost')) for x in c.get('hand',[])])
turns=[]
for i,c in enumerate(r['combats']):
 stop=r['combats'][i+1]['entry']['line'] if i+1<len(r['combats']) else 10**12
 frames=[x for x in ss if c['entry']['line']<=x['_line']<stop and (x['state'].get('run') or {}).get('floor')==c['floor'] and x['state'].get('in_combat')]
 groups=[]
 for row in frames:
  if not groups or groups[-1][0]['state']['turn']!=row['state']['turn']:groups.append([])
  groups[-1].append(row)
 for j,g in enumerate(groups):
  ready=[x for x in g if (x['state']['combat'].get('action_readiness') or {}).get('can_use_combat_actions')]
  start=ready[0] if ready else g[0]
  end=g[-1]
  turns.append(dict(sequence=c['sequence'],floor=c['floor'],turn=start['state']['turn'],start=slim(start),end=slim(end),next=slim(groups[j+1][0]) if j+1<len(groups) else None))
(p/'turns.json').write_text(json.dumps(turns,ensure_ascii=False,indent=2)+'\n')
with (p/'turns.txt').open('w') as f:
 for t in turns:
  a,b,n=t['start'],t['end'],t['next']
  f.write(f"场{t['sequence']} F{t['floor']} T{t['turn']}: s{a['line']}→{b['line']} HP{a['hp']} 挡{b['block']} 下轮HP{n['hp'] if n else '退出/截断'} 敌始{[(x['id'],x['hp'],x['powers']) for x in a['enemies']]}→末{[(x['id'],x['hp'],x['move']) for x in b['enemies']]}→下{[(x['id'],x['hp']) for x in n['enemies']] if n else '退出/截断'} 威胁{[(x['move'],x['intents']) for x in b['enemies']]}\n")
print('已保存',len(turns),'个场次回合')
