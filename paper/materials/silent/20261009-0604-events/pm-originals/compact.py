import json,re,collections
from pathlib import Path
p=Path(__file__).parent
d=[json.loads(l) for l in (p/'decisions.jsonl').open()]
s=[json.loads(l) for l in (p/'states.jsonl').open()]
for n in [305660,305952,305969,306023,306047,306071,306075]:
 x=next(x for x in d if x['_line']==n); print('方案',n,x['floor'],x['turn'],x.get('sl_attempt'),x.get('answers'))
 for k,v in x['questions']['plan']['criteria'].items():
  try:v=json.loads(v)
  except ValueError:continue
  print(k,{a:v.get(a) for a in ['focus','plays','hp_lost','damage_dealt','block_gained','cards_drawn','kills','enemies_after','rollout','rollout_turns','scaling_gained']})
print('逐轮关键帧')
r=json.loads((p/'KSX97DF5H3NY-resources.json').read_text())
by={x['_line']:x for x in s}
for c in r['combats']:
 if c['floor'] not in [8,17,23,30,31]:continue
 grouped={}
 for x in s:
  if not c['entry']['line']<=x['_line']<=c['last']['line']:continue
  st=x['state']; cp=st.get('combat') or {}; pl=cp.get('player') or {}
  if pl.get('energy',0)>0 or any(a.get('action')=='end_turn' for a in st.get('available_actions',[]) if isinstance(a,dict)):
   grouped.setdefault(st.get('turn'),[]).append(x)
 # Use first ready decision's exact observed ts or all snapshots at a turn; print first/last action boards.
 for t in sorted(grouped):
  xx=grouped[t]
  for lab,x in [('首',xx[0]),('末',xx[-1])]:
   st=x['state'];cp=st['combat'];pl=cp['player']
   print(c['sequence'],c['floor'],t,lab,x['_line'],'血挡能',st['run']['current_hp'],pl['block'],pl['energy'],'玩家层',[(z['power_id'],z['amount']) for z in pl.get('powers',[])], '敌',[(e['enemy_id'],e.get('name'),e['current_hp'],e['block'],[(i.get('total_damage')) for i in e.get('intents',[])],[(z['power_id'],z['amount']) for z in e.get('powers',[])]) for e in cp.get('enemies',[])])
print('其他事实')
for n in [305688,305798,305940,305758]:
 x=next(x for x in d if x['_line']==n)
 print(n,'顶层keys',list(x),'facts',str(x.get('facts'))[:500])
 for k,v in x.get('questions',{}).items():
  m=re.search('facts|route|clock',v.get('instructions',''),re.I)
  print('instructions尾',v.get('instructions','')[-1800:])
print('代码自主统计')
turns=collections.defaultdict(set)
for x in d:
 if x['label'].startswith('combat/'):
  if x['label']=='combat/plan-continue':continue
  turns[(x['floor'],x.get('sl_attempt'),x['turn'])].add(x['decider'])
print('all turns',len(turns),'code参与',sum('code'in v for v in turns.values()),'仅code',sum(v=={'code'} for v in turns.values()),'混合',sum('code'in v and 'jev'in v for v in turns.values()))
print('usage',sum(x.get('usage',{}).get('input_tokens',0) for x in d),sum(x.get('usage',{}).get('output_tokens',0) for x in d))
