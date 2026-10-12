import json,collections,datetime,re
from pathlib import Path
p=Path(__file__).parent
s=[json.loads(l) for l in (p/'states.jsonl').open()];d=[json.loads(l) for l in (p/'decisions.jsonl').open()];r=json.loads((p/'KSX97DF5H3NY-resources.json').read_text());run=json.loads(next((p/'runs.jsonl').open()))
sb={x['_line']:x['state'] for x in s};db={x['_line']:x for x in d};checks=[]
def check(name,actual,expected):
 checks.append({'项':name,'实值':actual,'文稿值':expected,'一致':actual==expected})
 assert actual==expected,(name,actual,expected)
check('角色',run['character'].lower(),'silent');check('进阶',run['ascension'],10);check('终层',run['floor'],31);check('源码',run['code'],'3cadc990+dirty')
check('决策数',len(d),517);check('状态数',len(s),544);check('战斗窗口数',len(r['combats']),19)
check('各窗口入HP',[c['entry']['hp'] for c in r['combats']],[56,56,56,55,53,50,70,69,69,63,53,48,41,29,54,19,19,19,19])
check('全部最大HP',sorted({x['state']['run']['max_hp'] for x in s}),[70])
check('前15赢房净损合',sum(c['observed_net_hp_loss'] for c in r['combats'][:15]),179)
check('终战HP挡',[sb[314122]['run']['current_hp'],sb[314122]['combat']['player']['block']],[1,13])
check('终战结束前攻击',sum(i.get('total_damage') or 0 for e in sb[314122]['combat']['enemies'] for i in e['intents']),45)
check('死亡敌血',[e['current_hp'] for e in sb[314123]['combat']['enemies']],[15,8,26])
check('T5完整预算需损',45-13,32);check('最少缺血',32+1-sb[314122]['run']['current_hp'],32)
for f,need,loss,hpl in [(8,[90,83,71,33,22],[7,12,38,11,22],[6,10,15,8,0]),(17,[262,251,225,190,157,119,97,62,21],[11,26,35,33,38,22,35,41,21],[0,4,6,0,0,12,9,0,0]),(30,[178,148,127,89,89,50,38,6],[30,21,38,0,39,12,32,6],[0,0,0,2,12,12,9,0])]:
 c=next(c for c in r['combats'] if c['floor']==f);first={}
 for x in s:
  if c['entry']['line']<=x['_line']<=c['last']['line'] and (x['state'].get('combat')or{}).get('player',{}).get('energy',0)>0:first.setdefault(x['state']['turn'],x['state'])
 a=list(first.values());b=a[1:]+[sb[c['exit']['line']]]
 def hp(st):return sum(e['current_hp'] for e in (st.get('combat')or{}).get('enemies',[]) if e['is_alive'])
 check('F'+str(f)+'各轮需',list(map(hp,a)),need);check('F'+str(f)+'各轮净扣',[hp(x)-hp(y) for x,y in zip(a,b)],loss);check('F'+str(f)+'各轮玩家净损',[x['run']['current_hp']-y['run']['current_hp'] for x,y in zip(a,b)],hpl)
for c,loss,hpl in zip(r['combats'][15:],[[52,0,7,21,0],[45,27,5,16,0],[45,27,5,16,0],[45,27,5,16,8]],[[0,3,0,10,0],[0,8,0,10,0],[0,14,0,0,0],[0,8,0,10,1]]):
 first={}
 for x in s:
  if c['entry']['line']<=x['_line']<=c['last']['line'] and (x['state'].get('combat')or{}).get('player',{}).get('energy',0)>0:first.setdefault(x['state']['turn'],x['state'])
 a=list(first.values());b=a[1:]+[sb[(c['exit']or c['last'])['line']]]
 def mom(st):return next(e['current_hp'] for e in st['combat']['enemies'] if e['enemy_id']=='OVICOPTER')
 check('F31窗口'+str(c['sequence'])+'母体各轮扣',[mom(x)-mom(y) for x,y in zip(a,b)],loss);check('F31窗口'+str(c['sequence'])+'玩家损',[x['run']['current_hp']-y['run']['current_hp'] for x,y in zip(a,b)],hpl)
for n in [306019,306043,306067]:
 v=json.loads(db[n]['questions']['plan']['criteria']['plan1']);check(str(n)+'预测母体','直飞产卵虫 44 HP, 中毒 10' in v['enemies_after'],True);check(str(n)+'样本24全赢','in 24/24' in v['rollout'],True)
for a,b,delta in [(314081,314082,[0,6,3]),(314107,314108,[0,3,3,3])]:
 def poison(st):return [next((z['amount'] for z in e['powers'] if z['power_id']=='POISON_POWER'),0) for e in st['combat']['enemies']]
 check(str(a)+'→'+str(b)+'药瓶逐体毒增',[y-x for x,y in zip(poison(sb[a]),poison(sb[b]))],delta)
check('HP护栏次数',sum('HP guard:' in x['rationale'] for x in d),1)
check('低信心',sum(x['decider']=='jev' and x.get('confidence',1)<.35 for x in d),10)
plans=[x for x in d if x['decider']=='jev' and x['label'].startswith('combat/')]
check('Jev选线数',len(plans),85);check('rank1数',sum(re.search(r'code rank 1(?:\D|$)',x['rationale']) is not None for x in plans),32)
check('记录推演最优',[sum(x.get('rollout_best_chosen') is True for x in plans),sum(x.get('rollout_best_chosen') is not None for x in plans)],[79,82])
t=collections.defaultdict(set)
for x in d:
 if x['label'].startswith('combat/') and x['label']!='combat/plan-continue':t[(x['floor'],x.get('sl_attempt'),x['turn'])].add(x['decider'])
check('自主回合口径',[len(t),sum(v=={'code'} for v in t.values()),sum(v=={'code','jev'} for v in t.values()),sum(v=={'jev'} for v in t.values())],[86,23,56,7])
check('承接Jev',sum('continuing the Jev-chosen plan:' in x['rationale'] for x in d),133)
check('实饮数',sum((x.get('chosen')or{}).get('action')=='use_potion' for x in d),9)
check('弃药数',sum((x.get('chosen')or{}).get('action')=='discard_potion' for x in d),0)
sl=[json.loads(l) for l in (p/'sl-attempts.jsonl').open() if json.loads(l)['floor']==31]
check('前三读档时长',[x['reload']['ms'] for x in sl[:3]],[6939,7677,7065])
check('抽序前30相同',all(x['draws']['order'][:30]==sl[0]['draws']['order'][:30] for x in sl),True)
check('首末用秒',(datetime.datetime.fromisoformat(d[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(d[0]['ts'].replace('Z','+00:00'))).total_seconds(),1513.612)
check('Jev输入输出',[sum(x.get('usage',{}).get('input_tokens',0) for x in d if x['decider']=='jev'),sum(x.get('usage',{}).get('output_tokens',0) for x in d if x['decider']=='jev')],[537492,5389])
check('脑输入输出缓存',[sum((x.get('deepseek')or{}).get(k,0) for x in d) for k in ['input_tokens','output_tokens','cache_hit_tokens']],[4030798,7979,2220800])
check('各层实饮槽',[[(x['floor']),x['turn'],x['chosen']['option_index']] for x in d if (x.get('chosen')or{}).get('action')=='use_potion'],[[2,1,0],[3,1,0],[5,4,0],[13,1,1],[14,1,0],[14,1,1],[21,1,0],[30,1,0],[30,3,1]])
(p/'numbers-checked.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
print('关键数字核验通过：'+str(len(checks))+'项')
