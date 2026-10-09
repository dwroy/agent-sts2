import collections
import copy
import json
from pathlib import Path

O = Path(__file__).parent
A = json.load(open(O/'audit.json'))
R = {r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
E = json.load(open(O/'experience-before.json'))
old = copy.deepcopy(E)
V = 'VAC6Z1PZ1QJG'
N = 'NG1FBJTSRLHS'
changed = []
mapping = {}
def revise(ident, runs, ledger, lesson):
    e = next(e for e in E['entries'] if e['id']==ident)
    for run in runs:
        assert R[run]['character'].lower()=='silent'
        if run not in e['evidence']:
            e['evidence'].append(run)
    e['n_support'] = len(e['evidence'])
    e['n_contradict'] = len(e.get('contradicting',[]))
    e['confidence'] = 'high' if e['n_support']>=5 and e['n_contradict']<=e['n_support']/3 else 'med' if e['n_support']>=2 else 'low'
    e['last_seen'] = '2026-10-09'
    e['lesson'] = lesson.format(n=e['n_support'])
    changed.append(ident)
    mapping[ident] = ledger

rest = next(x for x in json.load(open(O/'rest-summary.json')) if x['asc']==10)
low = next(x for x in A['bands'] if (x['asc'],x['act'],x['type'],x['band'])==(10,1,'Monster','<25%'))
nr = sum(r['ascension']==10 for r in R.values())
revise('silent-route-hp-observation',[V,N],['silent-0019'],
    f'观察：赢战仍耗血药，问号另算，未来恢复不预支。A10 {nr}局一幕Monster入口<25%共{low["n"]}房/{low["runs"]}局、{low["deaths"]}死（{low["deaths"]/low["n"]:.2%}），活损中位{low["median_win"]}；各阶/幕/房型见报告（n={{n}}）。典型案例：{V} F33获胜75→7损68，跨幕补56另账；{N} F7锻造63不回、F8赢损18、F9强制精英45进场死。无改线/留药受控勝果，不立安全血线。'.replace('勝','胜'))
revise('silent-rest-buffer-observation',[V,N],['silent-0020'],
    f'观察：回血增加即时缓冲，锻造不回血，不能保证后战。A10 {nr}局{rest["rests"]}独立火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{rest["deaths"]/rest["nexts"]:.2%}），活损中位{rest["median"]}；各阶另列（n={{n}}）。典型案例：{V}七火实回159，67/84两药进女王六败；{N} F7锻造不兑现皇家枕头，后走廊损18才45血进雕像死。原理由“当前血量支持下一精英”是预测；两线boss入口同77的全败模拟不证明回血无价值，无两选项实打对照。')
revise('silent-deck-burst-observation',[V,N],['silent-0021','silent-0125'],
    '观察：计划能力、已结本体进度和后续生存分核。机制：毒层不等即时伤，未建立能力与未来挡不预支。搭配：持续输出与当轮实挡/费用合核，护栏省血和少伤在同题比较，不累计未执行原线。决定胜负的战斗：{n}支持/0反例，整战单因未控（n={n}）。典型案例：VAC6Z1PZ1QJG四护栏题面省10/12/13/9血、少9/14/0/6伤，原线未实打；女王末试余像T8才建立、毒雾未建，末T12女王仍152血。NG1FBJTSRLHS计划步法等未得，末轮串刺9＋毒4使41→28，25攻10挡仍杀12血。')
revise('silent-strength-weak-observation',[V,N],['silent-0006','silent-0012'],
    '力量逐击加伤、敏捷逐张加牌挡，临时层/弱/易伤按现场分核。机制：基础加属性后核倍率，毒/被动挡另源；弱不关闭成长。搭配：多击/多挡重复收益仍核当前血价。决定胜负的战斗：{n}支持/0反例，整战单因未控（n={n}）。典型案例：LYBHQ1X230ZB四段1力多4伤；VAC6Z1PZ1QJG聚合体首试T3尖啸减6力使三击27→6，T4恢复；末试T12女王4力/五击45，1敏与14挡不足活。NG1FBJTSRLHS雕像T3建10力25攻、迷雾弱化18，T4回25，T5仍25，不沿用T3减伤。')
revise('silent-noxious-fumes-growth',[V],['silent-0011'],
    '毒雾普通/升级建2/3层，后续玩家轮初补毒，能力不即时施毒。机制：已结毒逐次减1后按实建量补，可叠加，制品/阶段另核。搭配：须活到补毒与结算，直接施毒/触媒和剩血分账。决定胜负的战斗：{n}支持/0反例，整战单卡胜因未控（n={n}）。典型案例：WZL2AMEY85S7三雾建2→4→6仍败；VAC6Z1PZ1QJG女王首试T5升级雾建3，聚合体T6毒18/T7毒26包含药瓶、旧毒减1与补3；末试从未建立雾仍打到T12，不由持有或早建宣称必胜。')
revise('silent-frail-card-block',[V],['silent-0069'],
    '脆弱逐张折减卡牌格挡，被动挡另核。机制：基础加现场敏/牌增量再核倍率，已见×0.75最终向下取整，旧挡不倒补。搭配：多挡逐张、首卡倍率/余像和遗物分账，不推广未见增益顺序。决定胜负的战斗：{n}支持/0反例，单项整战胜因未控（n={n}）。典型案例：P2M3DFJ4DEZ3八敏首卡翻倍闪躲+实21仍死；VAC6Z1PZ1QJG A10女王末T10预判+后5敏，防御⌊(5+5)×0.75⌋=7，余像另1，挡15→23；T12回1敏坚韧给4，90脆弱仍在，不能沿用T10挡值。')
revise('silent-afterimage-per-card-block',[V],['silent-0023'],
    '余像按建立后实际出牌次数补挡，自身首次不触发自己。机制：每1层后续每牌＋1，重放再触发，脆弱不折被动挡，换战重建。搭配：多牌兑现，与牌挡/覆甲分源，拥有未打不算挡。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：H1T1F8ML9FUE脆弱下重放被动挡另计；VAC6Z1PZ1QJG A10女王末试T8才建1，T12小刀/坚韧/药瓶各补1，轮初7＋坚韧4＋余像3=14，对45仍死；不追补T8以前出牌或承诺提前建可赢。')
revise('silent-piercing-wail-temporary-strength',[V],['silent-0046'],
    '尖啸临时减力按攻击段兑现，次轮恢复须重核。机制：普通/升级减6/8，逐段核力与弱，制品可阻、攻击不降成负伤。搭配：多击减伤与实挡合核，不当永久停止成长。决定胜负的战斗：{n}支持/0反例，单牌整战胜因未控（n={n}）。典型案例：KAY522KT5NXR三击30→12；VAC6Z1PZ1QJG A10聚合体首试T3减6力使27→6，T4恢复、T6三力48被弱化36；末试尖啸T2用，T3已无负力保护，不能沿用首试同轮6攻。')
revise('silent-queen-poison-main-target',[V],['silent-0069','silent-0090'],
    '观察：女王两种击杀序均有赢例，不定固定顺序或提前能力必胜。机制：血按进阶{@2:HP:QUEEN}/{@4:HP:QUEEN}/{@10:HP:QUEEN}读，本体死可终战；三减益/魂缚与现场成长另核，爪牙死不关闭成长。搭配：实建毒、防御和续战血药合核。决定胜负的战斗：{n}支持/0反例，真正重打11场57试3赢，替序胜因未控（n={n}）。典型案例：ZZMYZ5UBCG72 A2本体先死爪余87；VAC6Z1PZ1QJG A10六试聚合体均T8先退、T12女王仍存，末女王4力45攻，8血14挡至少差24活命血，毒21/荆棘后182→152；爪退场不等整战过。'.replace('{@','{{@').replace(':QUEEN}',':QUEEN}}'))
revise('silent-anticipate-temporary-dexterity',[V],['silent-0080'],
    '预判普通/升级仅本轮建立2/4敏捷。机制：临时标记与敏捷同增，次轮撤回；后续牌挡才兑现，旧挡不补。搭配：与药水/步法常驻敏捷分账，多挡牌重复收益。决定胜负的战斗：{n}支持/0反例，单项整战因果未控（n={n}）。典型案例：NEWRFAYKTQHR蜂群末T1预判叠药6敏、T2回2；VAC6Z1PZ1QJG A10女王末T10常驻1＋预判+4=5敏，脆弱防御7＋余像1使15→23挡，T11回1；T12只14挡对45死，临时防御不当后轮资源。')
revise('silent-queen-poison-window-sl-observation',[V],['silent-0079'],
    '观察：女王重打核实际启动/血价，赢试多处变化不作药水或顺序的单因胜果。机制：实建毒与可活轮限制结算，回放盘面不一致后的旧后缀不预支。搭配：真实挡/药/牌序和SL恢复分账。决定胜负的战斗：10场57试1赢、47次判死读档，后续抽牌/生成未全控（n={n}）。典型案例：PBUBM0LRTEDD第三试T9胜26空药，下一boss六败；VAC6Z1PZ1QJG六试同67血两药，前五T12判死末试T12实死，末试T4换升级药瓶/后空翻/手法而后序不同，零赢；第4/5试回放T1不一致停止，不能写成目标轮已换。')
revise('silent-haze-group-poison-weak',[V,N],['silent-0235'],
    '迷雾群毒与当轮虚弱分账，施放不即时扣本体。机制：普通/升级4/6毒及1/2弱，结束结毒再减1，制品逐项阻减益，弱不清成长。搭配：爆发增加次数，仍需活到结算。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：H1T1F8ML9FUE沙漏制品逐项阻毒/弱；NG1FBJTSRLHS A10雕像T3迷雾使毒2→6、65血当步不变，25攻弱化18，5挡实损13；结束毒6到59并剩5毒，T4无弱回25，不把毒或一次弱当持续免攻。VAC6Z1PZ1QJG首试升级迷雾配尖啸仍六败。')
revise('silent-cure-all-energy-draw',[N],['silent-0240'],
    '痊愈药水在已见饮用后加1能量并抽2牌，HP不变，不能按名字计回血。机制：10局16次实用均能量+1、手牌数+2、HP增量0；含SL但支持按局去重，未见满手等边界不外推。搭配：实际抽入牌与当前费用/弃牌重核，不定喝药时机。决定胜负的战斗：{n}支持/0反例，独立用药胜因未控（n={n}）。典型案例：VLZ6CCT8AQ0A实饮加能换手；NG1FBJTSRLHS A10 F6T1能量3→4、手牌7→9、血63不变、方柱零损；F9喝的是另得安瓿、当步扣10非加毒，无留痊愈/安瓿另一轮实打对照。')
regen_evidence = next(e['evidence'] for e in E['entries'] if e['id']=='silent-regen-potion-decay-heal') + [V]
regen = [x for x in A['potions'] if (x.get('potion') or {}).get('id')=='REGEN_POTION' and x['run'] in regen_evidence]
revise('silent-regen-potion-decay-heal',[V],['silent-0259'],
    f'再生逐轮回复并受上限截断，不当即时15血。机制：{len({x["run"] for x in regen})}局{len(regen)}饮增5层，完整5/4/3/2/1共15；短战/封顶按实回，先回后敌伤已核。搭配：牌挡/敌伤/回血分源，净损不当敌毛伤，不定留药门槛。决定胜负的战斗：{{n}}支持/0反例，单药整战胜因未控（n={{n}}）。典型案例：LY83ZMTFVKJH三轮仅回12；{V} A10女王六试T1均饮、各前五轮实回15，仍零赢；67→0净损67不当敌毛伤，五次SL恢复两药是重用、不是十瓶新取得。')
toric_evidence = next(e['evidence'] for e in E['entries'] if e['id']=='silent-toric-toughness-delayed-block') + [V]
toric = [x for x in A['cards'] if x['card']=='TORIC_TOUGHNESS' and x['run'] in toric_evidence]
revise('silent-toric-toughness-delayed-block',[V],['silent-0289'],
    f'坚韧之环即时给挡并建立两次轮初同额挡，施放额度与后来敏捷分账。机制：{len({x["run"] for x in toric})}局{len(toric)}次普通牌实见基础5加敏后核脆弱、建2次；延迟挡沿施放额度，未知升级/重放/叠层不外推。搭配：实挡与当前攻合核，不预支未活到的轮次。决定胜负的战斗：{{n}}支持/0反例，单牌整战因果未控（n={{n}}）。典型案例：ZVYUL2YP3518蟹T6预判后6敏实11、T7/T8敏回2仍各11；{V} A10女王末T12一敏/脆弱给4、余像另1，整轮共14挡对45死，未来两轮挡未兑现。')
revise('silent-bygone-effigy-wake-strength',[N],['silent-0307'],
    '雕像沉睡后苏醒无攻，下一玩家轮已10力斩击，前轮挡不跨轮。机制：{n}局见睡/醒/10力序列；基础伤A0 {@0:DMG:BYGONE_EFFIGY:SLASHES_MOVE}、A10 {@10:DMG:BYGONE_EFFIGY:SLASHES_MOVE}再核力弱，缓慢公式未隔离。搭配：当轮毒/虚弱/实挡分核，不定沉睡期固定输出序。决定胜负的战斗：{n}支持/0反例，固定打法胜因未控（n={n}）。典型案例：Y6GM2CHWJBEY A0 F9T3十力23攻；NG1FBJTSRLHS A10 F9 T3十力25弱化18、5挡损13，T4回25损20，T5 12血10挡对25需损15至少差4活命血，4毒后敌仍28；四道推演最优仍不保证实赢。'.replace('{@','{{@').replace(':SLASHES_MOVE}',':SLASHES_MOVE}}'))

E['version'] = '2026-10-09.14'
E['_about'] = '静默经验只从本角色实盘与复盘学习。第125次增量并VAC6Z1PZ1QJG、NG1FBJTSRLHS两局A10，截至2026-10-09T01:02:43.438Z共162完局；旧160局七数组/血档/节点/回血/SL同口径复算。补女王临时敏捷、脆弱、余像、毒雾、减力与SL失败对照，雕像十力/虚弱/毒实结及痊愈能量抽牌；赢战血价、营火和SL恢复分账。缺提前能力/另击杀序/原护栏线/留药/休息整战受控胜果，不拟新阈值；源码交独立strategy-proposal，接续接口bug不下发游戏经验。'
before = {e['id']:e for e in old['entries']}
changes = [{'id':ident,'before':before[ident],'after':next(e for e in E['entries'] if e['id']==ident)} for ident in changed]
assert [e['id'] for e in E['entries'] if e != before[e['id']]] == [e['id'] for e in E['entries'] if e['id'] in changed]
for e in E['entries']:
    assert e['n_support']==len(e['evidence'])
    assert all(r in R and R[r]['character'].lower()=='silent' for r in e['evidence']+e.get('contradicting',[]))
active = [e for e in E['entries'] if e['status']=='active']
assert sum(len(e['lesson']) for e in active)<=60000
(O.parents[2]/'knowledge/characters/silent/experience.json').write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2)+'\n')
(O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
summary = {'added':0,'updated':len(changes),'retired':0,'active':len(active),'chars':sum(len(e['lesson']) for e in active),'confidence':dict(collections.Counter(e['confidence'] for e in active)), 'applicable':{a:{'entries':len(es:=[e for e in active if e['asc'][0]<=a<=e['asc'][1]]),'chars':sum(len(e['lesson']) for e in es)} for a in [8,9,10]}}
(O/'update-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(summary)
