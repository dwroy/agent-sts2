import json
from pathlib import Path
p=Path(__file__).parent;S=[json.loads(x) for x in (p/'states.jsonl').open()];D=[json.loads(x) for x in (p/'decisions.jsonl').open()];ss={x['_source']['line']:x['state'] for x in S};ds={x['_source']['line']:x for x in D};checks=[]
def ck(name,actual,expected):
 assert actual==expected,(name,actual,expected)
 checks.append({'项':name,'实值':actual})
def hp(n):return ss[n]['run']['current_hp']
def enemy(n):return ss[n]['combat']['enemies'][0]
def powr(n,id,who='player'):
 data=ss[n]['combat']['player'] if who=='player' else enemy(n)
 return next((x['amount'] for x in data['powers'] if x['power_id']==id),0)
ck('抽取条数',[len(D),len(S)],[706,752]);ck('实际脑请求',sum(d.get('deepseek',{}).get('brain',{}).get('engine')=='codex' for d in D),41)
ck('终战逐轮HP',[hp(n) for n in [319015,319022,319029,319034,319039,319045,319051]],[68,50,32,32,10,3,0])
ck('终战逐轮敌HP',[enemy(n)['current_hp'] for n in [319014,319015,319022,319029,319034,319039,319045,319051]],[254,245,197,186,160,145,112,40])
ck('终战药前后毒',[powr(n,'POISON_POWER','enemy') for n in [319049,319050,319051]],[22,28,27]);ck('末轮尖啸攻击',[sum(x.get('total_damage') or 0 for x in enemy(n)['intents']) for n in [319046,319047,319050]],[21,17,17])
ck('药水无即时伤',[enemy(n)['current_hp'] for n in [319049,319050]],[68,68]);ck('步法敏捷',[powr(n,'DEXTERITY_POWER') for n in [319018,319024]],[3,5]);ck('双毒雾',[powr(n,'NOXIOUS_FUMES_POWER') for n in [319021,319037]],[3,6]);ck('末轮减力',[powr(n,'STRENGTH_POWER','enemy') for n in [319046,319047]],[-2,-8]);ck('末轮存活差',17+1-hp(319045),15)
ck('护栏HP',[hp(n) for n in [318837,318841]],[70,67]);ck('护栏敌HP',[enemy(n)['current_hp'] for n in [318837,318841]],[379,367]);plans={k:json.loads(v) for k,v in ds[310567]['questions']['plan']['criteria'].items()};ck('护栏方案',[plans[k][a] for k,a in [('plan2','hp_lost'),('plan1','hp_lost'),('plan2','damage_dealt'),('plan1','damage_dealt')]],[13,3,20,12])
ck('F42到恢复链',[hp(n) for n in [318978,318991,318997,319000,319001,319006,319007,319014]],[50,24,18,18,30,51,68,68])
ck('F12再生',[hp(n) for n in [318468,318474,318478,318486,318495]],[9,13,17,7,9]);ck('F12回血与损血净',5+4+3+2-1-13,0)
ck('SL首试末态',[hp(318831),enemy(318831)['current_hp'],powr(318831,'POISON_POWER','enemy')],[8,135,34]);ck('SL恢复',[hp(318832),[(x['index'],x['potion_id']) for x in ss[318832]['run']['potions'] if x.get('occupied')]],[70,[(1,'POISON_POTION')]])
ck('F33T14时点',[enemy(n)['current_hp'] for n in [318904,318905]],[44,44]);ck('F33T14毒',[powr(n,'POISON_POWER','enemy') for n in [318904,318905]],[41,47]);ck('F33T14无出牌',ds[310621]['chosen']['action'],'end_turn');ck('F33获胜HP',hp(318906),3)
ck('牌组',[len(S[-1]['state']['run']['deck']),sum(bool(x.get('upgraded')) for x in S[-1]['state']['run']['deck'])],[38,10])
P=[d for d in D if d['decider']=='jev' and 'plan-choice' in d['label']];ck('最优题数',[len(P),sum(d.get('rollout_best_chosen') is True for d in P),sum(isinstance(d.get('rollout_best_chosen'),bool) for d in P)],[169,158,166]);ck('低信心',sum(d['decider']=='jev' and isinstance(d.get('confidence'),(float,int)) and d['confidence']<.35 for d in D),23)
ck('饮药动作数',sum(d.get('chosen',{}).get('action')=='use_potion' for d in D),10)
ck('护栏次数',sum('HP guard:' in d.get('rationale','') for d in D),1)
(p/'numbers-checked.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n');print('关键数字核验通过',len(checks))
