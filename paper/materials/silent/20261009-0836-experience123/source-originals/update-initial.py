import collections
import copy
import json
import subprocess
from pathlib import Path

O=Path(__file__).parent.resolve()
W=O.parents[2]
N='RZ6YAC7K89NM'
A=json.load(open(O/'audit.json'))
E=json.load(open(O/'experience-before.json'))
B=copy.deepcopy(E)
M={e['id']:e for e in E['entries']}
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
changes=[]
mapping={}
day=subprocess.check_output(['date','+%Y-%m-%d'],text=True).strip()

def update(ident,text,lids):
    e=M[ident]
    before=copy.deepcopy(e)
    assert N not in e['evidence']
    e['evidence'].append(N)
    e['n_support']=len(e['evidence'])
    e['n_contradict']=len(e.get('contradicting',[]))
    n,c=e['n_support'],e['n_contradict']
    e['confidence']='high' if n>=5 and c<=n/3 else 'med' if n>=2 else 'low'
    e['last_seen']=max(e['last_seen'],'2026-10-09')
    e['lesson']=text.replace('{n}',str(n))
    changes.append(dict(id=ident,before=before,after=copy.deepcopy(e)))
    mapping[ident]=lids

rest=json.load(open(O/'rest-summary.json'))[-1]
band=next(r for r in A['bands'] if (r['asc'],r['act'],r['type'],r['band'])==(10,1,'Monster','<25%'))
update('silent-route-hp-observation',f'观察：赢战仍耗血药，问号另算，未来火/餐券不预支。A10 {rest["runs"]}局一幕Monster入口<25%共{band["n"]}房/{band["runs"]}局、{band["deaths"]}死（{100*band["deaths"]/band["n"]:.2f}%），活损中位{band["median_win"]}；各阶/幕/房型见报告（n={{n}}）。典型案例：CSLHFCBSC1UM三火后64血仍boss六败；RZ6YAC7K89NM F7回30→51，F8/F9两胜耗能力药且损13/29，F10/F11不回血、9/70进F12死；F7后至下一火无别线，未到F13火/F15商店。无改线/留药受控胜果，不立安全血线。',['silent-0019'])
update('silent-rest-buffer-observation',f'观察：回血增加即时缓冲，锻造不回血，不能保证后战。A10 {rest["runs"]}局{rest["rests"]}独立火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{100*rest["deaths"]/rest["nexts"]:.2f}%），活损中位{rest["median"]}；各阶另列（n={{n}}）。典型案例：KSX97DF5H3NY回54后两强制战败；RZ6YAC7K89NM唯一F7回21、无锻造，初56＋21−六胜净损68＝末战9；回血后F8赢损13，再F9赢损29到9，未活到下一火。boss模拟17%/投影62包含未来两火条件，不当下一走廊胜率；无回血/锻造整战受控对照。',['silent-0020'])
update('silent-deck-burst-observation','观察：计划组件、实建能力、可支付后续与已结本体进度分核。机制：毒层不是即时伤，存活轮与费用约束兑现；护栏重问不重复计价。搭配：持续输出与实挡同核，未得能力/未来挡不预支。决定胜负的战斗：{n}支持/0反例，整战单因未控（n={n}）。典型案例：WZL2AMEY85S7三雾仍败；RZ6YAC7K89NM F6T1护栏题面省9血少12伤、替线实零损9伤，原线未实打；F12四轮净扣85余6，清91需22.75/轮仅事后预算。T3毒杀钙化取消13攻，T4未来4挡未兑现、4血9挡对15仍死；计划毒雾/触媒未得。',['silent-0021','silent-0125'])
update('silent-footwork-block','步法普通/升级建2/3敏捷，后续每张挡牌加敏，已有挡不追补。机制：基础挡加现场敏后核倍率/脆弱，被动挡另源，换战重建。搭配：多挡重复收益，牌数/能量须可用，仍核敌成长。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：PBUBM0LRTEDD神化3敏/暗影后空翻22挡；RZ6YAC7K89NM A10 F8能力药生成步法建2敏，T3两防御7/7＋生存者10＝24，比基础18多6、覆盖20攻零损；F9敏捷清。F12永久步法T3未打，不能由持有算已建或认应先打。',['silent-0005'])
update('silent-strength-weak-observation','力量逐击加伤、敏捷逐张加牌挡，临时层/弱/易伤按现场分核。机制：基础加属性后核倍率，毒/被动挡另源；仪式按现场层数增力，弱不关闭成长。搭配：多击/多挡重复收益仍核当前血价。决定胜负的战斗：{n}支持/0反例，整战单因未控（n={n}）。典型案例：LYBHQ1X230ZB四段1力多4伤；RZ6YAC7K89NM A10 F12钙化/潮湿仪式2/6、T3力2/6，潮湿T2—T4无弱同招3/9/15对应力0/6/12；T1中和的1弱不阻后续成长，T3杀钙化后潮湿仍长力。末5毒不斩杀、4血9挡对15死；本局玩家无正力。',['silent-0006','silent-0012','silent-0083'])
update('silent-bouncing-flask-poison','弹跳药瓶按实际次数、分配与毒结算兑现，多敌不保证指定目标收尾。机制：普通3毒×3次、升级3毒×4次；制品逐次阻毒，施毒不即时伤，总伤吻合不验证逐敌进度。搭配：持续毒/蜃景分核总毒与目标剩血，随机未发生不预定。决定胜负的战斗：{n}支持/0反例，单牌整战胜因未控（n={n}）。典型案例：G8NHLL09DLBX随机毒未终结母体；RZ6YAC7K89NM A10 F12T1实分钙化6/潮湿3、次轮23/36血余5/2毒，题报29/30血及潮湿8毒，总扣均32、两体各差6；本轮非确定斩杀，缺另一分配整战对照。',['silent-0007'])
update('silent-deadly-poison-application','致命毒药普通/升级施5/7毒，不即时扣血。机制：实结按当前毒再减1，制品/头骨/触媒/阶段另核，过量毒按剩血截断。搭配：补层与存活结算合核，不预支免攻。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：KSX97DF5H3NY毒10只计6剩血；RZ6YAC7K89NM A10 F12T2普通毒药使潮湿2→7毒、本体36当步不变，结束实扣7到29；末T4已有5毒仅11→6而玩家死，施毒成功不等已击杀。',['silent-0007'])
update('silent-poisoned-stab-components','带毒刺击直伤、施毒和本方失血分列，尚存毒不当已伤。机制：普通/升级基础6/8伤与3/4毒，力/弱/易伤改攻击，制品可阻毒；触媒/无实体/剩血另核。搭配：实结毒可清残血敌取消其攻击，仍核其他活敌。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：CSLHFCBSC1UM负2力刺击只扣挡4、仍加3毒；RZ6YAC7K89NM A10 F12T3刺击使钙化12→6血、4→7毒，结束毒杀取消13攻，剩潮湿9攻−5挡实损4；T4潮湿未被5毒杀掉仍15攻致死，不把总毒当全场免攻。',['silent-0030'])
fort=[x for x in A['potions'] if (x.get('potion') or {}).get('id')=='FORTIFIER']
update('silent-fortifier-existing-block-triple',f'固化把饮用时已持有的格挡变为三倍，不预支后轮挡。机制：{len(set(x["run"] for x in fort))}局{len(fort)}饮已见B→3B，当步增2B；敏捷在此前牌挡形成时另算，未饮/过轮不留潜在收益。搭配：真实已有挡与当前攻击合核，不由药名定先喝/留药。决定胜负的战斗：{{n}}支持/0反例，独立单药整战胜因未控（n={{n}}）。典型案例：BJLTVSYXCSGS墨影11→33；RZ6YAC7K89NM A10 F6T3已有5饮后15、当步32血不变，该轮零损、整战38→30仍损8；F6T1两候选均不饮，未实打早饮或留药后场，不定时点。',['silent-0225'])

roll=json.load(open(O/'delayed-block-history.json'))
n=len(roll['evidence'])
entry=dict(id='silent-dodge-and-roll-delayed-block',scope='card:DODGE_AND_ROLL',name='闪躲翻滚',asc=[0,20],lesson=f'闪躲翻滚的当轮挡与已建立的下轮挡分开算，未活到下轮不能预支。机制：按实际BLOCK_NEXT_TURN_POWER层数核延后份，敏捷/脆弱/首挡倍率与重复触发另核，不把两轮合为当前挡。搭配：当轮其他挡覆盖眼前攻，延后份只在活到后轮兑现。决定胜负的战斗：{n}支持/0反例，单牌整战胜因未控（n={n}）。典型案例：1NZ8FE5F34R9负1敏升级翻滚实挡5并建下轮5；RZ6YAC7K89NM A10 F12T4普通翻滚当轮4/下轮4，再防御5合当前9，4血对15需损6阵亡，未有下一轮，不算13挡。',evidence=roll['evidence'],n_support=n,n_contradict=0,confidence='high' if n>=5 else 'med' if n>=2 else 'low',last_seen='2026-10-09',status='active')
assert entry['id'] not in M
E['entries'].append(entry)
changes.append(dict(id=entry['id'],before=None,after=copy.deepcopy(entry)))
mapping[entry['id']]=[]
E['version']=day+'.12'
E['_about']=f'静默经验只从本角色实盘与复盘学习。第123次增量并RZ6YAC7K89NM A10，截至{A["cutoff"]}共{len(R)}完局；旧158局七数组/血档/节点/回血/SL同口径复算。补药生成步法的敏捷逐挡、敌仪式成长、随机毒逐敌预算、施毒实结、固化已有挡及翻滚延后挡；六勝耗血药与未到火/餐券分账。缺护栏原线、毒另一分配、留药/改线受控整战，不拟新阈值/药价；源码交独立strategy-proposal。'.replace('六勝','六胜')
for e in E['entries']:
    if e['status']!='active':continue
    assert e['n_support']==len(set(e['evidence']))
    assert e['n_contradict']==len(set(e.get('contradicting',[])))
    assert all(R[r]['character'].lower()=='silent' for r in e['evidence']+e.get('contradicting',[]))
    assert e['scope'].split(':')[0] in ['boss','elite','hallway','act','general','card','relic','potion','event']
    if e['scope'].split(':')[0] in ['card','relic','potion','event']:assert e.get('name')

def stats(data):
    a=[x for x in data['entries'] if x['status']=='active']
    return dict(active=len(a),chars=sum(len(x['lesson']) for x in a),confidence=dict(collections.Counter(x['confidence'] for x in a)),applicable={str(n):dict(entries=len(z:=[x for x in a if x['asc'][0]<=n<=x['asc'][1]]),chars=sum(len(x['lesson']) for x in z)) for n in [8,9,10]})

assert stats(E)['chars']<=60000
assert len(changes)==10
(W/'knowledge/characters/silent/experience.json').write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(dict(entries=changes),ensure_ascii=False,indent=2)+'\n')
(O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
(O/'update-summary.json').write_text(json.dumps(dict(added=1,updated=9,retired=0,before=stats(B),after=stats(E)),ensure_ascii=False,indent=2)+'\n')
print(json.dumps(json.load(open(O/'update-summary.json')),ensure_ascii=False))
