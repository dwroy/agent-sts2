import json,pathlib,collections
p=pathlib.Path(__file__).parent
for r in ['TU3XB4CAEDAW','V0383V5S9BCQ']:
 d=[json.loads(l) for l in (p/(r+'.decisions.jsonl')).open()];s=[json.loads(l) for l in (p/(r+'.states.jsonl')).open()];t=json.loads((p/(r+'.turns.json')).read_text())
 print('\nRUN',r)
 print('unusual keys',collections.Counter(k for x in d for k in x if k not in ['ts','mode','screen','session','floor','turn','label','decision_id','decider','fingerprint','questions','answers','chosen','expect','rationale','confidence','fallback','reasked','no_jev','reused_answer','request_ids','latency_ms','usage','jev_context','jev_hints','rollout','rollout_best_chosen','timing','sl_attempt','sl_reloads','run_id','observed_ts','journal','result']))
 groups=collections.OrderedDict()
 for x in t:groups.setdefault((x['floor'],x['reload']),[]).append(x)
 for (floor,reload),a in groups.items():
  st=[x for x in s if x['state'].get('run',{}).get('floor')==floor and x['ts']>=a[-1]['ts']]
  end=next((x['state'] for x in st if x['screen'] in ['COMBAT_REWARDS','GAME_OVER','REWARD','REWARDS']),None)
  need=[];dealt=[];loss=[]
  for i,x in enumerate(a):
   eh=sum(e['current_hp'] for e in x['enemy'] if e.get('current_hp',0)>0);need.append(eh)
   if i+1<len(a):nh=a[i+1]['hp']; ne=sum(e['current_hp'] for e in a[i+1]['enemy'] if e.get('current_hp',0)>0)
   elif end:nh=end['combat']['player']['current_hp']; ne=sum(e['current_hp'] for e in end['combat']['enemies'] if e.get('is_alive'))
   else:nh=x['last_hp']; ne=sum(e['current_hp'] for e in x['last_enemy'] if e.get('is_alive'))
   loss.append(x['hp']-nh);dealt.append(eh-ne)
  print('battle',floor,'reload',reload,'names',[(e['name'],e['enemy_id'],e['max_hp']) for e in a[0]['enemy']],'hp',a[0]['hp'],'max',a[0]['maxhp'],'end',nh,'need',need,'dealt',dealt,'loss',loss,'end_screen',end and end['screen'])
 print('powers key')
 for x in t:
  if x['floor'] in ([17,35,40] if r.startswith('TU') else [5,11]):
   print(x['floor'],x['reload'],x['turn'],'hp',x['hp'],'p',[(v['power_id'],v['amount']) for v in x['powers']],'e',[(e['current_hp'],[(v['power_id'],v['amount']) for v in e['powers']],e['intents']) for e in x['enemy']],'last',x['last_hp'],x['last_block'],'plays',[a['rationale'] for a in x['plays'] if a['chosen']['action'] not in ['end_turn']])
 print('brain afterF28')
 for x in d:
  if x['decider']=='codex' and (x['floor']>=28 or r.startswith('V0')): print(x['ts'],x['floor'],x['label'],x['journal'])
 print('potions actions')
 for x in d:
  if x.get('chosen',{}).get('action') in ['use_potion','drink_potion','discard_potion','claim_reward','buy_potion']:print(x['floor'],x['turn'],x.get('sl_reloads'),x['chosen'],x['rationale'])
 print('focus',sum(any('focus' in str(v) for v in x.get('questions',{}).values()) for x in d if x['decider']=='jev'),[(x['floor'],x['turn'],x.get('journal')) for x in d if x['decider']=='jev' and 'focus' in str(x.get('journal'))])
 print('laststate',[(x['screen'],x['state'].get('combat',{}).get('player'),x['state'].get('combat',{}).get('enemies')) for x in s[-2:]])
