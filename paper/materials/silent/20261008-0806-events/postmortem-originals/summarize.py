import json, collections
from pathlib import Path
p=Path(__file__).parent

def read(fn):
 out=[]
 for l in (p/fn).open():
  n,s=l.rstrip().split(':',1); r=json.loads(s); r['_line']=int(n); out.append(r)
 return out

d=read('decisions.lines'); st=read('states.lines'); b=read('brain.lines'); sl=read('sl.lines')
print('决策',len(d),d[0]['_line'],d[-1]['_line'],d[0]['ts'],d[-1]['ts'])
print('状态',len(st),st[0]['_line'],st[-1]['_line'])
print('决策者',collections.Counter(r['decider'] for r in d));print('标签',collections.Counter(r['label'] for r in d))
print('大脑',len(b),collections.Counter(r.get('engine') for r in b))
for r in d:
 if r['decider']=='codex':
  print('策略',r['_line'],r['floor'],r['label'],r.get('chosen'),r['rationale'])
  if r.get('boss_sim'): print('模拟',r['_line'],{k:v for k,v in r['boss_sim'].items() if k not in ['options','not_simulated']},'已选候选',r['boss_sim'].get('options',{}).get((r.get('deepseek') or {}).get('choice')))
for r in sl:
 print('SL',r['_line'],{k:r.get(k) for k in ['attempt','turns','end_hp','end_block','incoming','result','started_at','ended_at','judge','explore','give_up_reason']})
r=json.loads((p/'L2TSFU62Z57Z-resources.json').read_text())
for c in r['combats']:
 print('资源',c['sequence'],c['floor'],c['enemies'],c['entry'],c['last'],c['exit'],c['end'],c['observed_net_hp_loss'])
 print('变化',[(x['from']['line'],x['to']['line'],x['to']['turn'],x['from']['hp'],x['to']['hp'],x['from']['potions'],x['to']['potions']) for x in c['changes']])
print('战外/边界资源变化')
for c in r['resource_changes']:
 if c['combat_sequence'] is None: print(c)
print('用药决策')
for x in d:
 if 'potion' in (x.get('chosen') or {}).get('action',''): print(x['_line'],x['floor'],x.get('sl_reloads'),x['turn'],x['chosen'],x['rationale'])
print('护栏/换线')
for x in d:
 if any(a in x['rationale'].lower() for a in ['guard','least-loss','explore','deviat']): print(x['_line'],x['floor'],x.get('sl_reloads'),x['turn'],x['rationale'])
