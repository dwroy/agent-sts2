import collections
import copy
import json
from pathlib import Path

O = Path(__file__).parent
K = Path('knowledge/characters/silent/experience.json')
N = 'AD3QSC3P41JU'
B = json.load((O/'experience-before.json').open())
E = copy.deepcopy(B)
I = {e['id']: e for e in E['entries']}
A = json.load((O/'audit.json').open())
R = {r['run_id']: r for r in json.load((O/'run-metadata.json').open())}
C = []

def change(eid, text):
    e = I[eid]
    before = copy.deepcopy(e)
    assert N not in e['evidence']
    e['evidence'].append(N)
    e['n_support'] = len(e['evidence'])
    e['last_seen'] = '2026-10-08'
    e['lesson'] = text.replace('{n}', str(e['n_support']))
    n, z = e['n_support'], e['n_contradict']
    e['confidence'] = 'high' if n >= 5 and z <= n/3 else 'med' if n >= 2 else 'low'
    C.append(dict(id=eid, before=before, after=copy.deepcopy(e), new_runs=[N]))

change('silent-strength-weak-observation', '力量逐击加伤，敏捷逐张加牌挡，乘区与来源分账。机制：现场力/敏后核弱、脆弱，旧挡不倒补，临时量另核。搭配：多击/多挡重复受益，毒与被动挡另算。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：LYBHQ1X230ZB四攻击段1力共多4伤；AD3QSC3P41JU A10实验体末T2四技能令敌力3→15、同招19→31，虚弱后23；18挡、3血仍死。')
change('silent-mirage-poison-card-block', '蜃景按施放时存活敌毒总量给牌挡，后施毒不追补。机制：加敏后核脆弱，施放不耗毒，重放逐次核。搭配：毒雾实建和施毒时序决定当轮挡，零毒零敏0挡。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：NEWRFAYKTQHR先毒蜃景11挡、倒序仅4；AD3QSC3P41JU A10女王T6毒32＋41＝73，脆弱后实54挡，对36攻零损；T11胜15血，无蜃景替代整战未知。')
change('silent-noxious-fumes-growth', '毒雾普通/升级建立2/3层，后续玩家轮初补毒。机制：建层不即时施毒，可叠加；额外起始补毒不等已经扣血，换战重建。搭配：须活到实际结算，力量被减不改变毒层。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：NEWRFAYKTQHR建2后下一玩家轮补2；AD3QSC3P41JU A10女王T1建6、T3补到8，T11胜；实验体佩尔之眼使毒3→6而敌仍72，末实扣6仍58血。')
change('silent-vambrace-opening-block', '臂甲翻倍战内首张实际格挡，不当每轮恒定翻倍。机制：首张基础加敏后翻倍，消费后其他来源另核，未知交互不外推。搭配：先看是否已消费，未施放不预支。决定胜负的战斗：{n}支持/0反例，遗物整战胜因未控（n={n}）。典型案例：K2JAGKVJAWZJ首后空翻16、次轮只10；AD3QSC3P41JU A10实验体首防御5→10，18攻仍损8；末T2后续两后空翻各5、防御+8合18，不再翻倍。')

def sl_counts(eid, enemy):
    support = set(I[eid]['evidence']) | {N}
    groups = collections.defaultdict(list)
    for row in A['attempts']:
        if row['run'] in support and any(f['run']==row['run'] and f['floor']==row['floor'] and enemy in f['enemies'] for f in A['fights']):
            groups[(row['run'],row['floor'])].append(row)
    multi = [v for v in groups.values() if max(x['attempt'] for x in v)>1]
    return f'真正重打{len(multi)}场{sum(len(v) for v in multi)}试{sum(x["result"]=="won" for v in multi for x in v)}赢'

change('silent-test-subject-phase-reset', '实验体按现场激怒层数计技能成本，换阶段重核敌状态。机制：首阶段每技能加激怒层数力量，能力不加；历史换阶段清敌力/激怒/毒、留玩家能力。搭配：抽牌、减力、毒与可活轮合核，全败推演仍有血价。决定胜负的战斗：{n}支持/0反例，'+sl_counts('silent-test-subject-phase-reset','TEST_SUBJECT')+'（n={n}）。典型案例：9R916WW0V65N A10第三试15轮25→12胜；AD3QSC3P41JU六试0赢，激怒3，T1扫腿线省8血少9伤、T3才判死；末四技能敌力3→15，23攻对18挡、3血实死，未跨阶段。')
change('silent-lagavulin-siphon-poison-sl', '族母吸取压缩直接伤/牌挡，已建毒按现场层数结算。机制：已见每次玩家力敏各−2、敌力+2，负力量不减技能毒层。搭配：到手能力、来袭和可活轮共同核，重打抽牌改变另列。决定胜负的战斗：{n}支持/0反例，单项胜因未控（n={n}）。典型案例：GXNKW8X1XYJP重打36→2毒胜；AD3QSC3P41JU A10 T2/T3建双毒雾+合6，T8力敏各−2、敌力2，毒仍兑现，T11以38→11胜。')
change('silent-piercing-wail-temporary-strength', '尖啸临时降力按攻击段兑现，次轮恢复重核。机制：普通/升级减6/8，各段核力/弱，制品可阻减力，攻击不降到负伤。搭配：爆发重放可增加本轮减力量，但不当常驻防御。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：G8NHLL09DLBX群攻23→2、次轮撤；AD3QSC3P41JU A10女王T10爆发+重放尖啸令力2→−10、攻22→9，防御6＋水盆4零损，次轮恢复2。')
change('silent-burst-next-skills-replay', '爆发本轮使普通下一张、升级下两张技能各额外打出一次，攻击不耗层、未用不跨轮。机制：每张符合技能耗一层，各次牌效/被动独立兑现，敏捷计入每次牌挡。搭配：能量、施毒、弃牌分账，两层不等同牌再打两次。决定胜负的战斗：{n}支持/0反例，单组件整战胜因未控（n={n}）。典型案例：LYBHQ1X230ZB爆发重放迷雾+、母体4→16毒；AD3QSC3P41JU A10女王T10爆发+层2→1→0，尖啸两次减12力、防御重放脆弱后共6挡，保住15血到T11胜。')
change('silent-ripple-basin-no-attack-block', '波纹水盆在已见无攻击回合末补4挡，敏捷/脆弱不改这4。机制：牌挡与条件被动挡分源，毒按真实结算兑现，内部全序未记录。搭配：毒防可并行，仍合核持牌状态与血池，不定弃攻规则。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：E6AVMMVCSRPC负2敏仍补4挡、对18攻仍死；AD3QSC3P41JU A10女王T9牌挡13＋水盆4，对6×5＝30实损13；T10牌挡6＋4挡住9攻、维持15血。')
change('silent-queen-poison-main-target', '观察：女王两种击杀序均有赢例，不定固定顺序或提前能力必胜。机制：血按进阶{@2:HP:QUEEN}/{@4:HP:QUEEN}/{@8:HP:QUEEN}读，本体死可终战；弱/脆/易伤改变攻防，爪牙死不关闭成长。搭配：实建毒、防御和续战血药合核。决定胜负的战斗：{n}支持/0反例，'+sl_counts('silent-queen-poison-main-target','QUEEN')+'，替序胜因未控（n={n}）。典型案例：ZZMYZ5UBCG72 A2本体先死、爪余87；AD3QSC3P41JU A10毒雾8，T8聚合体44血46毒先退场、31攻击未结算，T11女王退场，房间62→15；下场开场扣4、11血空药六败。')
change('silent-royal-poison-blood-vial-opening-net', '王室猛毒开场净血价按实际遗物组合核，出牌前失血须算可操作入口。机制：无小血瓶已见新战各净失4；同持小血瓶旧两场各净失2，内部先后未知。搭配：茶/休息回血与开场扣血分账，读档恢复不重复收血价。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：TXZ6RVMQA09D A10 F49以4血进房、出牌前死；AD3QSC3P41JU A10 F39/45/46/48/49各扣4，女王退出15＝实验体入房15，可操作11；五次SL回11不算回血。')
change('silent-double-boss-resource-handoff', '观察：A10首Boss获胜后直接接续实际血药，开场失血另扣，能力换战重建。机制：{n}局F48出口HP与F49入房HP相同，全部后战败；可操作HP再核遗物，连续boss非跨幕。搭配：回复、复活与SL恢复分账，不由全败拟终局权重或留药门槛。决定胜负的战斗：{n}支持/0反例，无保药/改线完整胜利对照（n={n}）。典型案例：9R916WW0V65N实验体25血四药→12血空槽、接女王败；AD3QSC3P41JU A10女王62入房/58可操作→15胜，能量药已饮；实验体15入房/11可操作六败。')
change('silent-act-transition-missing-hp-heal', '已见A9/A10跨幕按缺失HP的80%向下取整回复。机制：同上限⌊(最大HP−当前HP)×0.8⌋，低阶/其他先古未核；连续boss非跨幕。搭配：营火、遗物、事件与SL恢复分账。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：H1T1F8ML9FUE先古回52/33；AD3QSC3P41JU A10 F18 11→58回47、F34 19→59回40，max70不变；女王到实验体无中间回复。')
dex = [r for r in A['potions'] if (r.get('potion') or {}).get('id')=='DEXTERITY_POTION']
new_dex = [r for r in dex if r['run']==N]
assert len(new_dex)==1
assert new_dex[0]['after']['powers'].get('DEXTERITY_POWER',0)-new_dex[0]['before']['powers'].get('DEXTERITY_POWER',0)==2
change('silent-dexterity-potion-card-block', '敏捷药水实饮建2敏捷，已有挡不倒补。机制：后续牌挡加敏再核脆弱，换战撤，历史逐饮另列。搭配：多挡牌重复收益，其他挡源另计，不定喝留时点。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：H1T1F8ML9FUE两饮各＋2、防御5→7另余像1；AD3QSC3P41JU A10 F21T1实饮＋2，该战57→55，F49玩家无常驻敏捷；留药完整胜线未知。')
rest = next(r for r in json.load((O/'rest-summary.json').open()) if r['asc']==10)
change('silent-rest-buffer-observation', f'观察：实完成回复和后战结果分账。A10 {rest["runs"]}局{rest["rests"]}火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{100*rest["deaths"]/rest["nexts"]:.2f}%），活损中位{rest["median"]}；各阶另列（n={{n}}）。典型案例：AD3QSC3P41JU A10十一火六回血实回133，末火26→62、女王胜15，下场可操作11仍六败；替路线/锻造整场结局未知。')
band = next(r for r in A['bands'] if (r['asc'],r['act'],r['type'],r['band'])==(10,2,'Unknown','<25%'))
change('silent-route-hp-observation', f'观察：问号可战，避精英与赢当前战不保证后场血药。A10 {rest["runs"]}局二幕Unknown以<25%入血{band["n"]}房/{band["runs"]}局、{band["deaths"]}死（{100*band["deaths"]/band["n"]:.2f}%），活损中位{band["median_win"]}；分阶/幕/房型/血档另列（n={{n}}）。典型案例：AD3QSC3P41JU A10二/三幕无精英，F4投影F15为70、实53，原投影按回血但两火实锻造；F47实休息到62仍后场败，替路线受控胜线未知。')
change('silent-deck-burst-observation', '观察：能力、当前胜率与后场血药分账。机制：只计实建能力、毒、抽牌和可活轮，未来结算不预支。搭配：持续毒与蜃景真实挡合核，全败推演换线仍计血价。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：H1T1F8ML9FUE沙漏晚建雾/触媒未兑现；AD3QSC3P41JU A10双雾抗族母负力敏、三雾与蜃景撑女王T11胜，但下场只11血空药且能力重建；保血线多活一轮仍无赢次。')

E['version']='2026-10-08.18'
E['_about']='静默经验只来自本角色实盘与复盘。第101次增量合并AD3QSC3P41JU A10；截至2026-10-08T06:53:39.267Z共132完局，旧131局七数组、血档/节点后战、实回复及SL逐行复算。激怒逐技能成本、已建毒与实际结算、蜃景脆弱牌挡、爆发尖啸与回合末水盆分源，连续boss入房/可操作HP和开场血价分账。六试全败无完整替代胜线，不拟全局药水/SL/终局阈值。经验/账本/代码提案关联独立strategy-proposal，不改打法源码。'

def stats(x):
    active=[e for e in x['entries'] if e['status']=='active']
    return dict(active=len(active),chars=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),asc={a:dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in active),chars=sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]})

summary=dict(old_version=B['version'],version=E['version'],added=0,updated=len(C),retired=0,before=stats(B),after=stats(E),evidence=[dict(id=c['id'],evidence=c['after']['evidence'],contradicting=c['after'].get('contradicting',[]),by_asc=dict(collections.Counter(R[r]['ascension'] for r in c['after']['evidence']))) for c in C])
assert summary['before']['chars']<55000 and summary['after']['chars']<55000
K.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(dict(entries=C),ensure_ascii=False,indent=2)+'\n')
(O/'update-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
(O/'dexterity-actions.json').write_text(json.dumps(dex,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k!='evidence'},ensure_ascii=False))
