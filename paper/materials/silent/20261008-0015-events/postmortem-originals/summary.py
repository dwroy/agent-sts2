exec(open('/home/dw/Projects/agent-sts2/learner/runs/20261007-234302-postmortem/inspect.py').read().split("print('DECISION KEYS'")[0])
def ep(row):
 st=row['state']; co=st.get('combat') or {}; pl=co.get('player') or {}
 return {'line':row['_line'],'ts':row['ts'],'turn':st.get('turn'),'screen':st.get('screen'),'hp':st.get('run',{}).get('current_hp'),'max':st.get('run',{}).get('max_hp'),'block':pl.get('block'),'energy':pl.get('energy'),'pp':[(x['power_id'],x['amount']) for x in pl.get('powers',[])],'en':[(e.get('name'),e.get('enemy_id'),e.get('current_hp'),e.get('block'),e.get('move_id'),[(z['power_id'],z['amount']) for z in e.get('powers',[])],sum(z.get('total_damage') or 0 for z in e.get('intents',[]))) for e in co.get('enemies',[])]}
for c in r['combats']:
 rows=[x for x in s if c['entry']['line']<=x['_line']<=(c.get('exit') or c['last'])['line']]
 turns={}
 for x in rows:
  if x['state'].get('in_combat') and (x['state'].get('combat') or {}).get('action_readiness',{}).get('can_use_combat_actions'): turns.setdefault(x['state'].get('turn'),x)
 starts=list(turns.values()); end=rows[-1]
 print('C',c['sequence'],'F',c['floor'],'entry',c['entry'],'exit',c.get('exit'),'last',c['last'],'enemies',c['enemies'])
 for i,x in enumerate(starts):
  y=starts[i+1] if i+1<len(starts) else end
  print('T',ep(x),'net_enemy',sum(e[2] for e in ep(x)['en'] if e[2]) - sum(e[2] for e in ep(y)['en'] if e[2]),'net_loss',ep(x)['hp']-ep(y)['hp'])
print('CHANGES')
for x in r['resource_changes']:
 a=x['from'];b=x['to'];print(b['line'],b['ts'],'F',b['floor'],'T',b['turn'],'HP',a['hp'],b['hp'],'max',b['max_hp'],'P',a['potions'],b['potions'],'restart',x['restart_boundary'])
print('SL')
for z in (p/'sl-attempts.jsonl').open():
 x=json.loads(z);print({k:x.get(k) for k in ['_line','floor','attempt','started_at','ended_at','result','turns','end_hp','end_block','incoming','reload','give_up_reason']})
print('BRAIN')
for x in d:
 if x['decider']=='codex' and x['label'] not in ['shop/buy','map/route-follow']:
  print(x['_line'],x['floor'],x['label'],json.dumps(x.get('chosen'),ensure_ascii=False),json.dumps(x.get('journal'),ensure_ascii=False)[:1400])
print('STATS',collections.Counter(x['decider'] for x in d))
print('GUARD',[(x['_line'],x['floor'],x['turn'],x['rationale']) for x in d if any(t in x['rationale'].lower() for t in ['guard','overrid','hp safety','hp-safe'])])
print('POTION ACTS',[(x['_line'],x['ts'],x['floor'],x['turn'],x['chosen'],x['rationale']) for x in d if any(t in str(x['chosen']) for t in ['potion','discard']) and x['label']!='selection/choose'])
