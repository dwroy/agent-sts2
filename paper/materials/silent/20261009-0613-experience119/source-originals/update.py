import collections, copy, json, subprocess
from pathlib import Path

O = Path(__file__).parent.resolve()
W = O.parents[2]
N = '0DJ6GFZZ0TG9'
A = json.load(open(O/'audit.json'))
E = json.load(open(O/'experience-before.json'))
B = copy.deepcopy(E)
M = {e['id']: e for e in E['entries']}
R = {r['run_id']: r for r in json.load(open(O/'run-metadata.json'))}
changes = []
mapping = {}
day = subprocess.check_output(['date', '+%Y-%m-%d'], text=True).strip()

def update(ident, text, lids):
    e = M[ident]
    before = copy.deepcopy(e)
    assert N not in e['evidence']
    e['evidence'].append(N)
    e['n_support'] = len(e['evidence'])
    e['n_contradict'] = len(e.get('contradicting', []))
    n, c = e['n_support'], e['n_contradict']
    e['confidence'] = 'high' if n >= 5 and c <= n/3 else 'med' if n >= 2 else 'low'
    e['last_seen'] = max(e['last_seen'], day)
    e['lesson'] = text.replace('{n}', str(n))
    changes.append(dict(id=ident, before=before, after=copy.deepcopy(e)))
    mapping[ident] = lids

rest = next(r for r in json.load(open(O/'rest-summary.json')) if r['asc'] == 10)
band = next(r for r in A['bands'] if (r['asc'],r['act'],r['type'],r['band']) == (10,2,'Monster','≥60%'))
update('silent-route-hp-observation', f'观察：赢战/避精英不保证后场血药，问号另算，未来火不预支。A10 {rest["runs"]}局二幕Monster≥60%入口{band["n"]}房/{band["runs"]}局、{band["deaths"]}死（{100*band["deaths"]/band["n"]:.2f}%），活损中位{band["median_win"]}；各阶/幕/房型见报告（n={{n}}）。典型案例：456MRNGCPD8E末火未到；0DJ6GFZZ0TG9 F22/23两胜65→58→47，F28避精英挖饰品、F29回69、F32实69兑现投影，69血两药仍败boss。F12投影F16入口73实39，后续锻造/默认回血前提不同；旧路线未打，不定改线必优。', ['silent-0019'])
update('silent-rest-buffer-observation', f'观察：回血增加即时缓冲，锻造/挖掘不回血，不保证后场。A10 {rest["runs"]}局{rest["rests"]}独立火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{100*rest["deaths"]/rest["nexts"]:.2f}%），活损中位{rest["median"]}；各阶另列（n={{n}}）。典型案例：J8PHG72DGD90末火回27仍六败；0DJ6GFZZ0TG9三HEAL各22合66、五SMITH一DIG不回血，巨兽61→21、跨幕另回44，F29实47→69后boss仍死。F32缺7选择升级扫腿，无改回血整场对照。', ['silent-0020'])
update('silent-deck-burst-observation', '观察：计划组件、实建能力、可执行后续和已结收益分核。机制：实际费用、抽弃与可活轮决定兑现，没取得的牌不算输出。搭配：毒/抽牌伤/临时力各分源，护栏同时核省血少伤。决定胜负的战斗：{n}支持/0反例，整战单因未控（n={n}）。典型案例：WZL2AMEY85S7三雾仍败；0DJ6GFZZ0TG9未得毒雾/触媒/步法，蟹T1原线36伤但猎杀者被弃、实16；F9护栏预测省13血少7伤/7施毒，替线实损3、T7胜59血，原线未打；蟹T4候选多3血少12伤未实打，不称能赢。', ['silent-0021','silent-0125'])
update('silent-strength-weak-observation', '力量逐击加伤，敏捷逐张加牌挡，临时层/虚弱分核。机制：基础加现场属性后核倍率；毒和抽牌能力伤另账，次轮撤力不当永久成长。搭配：多段/多挡重复收益，实际血挡与可活轮共同验收。决定胜负的战斗：{n}支持/0反例，整战单因未控（n={n}）。典型案例：LYBHQ1X230ZB四段1力多4伤；0DJ6GFZZ0TG9 A10蟹T4药5+饰品3=8临时力，锋利杀灭+在虚弱下四段每敌实扣40，次轮力撤；T6毒杀火箭后碾碎爪3→9力/99挡仍杀2血11挡玩家，击杀一侧不等获胜。', ['silent-0012'])
update('silent-speedster-draw-damage', '速行者使回合中抽牌逐次向各敌补伤，多目标已有实盘数字。机制：已建2层，每抽一牌每敌2伤，无实体单次实1；与攻击本体/毒分源。搭配：抽牌技能/遗物须实际触发，未建立和未抽牌不预支。决定胜负的战斗：{n}支持/0反例，整战单卡胜因未控（n={n}）。典型案例：KAY522KT5NXR无实体两抽合2；0DJ6GFZZ0TG9 A10蟹T2建2，T5肾上腺素抽二使两敌103/77→99/73，独门技术再抽二至95/69，各扣4；此16伤已发生，不重复加到重问的36伤预测。', ['silent-0045'])
update('silent-reptile-trinket-temporary-strength', '饰品饮药实建本轮临时3力，药水自身增益另算。机制：已见一药+3/两药叠6，永久力保留，次轮撤临时部分；未见触发组合不外推。搭配：当轮多段攻击重复用力，毒/抽牌伤不归力量。决定胜负的战斗：{n}支持/0反例，整战遗物因果未控（n={n}）。典型案例：CSBR5CRDWQNB永久2药后5、次轮2；0DJ6GFZZ0TG9 A10蟹T2癫狂之触建3力、T3撤；T4肌肉5+饰品3=8，杀灭+四段每敌40、T5两临时层均撤。原同线报106实136差30尚未隔离，不全归饰品或许诺修后胜。', ['silent-0063'])
update('silent-serpent-form-per-card-damage', '群蛇形态建立后实际出牌向随机一敌补4/6伤，挡牌也触发。机制：能力伤与卡牌效果/盾/本体分账，不固定随机目标；残壳受伤不等结束自爆。搭配：多牌与抽牌/能量须实际可付，仍留生存挡。决定胜负的战斗：{n}支持/0反例，整战单卡因果未控（n={n}）。典型案例：5PM6JAQG6FNQ多能力共同胜恶魔；0DJ6GFZZ0TG9 A10巨兽T1建4，T8防御使残壳999999988→999999984另扣4、挡11→16，弱后喷发26仍损10；整战61→21，残壳伤不计本体进度。', ['silent-0132'])
update('silent-kaiser-crab-facing-sl', '观察：帝王蟹朝向、毒杀、存活部件与血价同核，不定统一杀序。机制：后方/力弱按现场，单侧退场另核99挡与增力，不删剩敌或把一侧死亡当胜。搭配：实伤/真挡/毒和后轮存活共同验收。决定胜负的战斗：{n}支持/0反例，真正重打11场58试2赢（n={n}）。典型案例：K2JAGKVJAWZJ同首抽两试1赢、目标/挡同变；0DJ6GFZZ0TG9 A10仅首试，T6火箭12血16毒先退场、碾碎爪76→68/18→99挡/3→9力，2血11挡实死。缺攻击中间帧，不沿旧24或末17推毛伤，不把SL不确定叫可活。', ['silent-0161'])
update('silent-giant-explosion-window', '巨兽本体结束后仍有自爆，残壳近十亿血不当新需伤。机制：A10已见蒸汽T2=20后每轮+3，本体结束下一轮自爆；本体血读{@10:HP:WATERFALL_GIANT}，弱/减力与实挡另核。搭配：结束本体后留生存窗口，打残壳不消爆，净进度含回复不叫毛伤。决定胜负的战斗：{n}支持/0反例，提前击杀整战单因未控（n={n}）。典型案例：G8NHLL09DLBX爆56弱42、胜余1；0DJ6GFZZ0TG9 A10 T7收本体、T8中和后喷发26，生存者+11及防御5合16挡，31→21损10，整战61→21；防御另触发群蛇4只扣残壳。', ['silent-0017'])
update('silent-terror-eel-vigor-vulnerable', '骇鳗过阈值取消当轮攻击，后段仍核未耗活力与易伤。机制：撞击基础读{@10:DMG:TERROR_EEL:CRASH_MOVE}后加现场活力再核弱/易伤；A0/A1惊叫70、A10为75，恐吓已见99易伤。搭配：眩晕不清活力，毒进度/实挡/可活轮合核。决定胜负的战斗：{n}支持/0反例，无真正重打，整战单因未控（n={n}）。典型案例：FU8ZUQHBHNV9 A10越75后仍死18血敌；0DJ6GFZZ0TG9 F9T5从94至64触发T6恐吓，6活力仍留，T7毒杀31血敌、70→59获胜；护栏替线实际省血方案兑现，未执行原线不报独立胜因。', ['silent-0050'])
update('silent-act-transition-missing-hp-heal', '已见A9/A10跨幕按缺失HP的80%向下取整回复。机制：同上限⌊(maxHP−当前HP)×0.8⌋，低阶/其他先古未核，连续boss非跨幕。搭配：营火/事件/药与SL恢复分源，不预支未来血。决定胜负的战斗：{n}支持/0反例，回复不保证后战（n={n}）。典型案例：J8PHG72DGD90同族16/74回46；0DJ6GFZZ0TG9 A10巨兽21/76跨幕实回⌊55×0.8⌋=44到65，三营火各22与浴场扣6增上限6另账；二幕末死无跨幕回血。', ['silent-0243'])

ident = 'silent-flex-potion-temporary-strength'
assert ident not in M
entry = dict(id=ident, scope='potion:FLEX_POTION', name='肌肉药水', asc=[0,20],
    lesson='观察：肌肉药实饮建立本轮5临时力，饰品3另源，两临时层次轮撤。机制：本局合8力进入每段攻击，虚弱/附魔按现场核；不当永久成长，不外推未见组合。搭配：当轮多段牌重复用力，毒与抽牌伤另账，不设喝留门槛。决定胜负的战斗：1支持/0反例，只有A10组合局部实测、未隔离整战胜因（n=1）。典型案例：0DJ6GFZZ0TG9 F33T4实建FLEX5/饰品3，锋利杀灭+虚弱下每段10、四段每敌40；T5两层撤、仅2血，T6仍死。',
    evidence=[N], n_support=1, n_contradict=0, confidence='low', last_seen=day, status='active')
E['entries'].append(entry)
changes.append(dict(id=ident,before=None,after=copy.deepcopy(entry)))
mapping[ident] = ['silent-0330']
E['version'] = day + '.8'
E['_about'] = f'静默经验只从本角色实盘与复盘学习。第119次增量并0DJ6GFZZ0TG9 A10，截至{A["cutoff"]}共155完局；旧154局七数组、血档/节点/回血/SL同口径复算。核临时药力与饰品、多目标抽牌伤、群蛇残壳伤、单侧蟹死亡与生存窗口、赢战血药及护栏候选差。无替代全路线/喝药时点/整战受控胜因，不拟固定门槛；源码交独立strategy-proposal，其他角色保持。'
for e in E['entries']:
    if e['status'] != 'active': continue
    assert e['n_support'] == len(set(e['evidence']))
    assert e['n_contradict'] == len(set(e.get('contradicting',[])))
    assert all(R[r]['character'].lower() == 'silent' for r in e['evidence']+e.get('contradicting',[]))
    assert e['scope'].split(':')[0] in ['boss','elite','hallway','act','general','card','relic','potion','event']
    if e['scope'].split(':')[0] in ['card','relic','potion','event']: assert e.get('name')
def stats(e):
    a = [x for x in e['entries'] if x['status']=='active']
    return dict(active=len(a),chars=sum(len(x['lesson']) for x in a),confidence=dict(collections.Counter(x['confidence'] for x in a)),applicable={str(n):dict(entries=len(z:=[x for x in a if x['asc'][0]<=n<=x['asc'][1]]),chars=sum(len(x['lesson']) for x in z)) for n in [8,9,10]})
assert stats(E)['chars'] <= 60000
(W/'knowledge/characters/silent/experience.json').write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(dict(entries=changes),ensure_ascii=False,indent=2)+'\n')
(O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
(O/'update-summary.json').write_text(json.dumps(dict(before=stats(B),after=stats(E),added=1,updated=len(changes)-1,retired=0),ensure_ascii=False,indent=2)+'\n')
print(json.dumps(json.load(open(O/'update-summary.json')),ensure_ascii=False))
