import json,pathlib,collections
p=pathlib.Path('learner/runs/20261007-064303-postmortem')
for run in ['87LCSDR5P3DL','TKXQ6L4N9A6U']:
 ds=[json.loads(l) for l in (p/(run+'.decisions.jsonl')).open()]
 ss=[json.loads(l) for l in (p/(run+'.states.jsonl')).open()]
 with (p/(run+'.summary.txt')).open('w') as out:
  def pr(*args):print(*args,file=out)
  pr('局',run,'用时',(__import__('datetime').datetime.fromisoformat(ds[-1]['ts'].replace('Z','+00:00'))-__import__('datetime').datetime.fromisoformat(ds[0]['ts'].replace('Z','+00:00'))).total_seconds())
  jevs=[d for d in ds if d['decider']=='jev']; qs=[d for d in jevs if d['label'].startswith('combat/plan-choice')]
  pr('Jev总/低信心',len(jevs),sum(d.get('confidence',1)<.35 for d in jevs));pr('选线/最优',len(qs),collections.Counter(str(d.get('rollout_best_chosen')) for d in qs))
  pr('护栏',[(d['floor'],d['turn'],d['rationale']) for d in ds if 'guard' in d or 'hp_guard' in d or any(x in d['rationale'] for x in ['guard','as good or better','safer','overrid'])])
  pr('其他字段',collections.Counter(k for d in ds for k in d if k not in ds[0]))
  for d in ds:
   if d['decider']=='codex':pr('大脑',d['floor'],d['label'],d.get('journal'),d.get('rationale'))
   if d.get('chosen',{}).get('action')=='use_potion':pr('喝药',d['floor'],d['turn'],d.get('expect'),d.get('rationale'))
  for d in ds:
   if d.get('hp_guard') or d.get('guard'):pr('护栏细节',d)
  groups=[];g=None;prev=None
  for row in ss:
   s=row['state'];floor=s.get('run',{}).get('floor');t=s.get('turn');c=s.get('combat',{})
   if not s.get('in_combat') or not c.get('enemies'):continue
   if g is None or floor!=g['floor'] or (prev is not None and t is not None and prev is not None and t<prev):
    g={'floor':floor,'rows':[]};groups.append(g)
   g['rows'].append(row);prev=t
  for gi,g in enumerate(groups):
   ready=[r for r in g['rows'] if r['state']['combat'].get('action_readiness',{}).get('can_use_combat_actions')]
   if not ready:continue
   first=ready[0]['state'];pr('战斗',gi,g['floor'],'进',first['run']['current_hp'],'敌',[(e['name'],e['enemy_id'],e['max_hp']) for e in first['combat']['enemies']])
   turns=collections.OrderedDict()
   for r in ready:turns.setdefault(r['state']['turn'],[]).append(r)
   for t,rows in turns.items():
    a,b=rows[0]['state'],rows[-1]['state'];c=a['combat'];z=b['combat']
    pr('轮',t,'HP',c['player']['current_hp'],z['player']['current_hp'],'需/尾',[(e['current_hp'],e['block']) for e in c['enemies']],[(e['current_hp'],e['block']) for e in z['enemies']],'挡',z['player']['block'],'来袭',[[i.get('total_damage') for i in e.get('intents',[])] for e in z['enemies']],'玩家势',[(x['power_id'],x['amount']) for x in z['player']['powers']],'敌势',[[(x['power_id'],x['amount']) for x in e['powers']] for e in z['enemies']])
   pr('末快照',g['rows'][-1]['ts'],g['rows'][-1]['state']['screen'],g['rows'][-1]['state']['combat']['player']['current_hp'])
