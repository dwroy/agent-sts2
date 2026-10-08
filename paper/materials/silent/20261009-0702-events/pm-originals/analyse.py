import json,collections
from pathlib import Path
P=Path(__file__).resolve().parent
D=json.loads((P/'decisions.json').read_text());S=json.loads((P/'states.json').read_text());R=json.loads((P/'SV2GP9NX4HQD-resources.json').read_text())
for s in S:s['state']['_line']=s['_line'];s['state']['_ts']=s['ts']
def player(s):return (s['state'].get('combat') or {}).get('player') or {}
def short(s):
 t=s['state'];return {'s':s['_line'],'ts':s['ts'],'screen':t.get('screen'),'floor':t.get('run',{}).get('floor'), 'turn':t.get('turn'),'p':{k:v for k,v in player(s).items() if k in ['current_hp','max_hp','block','energy','powers']},'enemy':[{k:v for k,v in e.items() if k in ['index','name','enemy_id','current_hp','max_hp','block','powers','intent','is_alive','intents']} for e in (t.get('combat') or {}).get('enemies',[])]}
out=[]
for c in R['combats']:
 a=c['entry'];b=c.get('exit') or c['last'];out.append(f"{c['sequence']} F{c['floor']} {','.join(c['enemies'])} {a['hp']}/{a['max_hp']}→{b['hp']}/{b['max_hp']} {a['potions']}→{b['potions']} s{a['line']}→{b['line']} {a['ts']}→{b['ts']} {c['end']}")
(P/'resources-summary.txt').write_text('\n'.join(out))
out=[]
for ch in R['resource_changes']:
 a=ch['from'];b=ch['to'];out.append(f"s{a['line']}→{b['line']} F{a['floor']}T{a['turn']}→F{b['floor']}T{b['turn']} {a['screen']}→{b['screen']} HP{a['hp']}/{a['max_hp']}→{b['hp']}/{b['max_hp']} {a['potions']}→{b['potions']} {b['ts']} restart={ch['restart_boundary']}")
(P/'changes-summary.txt').write_text('\n'.join(out))
out=[]
for d in D:
 if any(w in d['rationale'].lower() for w in ['guard','overrid','replac','protect']):out.append(json.dumps(d,ensure_ascii=False))
(P/'guards.jsonl').write_text('\n'.join(out))
for f in [17,33,43,45,46,48]:
 out=[]
 for c in R['combats']:
  if c['floor']!=f:continue
  frames=[s for s in S if c['entry']['line']<=s['_line']<=(c.get('exit') or c['last'])['line']];groups=collections.defaultdict(list)
  for s in frames:
   t=s['state'].get('turn');groups[t].append(s)
  out.append('sequence='+str(c['sequence']))
  for t,fr in groups.items():
   a=next((s for s in fr if (s['state'].get('combat') or {}).get('hand') and player(s).get('energy',0)>0),fr[0]);b=fr[-1]
   out.append(json.dumps({'turn':t,'first':short(a),'last':short(b)},ensure_ascii=False))
 (P/f'F{f}-turns.jsonl').write_text('\n'.join(out))
# 减少输出，仅保留核心决策与已选择题面。
out=[]
for d in D:
 if d['label'].startswith('combat/') and d['label']!='combat/plan-continue':
  q=d.get('questions') or {};an=d.get('answers') or {};criteria=(q.get('plan') or {}).get('criteria') or {};choice=(an.get('plan') or {}).get('choice');selected=criteria.get(choice)
  out.append(json.dumps({'d':d['_line'],'floor':d['floor'],'turn':d['turn'],'attempt':d.get('sl_attempt'),'chosen':d['chosen'],'why':d['rationale'],'selected':json.loads(selected) if selected else None,'rollout_best':d.get('rollout_best_chosen'),'boss_sim':d.get('boss_sim')},ensure_ascii=False))
(P/'combat-summary.jsonl').write_text('\n'.join(out))
print('已保存汇总');print(json.dumps(short(S[-2]),ensure_ascii=False));print('first-player-keys',list(player(S[3])),'combat-keys',list(S[3]['state'].get('combat') or {}),'run-keys',list(S[3]['state'].get('run') or {}))
print('护栏相关',len((P/'guards.jsonl').read_text().splitlines()))
