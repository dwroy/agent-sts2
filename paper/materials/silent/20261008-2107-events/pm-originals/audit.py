import json,collections,re
from pathlib import Path
P=Path(__file__).parent
D=json.loads((P/'decisions.json').read_text()); S=json.loads((P/'states.json').read_text()); C=json.loads((P/'2H311EAD34GD-resources.json').read_text())
def power(x): return {v['power_id']:v['amount'] for v in x.get('powers',[])}
def compact(r):
 s=r['state'];c=s.get('combat') or {};p=c.get('player') or {}
 return {'s':r['_line'],'ts':r['ts'],'t':s['turn'],'hp':s['run']['current_hp'],'b':p.get('block'),'e':p.get('energy'),'p':power(p),'en':[(v['index'],v['current_hp'],v['block'],v['move_id'],sum((i.get('total_damage') or 0) for i in v['intents']),power(v)) for v in c.get('enemies',[])]}
turns=[]
for b in C['combats']:
 rows=[r for r in S if b['entry']['line']<=r['_line']<=b['last']['line']]
 print('战斗',b['sequence'],'F',b['floor'])
 for t,g in __import__('itertools').groupby(rows,key=lambda r:r['state']['turn']):
  g=list(g); ready=next((r for r in g if (r['state']['combat'].get('action_readiness') or {}).get('can_use_combat_actions')),g[0]);last=g[-1]
  print('轮',compact(ready),'末',compact(last))
  turns.append({'sequence':b['sequence'],'floor':b['floor'],'turn':t,'first':compact(ready),'last':compact(last)})
(P/'turn-audit.json').write_text(json.dumps(turns,ensure_ascii=False,indent=2)+'\n')
