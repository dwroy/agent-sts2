import json,collections,re,datetime
from pathlib import Path
P=Path('learner/runs/20261009-224302-postmortem')
def rows(n):return [json.loads(x) for x in (P/(n+'.jsonl')).open()]
D,S,PL,SL=[rows(x) for x in ('decisions','states','plans','sl')];R=json.loads((P/'Q389KW7SVWKH-resources.json').read_text());sd={x['_line']:x for x in S}
print('统计')
J=[d for d in D if d['decider']=='jev'];Q=[d for d in J if 'rollout_best_chosen' in d]
print('Jev',len(J),'低信',sum(d['confidence']<.35 for d in J),'最佳',collections.Counter(d['rollout_best_chosen'] for d in Q),'计划问题',len(Q),'代码rank1',sum('code rank 1 ' in d['rationale']for d in Q),'rank-添加',sum("code rank -" in d['rationale']for d in Q))
print('代码continuation归属',collections.Counter('jev-plan' if 'Jev-chosen' in d['rationale'] else 'code' for d in D if d['label']=='combat/plan-continue'))
print('自主combat次数',len([d for d in D if d['decider']=='code' and d['label'].startswith('combat/') and d['label']!='combat/plan-continue']))
for mode in ('all','self'):
 k={(d.get('sl_attempt'),d['floor'],d['turn']) for d in D if d['decider']=='code' and d['label'].startswith('combat/') and (mode=='all' or d['label']!='combat/plan-continue')}
 print('code回合',mode,len(k))
print('focus')
for d in D:
 if 'focus'in d or' chosen_order' in d:print('d',d['_seq'],'F',d['floor'],'T',d['turn'],'focus',d.get('focus'),'order',d.get('chosen_order'))
print('护栏详细')
for d in D:
 if 'HP guard:'in d['rationale']:
  print('d',d['_seq'],d['rationale'],'探索',d.get('sl_explore'))
  q=d['questions']['plan']['criteria']
  for k in ('plan2','plan6'):
   o=json.loads(q[k]);print(k,{key:o.get(key)for key in ('plays','hp_lost','damage_dealt','block_gained','cards_drawn','enemies_after','rollout_turns','rollout_best','potion_cost')})
print('资源变化')
for e in R['resource_changes']:
 a,b=e['from'],e['to'];print(f"s{a['line']} F{a['floor']}T{a['turn']} {a['hp']} {a['potions']} -> s{b['line']} F{b['floor']}T{b['turn']} {b['hp']} {b['potions']} 窗口{e['combat_sequence']} SL边界{e['restart_boundary']}")
print('每场逐回合敌血起终净变化')
for c in R['combats']:
 print('场',c['sequence'],'F',c['floor'])
 ss=[s for s in S if c['entry']['line']<=s['_line']<=(c.get('exit')or c['last'])['line']]
 g=collections.defaultdict(list)
 for s in ss:g[s['state'].get('turn')].append(s)
 for t,z in g.items():
  a,b=z[0],z[-1]
  def es(s):return [(e.get('name'),e.get('enemy_id'),e.get('current_hp'),e.get('max_hp'),e.get('is_alive'))for e in (s['state'].get('combat')or{}).get('enemies',[])]
  print(t,'HP',a['state']['run']['current_hp'],b['state']['run']['current_hp'],'敌',es(a),es(b))
print('收益来源遗物')
seen=set()
for s in S:
 for v in s['state'].get('run',{}).get('relics',[]):
  if v.get('relic_id')not in seen: print(s['_line'],s['state']['run']['floor'],v);seen.add(v.get('relic_id'))
