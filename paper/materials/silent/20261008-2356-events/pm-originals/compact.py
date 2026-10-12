import json,pathlib,collections,re
P=pathlib.Path('learner/runs/20261008-231302-postmortem')
for run in ['M0GY0A4M2F7H','Z91JN3S3PQX2']:
 d=json.loads((P/(run+'-subset.json')).read_text());r=json.loads((P/(run+'-resources.json')).read_text()); print('\n局',run)
 for w in r['combats']:
  if w['floor'] not in [11,13,14,15,17,21,28,33]:continue
  st=[x for x in d['states'] if w['entry']['line']<=x['_line']<=(w['exit'] or w['last'])['line']];g=[]
  for x in st:
   if not g or x['state'].get('turn')!=g[-1][0]['state'].get('turn'):g.append([])
   g[-1].append(x)
  print('战斗',w['sequence'],w['floor'])
  for i,a in enumerate(g):
   first,last=a[0],a[-1]; nxt=g[i+1][0] if i+1<len(g) else last
   def powers(x):return {q['power_id']:q['amount'] for q in x.get('powers',[])}
   def data(x):
    s=x['state'];c=s.get('combat') or {};p=c.get('player') or {};return [x['_line'],s['run']['current_hp'],p.get('block'),powers(p),[[e['name'],e['current_hp'],powers(e),sum(z.get('total_damage') or 0 for z in e.get('intents',[]))] for e in c.get('enemies',[])]]
   print(first['state'].get('turn'),data(first),'→',data(last),'后',data(nxt))
   if w['floor'] in [17,33]:
    for x in d['decisions']:
     if first['ts']<=x['ts']<=last['ts'] and x.get('chosen',{}).get('action') not in ['end_turn']:
      print('d',x['_line'],x.get('sl_attempt'),x.get('chosen'),x.get('rationale'))
 print('统计段')
 for decider in ['jev','codex','code']:
  sub=[x for x in d['decisions'] if x['decider']==decider];print(decider,len(sub),{k:sum((x.get('usage') or {}).get(k,0) or 0 for x in sub) for k in ['input_tokens','output_tokens','cache_hit_tokens']})
 print('代码新选轮',len(set((x['floor'],x.get('sl_attempt') or 0,x.get('turn')) for x in d['decisions'] if x['decider']=='code' and x['label'].startswith('combat/') and x['label']!='combat/plan-continue')))
 plans=[x for x in d['decisions'] if x['decider']=='jev' and x['label'].startswith('combat/plan-choice')]; ranks=collections.Counter(re.search(r'code rank (.*)$',x.get('rationale','')).group(1).split(';')[0] if 'code rank ' in x.get('rationale','') else '药水/无排名' for x in plans)
 print('排名',len(plans),ranks)
 print('最优',sum(any(json.loads(v).get('rollout_best') is True and k==str((x.get('deepseek') or {}).get('choice','')) for k,v in x.get('questions',{}).get('plan',{}).get('criteria',{}).items()) for x in plans))
 print('药水')
 for e in r['resource_changes']:
  a,b=e['from'],e['to']
  if a['potions']!=b['potions']:
   ds=[(x['_line'],x.get('chosen'),x.get('rationale')) for x in d['decisions'] if a['ts']<=x['ts']<=b['ts']]
   print(a['line'],b['line'],'F',b['floor'],'T',a['turn'],a['potions'],'→',b['potions'],'SL',e['restart_boundary'],'d',ds)
