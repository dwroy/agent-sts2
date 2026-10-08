import json,pathlib,collections,datetime
P=pathlib.Path('learner/runs/20261008-231302-postmortem')
for run in ['M0GY0A4M2F7H','Z91JN3S3PQX2']:
 d=json.loads((P/(run+'-subset.json')).read_text());r=json.loads((P/(run+'-resources.json')).read_text());facts={'run':run,'combats':[],'potions':[],'focus':[]}
 ds=d['decisions']
 for w in r['combats']:
  st=[x for x in d['states'] if w['entry']['line']<=x['_line']<=(w['exit'] or w['last'])['line']];groups=[]
  for x in st:
   if not groups or x['state'].get('turn')!=groups[-1][0]['state'].get('turn'):groups.append([])
   groups[-1].append(x)
  turns=[]
  for i,g in enumerate(groups):
   if not (g[0]['state'].get('combat') or {}).get('enemies'):continue
   a,b=g[0],g[-1];n=groups[i+1][0] if i+1<len(groups) else b
   def enemies(x):return (x['state'].get('combat') or {}).get('enemies',[])
   def total(x):return sum(e['current_hp'] for e in enemies(x) if e.get('is_alive'))
   ec=enemies(a);end=enemies(n);stage=any(e['current_hp']>100000000 for e in ec+end)
   turns.append({'turn':a['state'].get('turn'),'start_line':a['_line'],'action_last_line':b['_line'],'after_line':n['_line'],'player_start':a['state']['run']['current_hp'],'player_end':n['state']['run']['current_hp'],'hp_net':n['state']['run']['current_hp']-a['state']['run']['current_hp'],'enemy_before':total(a),'enemy_after':total(n),'net_progress':total(a)-total(n) if not stage else None,'enemy_detail_before':[(e['enemy_id'],e['current_hp']) for e in ec],'enemy_detail_after':[(e['enemy_id'],e['current_hp']) for e in end], 'stage_sentinel':stage,'partial':i==len(groups)-1 and w['exit'] is None})
  names=sorted({(e['enemy_id'],e['name']) for x in st for e in (x['state'].get('combat') or {}).get('enemies',[])})
  facts['combats'].append({'sequence':w['sequence'],'floor':w['floor'],'names':names,'entry':w['entry'],'exit':w['exit'],'last':w['last'],'turns':turns,'end':w['end']})
 for e in r['resource_changes']:
  a,b=e['from'],e['to']
  if a['potions']==b['potions']:continue
  acts=[x for x in ds if a['ts']<=x['ts']<=b['ts'] and x.get('chosen',{}).get('action') in ['use_potion','discard_potion','claim_reward','buy_potion']]
  removed=[v for v in a['potions'] if v not in b['potions']];added=[v for v in b['potions'] if v not in a['potions']]
  facts['potions'].append({'from':a,'to':b,'removed':removed,'added':added,'restart':e['restart_boundary'],'actions':[{'line':x['_line'],'chosen':x['chosen'],'rationale':x['rationale']} for x in acts]})
 for x in ds:
  cr=x.get('questions',{}).get('plan',{}).get('criteria',{});selected=x.get('answers',{}).get('plan',{}).get('choice');opts={k:json.loads(v) for k,v in cr.items()}
  withfocus={k:q['focus'] for k,q in opts.items() if 'focus' in q}
  if withfocus:facts['focus'].append({'line':x['_line'],'floor':x['floor'],'turn':x['turn'],'options':withfocus,'chosen':selected,'selected_focus':opts.get(selected,{}).get('focus')})
 (P/(run+'-facts.json')).write_text(json.dumps(facts,ensure_ascii=False,indent=2))
 print('\n局',run)
 for w in facts['combats']:
  if w['floor'] in ([11,13,14,15,17] if run.startswith('M') else [17,21,28,33]):print('F',w['floor'],'序',w['sequence'],'伤/净清',[t['net_progress'] for t in w['turns']],'HP变',[t['hp_net'] for t in w['turns']],'剩',[t['enemy_after'] if not t['stage_sentinel'] else '占位' for t in w['turns']],'s',[(t['start_line'],t['after_line']) for t in w['turns']])
 print('focus',len(facts['focus']),sum(x['selected_focus'] is not None for x in facts['focus']),[(x['floor'],x['turn'],x['selected_focus']) for x in facts['focus']])
 print('SL末态')
 for x in d['sl']:
  print(x['_line'],x['floor'],x['attempt'],x['result'],x.get('end_hp'),x.get('end_block'),x.get('incoming'),x.get('judge'),x.get('reload'))
