import collections, copy, json
from pathlib import Path

O=Path(__file__).parent; K=Path('knowledge/characters/silent/experience.json'); N='LYBHQ1X230ZB'
B=json.load(open(O/'experience-before.json')); E=copy.deepcopy(B); I={e['id']:e for e in E['entries']}
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}; A=json.load(open(O/'audit.json')); changes=[]
def change(eid, text):
    e=I[eid]; old=copy.deepcopy(e); assert N not in e['evidence']
    e['evidence'].append(N); e['n_support']=len(e['evidence']); e['last_seen']='2026-10-08'
    e['lesson']=text.replace('{n}',str(e['n_support']))
    n=e['n_support']; z=e['n_contradict']; e['confidence']='high' if n>=5 and z<=n/3 else 'med' if n>=2 else 'low'
    changes.append(dict(id=eid,before=old,after=copy.deepcopy(e),new_runs=[N]))

change('silent-strength-weak-observation','力量逐击加伤，敏捷逐张加牌挡，乘区与来源分账。机制：先核现场力/敏再核弱、脆弱及实际倍率，已有挡不倒补。搭配：多击/多挡牌重复受益，毒与被动挡另算。决定胜负的战斗：{n}支持/0反例，单项整战因果未控（n={n}）。典型案例：G8NHLL09DLBX A10弱化自爆56→42后剩1血；LYBHQ1X230ZB A10末战1力使背刺/打击/匕首雨四段合多4直伤，3敏与臂甲使防御(5＋3)×2＝16，弱后20攻仍耗最后4血。')
change('silent-footwork-block','步法普通/升级建立2/3敏捷，后续每张挡牌兑现，已有挡不补。机制：基础挡加现场敏捷后核脆弱及倍率，柔嫩等属性变化另核。搭配：多挡牌重复受益，未打挡牌无收益。决定胜负的战斗：{n}支持/0反例，单卡整战因果未控（n={n}）。典型案例：9R916WW0V65N六敏无挡牌死；LYBHQ1X230ZB A10 F29T3步法+后两防御各8、暗影各翻16共32盖29；F30T2首次防御16比零敏首次10多6，4血对20攻仍死。')
change('silent-vambrace-opening-block','臂甲翻倍战内首张实际格挡，不当每轮恒定翻倍。机制：首张基础加敏后翻倍，消费后其他来源另核，脆弱/未知交互不外推。搭配：先看是否已消费；被弃或未打不预支。决定胜负的战斗：{n}支持/0反例，遗物整战胜因未控（n={n}）。典型案例：K2JAGKVJAWZJ A10首后空翻16、次轮只10；LYBHQ1X230ZB A10 F29T1生存者8→16已消费，T3两防御翻倍来自暗影；F30T2首次防御(5＋3)×2＝16，仍缺1血才能活过20攻。')
change('silent-shadowmeld-new-block-double','融入暗影只翻本轮建立后新增挡，已有挡不补。机制：实建1层后基础加敏再乘2，建立本身不带挡、轮末撤；脆弱及其他倍率另核。搭配：先付建立费并实际施放后续挡牌，不与臂甲重复归因。决定胜负的战斗：{n}支持/0反例，单卡整战因果未控（n={n}）。典型案例：K2JAGKVJAWZJ旧7挡施暗影仍7；LYBHQ1X230ZB A10 F29T3技能药真实生成暗影，3敏下两防御各16共32，比仅敏捷16多16，盖29攻零损；臂甲已T1消费。')
change('silent-obscura-summon-growth','胧光怪活体召唤新增攻击者，主怪中毒不等幻象停攻。机制：逐实体召唤/复活/退场和当前力核，初始血不作后段总需伤；航行成长仅已见局有效。搭配：两敌来袭、实结毒与血挡合核，不定固定目标序。决定胜负的战斗：{n}支持/0反例，另一目标序整战因果未控（n={n}）。典型案例：61E2QS63Y9WU A10航行0→3→6力；LYBHQ1X230ZB A10 F30四试0赢，T1母体129→96后召21血幻象，T2合28弱至20，16挡仍耗尽4血；仅末试结15毒后幻象15/母体87，无本局复活或航行证据。')
change('silent-vajra-opening-strength','金刚杵已见开场给1力量，收益按实际攻击段数兑现，不给格挡。机制：无其他修正每段基础加1；削力、弱与无实体另核，毒不加。搭配：多击重复受益，不能以增伤替生存窗口。决定胜负的战斗：{n}支持/0反例，遗物整战胜因未控（n={n}）。典型案例：UACFSW4VDDLD A6无实体两刀各1；LYBHQ1X230ZB A10 F30T1背刺11→12、打击6→7、匕首雨两段4→5，合29直伤比无力多4；漏斗毒另4，仍母体96及新幻象21。')
change('silent-burst-next-skills-replay','爆发本轮使普通下一张、升级下两张技能各额外打出一次，攻击不耗层、未用不跨轮。机制：每张符合技能耗一层，各次兑现牌效与实际被动，敏捷计入每次牌挡。搭配：能量、施毒、弃牌与被动分账，不把两层当同牌多重放两次。决定胜负的战斗：{n}支持/0反例，单组件整战胜因未控（n={n}）。典型案例：K2JAGKVJAWZJ爆发+生存者两次10合20仍死；LYBHQ1X230ZB A10 F23T1普通爆发重放迷雾+，母体4→16毒、虚弱4，两次各6毒且层用尽，结束实扣16毒，不即时扣血。')
change('silent-slumbering-beetle-wake-growth','熟睡甲虫醒后滚动持续成长，失血唤醒当轮眩晕不等后续停攻。机制：睡层下降、醒后覆甲消失；基础滚动按进阶读{@7:DMG:SLUMBERING_BEETLE:ROLL_OUT_MOVE}/{@10:DMG:SLUMBERING_BEETLE:ROLL_OUT_MOVE}，现场力/弱逐击核。搭配：毒、醒来窗口、当前挡和次轮成长分账，不定杀序。决定胜负的战斗：{n}支持/0反例，单组件整战胜因未控（n={n}）。典型案例：BTSRF7JL1W1Y A10醒后持续成长致死；LYBHQ1X230ZB A10 F29T3醒后0力18攻被中和降13，T4/5/6力2/4/6、弱后15/16/18，T6零挡实损18；虽胜仅4血空药。')
change('silent-bowlbug-rock-full-block-stun','盛碗虫（石）有失衡时，自身攻击被完整格挡后下一轮眩晕，即使另敌仍使玩家失血。机制：仅核IMBALANCED_POWER1、实际结束且石虫存活的完整挡窗口；零攻、毒杀或其他触发未外推。搭配：现场挡与弱/减力改变覆盖，其他敌另计。决定胜负的战斗：{n}支持/0反例，局部机制不等整场必胜（n={n}）。典型案例：LRN0HPZ0FZS1 A0挡13盖石11而卵仍损5、T2石眩晕；LYBHQ1X230ZB A10 F29T1挡16盖石16、T2眩晕；T3暗影两防御32盖合29，T4石再眩晕，整战仍42→4。')
change('silent-hunter-tender-card-attributes','猎人杀手柔嫩逐牌削当前力量/敏捷，牌伤和牌挡按当时属性核。机制：TENDER_POWER1在已见出牌后力敏各−1，次玩家轮恢复、柔嫩留；翻滚下轮挡按出时建立，不追补恢复。搭配：当前多挡、抽牌续步、跨轮挡分源，不由局部多挡推胜。决定胜负的战斗：{n}支持/0反例，整场换序因果未控（n={n}）。典型案例：61E2QS63Y9WU A10负敏翻滚仅5/5挡；LYBHQ1X230ZB A10 F22T2三攻后力0→−1→−2→−3、敏3→2→1→0，零挡损18；T5精确切击后防御7/生存者9合16盖14，胜仍65→36。')
change('silent-haze-group-poison-weak','迷雾群毒与当轮虚弱分账，施放不即时扣本体。机制：普通/升级4/6毒及1/2弱，结束结毒再减1；制品与其他毒源另核，弱不清成长。搭配：群毒须活到结算，爆发增加次数，敌剩血/来袭与牌挡合核。决定胜负的战斗：{n}支持/0反例，单卡整战因果未控（n={n}）。典型案例：MTQ0EUBJ3R6T A10迷雾+两敌各6；LYBHQ1X230ZB A10 F30T2两敌毒6/9，攻击17＋11弱至12＋8，16挡对20耗尽4血，末实结15毒仍余15/87；前三截断不记已伤。')
change('silent-eternal-feather-rest-arrival-heal','永恒羽毛实际到营火才回血，与之后休息/锻造分账。机制：已见17–44张范围实回符合min(HP缺口,3×⌊牌组/5⌋)，上限截断、未知范围不外推。搭配：已到火回复增加血池，未来火不预支，不据此为回血加牌。决定胜负的战斗：{n}支持/0反例，构筑与回复混杂，无单遗物因果（n={n}）。典型案例：QNTW139MGECA A10三次羽毛回39、休息另计；LYBHQ1X230ZB A10 F28牌组25到火27→42实回15，随后锻造中和无休息回血，F29胜到4、下一火未到。')
change('silent-act-transition-missing-hp-heal','已见A9/A10跨幕按缺失HP的80%向下取整回复。机制：同上限⌊(最大HP−当前HP)×0.8⌋，低阶/其他先古未核；连续boss非跨幕。搭配：营火、遗物、事件回复与SL恢复分账。决定胜负的战斗：{n}支持/0反例，单项整战因果未控（n={n}）。典型案例：9R916WW0V65N首boss12血直接进女王无回；LYBHQ1X230ZB A10 F17胜29血后五轮书先回20至49，F18先古再回⌊21×0.8⌋＝16至65，不能把36全归跨幕。')
rest=next(r for r in json.load(open(O/'rest-summary.json')) if r['asc']==10)
change('silent-rest-buffer-observation',f'观察：实完成回复和后战结果分账。A10 {rest["runs"]}局{rest["rests"]}火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{100*rest["deaths"]/rest["nexts"]:.2f}%），活损中位{rest["median"]}；各阶另列（n={{n}}）。典型案例：LYBHQ1X230ZB A10四次休息各回21；F28羽毛27→42后锻造无休息回，F29胜到4、F30死，计划后火未到；另一休息/锻造完整对照未知。')
band=next(r for r in A['bands'] if (r['asc'],r['act'],r['type'],r['band'])==(10,2,'Unknown','<25%'))
change('silent-route-hp-observation',f'观察：问号可战，赢当前战不保证后战缓冲。A10 {rest["runs"]}局二幕Unknown以<25%入血{band["n"]}房/{band["runs"]}局、{band["deaths"]}死（{100*band["deaths"]/band["n"]:.2f}%），活损中位{band["median_win"]}；各阶/幕/房型/血档另列，非路线因果（n={{n}}）。典型案例：LYBHQ1X230ZB A10 F22/F23胜共损59，休息回21、羽毛回15后F29仍42→4耗药，F30以4/70空药四试败；未走替线/留药整战未知，不定安全血线。')
change('silent-deck-burst-observation','观察：当前战预测胜率与赢后血药、后继资源分账。机制：只计实际能力、毒、抽牌和生存轮，未执行候选不当反事实胜线。搭配：持续输出与真实挡合核，有限推演不等后场安全。决定胜负的战斗：{n}支持/0反例，整场换序因果未控（n={n}）。典型案例：LYBHQ1X230ZB A10 F29T6选预计损18/伤31/留4的8样本全赢线，实损18且T7胜；另一损12/伤22/留10的7/8线未实打，6血差不证明转胜；F30T2结15毒仍两敌活、4血16挡对20死。')

E['version']='2026-10-08.16'
E['_about']='静默经验只来自本角色实盘与复盘。第99次增量合并LYBHQ1X230ZB A10及14:01勘误；截至2026-10-08T05:24:24.543Z共130完局，旧129局七数组、血档/节点后战、实回复及SL逐行复算。敏捷/臂甲/暗影分源，召唤新增血与已结毒分账，胜战出口血药与后场资源补证。四次同序SL无赢次，逃脱计划本局未实打，不补整战反事实或机制因果。经验/账本/代码提案关联独立strategy-proposal，不改打法源码。'
def stats(x):
    aa=[e for e in x['entries'] if e['status']=='active']
    return dict(active=len(aa),chars=sum(len(e['lesson']) for e in aa),confidence=dict(collections.Counter(e['confidence'] for e in aa)),asc={a:dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in aa),chars=sum(len(e['lesson']) for e in aa if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]})
summary=dict(old_version=B['version'],version=E['version'],added=0,updated=len(changes),retired=0,before=stats(B),after=stats(E),evidence=[dict(id=c['id'],evidence=c['after']['evidence'],contradicting=c['after'].get('contradicting',[]),by_asc=dict(collections.Counter(R[r]['ascension'] for r in c['after']['evidence']))) for c in changes])
assert summary['before']['chars']<55000 and summary['after']['chars']<55000
K.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(dict(entries=changes),ensure_ascii=False,indent=2)+'\n')
(O/'update-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k!='evidence'},ensure_ascii=False))
