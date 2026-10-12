import json,pathlib,collections,datetime
P=pathlib.Path('learner/runs/20261008-231302-postmortem')
for run in ['M0GY0A4M2F7H','Z91JN3S3PQX2']:
 d=json.loads((P/(run+'-subset.json')).read_text());r=json.loads((P/(run+'-resources.json')).read_text());ds=d['decisions']; sm={x['_line']:x for x in d['states']}
 print('\n局',run)
 for w in r['combats']:
  if w['floor'] not in ([11,13,14,15,17] if run.startswith('M') else [17,21,28,33]):continue
  print('战斗',w['sequence'],w['floor'])
  st=[x for x in d['states'] if w['entry']['line']<=x['_line']<=(w['exit'] or w['last'])['line']]; groups=[]
  for x in st:
   if not groups or x['state'].get('turn')!=groups[-1][0]['state'].get('turn'):groups.append([])
   groups[-1].append(x)
  for gi,g in enumerate(groups):
   a=g[0]; b=g[-1];c=a['state'].get('combat'); z=b['state'].get('combat');next_=groups[gi+1][0] if gi+1<len(groups) else None
   def obj(x):
    c=x['state'].get('combat');p=c.get('player') or {} if c else {};return {'s':x['_line'],'t':x['state'].get('turn'),'hp':x['state']['run']['current_hp'],'block':p.get('block'),'energy':p.get('energy'),'pwr':[(y['power_id'],y['amount']) for y in p.get('powers',[])],'e':[(y['enemy_id'],y['current_hp'],y.get('block'),[(q['power_id'],q['amount']) for q in y.get('powers',[])],y.get('move_id'),y.get('intents')) for y in (c or {}).get('enemies',[])]}
   print('轮',a['state'].get('turn'),'首',obj(a),'末',obj(b),'后',obj(next_) if next_ else None)
  if w['floor'] in [17,33]:
   print('重要牌序')
   for x in ds:
    if w['entry']['ts']<=x['ts']<=(w['exit'] or w['last'])['ts']:
     if x.get('chosen',{}).get('action') in ['use_potion'] or x.get('label') in ['combat/least-loss','selection/choose'] or 'HP guard' in x.get('rationale','') or any(t in x.get('rationale','') for t in ['灵动步法','狂乱逃离','滚石','focus']):
      print(x['_line'],x['turn'],x['label'],x.get('chosen'),x.get('rationale'),x.get('questions'))
 print('药水')
 for e in r['resource_changes']:
  a,b=e['from'],e['to']
  if a['potions']!=b['potions']:
   ids=[(x['_line'],x.get('chosen'),x.get('rationale')) for x in ds if a['ts']<=x['ts']<=b['ts']]
   print(a['line'],b['line'],'F',b['floor'],'T',a['turn'],'HP',a['hp'],b['hp'],a['potions'],'→',b['potions'],'重启',e['restart_boundary'],'d',ids)
 print('统计')
 for decider in ['jev','codex','code']:
  sub=[x for x in ds if x['decider']==decider];print(decider,len(sub),'usage',dict((k,sum((x.get('usage') or {}).get(k,0) or 0 for x in sub)) for k in ['input_tokens','output_tokens','cache_hit_tokens']),'延迟',sum(x.get('latency_ms',{}).get('deepseek',0) for x in sub))
 print('代码轮',len(set((x['floor'],x.get('sl_attempt') or 0,x.get('turn')) for x in ds if x['decider']=='code' and x['label'].startswith('combat/') and x['label']!='combat/plan-continue')))
 print('比例',collections.Counter(x.get('rationale','').split('code rank ')[-1].split(';')[0] for x in ds if x['decider']=='jev' and 'code rank ' in x.get('rationale','')))
 print('focused',[(x['_line'],x['floor'],x['turn'],x.get('rationale'),x.get('chosen')) for x in ds if 'focus' in json.dumps({k:v for k,v in x.items() if k not in ['questions','fingerprint']},ensure_ascii=False)])
