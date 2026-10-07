import collections, copy, json, re
from pathlib import Path

O = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
FILE = ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'
RUN = 'P5HT1272P5SB'
B = json.load(open(O/'experience-before.json'))
E = copy.deepcopy(B)
A = json.load(open(O/'audit.json'))
R = {r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
by = {e['id']:e for e in E['entries']}
texts = {
'silent-footwork-block': '步法普通/升级建2/3敏捷，逐挡牌兑现，不追补已有挡。机制：基础挡加现场敏捷，再逐牌核脆弱；被动挡另算。搭配：多张挡牌重复获益，能力须实际建立。决定胜负的战斗：49支持局，局部收益不等整战胜因（n=49）。典型案例：TKXQ6L4N9A6U A10 F22 T4先给6挡后建3敏不追补；P5HT1272P5SB A10同族T15两防御加后空翻共24、比基础15多9，36攻击仍损12；末战T7同三牌24挡零损而本体伤害0。',
'silent-strength-weak-observation': '力量逐击增伤，敏捷逐挡牌增挡，虚弱逐击取整；独立成长不因当轮减伤停止。机制：多段收益按段数放大，被动、敌挡与实际掉血另核。搭配：实际力量/敏捷、攻击段数与可活轮一起验收。决定胜负的战斗：79支持局，各子公式及整战因果分账（n=79）。典型案例：QNTW139MGECA A10棱柱六攻击1力贡献6原始伤，扣22挡后实伤39。P5HT1272P5SB A10同族神官0/3/6/9力下三击9/18/27/36，T15的24挡仍损12；末战T8主怪20经虚弱为15、0挡损15，起航加力仍继续。',
'silent-gorget-plating': '护喉甲开场覆甲不等于整场固定格挡。机制：实见开场PLATING_POWER=4、后段耗尽；只观察层数，未隔离完整减层条件。搭配：覆甲、敏捷与卡牌格挡分别记，后段用现场层数。决定胜负的战斗：5支持局，后段不能预支已失覆甲，单遗物胜因未控（n=5）。典型案例：C48LLXBGKXQ9 A0沙虫末试T5覆甲已无、T11的2血26挡对32不足；P5HT1272P5SB A10末战T4防御8加剩1覆甲合9，对14损5，T5起覆甲0，不能再补开场4。',
'silent-abrasive-thorns-dexterity': '磨蚀的敏捷与逐击荆棘分别兑现，生成能力不等于已建立。机制：普通实建1敏捷/4荆棘，升级实建1/6；敏捷加到后续挡牌，不补旧挡；荆棘逐击反伤，全挡仍触发，无实体实见每击1。搭配：多张挡牌与多击分别放大收益，毒及过量截断另计。决定胜负的战斗：A0实验体SL胜、A10胧光问号败，单卡整战胜因未隔离（n=2）。典型案例：KAY522KT5NXR A0 F48/2 T5全挡四击反16加7毒，99→76；P5HT1272P5SB A10 F19三磨蚀+复制品实打、敏捷1→4/荆棘6→24；F25 T8富足生成后才施磨蚀+，共4敏捷/6荆棘，主怪动作后6反伤加3毒使40→31；T9荆棘6使幻象21→15，仍穿13挡杀3血。',
'silent-nightmare-next-turn-copies': '夜魇换来下一轮三张所选牌复制品，复制不等于施放或增益建立。机制：已见升级3→2费、选择后NIGHTMARE_POWER3、次轮加三张；复制保留蛇咬、突然一拳、毒药、磨蚀及富足；A7毒药复制品各7毒、不带原魂缚，不外推所有附魔继承。搭配：对象须选择时仍在手，次轮还须存活并实际支付；不能预支三牌收益。决定胜负的战斗：A7女王复制毒兑现，A10计划复制步法却实际复制富足，替对象整战未控（n=2）。典型案例：4Y94N8RDPGPM A7女王T10损23后T11两复制毒把聚合体13→27毒、先杀25血而零损，第三张给女王7毒；P5HT1272P5SB A10 F19 T1选磨蚀+、T2三复制品实际施放，1敏/6荆棘累到4敏/24荆棘、能量保持3，仅观察当时费用；F25 T1先施步法+再夜魇+，选择时步法已不在手、实际选富足；T2三复制品未施放，不计额外9敏捷或三次随机能力收益。',
'silent-fasten-defend-extra-block': '勒紧只增加“防御”牌的格挡，不作所有挡牌或已有挡的统一增量。机制：实建FASTEN_POWER4；防御先合基础/敏捷/勒紧，再核脆弱。搭配：步法的逐牌增量与勒紧的专属增量分开，爆发重复防御则两次兑现，后空翻不加勒紧。决定胜负的战斗：A7女王挡住35/25，A10 F31问号战双防御零损、胧光末轮仍死，单卡整战胜因未控（n=3）。典型案例：4Y94N8RDPGPM A7女王T12两防御各⌊(5+9+4)×0.75⌋=13、后空翻10；HSX4HYATB4E2 A10 F31 T2坚韧之环5加爆发双防御9+9合23，对17零损；P5HT1272P5SB A10 F25 T9原防御9、建立后13，对26需损13而仅3血。',
'silent-dowsing-rod-question-task': '寻龙尺的探寻是问号计数任务，不按即时找牌评价。机制：已见普通探寻不能打，进入5个问号后变富足；普通富足1费、消耗、三张升级能力选一入手且该轮免费，战内富足+实见0费；不外推升级任务计数。搭配：任务进度、生成、施放与实际增益分别核。决定胜负的战斗：3局任务完成与能力使用不同，路线和遗物胜因未隔离（n=3）。典型案例：2L1BNN9ZJEFU A6 F15完成；4ANT8D00TP72 A10 F22完成，沙虫首试生成毒雾+并建3、末试同牌未施而胜；P5HT1272P5SB A10 F14已成富足，F25 T8生成磨蚀+后实际施放才得1敏捷/6荆棘，T2三富足复制品未用不计三次生成收益。',
'silent-obscura-summon-growth': '观察：胧光主怪存活时幻象清零仍可复活，召唤血与本体伤害分账，不按开场单敌算后段。机制：实见21血寄生惧魔反复出现；起航后加力，多次加力放大撞击，幻象A10基伤{@10:DMG:PARAFRIGHT:SLAM_MOVE}须按现场力量/虚弱另核；不把起航规则移给雾菇。搭配：主怪已伤、幻象已伤、毒结算与来袭分别验收，不定统一击杀顺序。决定胜负的战斗：8局胧光加1局雾菇召唤观察，临时清召唤不等结束、目标顺序整战未控（n=9）。典型案例：8CFMW9SAGFWQ A6三次清幻象后仍复活，主怪余58而死；P5HT1272P5SB A10 F25三次清幻象后T4/5/9各回21，起航使力3/6/9、撞击20/23/26；毛需伤213、实扣本体106+幻象69=175、余38，T9的3血13挡仍死。',
'silent-expose-vulnerable': '暴露普通/升级均保留消耗，易伤与清挡/制品分别核。机制：已见易伤2/3、后续攻击核1.5倍；两局同一步清挡与全部制品，不拆重放内部顺序。搭配：消耗限制本战复用，后续攻击/施毒须实际兑现，窗口优势不等整战胜线。决定胜负的战斗：10支持局，清制品子证据仍2局0反例，单牌胜因未控（n=10）。典型案例：53FLQ68CETW0 A6沙漏首/六试T5重放暴露+使33挡/2制品→0/0、易伤6；HSX4HYATB4E2 A10第二试T2普通暴露清33挡/3制品、易伤2，随后毒9扣至483。P5HT1272P5SB A10 F24升级、F25 T2实际暴露+仍3易伤/消耗，随后施放且本战无第二次暴露，不计可复用收益。',
'silent-deck-burst-observation': '观察：计划中的能力组合按实际复制、建立和结算验收，不预支未来收益。机制：未取得/未支付的成长收益0；复制牌到手还不是施放，已建敏捷只增挡，不代替足额击杀。搭配：能量、抽序、选择时手牌、可活轮及敌成长一起核。决定胜负的战斗：78支持局，局部增益非整战胜因（n=78）。典型案例：T3FW7R2R2306 A10异鸟毒20加直接57仍缺13；P5HT1272P5SB A10计划夜魇复制步法，末战先施步法后复制富足，T2三复制品未用；T7三挡牌因3敏多9挡零损却伤0，三次清幻象后主怪仍余23而死。未选对象/替构筑未实打，不宣称必胜。',
}
fs=[f for f in A['fights'] if f['asc']==10]
rest=json.load(open(O/'rest-summary.json'))[-1]
gains=sum(rest['gains'])
assert len(A['runs'])==83 and len(A['fights'])==1256 and sum(x['death'] for x in A['fights'])==73
assert len(fs)==542 and sum(x['death'] for x in fs)==43
texts['silent-route-hp-observation'] = '观察：问号战血价与未来营火分别核，四火避精英不免当前战损。首COMBAT→同房末结算净损、实死/回复分账、Unknown不算Monster；83静默局1256房73死。A8一局25/0死、A9三局48/2死；A10 43局542房43死，二幕问号40–60%三房一死=33.33%、活损中位37.5，非安全线。典型案例：P5HT1272P5SB A10 F22事件付10、F23异螨损12，F24锻造后40/77，F25问号战损40而死、F27火未到；未选回血/替路线未实打，不推因果优劣（n=83）。'
texts['silent-rest-buffer-observation'] = f'观察：实际回血增加当前血池，未来火与boss投影不作下一战生命。A8一局9火8回血回111、后战7/0死；A9三局21火16回血回341、后战15/1死；A10 43局{rest["rests"]}火{rest["heal"]}回血/{rest["smith"]}非回血动作回{gains}，去重后战{rest["nexts"]}/{rest["deaths"]}死={100*rest["deaths"]/rest["nexts"]:.2f}%、活损中位{rest["median"]}。典型案例：P5HT1272P5SB A10 F12实际34→57；F24锻造仍40、下一问号战死，题面回血即时63但该线未实打，预计F27及boss77均未兑现；不推统一血线或锻造/回血必胜（n=83）。'
for eid,text in texts.items():
    if eid=='silent-strength-weak-observation':
        clause=next(c for c in re.split(r'(?<=[。；])',by[eid]['lesson']) if '药' in c)
        text=text.replace('扣22挡后实伤39。','扣22挡后实伤39。4D4J8USKCPAV'+clause)
    e=by[eid]; old=e['lesson']
    for clause in re.split(r'(?<=[。；])',old):
        if '药' in clause and clause not in text: text += clause
    e['lesson']=text
    for run in ([RUN,'HSX4HYATB4E2'] if eid=='silent-fasten-defend-extra-block' else [RUN]):
        if run not in e['evidence']:e['evidence'].append(run)
    e['n_support']=len(e['evidence'])
    e['n_contradict']=len(e.get('contradicting',[]))
    e['confidence']='high' if e['n_support']>=5 and e['n_contradict']<=e['n_support']/3 else 'med' if e['n_support']>=2 else 'low'
    e['last_seen']='2026-10-07'
E['version']='2026-10-07.12'
E['_about']='静默经验只来自本角色复盘与日志。第66次增量截至P5HT1272P5SB结束2026-10-06T23:23:38.170Z，83完局；旧82局七数组/血档/节点/回血/SL逐行复算一致。新增12房1死、总1256房73死。逐牌敏捷、逐击力量/虚弱、覆甲耗尽、夜魇次轮复制、寻龙尺生成与磨蚀施放、勒紧专属挡、暴露保留消耗及幻象复活分账；未来回血不代当前血量，未选方案不作整战因果，两个纯bug分账，不加用药规则。'
old={e['id']:e for e in B['entries']}
for e in E['entries']:
    assert e['n_support']==len(e['evidence']) and e['n_contradict']==len(e.get('contradicting',[]))
    assert all(len(r)==12 and R[r]['character'].lower()=='silent' for r in e['evidence']+e.get('contradicting',[]))
    if e['scope'].startswith(('potion:','general:potion')):assert e==old[e['id']]
    if e['id'] in texts:
        for clause in re.split(r'(?<=[。；])',old[e['id']]['lesson']):
            if '药' in clause:assert clause in e['lesson'],(e['id'],clause)
    else:assert e==old[e['id']]
active=[e for e in E['entries'] if e['status']=='active']
assert sum(len(e['lesson']) for e in active)<=60000
def stats(obj):
    aa=[e for e in obj['entries'] if e['status']=='active']
    return dict(active=len(aa),chars=sum(len(e['lesson']) for e in aa),confidence=dict(collections.Counter(e['confidence'] for e in aa)),by_asc={str(a):dict(entries=len([e for e in aa if e['asc'][0]<=a<=e['asc'][1]]),chars=sum(len(e['lesson']) for e in aa if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]})
changes=dict(added=[],updated=list(texts),retired=[],before=stats(B),after=stats(E),rows=[dict(id=i,before_n=old[i]['n_support'],after_n=by[i]['n_support'],before_chars=len(old[i]['lesson']),after_chars=len(by[i]['lesson']),evidence_added=[r for r in by[i]['evidence'] if r not in old[i]['evidence']]) for i in texts])
FILE.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(changes,ensure_ascii=False))
