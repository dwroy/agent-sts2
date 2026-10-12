import json,collections,datetime
from pathlib import Path
p=Path('learner/runs/20261007-074302-postmortem')
ds=[json.loads(x) for x in (p/'decisions.jsonl').open()]
ss=[json.loads(x) for x in (p/'states.jsonl').open()]
byobs={x['observed_ts']:x for x in ss}
def powers(a):return [(x['power_id'],x['amount']) for x in a]
def enemy(e):return [e['index'],e['name'],e['enemy_id'],e['current_hp'],e['block'],powers(e['powers']),e['move_id'],[(i['damage'],i['hits'],i['total_damage']) for i in e['intents']]]
def brief(s):
 c=s['combat'];return {'hp':c['player']['current_hp'],'block':c['player']['block'],'energy':c['player']['energy'],'powers':powers(c['player']['powers']),'enemies':[enemy(e) for e in c['enemies']]}
for floor in [8,17,23,25]:
 print('\n战斗',floor)
 fs=[x for x in ss if x['state'].get('run',{}).get('floor')==floor and x['state'].get('combat')]
 fds=[d for d in ds if d['floor']==floor and d['label'].startswith('combat/')]
 rounds=collections.defaultdict(list)
 for x in fs:rounds[x['state']['turn']].append(x)
 for t,xs in rounds.items():
  td=[d for d in fds if d['turn']==t];first=byobs.get(td[0]['observed_ts'],xs[0]) if td else xs[0]
  a,b=first['state'],xs[-1]['state']; dmg=0
  for u,v in zip(xs,xs[1:]):
   prev={e['index']:e for e in u['state']['combat']['enemies']}
   for e in v['state']['combat']['enemies']:
    if e['index'] in prev:dmg+=max(0,prev[e['index']]['current_hp']-e['current_hp'])
  nxt=rounds.get(t+1)
  if nxt:
   prev={e['index']:e for e in b['combat']['enemies']}
   for e in nxt[0]['state']['combat']['enemies']:
    if e['index'] in prev:dmg+=max(0,prev[e['index']]['current_hp']-e['current_hp'])
  afterhp=(nxt[0]['state']['combat']['player']['current_hp'] if nxt else b['combat']['player']['current_hp'])
  need=sum(e['current_hp'] for e in a['combat']['enemies'] if e['is_alive'])
  print('回合',t,'需',need,'扣',dmg,'血损',a['combat']['player']['current_hp']-afterhp,'首',json.dumps(brief(a),ensure_ascii=False),'末',json.dumps(brief(b),ensure_ascii=False))
  if floor==25:
   for d in td:print('决策',d['ts'],d['decider'],d['label'],d['chosen'],d['rationale'])
   print('首手',[(h['name'],h['card_id'],h.get('resolved_rules_text')) for h in a['combat']['hand']])
print('\n药水与非战斗血量')
prev=None
for x in ss:
 s=x['state'];r=s.get('run')
 if not r:continue
 slots=tuple(z['potion_id'] for z in r['potions']); key=(r['floor'],r['current_hp'],r['max_hp'],slots)
 if prev!=key and (not s.get('in_combat') or not prev or prev[3]!=slots):print(x['ts'],s['screen'],key)
 prev=key
print('显式药水动作')
for d in ds:
 if 'potion' in d['chosen']['action']:print(d['floor'],d['turn'],d['chosen'],d['expect'],d['rationale'])
print('低信心',sum(d['decider']=='jev' and d.get('confidence',1)<.35 for d in ds))
qs=[d for d in ds if d['label'].startswith('combat/') and d['decider']=='jev']
print('Jev战斗',len(qs),'最优字段',collections.Counter(d.get('rollout_best_chosen') for d in qs),'首选rank',collections.Counter(d['rationale'].split('code rank ')[-1] for d in qs))
keys={(d['floor'],d['turn']) for d in ds if d['label'].startswith('combat/')}
jevkeys={(d['floor'],d['turn']) for d in qs}
code=[d for d in ds if d['label'].startswith('combat/') and d['decider']=='code' and d['label']!='combat/plan-continue']
print('战斗轮',len(keys),'无Jev战斗题',len(keys-jevkeys),'代码非续步',len(code),'覆盖轮',len({(d['floor'],d['turn']) for d in code}),'非结束覆盖轮',len({(d['floor'],d['turn']) for d in code if d['chosen']['action']!='end_turn'}))
print('续步',collections.Counter(d['rationale'].split(':')[0] for d in ds if d['label']=='combat/plan-continue'))
print('低置信分类',collections.Counter('战斗' if d['label'].startswith('combat/') else '选择' for d in ds if d['decider']=='jev' and d.get('confidence',1)<.35))
print('自主末轮',[(d['label'],d['decider']) for d in ds if d['floor']==25 and d['turn']==9])
print('用时秒',(datetime.datetime.fromisoformat(ds[-1]['ts'])-datetime.datetime.fromisoformat(ds[0]['ts'])).total_seconds())
