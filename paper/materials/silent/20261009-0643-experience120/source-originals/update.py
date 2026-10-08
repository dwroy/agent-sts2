import collections, copy, json, subprocess
from pathlib import Path

O = Path(__file__).parent.resolve()
W = O.parents[2]
N = 'KSX97DF5H3NY'
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
band = next(r for r in A['bands'] if (r['asc'],r['act'],r['type'],r['band']) == (10,2,'Monster','25–40%'))
update('silent-route-hp-observation', f'观察：赢战/避精英不保证下一场血药，问号另算，未来火不预支。A10 {rest["runs"]}局二幕Monster入口25–40%共{band["n"]}房/{band["runs"]}局、{band["deaths"]}死（{100*band["deaths"]/band["n"]:.2f}%），活损中位{band["median_win"]}；分阶/幕/房型见报告（n={{n}}）。典型案例：456MRNGCPD8E末火未到；KSX97DF5H3NY无精英线F29回54，F30赢仍损35且两药饮尽，F31仅19/70空药四败。F18投影F31入口44实19，问号战/事件回血/锻造同时变化，不能全归一个参数或定换线必优。', ['silent-0019'])
update('silent-rest-buffer-observation', f'观察：回血增加即时缓冲，锻造不回血，不保证下一火前连续战斗。A10 {rest["runs"]}局{rest["rests"]}独立火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{100*rest["deaths"]/rest["nexts"]:.2f}%），活损中位{rest["median"]}；各阶另列（n={{n}}）。典型案例：J8PHG72DGD90末火回27仍六败；KSX97DF5H3NY枕头两次各回36，F29的18→54后两强制战，F30损35到19、没到F32火。事件/跨幕回复另账，无改休息/留药的整场胜对照。', ['silent-0020'])
update('silent-deck-burst-observation', '观察：计划组件、实建能力、可执行后续与已结收益分核。机制：费用、抽弃与可活轮决定兑现，未得牌不算输出，护栏候选省血不等整战净收益。搭配：持续毒/逐牌挡与伤害截止共同验收。决定胜负的战斗：{n}支持/0反例，整战单因未控（n={n}）。典型案例：WZL2AMEY85S7三雾仍败；KSX97DF5H3NY计划步法/触媒均未得，F8护栏报省13血少15伤，替线实7伤/损6、整战53→14，原线未打；F31末T5余像建后仅三牌补3，1血13挡对45仍死，不称提前建能力必胜。', ['silent-0021','silent-0125'])
update('silent-strength-weak-observation', '力量逐击加伤，敏捷逐张加牌挡，临时层/弱/易伤按现场分核。机制：基础加属性后核倍率，毒与被动挡另账，减力不停止后续成长。搭配：多段/多挡重复收益与真实血挡窗口合核。决定胜负的战斗：{n}支持/0反例，整战单因未控（n={n}）。典型案例：LYBHQ1X230ZB四段1力多4伤；KSX97DF5H3NY A10甲虫T5—8力2/4/6/8、T5/6各损12；母体末T5力4及玩家易伤1，31加两幼虫各7共45，13挡需损32，死亡后21/5/5不倒推末轮预算。本局无玩家敏捷，步法仅计划。', ['silent-0012'])
update('silent-afterimage-per-card-block', '余像按建立后实际出牌次数补挡，自身首次不触发自己。机制：每1层后续每牌＋1，重放再触发，脆弱不折被动挡，换战重建。搭配：多牌兑现，与牌挡/覆甲分源，拥有未打不算挡。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：H1T1F8ML9FUE脆弱下重放被动挡另计；KSX97DF5H3NY A10 F30T1建1、T5仅两牌补2，甲虫成长后仍损12；F31末T5后空翻先5挡，余像本身不补，随后打击/防御/逃脱计划补3至13，对45仍死，不把此前两牌追补或承诺提前建能赢。', ['silent-0023'])
update('silent-gorget-plating', '护喉甲开场覆甲不等整场固定格挡。机制：已见开场4，按当前剩层给挡；完整减层条件未隔离。搭配：覆甲、牌挡与余像分源，未来末挡不预支。决定胜负的战斗：{n}支持/0反例，单项整战因果未控（n={n}）。典型案例：79UCJ0K6R9C1寄生虫T5覆甲归零、T6损32；KSX97DF5H3NY A10末次母体战轮初T1—5覆甲4/3/2/1/0，T5只有13挡对45、1血实死，不能继续加开场4挡；本局没有玩家敏捷层。', ['silent-0013'])
update('silent-mirage-poison-card-block', '蜃景按施放时活敌毒总量给牌挡，后来施毒不追补。机制：加现场敏后核脆弱/暗影倍率，施放不耗毒、重放逐次核。搭配：启毒与可活窗口合核，总挡正确不保证随机毒集中母体。决定胜负的战斗：{n}支持/0反例，单卡整战未控（n={n}）。典型案例：NEWRFAYKTQHR先毒11挡、倒序4；KSX97DF5H3NY A10母体第2/4试T3毒5＋3＋3=11，蜃景实6→17、防御到22、零损；母体只实结5而非题面11，三次后续试均T5败，毒分配与总挡分开核。', ['silent-0010'])
update('silent-deadly-poison-application', '致命毒药普通/升级施5/7毒，不即时扣血。机制：实结按当前毒再减1，制品/头骨/触媒/阶段另核，过量毒按剩血截断。搭配：持续毒补层与存活结算窗口合核，不预支免攻。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：D4LJ9QMGFB8Q毒受限伤留2；KSX97DF5H3NY A10 F30T8雾已补到5毒，普通致命再5→10，敌6血当步不变、结算仅计6而实赢19血；末母体战T4实4→9毒仍T5败，无替代牌序整场胜线。', ['silent-0007'])
update('silent-bouncing-flask-poison', '弹跳药瓶按实际次数、分配与毒结算兑现，多敌不保证指定目标收尾。机制：普通3毒×3次、升级3毒×4次；制品逐次阻毒，施毒不即时伤，最高血目标不等最坏分配。搭配：持续毒/蜃景分核总毒与母体进度，随机未发生不预定。决定胜负的战斗：{n}支持/0反例，单牌整战胜因未控（n={n}）。典型案例：G8NHLL09DLBX母体随机毒未终结；KSX97DF5H3NY A10 F31第2—4试T3母体只获3、结5至50，题报结11至44且24/24赢；总毒11可相同而分配不同。四试同前30抽序均败，目标/幼虫数/落毒同变，不定换线或运气单因。', ['silent-0007'])
update('silent-noxious-fumes-growth', '毒雾普通/升级建2/3层，后续玩家轮初补毒，能力不即时施毒。机制：已结毒逐次减1后按实建量补，可叠加，制品/阶段另核。搭配：须活到补毒与结算，直接施毒/触媒和剩血分账。决定胜负的战斗：{n}支持/0反例，整战单卡胜因未控（n={n}）。典型案例：WZL2AMEY85S7三雾建2→4→6仍败；KSX97DF5H3NY A10 F30T6升级雾建3，T7毒3结后余2、T8补到5，致命再到10收掉6血甲虫，54→19获胜；未结毒与未来轮不当已伤，缺早建雾整场受控胜因。', ['silent-0011'])
update('silent-slumbering-beetle-wake-growth', '熟睡甲虫醒后滚动持续加力，同伴退场不保证其停攻。机制：睡层下降、醒后覆甲消失，基础滚动按{@7:DMG:SLUMBERING_BEETLE:ROLL_OUT_MOVE}/{@10:DMG:SLUMBERING_BEETLE:ROLL_OUT_MOVE}加力核弱。搭配：各敌毒杀/剩血与各自攻击分核，不定固定杀序。决定胜负的战斗：{n}支持/0反例，同伴先毒死后仍攻旧两局验证（n={n}）。典型案例：3KME36ADUE4U A7同伴毒死后仍致死；KSX97DF5H3NY A10 F30T3两碗虫退场，甲虫T5—8力2/4/6/8、T5/6各损12，T6才建3雾、T8毒杀而54→19胜，两瓶污浊饮尽。旧死例与新胜例均支持成长，不把胜因全归雾或同伴杀序。', ['silent-0128'])
update('silent-act-transition-missing-hp-heal', '已见A9/A10跨幕按缺失HP的80%向下取整回复。机制：同上限⌊(maxHP−当前HP)×0.8⌋，低阶/其他先古未核，连续boss非跨幕。搭配：营火/事件/药与SL恢复分源，不预支未来血。决定胜负的战斗：{n}支持/0反例，回复不保证后战（n={n}）。典型案例：J8PHG72DGD90同族16/74回46；KSX97DF5H3NY A10仪式兽38/70跨幕实回⌊32×0.8⌋=25到63；两枕头火各36、事件20/25另账，战外共142，15赢房净损179使56→19，三次SL恢复不记回血。', ['silent-0243'])

E['version'] = day + '.9'
E['_about'] = f'静默经验只从本角色实盘与复盘学习。第120次增量并KSX97DF5H3NY A10，截至{A["cutoff"]}共{len(R)}完局；旧155局七数组、血档/节点/回血/SL同口径复算。核余像建立时序、覆甲耗尽、随机毒总量与母体分配、蜃景实挡、持续毒/直接毒组合、敌成长与赢战血药链。四试同首抽全败，落毒/目标/幼虫数同变，不拟杀序/用药/护栏门槛，不许诺改法翻盘；源码交独立strategy-proposal。'
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
assert len(changes)==12
(W/'knowledge/characters/silent/experience.json').write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(dict(entries=changes),ensure_ascii=False,indent=2)+'\n')
(O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
(O/'update-summary.json').write_text(json.dumps(dict(added=0,updated=len(changes),retired=0,before=stats(B),after=stats(E)),ensure_ascii=False,indent=2)+'\n')
print(json.dumps(json.load(open(O/'update-summary.json')),ensure_ascii=False))
