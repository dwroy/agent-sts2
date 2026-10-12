import json,collections,datetime
from pathlib import Path
P=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-034303-postmortem')
def rows(name):
 out=[]
 for z in (P/(name+'.lines')).open():
  n,l=z.split(':',1);x=json.loads(l);x['_line']=int(n);out.append(x)
 return out
D=rows('decisions');S=rows('states');B=rows('brain')
with (P/'numbers.txt').open('w') as o:
 def emit(*v):print(*v,file=o)
 emit('大脑输入输出缓存', {k:sum((x.get('usage') or {}).get(k,0) or 0 for x in B) for k in ['input_tokens','output_tokens','cache_hit_tokens']})
 emit('大脑',[(x['_line'],x['label'],x.get('accepted'),x.get('usage')) for x in B if x['label']=='run-plan'])
 for decider in ['jev','codex','code']:
  xs=[x for x in D if x['decider']==decider];emit('决策用量',decider,{k:sum((x.get('usage') or {}).get(k,0) or 0 for x in xs) for k in ['input_tokens','output_tokens','cache_hit_tokens']})
 emit('低信心',[(x['_line'],x['floor'],x['turn'],x['label'],x['confidence']) for x in D if x['decider']=='jev' and isinstance(x.get('confidence'),(float,int)) and x['confidence']<.35])
 cps=[x for x in D if x['decider']=='code' and x['label'] in ['combat/plan','combat/lethal','combat/least-loss','combat/plan-guarded','combat/mod-lethal']]
 emit('代码自主',len(cps),dict(collections.Counter(x['label'] for x in cps)),len({(x['floor'],x['turn']) for x in cps}),sorted({(x['floor'],x['turn']) for x in cps}))
 forced=[x for x in D if x['decider']=='code' and (x.get('chosen') or {}).get('action')=='end_turn' and x not in cps];emit('其他代码结束',[(x['_line'],x['floor'],x['turn'],x['label']) for x in forced])
 for f in [2,17,29,30,31]:
  emit('战斗推演',f,collections.Counter(x['rollout_best_chosen'] for x in D if x['floor']==f and type(x.get('rollout_best_chosen')) is bool))
  sx=[x for x in S if x['state'].get('run',{}).get('floor')==f and x['state'].get('in_combat')]
  turns=collections.defaultdict(list)
  for x in sx:turns[x['state'].get('turn')].append(x)
  for t,arr in turns.items():
   a,b=arr[0],arr[-1];c=b['state']['combat'];emit('回合',f,t,'首末帧',a['_line'],b['_line'],'手牌末',[(v['card_id'],v.get('resolved_rules_text')) for v in c.get('hand',[])])
   start=a['state']['combat'].get('enemies',[]);end=c.get('enemies',[]);emit('敌HP',[(v['enemy_id'],v['current_hp']) for v in start],[(v['enemy_id'],v['current_hp']) for v in end])
  for x in D:
   if x['floor']==f and x['decider']=='jev' and x['label'].startswith('combat/'):
    q=x.get('questions',{}).get('plan',{}).get('criteria',{});ch=x.get('answers',{}).get('plan',{}).get('choice');v=json.loads(q[ch]) if ch in q else {};emit('预测',x['_line'],f,x['turn'],ch,{k:v.get(k) for k in ['hp_lost','damage_dealt','block_gained','enemies_after']},'焦点',x.get('focus'))
 for x in B:
  if x['_line'] in [9510,9517,9524,9527,9533,9536,9538]:
   emit('脑',x['_line'],x['label'])
   for k in ['run_brief','situation','route_review','act_route']:
    if k in x['payload']:emit(k,json.dumps(x['payload'][k],ensure_ascii=False))
   facts=x['payload'].get('facts') or {};emit('bossclock',json.dumps(facts.get('act_boss_clock'),ensure_ascii=False));emit('bosssim',json.dumps(facts.get('act_boss_sim'),ensure_ascii=False))
   if x['_line']==9510:emit('routemap',json.dumps(x['payload'].get('route_map'),ensure_ascii=False))
 emit('药水决策',[(x['_line'],x['floor'],x['turn'],x['label'],x.get('expect'),x.get('journal')) for x in D if (x.get('chosen') or {}).get('action') in ['use_potion','discard_potion','claim_reward','buy_potion'] and ((x.get('chosen') or {}).get('action')!='claim_reward' or 'potion' in str(x.get('expect')))])
 emit('首末决策秒',(datetime.datetime.fromisoformat(D[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(D[0]['ts'].replace('Z','+00:00'))).total_seconds())
 emit('首观测到结束秒',(datetime.datetime.fromisoformat(D[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(D[0]['observed_ts'].replace('Z','+00:00'))).total_seconds())
print('数字摘要已保存')
