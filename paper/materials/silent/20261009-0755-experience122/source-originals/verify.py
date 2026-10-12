import json,hashlib
from pathlib import Path
p=Path(__file__).parent;s={r['_line']:r for r in map(json.loads,(p/'pm-states.jsonl').open())};d={r['_line']:r for r in map(json.loads,(p/'pm-decisions.jsonl').open())};res=json.loads((p/'pm-CSLHFCBSC1UM-resources.json').read_text());checks=[]
def check(name,value,want):
    assert value==want,(name,value,want)
    checks.append({'项':name,'核实值':value})
check('战斗段数',len(res['combats']),15)
check('九场胜出进离HP',[(c['floor'],c['entry']['hp'],c['exit']['hp'],c['observed_net_hp_loss']) for c in res['combats'][:9]],[(2,56,55,1),(3,55,55,0),(5,55,55,0),(6,55,39,16),(8,39,33,6),(11,54,41,13),(12,41,41,0),(14,62,62,0),(15,62,43,19)])
check('全场maxHP',{r['state']['run']['max_hp'] for r in s.values()},{70})
check('六次boss进血',[(c['entry']['hp'],c['entry']['potions']) for c in res['combats'][9:]],[(64,[])]*6)
check('前五次末态',[(c['last']['turn'],c['last']['hp'],c['exit']) for c in res['combats'][9:14]],[(10,2,None),(8,8,None),(8,8,None),(10,5,None),(10,8,None)])
for line,hp,block,enemy,poison in [(315848,10,0,72,16),(315852,10,6,72,16),(315853,0,0,56,15)]:
    st=s[line]['state'];c=st['combat'];e=c['enemies'][0];check('死亡帧'+str(line),(st['run']['current_hp'],c['player']['block'],e['current_hp'],next(x['amount'] for x in e['powers'] if x['power_id']=='POISON_POWER')),(hp,block,enemy,poison))
check('末次来攻',s[315852]['state']['combat']['enemies'][0]['intents'][0]['total_damage'],25)
check('同T2指纹',d[307445]['fingerprint'],d[307548]['fingerprint'])
for line,loss,damage in [(307445,16,33),(307548,16,33),(307630,5,32)]:
 r=d[line];o=json.loads(r['questions']['plan']['criteria'][r['answers']['plan']['choice']]);check('原答'+str(line),(o['hp_lost'],o['damage_dealt']),(loss,damage))
check('第四次替代方案',tuple(json.loads(d[307548]['questions']['plan']['criteria']['plan1'])[x] for x in ('hp_lost','damage_dealt')),(21,42))
check('末次T3替代方案',tuple(json.loads(d[307630]['questions']['plan']['criteria']['plan5'])[x] for x in ('hp_lost','damage_dealt')),(0,21))
check('HP护栏替换',sum('HP guard:' in r.get('rationale','') or 'over the HP guard bound' in r.get('rationale','') for r in d.values()),0)
check('饮药次数',sum(r['chosen']['action']=='use_potion' for r in d.values()),5)
check('丢药次数',sum(r['chosen']['action']=='discard_potion' for r in d.values()),0)
check('首试末敌血',s[315665]['state']['combat']['enemies'][0]['current_hp'],31)
check('末次T3重放挡',[s[n]['state']['combat']['player']['block'] for n in (315818,315819,315820)],[0,10,15])
check('末次负属性',[[(x['power_id'],x['amount']) for x in s[n]['state']['combat']['player']['powers']] for n in (315830,315848)],[[('STRENGTH_POWER',-2),('DEXTERITY_POWER',-2)],[('STRENGTH_POWER',-4),('DEXTERITY_POWER',-4)]])
check('全部决策',len(d),468)
js=[r for r in d.values() if r['decider']=='jev'];plan=[r for r in js if 'plan' in r.get('questions',{})];check('Jev统计',(len(js),len(plan),sum(r.get('rollout_best_chosen') is True for r in plan),sum(r.get('confidence',1)<.35 for r in js)),(89,78,70,11))
(p/'numbers-checked.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2,default=list)+'\n')
print('关键数字核验通过',len(checks))

actual=[json.loads(x) for x in (p/'CSLHFCBSC1UM/states.jsonl').open()]
prior=[{k:v for k,v in json.loads(x).items() if not k.startswith('_')} for x in (p/'pm-states.jsonl').open()]
assert actual==prior
print('新抽480帧与复盘原帧全部相等')
