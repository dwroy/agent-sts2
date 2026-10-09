import json,collections,re,datetime
from pathlib import Path
P=Path('learner/runs/20261009-224302-postmortem');D=[json.loads(x)for x in(P/'decisions.jsonl').open()];S=[json.loads(x)for x in(P/'states.jsonl').open()];R=json.loads((P/'Q389KW7SVWKH-resources.json').read_text())
print('路线投影')
for d in D:
 if 'route_plan' not in d:continue
 n=d['_seq'];r=d['route_plan'];print('d',n,'开层',r['floor'],'路径',[(x['row'],x['type'],None if x.get('hpOnArrival') is None else round(x['hpOnArrival']*70,5))for x in r['path']])
print('营火模拟')
for d in D:
 if d['label']=='rest/plan':
  b=d.get('boss_sim')or{};print('d',d['_seq'],'F',d['floor'],'hp',b.get('entry_hp'),'来源',b.get('entry_source'),'samples',b.get('samples'),'selected',b.get('options',{}).get((d.get('deepseek')or{}).get('choice')), 'base',b.get('base'), 'error',b.get('error'),'chosen',d['chosen'])
print('喝药')
for d in D:
 if d['chosen'].get('action')in('use_potion','discard_potion'):
  after=next((s for s in S if s['_line']>=330652 and s['ts']>=d['ts']),None)
  print('d',d['_seq'],'F',d['floor'],'T',d['turn'],'a',d['sl_attempt'],d['chosen'],d['rationale'],'s后',after['_line']if after else None)
print('终战逐回合')
for c in R['combats'][16:]:
 print('尝试',c['sequence']-16)
 ss=[s for s in S if c['entry']['line']<=s['_line']<=(c.get('exit')or c['last'])['line']]
 g=collections.defaultdict(list)
 for s in ss:g[s['state']['turn']].append(s)
 for t,gg in g.items():
  a,b=gg[0],gg[-1];ap=a['state'].get('combat',{}).get('player',{});bp=b['state'].get('combat',{}).get('player',{})
  print('T',t,'首末s',a['_line'],b['_line'],'HP',a['state']['run']['current_hp'],b['state']['run']['current_hp'],'挡',bp.get('block'),'敌',[(e['current_hp'],e['max_hp'],e.get('move_id'),sum(z.get('total_damage')or 0 for z in e.get('intents',[])))for e in b['state'].get('combat',{}).get('enemies',[])],'起敌',[(e['current_hp'],e['max_hp'])for e in a['state'].get('combat',{}).get('enemies',[])])
print('关键胜战')
for c in R['combats']:
 if c['floor']in(17,25,33,35,37,38):
  print('F',c['floor'],'audit',[(x['turn'],x['live_enemy_hp_start'],x['live_enemy_hp_end'],x['visible_enemy_hp_loss_lower_bound'],x['gaps'])for x in c['enemy_hp_audit']['turns']])
print('神化+未建模')
count=0
for d in D:
 for k,v in d.get('questions',{}).get('plan',{}).get('criteria',{}).items():
  try:o=json.loads(v)
  except:continue
  if '神化+'in o.get('unmodelled_cards',''):count+=1;print('d',d['_seq'],'F',d['floor'],'T',d['turn'],k,o.get('plays'),'未建模',o['unmodelled_cards'])
print('总神化未建模候选',count,'神化实际打出数',sum(d['chosen'].get('action')=='play_card' and '神化' in d.get('rationale','')for d in D))
