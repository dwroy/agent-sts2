import json,collections,datetime,re
from pathlib import Path
p=Path(__file__).parent

def read(fn):
 rows=[]
 for l in (p/fn).open():
  n,s=l.split(':',1);r=json.loads(s);r['_line']=int(n);rows.append(r)
 return rows

d=read('decisions.lines');s=read('states.lines');b=read('brain.lines');res=json.loads((p/'L2TSFU62Z57Z-resources.json').read_text())
jev=[r for r in d if r['decider']=='jev'];jcombat=[r for r in jev if r['label'].startswith('combat/')]
metrics={'jev':len(jev),'低信心0.35':sum(r['confidence']<.35 for r in jev),'低信心0.50':sum(r['confidence']<.5 for r in jev),'boss低0.35':sum(r['confidence']<.35 for r in jev if r['floor']==17),'推演最优':sum(r.get('rollout_best_chosen') is True for r in jcombat),'推演标记分母':sum(type(r.get('rollout_best_chosen')) is bool for r in jcombat),'jev输入':sum(r['usage']['input_tokens'] for r in jev),'jev输出':sum(r['usage']['output_tokens'] for r in jev),'大脑输入':sum(r['usage']['inputTokens'] for r in b),'大脑输出':sum(r['usage']['outputTokens'] for r in b),'大脑缓存':sum(r['usage'].get('cacheHitTokens',0) for r in b),'时长秒':(datetime.datetime.fromisoformat(d[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(d[0]['ts'].replace('Z','+00:00'))).total_seconds()}
metrics['缓存百分比']=round(100*metrics['大脑缓存']/metrics['大脑输入'],2);metrics['推演最优百分比']=round(100*metrics['推演最优']/metrics['推演标记分母'],2)
guards=[];focus=[]
for r in d:
 if 'HP guard:' in r['rationale']:
  cs={k:json.loads(v) for k,v in r['questions']['plan']['criteria'].items()}
  m=re.search(r'HP guard: plan (\d+).*playing plan (\d+)',r['rationale']);old,new=[cs['plan'+x] for x in m.groups()]
  guards.append({'行':r['_line'],'尝试':r.get('sl_reloads',0)+1,'轮':r['turn'],'旧':{k:old.get(k) for k in ['plays','hp_lost','damage_dealt','potions_used']},'新':{k:new.get(k) for k in ['plays','hp_lost','damage_dealt','potions_used']},'后被SL覆盖':'SL explore' in r['rationale']})
 if r['decider']=='jev':
  cs={}
  for q in r.get('questions',{}).values():
   for k,v in q.get('criteria',{}).items():
    try:cs[k]=json.loads(v)
    except (ValueError,TypeError):continue
  if any(c.get('focus') for c in cs.values() if isinstance(c,dict)):
   choice=(r.get('answers',{}).get('plan') or {}).get('choice')
   focus.append({'行':r['_line'],'层':r['floor'],'轮':r['turn'],'给定focus':{k:c['focus'] for k,c in cs.items() if c.get('focus')},'原选':choice,'原选focus':cs.get(choice,{}).get('focus')})
metrics['护栏说明']=len(guards);metrics['SL撤护栏']=sum(x['后被SL覆盖'] for x in guards);metrics['生效护栏']=len(guards)-metrics['SL撤护栏'];metrics['候选省血总']=sum(x['旧']['hp_lost']-x['新']['hp_lost'] for x in guards);metrics['候选少伤总']=sum(x['旧']['damage_dealt']-x['新']['damage_dealt'] for x in guards);metrics['保留护栏省血候选']=sum(x['旧']['hp_lost']-x['新']['hp_lost'] for x in guards if not x['后被SL覆盖']);metrics['保留护栏少伤候选']=sum(x['旧']['damage_dealt']-x['新']['damage_dealt'] for x in guards if not x['后被SL覆盖'])
for c in res['combats']:
 c['人工核实结果']='胜利' if c['sequence']<=5 else '判死截断' if c['sequence']<=10 else '实际死亡'
 c['饮用']=[{'decision_line':r['_line'],'ts':r['ts'],'turn':r['turn'],'slot':r['chosen']['option_index'],'rationale':r['rationale']} for r in d if (r.get('chosen') or {}).get('action')=='use_potion' and r['floor']==c['floor'] and r.get('sl_reloads',0)==max(0,c['sequence']-6)]
metrics['focus题数']=len(focus);metrics['原选focus']=sum(bool(x['原选focus']) for x in focus)
(p/'numbers.json').write_text(json.dumps({'metrics':metrics,'guards':guards,'focus':focus},ensure_ascii=False,indent=2)+'\n')
(p/'resources-final.json').write_text(json.dumps(res,ensure_ascii=False,indent=2)+'\n')
print(metrics);print('护栏',guards);print('focus',focus)
print('路线投影对象')
for r in d:
 if r['label'] in ['map/route-plan','rest/plan']:
  for k in ['route_plan','route','route_change','deepseek','journal','chosen']:
   if k in r and k!='deepseek': print(r['_line'],k,str(r[k])[:2500])
print('牌名字')
for row in s:
 if row['_line'] in [291351,291384,291411,291437,291474,291506,291790,291791]:
  st=row['state'];print(row['_line'],'run keys',list(st['run']),'enemy names',[(x.get('name'),x.get('enemy_id')) for x in (st.get('combat') or {}).get('enemies',[])])
