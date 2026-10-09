import json,sys
from pathlib import Path
from collections import Counter,defaultdict
out=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-141302-postmortem');run='AF76L5UTPP8U'
def rows(n):return [json.loads(l) for l in (out/f'{run}-{n}.jsonl').open()]
ds=rows('decisions');ss=rows('states')
def criteria(r):
 for key,q in (r.get('questions') or {}).items():
  if key=='plan':
   for k,v in q.get('criteria',{}).items():
    try:v=json.loads(v)
    except ValueError:pass
    yield k,v
mode=sys.argv[1]
if mode=='brain':
 for r in ds:
  if r['decider']=='codex':print('D',r['_line'],'F',r['floor'],'T',r['turn'],r['label'],r.get('chosen'),r.get('journal'))
elif mode=='death':
 for r in ds:
  if r['floor']==23:
   print('D',r['_line'],'T',r['turn'],r['label'],r.get('chosen'),r['rationale'])
   if r.get('rollout'):print('ROLLOUT',r['rollout'],'chosen_best',r.get('rollout_best_chosen'),'chosen_order',r.get('chosen_order'),'focus',r.get('focus'))
   for k,v in criteria(r):
    print(k,{f:v.get(f) for f in ['plays','focus','hp_lost','damage_dealt','block_gained','cards_drawn','enemies_after','rollout_best','rollout','rollout_turns','stuns','simulated'] if f in v})
elif mode=='stats':
 print('raw_deciders',Counter(r['decider'] for r in ds))
 print('usage',dict(Counter({k:sum(r.get('usage',{}).get(k,0) or 0 for r in ds) for k in ['input_tokens','output_tokens','cache_hit_tokens']})))
 print('rollout metric',Counter(str(r.get('rollout_best_chosen')) for r in ds if r['decider']=='jev'))
 print('rollout nonend',Counter(str(r.get('rollout_best_chosen')) for r in ds if r['decider']=='jev' and (r.get('chosen') or {}).get('action')!='end_turn'))
 print('chosen_orders',Counter(r.get('chosen_order') for r in ds if r.get('chosen_order')))
 print('guard')
 for r in ds:
  if 'guard' in r['rationale'].lower() or any('guard' in k for k in r):print(r['_line'],r['floor'],r['turn'],r['rationale'],{k:v for k,v in r.items() if 'guard' in k})
 print('code unique turns',len({(r['floor'],r['turn']) for r in ds if r['label'].startswith('combat/') and r['decider']=='code'}))
 print('code initiators',Counter(r['label'] for r in ds if r['label'].startswith('combat/') and r['decider']=='code' and r['label']!='combat/plan-continue'))
 print('code initiators turns',len({(r['floor'],r['turn']) for r in ds if r['label'].startswith('combat/') and r['decider']=='code' and r['label']!='combat/plan-continue'}))
 print('code only turns',sorted({(r['floor'],r['turn']) for r in ds if r['label'].startswith('combat/')} - {(r['floor'],r['turn']) for r in ds if r['label'].startswith('combat/') and r['decider']=='jev'}))
 print('continue origins',Counter('Jev' if 'Jev-chosen' in r['rationale'] else 'code' for r in ds if r['decider']=='code' and r['label']=='combat/plan-continue'))
 print('mod/death/solver keys',Counter(k for r in ds for k in r if any(x in k for x in ['solver','judge','potion','guard','clock'])))
 print('potions actions')
 for r in ds:
  if (r.get('chosen') or {}).get('action') in ['use_potion','drink_potion','discard_potion']:print(r['_line'],r['ts'],r['floor'],r['turn'],r['chosen'],r['rationale'])
 print('config',rows('run-config'))
elif mode=='turns':
 for f in [2,3,7,9,12,14,15,17,19,21,22,23]:
  print('FLOOR',f)
  rs=[r for r in ss if (r['state'].get('run') or {}).get('floor')==f and (r['state'].get('combat') or {}).get('enemies')]
  group=defaultdict(list)
  for r in rs:group[r['state']['turn']].append(r)
  for t,rs in group.items():
   # Use first settled actionable frame and last combat frame before next turn or exit.
   ready=[r for r in rs if ((r['state'].get('combat') or {}).get('action_readiness') or {}).get('can_use_combat_actions')]
   if not ready:continue
   a=ready[0];b=ready[-1];c=a['state']['combat'];z=b['state']['combat']
   nxt=next((r for r in ss if r['_line']>b['_line'] and (r['state'].get('run') or {}).get('floor')==f and r['state']['turn']!=t),None)
   eh=lambda e:[(x['enemy_id'],x['current_hp'],x['block'],[(p['power_id'],p['amount']) for p in x['powers']]) for x in e]
   print('T',t,'S',a['_line'],b['_line'],'hp',c['player']['current_hp'],'->',nxt['state']['run']['current_hp'] if nxt else rs[-1]['state']['run']['current_hp'],'block',z['player']['block'],'incoming',sum((i.get('total_damage') or 0) for e in z['enemies'] if e['is_alive'] for i in e['intents']),'E start',eh(c['enemies']),'E end',eh(z['enemies']))
