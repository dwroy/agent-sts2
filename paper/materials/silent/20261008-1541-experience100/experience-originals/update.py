import collections
import copy
import json
from pathlib import Path

O = Path(__file__).parent
K = Path('knowledge/characters/silent/experience.json')
N = 'H1T1F8ML9FUE'
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

change('silent-strength-weak-observation', '力量逐击加伤，敏捷逐张加牌挡，乘区与来源分账。机制：现场力/敏后核弱、脆弱，旧挡不倒补，临时量与成长另核。搭配：多击/多挡重复受益，毒与被动挡另算。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：LYBHQ1X230ZB四攻击段1力共多4伤；H1T1F8ML9FUE A10沙漏T3→T4力0→4，同招26→30，前轮虚弱已撤；F24两敏防御5→7另余像1挡。')
change('silent-mirage-poison-card-block', '蜃景按现场存活敌毒总量给牌挡，后施毒不追补。机制：加敏后核脆弱，施放不耗毒；零毒零敏0挡，重放逐次核。搭配：施毒时序、余像与持牌血价分账。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：NEWRFAYKTQHR先毒蜃景11挡，倒序仅4；H1T1F8ML9FUE A10 F45T5五毒脆弱、蜃景+重放共6牌挡另2余像；沙漏第4试T3零毒换防御同伤12、损0→3，六试无赢。')
change('silent-haze-group-poison-weak', '迷雾群毒与当轮虚弱分账，施放不即时扣本体。机制：普通/升级4/6毒及1/2弱，结束结毒再减1，制品逐项阻减益，弱不清成长。搭配：爆发增加次数，仍需活到结算。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：LYBHQ1X230ZB迷雾+弱化28→20仍死；H1T1F8ML9FUE A10末沙漏T3尖啸耗一制品、迷雾毒耗另一，虚弱才建1、毒仍0；次轮弱撤而敌4力30攻。')
change('silent-wither-end-turn-loss', '凋萎末回合伤与攻击/格挡合核，毒斩杀仍可留持牌失血。机制：核现场3/6/9/12文本及末持牌数，不补缺帧内部全序。搭配：弃牌改变血价，重放新增持牌与实际挡一起核。决定胜负的战斗：{n}支持/0反例（n={n}）。典型案例：TXZ6RVMQA09D毒杀仍持牌损7；H1T1F8ML9FUE A10沙漏第3/4试T3防御换零挡蜃景，同伤12却多损3；末T4新牌已6伤，34血0挡对30＋6需损36，至少差3血才能活。')
change('silent-noxious-fumes-growth', '毒雾普通/升级建立2/3层，后续玩家轮初补毒。机制：建层不即时施毒，可叠加；头骨/制品及触媒另核。搭配：须实建并活到结算，换战重建，晚建不预支输出。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：NEWRFAYKTQHR建2后下一玩家轮补2；H1T1F8ML9FUE A10沙虫胜次T5建3、T9敌18血20毒实胜；末沙漏T4才建3，敌0毒、下一轮未到。')
change('silent-accelerant-triggers', '触媒增加毒结算次数，不倍增毒层，普通/升级建1/2且不即时施毒。机制：k层至多k＋1次，每结减1、零停止；普通p≥2为2p−1、升级p≥3为3p−3，限伤/阶段另核。搭配：先建毒并活到结算，换战重建。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：GXNKW8X1XYJP恶魔29毒三结84；H1T1F8ML9FUE A10沙虫建1配毒雾3实胜，末沙漏T4建1但毒0且死，未来双结未兑现。')
change('silent-afterimage-per-card-block', '余像按建立后实际出牌次数补挡，自身首次不触发自己。机制：每1层后续每牌＋1，重放再触发，脆弱不折被动挡。搭配：多牌兑现，牌挡/遗物另计，换战重建。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：9R916WW0V65N首boss有余像、女王未建不继承；H1T1F8ML9FUE A10 F45T5蜃景重放，脆弱下两次3牌挡＋两次1余像共8；末19挡对28实损9。')
change('silent-serpent-form-per-card-damage', '群蛇形态建立后每次实际出牌向随机一敌补4/6伤，挡牌也触发。机制：建立、未来触发与已伤分账，盾和本体逐步核，不把随机输出固定分给目标。搭配：多牌与抽牌/能量须能兑现。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：5PM6JAQG6FNQ恶魔毒雾/触媒/群蛇共同胜；H1T1F8ML9FUE A10 F45T3防御和零毒蜃景各触发4扣盾；T5重放合8先扣4盾再扣4本体，临时3力量次轮撤但群蛇4留。')
change('silent-piercing-wail-temporary-strength', '尖啸临时降力按攻击段兑现，次轮恢复重核。机制：普通/升级减6/8，各段核现场力/弱，攻击不降到负伤，制品可阻减力。搭配：多敌/多击受益，仍需实际挡，不当常驻防御。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：G8NHLL09DLBX三幼虫与母体23攻→2、次轮撤；H1T1F8ML9FUE A10末沙漏T3尖啸只耗一制品不建负力，T4敌4力30攻，不能预支减力。')
change('silent-scroll-paper-cuts-unblocked', '咬人卷轴纸伤难愈2按未完全挡住的攻击次数降生命上限。机制：每次漏伤降2上限，全挡一击不降，多段按漏伤击数核；仅验证2层。搭配：逐击挡、当前血和上限分账，不把上限减少再加作HP净损。决定胜负的战斗：{n}支持/0反例，无替打法胜线（n={n}）。典型案例：YLYLZWHA0GKU A10五漏击70→60；H1T1F8ML9FUE A10 F35漏伤令70→68→64，净损11、61→50；F46全战33血且max64不降。')

dex = [r for r in A['potions'] if (r.get('potion') or {}).get('id') == 'DEXTERITY_POTION']
new_dex = [r for r in dex if r['run'] == N]
assert len(new_dex) == 2
assert all(r['after']['powers'].get('DEXTERITY_POWER',0) - r['before']['powers'].get('DEXTERITY_POWER',0) == 2 for r in new_dex)
change('silent-dexterity-potion-card-block', '敏捷药水实饮建2敏捷，已有挡不倒补。机制：新局两饮均＋2，后续每挡牌加敏再核脆弱，换战撤；历史逐饮核验另列。搭配：多挡牌重复收益，其他挡源另计，不定喝留时点。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：9R916WW0V65N首boss药敏次战撤；H1T1F8ML9FUE A10 F24T2建2，防御5→7加余像1、挡12→20；全战无损还有瓶中船10挡，未控单药胜因、留药胜线未知。')

support = set(I['silent-aeonglass-artifact-growth-sl']['evidence']) | {N}
groups = collections.defaultdict(list)
for row in A['attempts']:
    if row['run'] in support:
        enemies = next(f['enemies'] for f in A['fights'] if f['run'] == row['run'] and f['floor'] == row['floor'])
        if 'AEONGLASS' in enemies:
            groups[(row['run'],row['floor'])].append(row)
multi = [v for v in groups.values() if max(x['attempt'] for x in v) > 1]
a10 = [v for v in multi if R[v[0]['run']]['ascension'] == 10]
sl_text = f'全阶重打{len(multi)}场{sum(len(v) for v in multi)}试{sum(x["result"]=="won" for v in multi for x in v)}赢，A10为{len(a10)}场{sum(len(v) for v in a10)}试{sum(x["result"]=="won" for v in a10 for x in v)}赢'
change('silent-aeonglass-artifact-growth-sl', '观察：沙漏制品、力量、持牌伤与真实启毒窗口合核，首boss胜还须交接资源。机制：毒/弱从实建算，凋萎按现场末持牌，能力换战重建。搭配：有限推演全死不作SL必死证据，同盘换线并记血价。决定胜负的战斗：{n}支持/0反例，'+sl_text+'（n={n}）。典型案例：H1T1F8ML9FUE A10六试均52/64空药、0赢；T2保血省3但少2伤，T3零毒蜃景换防御多损3同伤12；末T4敌402、34血对30＋6实死，无完整替代胜线。')
support = set(I['silent-insatiable-dual-clock']['evidence']) | {N}
groups = collections.defaultdict(list)
for row in A['attempts']:
    if row['run'] in support and any(f['run'] == row['run'] and f['floor'] == row['floor'] and 'THE_INSATIABLE' in f['enemies'] for f in A['fights']):
        groups[(row['run'],row['floor'])].append(row)
multi = [v for v in groups.values() if max(x['attempt'] for x in v) > 1]
change('silent-insatiable-dual-clock', '沙虫沙坑与攻击分别核，延长不等挡攻击，未来毒不预支。机制：逃离已见加1，沙坑归零判死；毒按实结与剩血核。搭配：弃牌不能删掉仍需的全部逃离，当前血/挡与可活输出同时验收。决定胜负的战斗：{n}支持/0反例，'+f'重打{len(multi)}场{sum(len(v) for v in multi)}试{sum(x["result"]=="won" for v in multi for x in v)}赢'+'，整战因果未控（n={n}）。典型案例：H1T1F8ML9FUE A10首试T6弃唯一逃离、T7沙坑1判死；第二试T9敌18血20毒仍先延1→2、余像1挡后毒胜28血，无不延长实战对照。')
change('silent-act-transition-missing-hp-heal', '已见A9/A10跨幕按缺失HP的80%向下取整回复。机制：同上限⌊(最大HP−当前HP)×0.8⌋，低阶/其他先古未核；连续boss非跨幕。搭配：营火、遗物、事件与SL恢复分账。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：LYBHQ1X230ZB五轮书先回20、先古另16；H1T1F8ML9FUE A10先古5→57回52、28→61回33，各为⌊缺血×0.8⌋；SL六次恢复不算回血。')
rest = next(r for r in json.load((O/'rest-summary.json').open()) if r['asc'] == 10)
change('silent-rest-buffer-observation', f'观察：实完成回复和后战结果分账。A10 {rest["runs"]}局{rest["rests"]}火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{100*rest["deaths"]/rest["nexts"]:.2f}%），活损中位{rest["median"]}；各阶另列（n={{n}}）。典型案例：H1T1F8ML9FUE A10九火八休息实回162，末火33→52后沙漏六试无赢；替路线/锻造整场结局未知。')
band = next(r for r in A['bands'] if (r['asc'],r['act'],r['type'],r['band']) == (10,2,'Unknown','<25%'))
change('silent-route-hp-observation', f'观察：问号可战，避精英与赢当前战不保证后场血药。A10 {rest["runs"]}局二幕Unknown以<25%入血{band["n"]}房/{band["runs"]}局、{band["deaths"]}死（{100*band["deaths"]/band["n"]:.2f}%），活损中位{band["median_win"]}；分阶/幕/房型/血档另列（n={{n}}）。典型案例：H1T1F8ML9FUE A10二幕无精英仍损92；三幕50→29、48→34、53→33，三休息才52空药入沙漏败；无替路线受控胜线，不定安全血线。')
change('silent-deck-burst-observation', '观察：能力、当前胜率与后场血药分账。机制：只计实建能力、毒、抽牌和可活轮，未来结算不预支。搭配：持续输出与真实挡合核，全败推演换线仍计血价。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：H1T1F8ML9FUE A10沙虫毒雾3/触媒1/余像1实胜28血；沙漏T4才建雾与触媒、0毒未到下轮，零毒蜃景换防御多损3同伤12；38张牌持有能力不等已启动，留药或换序完整胜线未知。')

E['version'] = '2026-10-08.17'
E['_about'] = '静默经验只来自本角色实盘与复盘。第100次增量合并H1T1F8ML9FUE A10及14:39勘误；截至2026-10-08T06:10:52.521Z共131完局，旧130局七数组、血档/节点后战、实回复及SL逐行复算。人工制品与实际启毒、凋萎持牌血价、蜃景/余像/群蛇重放分源，赢战出口HP/药水与营火资源链补证。沙漏六试无赢次，局部收益不冒称整场反事实或胜因。经验/账本/代码提案关联独立strategy-proposal，不改打法源码。'

def stats(x):
    active = [e for e in x['entries'] if e['status'] == 'active']
    return dict(active=len(active), chars=sum(len(e['lesson']) for e in active), confidence=dict(collections.Counter(e['confidence'] for e in active)), asc={a:dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in active), chars=sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]})

summary = dict(old_version=B['version'], version=E['version'], added=0, updated=len(C), retired=0, before=stats(B), after=stats(E), evidence=[dict(id=c['id'], evidence=c['after']['evidence'], contradicting=c['after'].get('contradicting',[]), by_asc=dict(collections.Counter(R[r]['ascension'] for r in c['after']['evidence']))) for c in C])
assert summary['before']['chars'] < 55000 and summary['after']['chars'] < 55000
K.write_text(json.dumps(E, ensure_ascii=False, indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(dict(entries=C), ensure_ascii=False, indent=2)+'\n')
(O/'update-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2)+'\n')
(O/'dexterity-actions.json').write_text(json.dumps(dex, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k != 'evidence'}, ensure_ascii=False))
