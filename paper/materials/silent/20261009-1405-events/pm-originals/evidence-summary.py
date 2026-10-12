import json,pathlib,collections,re
p=pathlib.Path(__file__).parent;ds=[json.loads(l) for l in (p/'decisions.jsonl').open()];ss=[json.loads(l) for l in (p/'states.jsonl').open()];rc=json.load((p/'NBJBVSBNPYQB-resources.json').open());out=[]
for c in rc['combats']:
 name={e['enemy_id']:e['name'] for row in ss if c['entry']['line']<=row['_line']<=c['last']['line'] for e in (row['state'].get('combat') or {}).get('enemies',[])}
 def rr(r):return f"{r['hp']}/{r['max_hp']}；"+('、'.join(f'槽{a} {b}' for a,b in r['potions']) or '空')
 z=c['exit'] or c['last'];loss=z['hp']-c['entry']['hp'];out.append(f"| F{c['floor']}/{c['sequence']} {'／'.join(n+' '+i for i,n in name.items())} | {rr(c['entry'])} → {rr(z)} | {loss:+d}；{'获胜' if c['exit'] and c['exit']['screen']=='REWARD' else '阵亡' if c['exit'] else 'T3判死SL，无退出帧，仅列末帧净变'} | s{c['entry']['line']}→s{z['line']}；{c['entry']['ts']}→{z['ts']} |")
(p/'resource-table.md').write_text('\n'.join(out)+'\n')
print('TABLE');print('\n'.join(out))
clock=[]
for d in (json.loads(l) for l in (p/'brain.jsonl').open()):
 def walk(v,path=''):
  if isinstance(v,dict):
   for k,z in v.items():
    if k=='act_boss_clock':clock.append({'line':d['_line'],'path':path+'.'+k,'clock':z})
    elif k not in ('criteria','options'):walk(z,path+'.'+k)
  elif isinstance(v,list):
   for j,z in enumerate(v):walk(z,path+str(j))
 walk(d.get('payload'))
(p/'clock-evidence.json').write_text(json.dumps(clock,ensure_ascii=False,indent=2)+'\n');print('CLOCK',[(v['line'],v['clock'].get('boss'),v['clock'].get('deck_damage_per_turn_estimate'),v['clock'].get('gap_per_turn')) for v in clock])
print('ROLLRATE',collections.Counter(str(d.get('rollout_best_chosen','missing')) for d in ds if d['decider']=='jev' and d['label'].startswith('combat/plan-choice')))
print('SL_OVERRIDES',[(d['_line'],d['floor'],d['turn'],d.get('sl_attempt')) for d in ds if 'SL explore' in d['rationale']])
print('NO_HP_SILENT_DEX',[(v['name'],v['relic_id']) for v in ss[-1]['state']['run'].get('relics',[])])
