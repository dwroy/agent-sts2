import json,collections
from pathlib import Path
p=Path(__file__).parent;S=[json.loads(l) for l in (p/'states.jsonl').open()];D=[json.loads(l) for l in (p/'decisions.jsonl').open()];R=json.loads((p/'J8PHG72DGD90-resources.json').read_text())
for c in R['combats']:
 rows=[x for x in S if c['entry']['line']<=x['_line']<=(c['exit'] or c['last'])['line']];names={e['enemy_id']:e['name'] for x in rows for e in (x['state'].get('combat') or {}).get('enemies',[])}
 print('ROW',c['sequence'],c['floor'],names,c['entry']['hp'],(c['exit'] or c['last'])['hp'],c['entry']['max_hp'],c['entry']['line'],(c['exit'] or c['last'])['line'])
print('POTION changes')
for e in R['resource_changes']:
 if e['from']['potions']!=e['to']['potions']:print(e['from']['line'],e['to']['line'],e['to']['ts'],e['to']['floor'],e['to']['turn'],e['from']['potions'],e['to']['potions'],e['restart_boundary'])
print('relic differences')
prev={}
for x in S:
 now={r['relic_id']:(r.get('stack'),r.get('counter')) for r in x['state']['run'].get('relics',[])}
 if now!=prev:print(x['_line'],x['state']['run']['floor'],x['state']['run']['current_hp'],{k:v for k,v in now.items() if prev.get(k)!=v});prev=now
print('selected choices')
for d in D:
 if (d['floor']==9 and d['turn']==3) or (d['floor']==31 and d['turn'] in [1,4,6]) or (d['floor']==33 and d.get('sl_attempt')==6 and d['turn'] in [2,4,11,12]):
  if d['decider']=='jev' or d['label'] in ['combat/least-loss','combat/end_turn']:
   ans=(d.get('answers',{}).get('plan') or {}).get('choice');qs=(d.get('questions',{}).get('plan') or {}).get('criteria') or {};v=qs.get(ans)
   try:v=json.loads(v) if v else None
   except ValueError:v=None
   print('CHOSEN',d['_line'],d['floor'],d['turn'],d.get('sl_attempt'),d['rationale'],{k:v.get(k) for k in ['hp_lost','damage_dealt','block_gained','rollout','boss_sim','unmodelled_cards']} if v else {})
