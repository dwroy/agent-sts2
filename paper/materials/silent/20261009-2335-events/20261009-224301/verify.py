import json,collections,datetime,re,hashlib
from pathlib import Path
P=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-224302-postmortem');D=[json.loads(x)for x in(P/'decisions.jsonl').open()];S=[json.loads(x)for x in(P/'states.jsonl').open()];R=json.loads((P/'Q389KW7SVWKH-resources.json').read_text());sd={x['_line']:x['state']for x in S};checks=[]
def check(name,a,b):
 if a!=b:raise ValueError(f'{name}: {a!r} != {b!r}')
 checks.append({'项':name,'实际':a,'对照':b})
def hp(n):return sd[n]['run']['current_hp']
def combat(n):return sd[n].get('combat')or{}
def enemies(n):return combat(n).get('enemies',[])
def power(obj,k):return next((v['amount']for v in obj.get('powers',[])if v['power_id']==k),0)
check('抽取数',[len(D),len(S),sum(1 for _ in(P/'plans.jsonl').open()),sum(1 for _ in(P/'sl.jsonl').open())],[743,770,9,9])
check('原始决策行',[D[0]['_line'],D[-1]['_line']],[321754,322496]);check('资源窗口',len(R['combats']),22)
check('胜战',[c['exit']['screen']for c in R['combats'][:16]],['REWARD']*16);check('首回合',[c['entry_is_turn_one']for c in R['combats']],[True]*22)
check('六试进场',[(c['entry']['hp'],c['entry']['max_hp'],c['entry']['potions'])for c in R['combats'][16:]],[(64,70,[[0,'BOTTLED_POTENTIAL'],[1,'POWER_POTION']])]*6)
check('读档截断',[c['exit']for c in R['combats'][16:21]],[None]*5)
check('死亡末帧',(hp(331420),combat(331420)['player']['block'],enemies(331420)[0]['intents'][0]['total_damage'],hp(331421),enemies(331421)[0]['current_hp'],enemies(331421)[0]['max_hp'],enemies(331421)[0]['name']),(7,14,33,0,181,212,'实验体 #C72'))
check('死亡需损与缺口',[33-14,33-14-7+1],[19,13])
check('神化未建模候选',sum('神化+'in json.loads(v).get('unmodelled_cards','')for d in D for v in d.get('questions',{}).get('plan',{}).get('criteria',{}).values()),42)
check('末试改线',D[736]['sl_explore']['replacement'],'打击 -> 实验体 #C71, 防御, 打击 -> 实验体 #C71, 防御')
check('潜能前后',(combat(331418)['player']['energy'],combat(331419)['player']['energy'],hp(331418),hp(331419),combat(331418)['player']['block'],combat(331419)['player']['block'],enemies(331418)[0]['current_hp'],enemies(331419)[0]['current_hp']),(0,0,7,7,14,14,200,190))
check('两个MC死亡数',[(D[n-1]['potions']['random'][0]['dies'],D[n-1]['potions']['random'][0]['samples'])for n in(737,741)],[(31,36),(34,36)])
check('三次护栏',[d['_seq']for d in D if'HP guard:'in d['rationale']],[638,674,724])
for n in(638,674,724):
 q=D[n-1]['questions']['plan']['criteria'];a,b=json.loads(q['plan6']),json.loads(q['plan2']);check('护栏损伤-'+str(n),(a['hp_lost'],a['damage_dealt'],b['hp_lost'],b['damage_dealt']),(25,21,12,15))
check('末回血',[(hp(a),hp(b))for a,b in((331210,331211),(331219,331220),(331232,331233))],[(1,22),(22,43),(43,64)])
check('精灵出口',(hp(331068),hp(331069),hp(331070)),(18,0,21))
check('再生出口',[hp(n)for n in(331145,331146,331149,331153,331157,331158)],[46,51,49,34,12,13])
for floor,need,loss in [(17,[221,201,173,143,102,97,62,38],[20,28,30,41,5,35,24,38]),(25,[171,131,93,65,26],[40,38,28,39,26]),(33,[428,371,337,278,194,142,74,29],[57,34,59,84,52,68,45,29]),(35,[116,80,62,46,20,1],[36,18,16,26,19,1]),(37,[172,124,111,83,23],[48,13,28,60,23]),(38,[281,271,222,181,140,105,26],[10,49,41,41,35,79,26])]:
 c=next(c for c in R['combats']if c['floor']==floor);ts=c['enemy_hp_audit']['turns'];check('F'+str(floor)+'需',[t['live_enemy_hp_start']for t in ts],need);check('F'+str(floor)+'净扣',[t['net_live_enemy_hp_loss']for t in ts],loss)
needboss=[[111,85,69,51,212,176],[111,100,77,21,212],[111,85,69,51,212,176],[111,85,56],[111,94,79,76],[111,85,69,51,212]]
for i,c in enumerate(R['combats'][16:]):
 g={}
 for s in S:
  if c['entry']['line']<=s['_line']<=(c.get('exit')or c['last'])['line']:g.setdefault(s['state']['turn'],s)
 need=[sum(e['current_hp']for e in(s['state'].get('combat')or{}).get('enemies',[])if e['is_alive'])for s in g.values()];check('第'+str(i+1)+'試需',need,needboss[i])
check('主动饮用',sum(d['chosen'].get('action')=='use_potion'for d in D),22);check('弃药',sum(d['chosen'].get('action')=='discard_potion'for d in D),0)
gains=[(i,p)for e in R['resource_changes']if not e['restart_boundary']for i,p in e['to']['potions']if[i,p]not in e['from']['potions']];check('净新获瓶数',len(gains),13)
check('Jev次数及低信',(sum(d['decider']=='jev'for d in D),sum(d['decider']=='jev'and d['confidence']<.35 for d in D)),(161,21))
check('最佳',(sum('rollout_best_chosen'in d for d in D),sum(d.get('rollout_best_chosen')is True for d in D)),(144,133))
check('rank1',sum(re.search(r'code rank 1\b',d['rationale'])is not None for d in D if'rollout_best_chosen'in d),59)
check('fallback',sum(d.get('fallback')is True for d in D),0)
check('token', {k:sum((d.get('usage')or{}).get(k,0)or 0 for d in D)for k in('input_tokens','output_tokens','cache_hit_tokens')},{'input_tokens':7463297,'output_tokens':21983,'cache_hit_tokens':3472896})
check('脑token',{k:sum((d.get('deepseek')or{}).get(k,0)or 0 for d in D)for k in('input_tokens','output_tokens','cache_hit_tokens','latency_ms')},{'input_tokens':6465234,'output_tokens':13052,'cache_hit_tokens':3472896,'latency_ms':762331})
check('代码自主动作',sum(d['decider']=='code'and d['label'].startswith('combat/')and d['label']!='combat/plan-continue'for d in D),131)
check('代码自主回合',len({(d['sl_attempt'],d['floor'],d['turn'])for d in D if d['decider']=='code'and d['label'].startswith('combat/')and d['label']!='combat/plan-continue'}),92)
check('focus及order',[sum('focus'in d for d in D),sum('chosen_order'in d for d in D)],[25,17])
check('敌激怒',[power(enemies(n)[0],'STRENGTH_POWER')for n in(331394,331395,331405,331406,331407,331410,331412,331413,331414)],[3,6,6,9,12,15,15,15,0])
check('普通步法敏捷',power(combat(331413)['player'],'DEXTERITY_POWER'),2)
(P/'numeric-verification.json').write_text(json.dumps({'checks':checks,'count':len(checks),'result':'全部通过'},ensure_ascii=False,indent=2)+'\n');print('逐项核验通过',len(checks))
