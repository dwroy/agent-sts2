import json,pathlib,re,hashlib,collections
p=pathlib.Path(__file__).parent;root=p.parents[2];checks=[]
def check(name,got,want):
 if got!=want:raise AssertionError((name,got,want))
 checks.append({'item':name,'observed':got,'expected':want})
for name in ['decisions','states','plans','sl']:
 source={'plans':'run-plans','sl':'sl-attempts'}.get(name,name)
 n=0
 with (root/'logs'/(source+'.jsonl')).open('rb') as h:
  for line in (p/(name+'-indexed.txt')).open('rb'):
   ln,b,raw=line.split(b':',2);h.seek(int(b));check(name+'原字节'+ln.decode(),h.readline()==raw,True);n+=1
 check(name+'条数',n,{'decisions':981,'states':1059,'plans':9,'sl':11}[name])
d={r['_line']:r for r in json.loads((p/'decisions.json').read_text())};s={r['_line']:r['state'] for r in json.loads((p/'states.json').read_text())};sl={r['_line']:r for r in json.loads((p/'sl.json').read_text())}
def hp(n):return [s[n]['run']['current_hp'],s[n]['run']['max_hp']]
def powers(n):return {r['power_id']:r['amount'] for r in s[n]['combat']['player']['powers']}
def enemy(n,k):return next(e for e in s[n]['combat']['enemies'] if e['enemy_id']==k)
for n,v in [(320767,[51,75]),(320824,[45,80]),(320860,[72,85]),(321122,[90,90]),(321275,[94,95]),(321359,[100,100]),(321563,[13,100]),(321565,[13,100]),(321678,[11,100]),(321684,[1,100]),(321690,[1,100]),(321691,[0,100])]:check('s'+str(n)+'血量',hp(n),v)
for n in [321565,321584,321607,321630,321646,321668]:check('F49入口石头'+str(n),[[a['index'],a['potion_id']] for a in s[n]['run']['potions'] if a['occupied']],[[0,'POTION_SHAPED_ROCK']])
check('终局女王',enemy(321691,'QUEEN')['current_hp'],349);check('终局聚合体',enemy(321691,'TORCH_HEAD_AMALGAM')['current_hp'],133)
check('死亡意图',sum(i.get('total_damage') or 0 for i in enemy(321690,'TORCH_HEAD_AMALGAM')['intents']),19)
check('末试判官6挡','19 incoming vs 1 HP + 0 block + 6 end-of-turn block' in sl[1362]['judge']['reason'],True)
check('T2预计损血',json.loads(d[313190]['questions']['plan']['criteria']['plan3'])['hp_lost'],10)
check('T2预计伤害',json.loads(d[313190]['questions']['plan']['criteria']['plan3'])['damage_dealt'],20)
check('T2实际净清',sum(e['current_hp'] for e in s[321678]['combat']['enemies'])-sum(e['current_hp'] for e in s[321684]['combat']['enemies']),23)
check('T3实际挡',s[321686]['combat']['player']['block'],31)
check('T3反伤含毒净清',sum(e['current_hp'] for e in s[321684]['combat']['enemies'])-sum(e['current_hp'] for e in s[321687]['combat']['enemies']),31)
check('科学敏捷1→3',[powers(321682)['DEXTERITY_POWER'],powers(321683)['DEXTERITY_POWER']],[1,3]);check('科学力量',powers(321683)['STRENGTH_POWER'],2)
check('步法敏捷3→5',[powers(321687)['DEXTERITY_POWER'],powers(321688)['DEXTERITY_POWER']],[3,5])
check('女王99三减益',[powers(321684)[k] for k in ['WEAK_POWER','FRAIL_POWER','VULNERABLE_POWER']],[99,99,99])
check('末轮98三减益',[powers(321690)[k] for k in ['WEAK_POWER','FRAIL_POWER','VULNERABLE_POWER']],[98,98,98])
check('石头女王400→385',[enemy(321676,'QUEEN')['current_hp'],enemy(321677,'QUEEN')['current_hp']],[400,385])
check('末试手中凋萎15',next(c for c in s[321561]['combat']['hand'] if c['card_id']=='WITHER')['dynamic_values'][0]['current_value'],15)
check('毒62敌32',[next(x['amount'] for x in enemy(321561,'AEONGLASS')['powers'] if x['power_id']=='POISON_POWER'),enemy(321561,'AEONGLASS')['current_hp']],[62,32])
check('护栏4',len([r for r in d.values() if 'HP guard:' in r['rationale']]),4)
for n,keys,vals in [(312975,['plan6','plan1'],[16,0,8,0]),(312981,['plan3','plan1'],[21,9,7,0]),(313020,['plan6','plan1'],[16,0,8,0]),(313087,['plan2','plan4'],[10,2,17,17])]:
 a,b=[json.loads(d[n]['questions']['plan']['criteria'][k]) for k in keys];check('护栏题面'+str(n),[a['hp_lost'],b['hp_lost'],a['damage_dealt'],b['damage_dealt']],vals)
check('成功使用21',sum(r['chosen']['action']=='use_potion' and r['result'].startswith(('completed','pending')) for r in d.values()),21)
check('未下发药水1',sum(r['chosen']['action']=='use_potion' and r['result'].startswith('not dispatched') for r in d.values()),1)
check('丢弃0',sum(r['chosen']['action']=='discard_potion' for r in d.values()),0)
check('低信心47',sum(r['decider']=='jev' and r.get('confidence') is not None and r['confidence']<.35 for r in d.values()),47)
check('F49错误诊断11',sum(r['floor']==49 and 'no end-of-turn block' in r['rationale'] for r in d.values()),11)
check('50脑调用',sum(r['decider']=='codex' and r.get('usage',{}).get('input_tokens',0)>0 for r in d.values()),50)
check('最终牌数',len(s[321691]['run']['deck']),33)
check('首boss双战已知','F48→F49' in d[312923]['questions']['pick']['instructions'],True)
(p/'verification-before-append.json').write_text(json.dumps({'checks':checks,'total':len(checks),'passed':True},ensure_ascii=False,indent=2))
print('核验通过',len(checks),'项')
