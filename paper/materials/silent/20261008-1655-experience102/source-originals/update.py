import collections
import copy
import json
from pathlib import Path

O = Path(__file__).parent
K = Path('knowledge/characters/silent/experience.json')
N = '9DAS5L8YM1CN'
B = json.load((O / 'experience-before.json').open())
E = copy.deepcopy(B)
I = {e['id']: e for e in E['entries']}
A = json.load((O / 'audit.json').open())
R = {r['run_id']: r for r in json.load((O / 'run-metadata.json').open())}
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
    e['confidence'] = 'high' if n >= 5 and z <= n / 3 else 'med' if n >= 2 else 'low'
    C.append(dict(id=eid, before=before, after=copy.deepcopy(e), new_runs=[N]))

change('silent-strength-weak-observation', '力量逐击加伤，敏捷逐张加牌挡，乘区与来源分账。机制：现场力/敏后核弱、脆弱，旧挡不倒补，临时量另核。搭配：多击/多挡重复受益，毒与被动挡另算。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：LYBHQ1X230ZB四攻击段1力共多4伤；9DAS5L8YM1CN A10扭动虫力4/6/8时单击11/13/15；磨蚀1敏使防御5→6全挡6，末猎人减属性后12挡仍不足挡14。')
change('silent-abrasive-thorns-dexterity', '磨蚀的敏捷与逐击荆棘分别兑现，持有能力不等实建。机制：普通/升级实建1敏及4/6荆棘；历史弃普通亦建1/4，未知交互另核。全挡也可反伤，无实体/剩血截断分账，换战重建。搭配：后续挡牌兑现敏捷，反伤不提前取消已发动攻击。决定胜负的战斗：{n}支持/0反例，单卡整战因果未控（n={n}）。典型案例：1913SE84AXQF千足虫弃磨蚀后两防御多2挡、反12仍损5；9DAS5L8YM1CN A10盛碗虫T5付3能建1敏/4荆棘，T6防御6正好挡丝虫3×2，胜仍2血；毒/反伤末击缺帧，下一战增益撤。')
change('silent-piercing-wail-temporary-strength', '尖啸临时降力按攻击段兑现，次轮恢复重核。机制：普通/升级减6/8，各段核力/弱，制品可阻减力，攻击不降到负伤。搭配：群攻/多击受益，毒杀攻击者与减力分账，不当常驻防御。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：AD3QSC3P41JU女王爆发重放减12力、次轮撤；9DAS5L8YM1CN A10盛碗虫T3石虫0→−6力、16→10攻，但先被刀毒结束，5挡/2血维持，次轮负力撤。')
change('silent-hunter-tender-card-attributes', '猎人杀手柔嫩逐牌削当前力量/敏捷，牌伤和牌挡按当时属性核。机制：TENDER_POWER1在出牌效果后力敏各−1，次玩家轮恢复、柔嫩留；药水不触发，跨轮挡按建立时算。搭配：临时敏捷、当前出牌数与来袭共同核，不由当轮存活推整战胜。决定胜负的战斗：{n}支持/0反例，整场换序因果未控（n={n}）。典型案例：61E2QS63Y9WU负敏翻滚仅5/5挡；9DAS5L8YM1CN A10四试同线，速度药建5敏、手上技法12挡后敏4/力−1，后两打击5/4、突然一拳5，末敏1/力−4；2血对14攻实死，敌仍81血。')
change('silent-speed-potion-temporary-dexterity', '速度药水当步加5临时敏捷，须在本轮后续格挡牌兑现。机制：逐饮加5、次轮速度层撤，独立属性变化另核，旧挡不倒补。搭配：每张牌按当前敏捷给挡，敌柔嫩逐牌减敏另算，不定喝留门槛。决定胜负的战斗：{n}支持/0反例，单药整战因果未控（n={n}）。典型案例：G8NHLL09DLBX药后偏折4→9、次轮撤；9DAS5L8YM1CN A10猎人四试同瓶恢复后各饮，5敏使手上技法7→12挡，牌后减敏；对虚弱14攻仍恰损2，三次SL恢复药不计新瓶。')

support = set(I['silent-cunning-potion-shiv-capacity']['evidence']) | {N}
cunning = [r for r in A['potions'] if r['run'] in support and (r.get('potion') or {}).get('id') == 'CUNNING_POTION']
capacity = collections.Counter()
for run in support:
    states = [json.loads(line) for line in (O / run / 'states.jsonl').open()]
    sm = {s['ts']: s['state'] for s in states}
    stamps = [s['ts'] for s in states]
    import bisect
    for p in [r for r in cunning if r['run'] == run]:
        before = sm[p['ts']]
        after = states[min(bisect.bisect_right(stamps, p['ts']), len(states) - 1)]['state']
        n0, n1 = len(before['combat']['hand']), len(after['combat']['hand'])
        assert n1 - n0 == min(3, 10 - n0), (run, p['ts'], n0, n1)
        capacity[(n0, n1 - n0)] += 1
partial = sum(n for (h, gain), n in capacity.items() if gain < 3)
full = sum(n for (h, gain), n in capacity.items() if gain == 3)
change('silent-cunning-potion-shiv-capacity', f'狡诈药水有手位时生成3张升级小刀，容量不足只添空位。机制：{{n}}局{len(cunning)}饮，{full}次添3、{partial}次容量不足；8手添2、10手添0仍耗瓶，上限10限本药观测；小刀基础6，力/弱另核。搭配：保留手牌后须核空位，未有穿插用药整战胜线，不定门槛。决定胜负的战斗：{{n}}支持/0反例，单药整战因果未控（n={{n}}）。典型案例：WQZVENQ7DTRP八手连喝添2/0/0仍败；9DAS5L8YM1CN A10盛碗虫T3四手→七手添三刀实打18，毒/开信刀共同零损过轮，整场赢仍2血。')
change('silent-strangle-following-card-hp-loss', '普通紧勒先攻击再建立当轮逐牌失血，技能也兑现后续伤害。机制：已见8攻击及紧勒2，自身不额外触发，后续攻击/技能完成各扣2，次轮消失；限无挡目标，不外推升级/叠层/重放。搭配：零费攻击和完成弃牌的技能增加触发，力只改初攻、毒另计。决定胜负的战斗：{n}支持/0反例，提前施放整战因果未控（n={n}）。典型案例：Q6M2Y34MWKRE骇鳗后两牌各多2；9DAS5L8YM1CN A10草蜢T1紧勒24后生存者/尖啸各2，报24实28；盛碗虫T4报8实12，均完整执行，修模不等挽救末战。')
change('silent-infection-end-turn-block', '感染留手每张在玩家回合结束造成3伤，先付持牌血价再验毒杀。机制：3×张数先耗挡，死亡可阻断敌毒/攻击；严格先后隔离仅历史A10末轮，其他免减伤未知。搭配：牌挡与敌攻共付持牌伤，未结毒不算已伤。决定胜负的战斗：{n}支持/0反例，替弃牌整战因果未控（n={n}）。典型案例：79UCJ0K6R9C1三感染9耗7挡、扣2血先死，敌8血10毒未结；9DAS5L8YM1CN A10扭动虫T3两9攻＋一感染3−10挡实损11，T5一11攻＋3感染、零挡实损14；全战69→17。')
change('silent-ceremonial-beast-threshold-growth-sl', '仪式兽跨现场阈值清横冲与阶段力量，眩晕不等击杀。机制：血量按进阶占位符、横冲阈值读现场PLOW_POWER；低阶150、A9/A10已见160，后段成长另核。搭配：直伤/已结毒推进阶段，仍须覆盖阈值后剩血和攻击。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：NEWRFAYKTQHR A10打击171→158清6力、眩晕；9DAS5L8YM1CN A10 T5从169→159跨160，横冲/6力撤且眩晕，仍需扣159；70→28/T11赢。L2TSFU62Z57Z跨阈值后仍死。')
change('silent-letter-opener-third-skill', '开信刀当前回合同第三次实际技能处额外群伤5，不归技能本身。机制：技能次数与已建被动分源核，敌挡/剩血截断另计，未完成次数不预支。搭配：多技能兼顾牌效和附加伤，毒与小刀另算，不定击杀序。决定胜负的战斗：{n}支持/0反例，遗物整战因果未控（n={n}）。典型案例：5PM6JAQG6FNQ末战第三技能额外扣5、后续毒收敌；9DAS5L8YM1CN A10盛碗虫T3防御→咕嘟冒泡→尖啸成为第三技能，各敌扣5，石虫13血15毒后退出，玩家零损，不能全归遗物。')
change('silent-bubble-bubble-condition', '咕嘟冒泡仅对当前中毒目标补毒，普通/升级9/12，不即时伤。机制：无毒仍耗费零效果，后来施毒不追补；触媒/剩血/限伤另核。搭配：实际初毒、能量与可活结算窗口共同验收。决定胜负的战斗：{n}支持/0反例，单卡整战因果未控（n={n}）。典型案例：5PM6JAQG6FNQ目标无毒空打仍35血；9DAS5L8YM1CN A10盛碗虫T3石虫毒6→15，随后刀/开信刀扣至13血再毒退场，5挡/2血维持；未有倒序受控整战胜线。')
change('silent-snakebite-retained-poison', '蛇咬保留并施毒，不即时扣本体，施毒不吃负力量。机制：普通/升级实加7/10毒，普通基础2费；免费个例来源不外推，结毒后减1、触媒/限伤另核。搭配：到手才可保留，能量和存活窗口共同验收。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：W7BHM8U02RKG负2力蛇咬仍毒1→8、六试0赢；9DAS5L8YM1CN A10盛碗虫T2蛇咬/突然一拳线报13伤损22并兑现，剩2血；同题防御线未执行，不据此称少损5即可通关。')
change('silent-act-transition-missing-hp-heal', '已见A9/A10跨幕按缺失HP的80%向下取整回复。机制：同上限⌊(最大HP−当前HP)×0.8⌋，低阶/其他先古未核，连续boss非跨幕。搭配：营火、事件、遗物与SL恢复分账。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：AD3QSC3P41JU跨幕实回47/40、连boss无回复；9DAS5L8YM1CN A10仪式兽胜28/70，F18到61实回33＝⌊42×0.8⌋，另三火实回94，SL回药不回血。')
rest = next(r for r in json.load((O / 'rest-summary.json').open()) if r['asc'] == 10)
change('silent-rest-buffer-observation', f'观察：实完成回复与后战结果分账。A10 {rest["runs"]}局{rest["rests"]}火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{100*rest["deaths"]/rest["nexts"]:.2f}%），活损中位{rest["median"]}；各阶另列（n={{n}}）。典型案例：9DAS5L8YM1CN A10三休息实回36/36/22共94，一幕boss胜28血；二幕无精英仍2血进猎人败，计划F24营火未到，不能预支枕头回血；替路线/锻造结局未知。')
band = next(r for r in A['bands'] if (r['asc'], r['act'], r['type'], r['band']) == (10, 2, 'Monster', '<25%'))
change('silent-route-hp-observation', f'观察：问号可战，避精英与赢当前战不保证到营火的血药。A10 {rest["runs"]}局二幕Monster以<25%入血{band["n"]}房/{band["runs"]}局、{band["deaths"]}死（{100*band["deaths"]/band["n"]:.2f}%），活损中位{band["median_win"]}；分阶/幕/房型/血档另列（n={{n}}）。典型案例：9DAS5L8YM1CN A10改无精英后投影F21/22/23入口38/28/18，实38/25/2；两战实损13/23、下一战败，F24休息未抵达，未有替路线受控胜线。')
change('silent-deck-burst-observation', '观察：持有能力、短程胜率与后场血药分账。机制：只计实建增益、毒、抽牌和可活轮，未来结算不预支，换战能力重建。搭配：直伤/持续输出与实际挡合核。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：9DAS5L8YM1CN A10扭动虫首题三轮后仍0/4完成却估胜约99%，实T8赢损52；F17取磨蚀拟弃牌免费建增益，实到F22T5才付3能建1敏/4荆棘，胜2血，下战增益撤且四败；替弃牌整战收益未知。')

E['version'] = '2026-10-08.19'
E['_about'] = '静默经验只来自本角色实盘与复盘。第102次增量合并9DAS5L8YM1CN A10；截至2026-10-08T07:19:01.986Z共133完局，旧132局七数组、血档/节点后战、休息回复与SL逐行复算。柔嫩逐牌减属性、临时敏捷牌挡、磨蚀实建与换战重建、感染持牌血价、狡诈生成/容量及紧勒逐牌伤分源核。二幕避精英仍须付到营火的连续血价，四试同线无赢次，不从当轮差1血拟整场通关或药水/SL/终局阈值。经验/账本/代码提案关联独立strategy-proposal，不改打法源码。'

def stats(x):
    active = [e for e in x['entries'] if e['status'] == 'active']
    return dict(active=len(active), chars=sum(len(e['lesson']) for e in active), confidence=dict(collections.Counter(e['confidence'] for e in active)), asc={a: dict(entries=sum(e['asc'][0] <= a <= e['asc'][1] for e in active), chars=sum(len(e['lesson']) for e in active if e['asc'][0] <= a <= e['asc'][1])) for a in [8, 9, 10]})

summary = dict(old_version=B['version'], version=E['version'], added=0, updated=len(C), retired=0, before=stats(B), after=stats(E), evidence=[dict(id=c['id'], evidence=c['after']['evidence'], contradicting=c['after'].get('contradicting', []), by_asc=dict(collections.Counter(R[r]['ascension'] for r in c['after']['evidence']))) for c in C])
assert summary['before']['chars'] < 55000 and summary['after']['chars'] < 55000
K.write_text(json.dumps(E, ensure_ascii=False, indent=2) + '\n')
(O / 'changes.json').write_text(json.dumps(dict(entries=C), ensure_ascii=False, indent=2) + '\n')
(O / 'update-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
(O / 'cunning-capacity.json').write_text(json.dumps(dict(drinks=len(cunning), capacity=[dict(hand=h, gain=g, n=n) for (h, g), n in sorted(capacity.items())]), ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: v for k, v in summary.items() if k != 'evidence'}, ensure_ascii=False))
