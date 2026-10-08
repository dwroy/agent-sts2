import collections
import copy
import json
from pathlib import Path

O = Path(__file__).parent
P = Path('knowledge/characters/silent/experience.json')
E = json.load((O / 'experience-before.json').open())
OLD = copy.deepcopy(E)
A = json.load((O / 'audit.json').open())
R = {r['run_id']: r for r in json.load((O / 'run-metadata.json').open())}
Q, U, B = 'QHK1XQ928TTM', 'UZ1T7AH49WMB', '7BNC8QX746YP'
I = {e['id']: e for e in E['entries']}
C = []

def change(short, runs, text=None):
    ident = 'silent-' + short
    e = I[ident]
    before = copy.deepcopy(e)
    extra = [r for r in runs if r not in e['evidence']]
    e['evidence'].extend(extra)
    e['n_support'] = len(e['evidence'])
    n = e['n_support']
    e['confidence'] = 'high' if n >= 5 and e['n_contradict'] <= n / 3 else 'med' if n >= 2 else 'low'
    e['last_seen'] = '2026-10-08'
    if text:
        e['lesson'] = text.replace('{n}', str(n))
    else:
        e['lesson'] = e['lesson'].replace(f"{before['n_support']}支持", f'{n}支持').replace(f"（n={before['n_support']}）", f'（n={n}）')
    C.append(dict(id=ident, kind='updated', before=before, after=copy.deepcopy(e), new_runs=extra))

change('strength-weak-observation', [Q,U,B], '力量逐击加伤，敏捷逐张加牌挡，临时量与乘区分账。机制：基础加现场力敏后核弱/脆弱，旧挡不倒补。搭配：多击/多挡重复收益，毒与被动挡另算。决定胜负的战斗：{n}支持/0反例，单项整战胜因未控（n={n}）。典型案例：LYBHQ1X230ZB四段1力多4伤；UZ1T7AH49WMB A10同族速度药5敏使脆弱下三挡9→20；7BNC8QX746YP雕像10力25攻施弱后18，18血仍死。')
change('footwork-block', [Q], '步法普通/升级建立2/3敏捷，后续每张挡牌兑现，已有挡不补。机制：基础挡加现场敏捷后核脆弱/倍率，吸取等属性变化另核。搭配：多挡重复受益，没打挡牌无收益。决定胜负的战斗：{n}支持/0反例，单卡整战因果未控（n={n}）。典型案例：9R916WW0V65N六敏无挡牌死；QHK1XQ928TTM A10双蟹末T3步法敏2→4，T4脆弱下冲刺10、两防御各6共22挡，仍对38攻死；未打勒紧不预支。')
change('frail-card-block', [Q,U], '脆弱逐牌缩减格挡，被动挡另核。机制：基础加敏/牌增量后各乘0.75向下取整，不能合挡折减，旧挡不倒补。搭配：多牌逐次核，余像/遗物挡分账。决定胜负的战斗：{n}支持/0反例，单项整战胜因未控（n={n}）。典型案例：Y5H4CFAQ2WTG蜃景4→6、防御3→5；UZ1T7AH49WMB A10同族T2速度药5敏后两防御各7、偏折6共20挡，饮前同三牌共9，抵18攻零损。')
change('noxious-fumes-growth', [Q,U], '毒雾普通/升级建立2/3层，后续玩家轮初补毒。机制：建层不即时施毒，可叠加，制品可阻一次、换战重建。搭配：须活到施毒及结算，负力量不减技能毒层。决定胜负的战斗：{n}支持/0反例，整战单卡胜因未控（n={n}）。典型案例：QHK1XQ928TTM A10蜂群重试T1实建毒雾、T6胜，药/抽弃同变；UZ1T7AH49WMB千足虫末T3才建3层即死，没有下一轮施毒。')
change('accelerant-triggers', [Q,U], '触媒增加毒结算次数，不倍增毒层，普通/升级建1/2且不即时施毒。机制：k层至多k＋1次，每结减1、零停止；普通p≥2为2p−1，升级p≥3为3p−3，限伤/阶段另核。搭配：先实建毒并活到结算，换战重建。决定胜负的战斗：{n}支持/0反例，整战单卡胜因未控（n={n}）。典型案例：GXNKW8X1XYJP恶魔29毒三结84；QHK1XQ928TTM双蟹末T4两敌9/14毒实结17/27共44仍余257血；UZ1T7AH49WMB触媒2无毒即死、收益0。')
change('afterimage-per-card-block', [U], '余像按建立后实际出牌次数补挡，自身首次不触发自己。机制：每1层后续每牌＋1，重放再触发、脆弱不折被动挡。搭配：多牌兑现，牌挡/遗物分账，换战重建。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：H1T1F8ML9FUE脆弱下蜃景重放两次3牌挡＋两次1余像共8；UZ1T7AH49WMB A10千足虫末T3偏折4＋1、触媒1、防御5＋1、毒雾1共13，6血对34攻仍死。')
change('lagavulin-siphon-poison-sl', [Q], '族母吸取压缩直伤/牌挡，已建毒按现场层数结算。机制：已见每次玩家力敏各−2、敌力＋2，负力量不减技能毒层。搭配：实建增益/临时减力与可活轮共同核，不由牌组拥有代替净属性。决定胜负的战斗：{n}支持/0反例，单项胜因未控（n={n}）。典型案例：GXNKW8X1XYJP重打36→2毒胜；QHK1XQ928TTM A10 T8力−1敏1、T10力−3敏−1/敌力4；T12直伤9后32血由毒结束，65→26净损39。')
change('kin-poison-sl-observation', [U], '观察：同族毒/能力须实建结算，固定杀序胜因未控。机制：临时减力仅降当轮，后轮仪式成长另核。搭配：实毒/群伤、牌挡与血池合核。决定胜负的战斗：8场32试4赢，真正重打仍6场30试2赢；A0仅背景、策略只A10（n=7）。典型案例：S9UZAK0JP0C0重试T4清信徒T10胜，抽牌/挡/目标同变；UZ1T7AH49WMB A10首试T9胜54→19，神官仪式后力3/6使同法球9→12→15；T2速度药三牌20挡抵18零损，次轮5敏撤。')
change('kaiser-crab-facing-sl', [Q], '观察：帝王蟹朝向、实毒与血价同核，不定统一杀序。机制：后方攻击/力弱读现场，有限全败不等血价相同；未死部件不预加蟹怒。搭配：输出、真挡及后轮血量共同验收。决定胜负的战斗：{n}支持/0反例，真正重打11场58试2赢（n={n}）。典型案例：K2JAGKVJAWZJ同首29抽、目标/挡同变第二试胜；QHK1XQ928TTM A10第3/6试T3同35血/手牌/敌179及204，均扣47，转打火箭使虫蛰14→20、多损6，T5判死变T4实死；两线均24/24死，不归整战单因。')
change('decimillipede-reattach-poison', [U], '千足虫需伤只加已发生重接，不预加未来复活；旧毒/力不沿用死前值。机制：9局见重接，另1局未死段；净扣含回血抵销，不等总伤，复活量按进阶/现场核。搭配：暂死段仍属本战，按实际毒/挡和血价重算，不定杀序。决定胜负的战斗：{n}支持/0反例，真正重打2场8试0赢、整战顺序胜因未控（n={n}）。典型案例：G33HU22H2543 A10初148、六次各25、八轮胜；UZ1T7AH49WMB四试均15入血，后试首轮同扣38但损14→9，末T3无毒13挡对34实死、三段余6/42/38，没有重接。')
change('sparkling-rouge-turn-three', [Q], '闪亮口红已见第3轮开始提供1力量和1敏捷，不当开场或每轮成长。机制：与彩虹/步法净层数合核，逐击/逐牌兑现，遗物挡独立。搭配：多击与多张挡牌，先核弱/脆弱及其他来源。决定胜负的战斗：{n}支持/0反例，移除遗物整战未控（n={n}）。典型案例：VLZ6CCT8AQ0A口红后步法敏1→3；QHK1XQ928TTM A10双蟹末T3力敏1/1→2/2，步法再敏4；本轮无技能、不新增彩虹，次轮22挡仍死。')
change('shadowmeld-new-block-double', [Q], '融入暗影只翻本轮建立后新增挡，已有挡不补。机制：实建1层后基础加敏再乘2，本身不带挡、轮末撤，脆弱/其他倍率另核。搭配：实际支付并打后续挡牌，不与遗物重复归因。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：K2JAGKVJAWZJ旧7挡不变；QHK1XQ928TTM双蟹末T2一敏下防御实补12、蜃景22共34，盖当轮攻击零损，下轮不保留倍率。')
change('mirage-poison-card-block', [Q], '蜃景按施放时活敌毒总量给牌挡，后来施毒不追补。机制：加现场敏后核脆弱/暗影倍率，施放不耗毒、重放逐次核。搭配：启毒与可活窗口合核，零毒零敏0挡。决定胜负的战斗：{n}支持/0反例，单卡整战未控（n={n}）。典型案例：NEWRFAYKTQHR先毒11挡、倒序4；QHK1XQ928TTM A10双蟹末T2两敌毒7＋3、敏1/暗影1，实补(10＋1)×2＝22，旧12→34；未来挡不预支。')
change('piercing-wail-temporary-strength', [Q,U], '尖啸临时降力按攻击段兑现，次轮恢复重核。机制：普通/升级减6/8，各段核力弱，制品可阻、攻击不降成负伤。搭配：多击逐段减，毒杀另计，不当常驻阻成长。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：AD3QSC3P41JU爆发重放减12力；UZ1T7AH49WMB A10同族减6使14威胁降3，次轮信徒恢复且力舞到3；千足虫T2减6、T3恢复后34攻仍死。')
change('horn-cleat-second-turn-block', [B], '观察：船夹板已见第二轮轮初14挡，不能当每轮固定或敏捷牌挡。机制：轮初已有挡与本轮新增挡分账，不跨轮，额外触发未全隔离。搭配：只覆盖当前攻击，苏醒无攻击时不预留至下轮。决定胜负的战斗：{n}支持/0反例，遗物独立整战胜因未控（n={n}）。典型案例：K3676LU8B0UH两敏仍14；7BNC8QX746YP A10雕像T2已有14加冲刺13成27、苏醒无攻，T3轮初0挡，施弱后18攻仅5挡实损13。')
change('byrdonis-strength-multihit-observation', [B], '异鸟已见领地意识1时轮初力量递增，同招按逐击加力，具体触发未隔离。机制：每段加现场力量后核虚弱，多击放大总威胁。搭配：能力输出与可活轮合核，弱不清力量。决定胜负的战斗：{n}支持局8过1死，单项因果未控（n={n}）。典型案例：T3FW7R2R2306六轮0—5力、三击15→21→27仍死；7BNC8QX746YP A10 T1—4力0/1/2/3，飞扑19→21，多2力多2伤；四轮胜46→10净损36。')
change('speed-potion-temporary-dexterity', [Q,U], '速度药当步加5临时敏捷，只在本轮后续挡牌兑现。机制：逐饮加5、次轮速度层撤，旧挡不补，独立属性变化另核。搭配：多挡逐张加敏再核脆弱，不定喝留门槛。决定胜负的战斗：{n}支持/0反例，单药整战胜因未控（n={n}）。典型案例：UZ1T7AH49WMB A10同族T2两防御各7加偏折6共20，饮前9、多11挡，抵18零损；QHK1XQ928TTM为boss购药先在F31喝，奖励技能补槽，不把已饮瓶当boss库存。')
change('dexterity-potion-card-block', [Q], '敏捷药实饮建2敏捷，已有挡不补。机制：后续牌挡加敏后核脆弱，换战撤；吸取/彩虹/口红另分源。搭配：多挡重复收益，不定喝留时点。决定胜负的战斗：{n}支持/0反例，单药整战因果未控（n={n}）。典型案例：Y5H4CFAQ2WTG脆弱下蜃景4→6、防御3→5；QHK1XQ928TTM A10族母T2饮药，T8玩家力−1敏1、T10力−3敏−1，负敏挡按净属性核，65→26胜。')
pp = json.load((O / 'history-poison_potion.json').open())
normal = sum(r['delta'] == 6 for r in pp)
skull = sum(r['delta'] == 7 for r in pp)
blocked = sum(r['delta'] == 0 for r in pp)
change('poison-potion-observed-application', [Q], f'毒药先加毒，饮用当步不扣本体HP。机制：35局{len(pp)}饮，常态{normal}饮加6、头骨{skull}饮加7、制品{blocked}饮阻毒耗1层；组合外不推。搭配：须活到实结，持牌伤/自损先核，不定喝留门槛。决定胜负的战斗：{{n}}支持/0反例，单药整战未控（n={{n}}）。典型案例：79UCJ0K6R9C1先自死未结毒；QHK1XQ928TTM A10同瓶7实饮、6恢复，boss末T4毒药加6经触媒实结，两敌共44毒伤仍余257血。')
change('act-transition-missing-hp-heal', [Q,U], '已见A9/A10跨幕按缺失HP的80%向下取整回复。机制：同上限⌊(最大HP−当前HP)×0.8⌋，低阶/其他先古未核，连续boss不当跨幕。搭配：营火/事件/药与SL恢复分账，不预支后幕血。决定胜负的战斗：{n}支持/0反例，回复不保证后场胜（n={n}）。典型案例：QHK1XQ928TTM A10族母胜26/70、回35到61；UZ1T7AH49WMB同族胜19/80、回48到67，后两胜共损52、15入千足虫四败。')
bands = next(r for r in A['bands'] if (r['asc'],r['act'],r['type'],r['band']) == (10,2,'Monster','<25%'))
change('route-hp-observation', [Q,U,B], f'观察：胜前战/避可选精英不保证后段血药，问号可战。A10 100局二幕Monster<25%入血{bands["n"]}房/{bands["runs"]}局、{bands["deaths"]}死，活损中位{bands["median_win"]}；分阶/幕/房型/血档另列（n={{n}}）。典型案例：QHK1XQ928TTM F29回36后问号战耗19、末火只到38；UZ1T7AH49WMB跨幕67后两胜损52、15入精英，未到F27不回血；无替线整场因果对照。')
rest = json.load((O / 'rest-summary.json').open())[-1]
change('rest-buffer-observation', [Q,U,B], f'观察：即时回复不等于后战保证，未到营火不预支。A10 100局{rest["rests"]}独立火/{rest["heal"]}回血实回{sum(rest["gains"])},去重{rest["nexts"]}后战{rest["deaths"]}死（{100*rest["deaths"]/rest["nexts"]:.2f}%），活损中位{rest["median"]}；各阶另列（n={{n}}）。典型案例：7BNC8QX746YP F13实回21至31，雕像仍死；boss投影24不是下一精英31，F9升级冲刺10→13确已兑现，无另一营火选择整场对照。')
change('deck-burst-observation', [Q,U,B], '观察：取得能力、实际建立、收益兑现与整战结果分核，不由数量推输出闭环。机制：只计实建增益/已结毒及可活轮，换战重建，自损不由挡代付。搭配：启动须到手可支付，当前真挡与血价合核。决定胜负的战斗：{n}支持/0反例，整战单因未控（n={n}）。典型案例：UZ1T7AH49WMB A10两毒雾两触媒在牌组，千足虫四试没有已结毒，末T3实建3/2即死；QHK1XQ928TTM蜂群重试改能力/药/抽弃后胜、不只归省6血。')

def add(ident, scope, name, evidence, text):
    n = len(evidence)
    e = dict(id='silent-'+ident, scope=scope)
    if name:
        e['name'] = name
    e.update(asc=[0,20], lesson=text.replace('{n}',str(n)), evidence=evidence, n_support=n, n_contradict=0, confidence='high' if n>=5 else 'med' if n>=2 else 'low', last_seen='2026-10-08', status='active')
    assert e['id'] not in I
    E['entries'].append(e)
    C.append(dict(id=e['id'], kind='added', before=None, after=copy.deepcopy(e), new_runs=evidence))

rainbow = list(dict.fromkeys(r['run'] for r in json.load((O/'history-rainbow.json').open())))
add('rainbow-ring-three-card-types', 'relic:RAINBOW_RING', '彩虹戒指', rainbow, '彩虹戒指在同轮凑齐攻击/技能/能力后加1力1敏，不是固定每轮成长。机制：首次凑齐触发，后续同类不重复，缺类不触发；力敏与口红/药分源。搭配：多击/多挡重复收益，额外出牌仍验血价。决定胜负的战斗：{n}支持/0反例，遗物单项整战未控（n={n}）。典型案例：XTSV1U9JD34T A10 F45T3触媒/中和/毒雾后冒泡使力0→1敏2→3；QHK1XQ928TTM双蟹末T1防御/毒雾/打击后0/0→1/1，T2缺攻击无新层，22挡仍不足末激光。')
offering = list(dict.fromkeys(r['run'] for r in json.load((O/'history-offering.json').open())))
add('offering-direct-hp-cost', 'card:OFFERING', '祭品', offering, '祭品付生命换能量/抽牌，已有挡不抵6血，收益按实际重问后执行核。机制：两局16次各−6血且原挡不变、能量＋2；抽3/升级5见牌面，不预定抽牌结果。搭配：先验血池再核实际到手可打收益，不由有限死率判净赚。决定胜负的战斗：{n}支持/0反例，省血整战胜因未控（n={n}）。典型案例：UMVLWER4CD98 A10 F35T2 88→82、7挡仍7；QHK1XQ928TTM双蟹末T4 15→9仍16挡，再腐化附魔撞击9→7仍22挡、总自损8；只确认本局附魔，不推广所有附魔。')
effigy = [r['run'] for r in json.load((O/'history-effigy.json').open()) if r['supported']]
add('bygone-effigy-wake-strength', 'elite:BYGONE_EFFIGY', None, effigy, '雕像沉睡后苏醒无攻，下一玩家轮已10力斩击，前轮挡不跨轮。机制：27局见睡/醒/10力序列；基础伤A0 {@0:DMG:BYGONE_EFFIGY:SLASHES_MOVE}、A10 {@10:DMG:BYGONE_EFFIGY:SLASHES_MOVE}再核力弱，缓慢公式未隔离。搭配：船夹板T2已有挡和当轮新增挡分账，短方案排名不代表追加出牌后整战。决定胜负的战斗：{n}支持/0反例，固定打法胜因未控（n={n}）。典型案例：Y6GM2CHWJBEY A0 F9T3十力23攻；7BNC8QX746YP A10 T2合27挡无攻、T3归零，T4 25施弱18仍杀18血，敌余17；原单牌1/8后追加冲刺，未执行原短线整战。')

E['version'] = '2026-10-08.23'
E['_about'] = '静默经验只来自本角色实盘与复盘。第106次增量合并QHK1XQ928TTM、UZ1T7AH49WMB、7BNC8QX746YP三局A10；截至2026-10-08T11:10:45.196Z共140完局，旧137局七数组/血档/节点后战/休息/SL复算一致。新增彩虹三类触发、祭品直接血价、雕像苏醒增力；历史另核3局彩虹、2局16次祭品和27局雕像，不借其他角色知识。能力实建不等已结毒、胜前场不免血药支出，全败SL仍有局部血价；原短线参考不代表追加出牌后的实线。相关经验/账本/代码提案交独立strategy-proposal，不改打法源码或其他角色。'
P.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(dict(entries=C),ensure_ascii=False,indent=2)+'\n')
def size(x):
    active=[e for e in x['entries'] if e['status']=='active']
    return dict(active=len(active),chars=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),by_asc={str(a):dict(entries=len(t:=[e for e in active if e['asc'][0]<=a<=e['asc'][1]]),chars=sum(len(e['lesson']) for e in t)) for a in [8,9,10]})
result=dict(before=size(OLD),after=size(E),added=sum(c['kind']=='added' for c in C),updated=sum(c['kind']=='updated' for c in C),retired=0)
assert result['after']['chars'] <= 60000
(O/'update-summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
