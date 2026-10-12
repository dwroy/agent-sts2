exec(open(__file__.replace('audit-summary.py','inspect.py')).read().split("mode=sys.argv[1]")[0])
from datetime import datetime
R=json.load((p/'E6DYYXRX7GVE-resources.json').open())
plans=[d for d in D if d['decider']=='jev' and 'plan-choice' in d['label']]
print('best',collections.Counter(str(d.get('rollout_best_chosen')) for d in plans))
print('notbest',[(d['_source']['line'],d['floor'],d['turn'],d.get('rollout_best_chosen')) for d in plans if d.get('rollout_best_chosen') is not True])
print('focus questions',sum(bool(d.get('focus')) for d in plans),'options',sum(len(d.get('focus',{})) for d in plans),'chosen',sum(((d.get('answers') or {}).get('plan') or {}).get('choice') in d.get('focus',{}) for d in plans))
self=[d for d in D if d['decider']=='code' and d['label'] in ['combat/plan','combat/lethal','combat/least-loss']]
print('self attempts',len(set((d['floor'],d.get('sl_attempt'),d['turn']) for d in self)),'self plus end',len(set((d['floor'],d.get('sl_attempt'),d['turn']) for d in self+[x for x in D if x['decider']=='code' and x['label']=='combat/end_turn'])))
print('F33 entries',[(d['_source']['line'],d.get('sl_attempt')) for d in D if d['floor']==33 and d['turn']==1])
print('sl end',[(x['_source']['line'],{k:x.get(k) for k in ['floor','attempt','turns','end_hp','end_block','incoming','gate','reload']}) for x in map(json.loads,(p/'sl-attempts.jsonl').open())])
print('enemy names', {z['enemy_id']:z['name'] for x in S for z in (x['state'].get('combat') or {}).get('enemies',[])})
print('relic gains')
prev=set()
for x in S:
 r=x['state']['run'];cur={a['relic_id'] for a in r.get('relics',[])}
 if cur-prev:print(x['_source']['line'],r['floor'],[(a['relic_id'],a['name']) for a in r.get('relics',[]) if a['relic_id'] in cur-prev])
 prev=cur
print('potion events')
for c in R['combats']:
 for e in c['changes']:
  if e['from']['potions']!=e['to']['potions']:print(c['floor'],c['sequence'],e['to']['turn'],e['to']['line'],e['to']['ts'],e['from']['potions'],e['to']['potions'])
print('last deck',len(S[-1]['state']['run']['deck']),collections.Counter(x['card_id']+('+' if x.get('upgraded') else '') for x in S[-1]['state']['run']['deck']))
print('boss clocks',[(d['_source']['line'],d['floor'],str(d.get('questions'))[:120]) for d in D if 'act_boss_clock' in str(d.get('questions')) and any(k in str(d.get('questions')) for k in ['needed_per','needed_damage','estimate_per'])])
print('cache%',3601408/5594078*100,'latency',600519/1000)
