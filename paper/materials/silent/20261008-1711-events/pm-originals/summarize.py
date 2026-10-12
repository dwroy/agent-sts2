import json,collections
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-164302-postmortem')
def read(n):return [json.loads(l) for l in (p/n).open()]
d=read('decisions.jsonl');s=read('states.jsonl');c=json.loads((p/'Y5H4CFAQ2WTG-resources.json').read_text())
def compact(x):return json.dumps(x,ensure_ascii=False,separators=(',',':'))
with (p/'summary.txt').open('w') as f:
 def log(*args):print(*args,file=f)
 log('RESOURCE COMBATS')
 for a in c['combats']:
  log('F',a['floor'],a['enemies'],'entry',a['entry'],'last',a['last'],'exit',a['exit'],'end',a['end'],'net',a['observed_net_hp_loss'])
 log('RESOURCE CHANGES')
 for a in c['resource_changes']:
  x=a['from'];y=a['to'];log('F',y['floor'],'T',y['turn'],'s',x['line'],y['line'],x['hp'],y['hp'],x['potions'],y['potions'],'restart',a['restart_boundary'])
 log('NONCOMBAT')
 for a in d:
  if a['decider']=='codex':log('d',a['_line'],'F',a['floor'],a['label'],compact(a['chosen']),a['rationale'])
 log('COMBAT KEY')
 for a in d:
  if a['floor'] in [17,19,33] and a['label'].startswith('combat/') and a['label']!='combat/plan-continue':
   log('d',a['_line'],'F',a['floor'],'T',a['turn'],a['decider'],a['label'],compact(a['chosen']),a['rationale'],compact(a.get('journal')))
 log('SL')
 for a in read('sl-attempts.jsonl'):log({k:v for k,v in a.items() if k not in ['draws','summary','judge']})
 log('PLANS')
 for a in read('run-plans.jsonl'):log('rp',a['_line'],a['floor'],compact(a['plan']),compact(a['raw']))
 log('ROUND STARTS')
 for a in c['combats']:
  entry=a['entry']['line'];last=a['last']['line'];frames=[r for r in s if entry<=r['_line']<=last];seen=set();rounds=[]
  for r in frames:
   st=r['state'];t=st.get('turn')
   if t in seen:continue
   seen.add(t);co=st.get('combat') or {};pl=co.get('player') or {};en=co.get('enemies') or []
   rounds.append({'t':t,'s':r['_line'],'hp':st['run']['current_hp'],'block':pl.get('block'),'enemies':[{k:e.get(k) for k in ['enemy_id','name','current_hp','block','intents','powers','is_alive']} for e in en],'player':pl,'hand':[(x.get('name'),x.get('card_id'),x.get('resolved_rules_text')) for x in co.get('hand',[])]})
  log('F',a['floor'],compact(rounds))
print('written summary',len(d),len(s))
print('decision schema journal',compact(next(a for a in d if a['decider']=='jev').get('journal')))
print('combat schema',[(k,type(v).__name__) for k,v in next(r['state']['combat'] for r in s if r['state'].get('combat')).items()])
