import collections
import copy
import json
from pathlib import Path

O = Path(__file__).parent
B = json.load((O / 'experience-before.json').open())
E = copy.deepcopy(B)
I = {e['id']: e for e in E['entries']}
A = json.load((O / 'audit.json').open())
R = {r['run_id']: r for r in json.load((O / 'run-metadata.json').open())}
N = ['BJLTVSYXCSGS', 'Y5H4CFAQ2WTG']
C = []
M = {}

def change(eid, runs, text, ledgers):
    e = I[eid]
    before = copy.deepcopy(e)
    for run in runs:
        assert run not in e['evidence'] and R[run]['character'].lower() == 'silent'
        e['evidence'].append(run)
    e['n_support'] = len(e['evidence'])
    e['last_seen'] = '2026-10-08'
    e['lesson'] = text.replace('{n}', str(e['n_support']))
    n, z = e['n_support'], e['n_contradict']
    e['confidence'] = 'high' if n >= 5 and z <= n / 3 else 'med' if n >= 2 else 'low'
    C.append(dict(id=eid, before=before, after=copy.deepcopy(e), new_runs=runs))
    M[eid] = ledgers

change('silent-strength-weak-observation', N, '力量逐击加伤，敏捷逐张加牌挡，乘区与来源分账。机制：现场力/敏后核弱、脆弱，旧挡不倒补，临时量另核。搭配：多击/多挡重复受益，毒与被动挡另算。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：LYBHQ1X230ZB四攻击段1力共多4伤；Y5H4CFAQ2WTG A10沙虫同双击在力3/6时12×2/15×2，多3力多6威胁；BJLTVSYXCSGS方柱力2→4，单击10→12，末试仍死。', ['silent-0012'])
change('silent-footwork-block', [N[0]], '步法普通/升级建立2/3敏捷，后续每张挡牌兑现，已有挡不补。机制：基础挡加现场敏捷后核脆弱及倍率，柔嫩等属性变化另核。搭配：多挡牌重复受益，未打挡牌无收益。决定胜负的战斗：{n}支持/0反例，单卡整战因果未控（n={n}）。典型案例：9R916WW0V65N六敏无挡牌死；BJLTVSYXCSGS A10巨斧T1建2敏后复制防御+各10、共20，比无敏两次8多4，保住21血；后轮脆弱另核，整场净损9。', ['silent-0005'])
change('silent-frail-card-block', N, '脆弱逐牌缩减格挡，被动挡另核。机制：基础挡加敏捷/牌增量后各乘0.75向下取整，不能合挡折减，旧挡不倒补。搭配：多牌/重放逐次核，余像/覆甲/遗物挡分账。决定胜负的战斗：{n}支持/0反例，单项整战因果未控（n={n}）。典型案例：ZTRGYYMLR8SC两防御各3合6挡仍死；Y5H4CFAQ2WTG A10虱祖T3脆弱下饮2敏，蜃景4→6、防御3→5，合11挡对17损6；BJLTVSYXCSGS末T3防御⌊(5+1)×0.75⌋=4仍死。', ['silent-0005'])
change('silent-noxious-fumes-growth', [N[0]], '毒雾普通/升级建立2/3层，后续玩家轮初补毒。机制：建层不即时施毒，可叠加；制品可挡一次补毒，换战重建。搭配：须活到实际结算，力量被减不改变毒层。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：NEWRFAYKTQHR建2后下一轮补2；BJLTVSYXCSGS A10族母建三雾合6，吸取后力敏各−2、三挡合15少6，但T10敌40/毒51无出牌毒胜；末构装体制品推迟启毒，不能据此否定构筑。', ['silent-0011'])
change('silent-accelerant-triggers', [N[0]], '触媒增加毒结算次数，不倍增毒层，普通/升级建1/2且不即时施毒。机制：k层至多k＋1次，每结减1、零停止；普通p≥2为2p−1、升级p≥3为3p−3，限伤/阶段另核。搭配：先建毒并活到结算，换战重建。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：GXNKW8X1XYJP恶魔29毒三结84；BJLTVSYXCSGS A10构装体首两试T2触媒+使方柱6毒三结、13/12血退；末试未建只扣6、该方柱到T3仍16血，目标亦变，不归单因。', ['silent-0027'])
change('silent-outbreak-immediate-poison', [N[0]], '毒性爆发加毒后立即结算，逐敌算毒与本体扣血。机制：普通/升级加9/12，原有毒一并结算后减1；触媒额外次数、制品与限伤另核，实伤按剩血截断。搭配：已有毒/触媒放大即时伤，轮末毒与遗物分账。决定胜负的战斗：{n}支持/0反例，单牌整战胜因未控（n={n}）。典型案例：LLYSRQQ35AVW A8触媒2下每敌9+8+7=24、残6毒；BJLTVSYXCSGS A10蟹T5毒雾/触媒配爆发，本体净进度227含即发毒、轮末毒及轮初抱抱，T6胜9血，不能全记卡牌直伤。', ['silent-0037'])
change('silent-lagavulin-siphon-poison-sl', [N[0]], '族母吸取压缩直接伤/牌挡，已建毒按现场层数结算。机制：已见每次玩家力敏各−2、敌力+2，负力量不减技能毒层。搭配：到手能力、来袭和可活轮共同核，重打抽牌改变另列。决定胜负的战斗：{n}支持/0反例，单项胜因未控（n={n}）。典型案例：GXNKW8X1XYJP重打36→2毒胜；BJLTVSYXCSGS A10三雾建6，T7吸取后力敏各−2、敌力2，防御/防御+/生存者实3+6+6=15；T10敌40/毒51不出牌毒胜14血，药回血及战后增长分账。', ['silent-0030'])
change('silent-construct-artifact-growth', [N[0]], '构装体制品与方柱力量成长分别核，毒进度不代替存活余量。机制：按目标剥制品后才建弱/毒，方柱后轮力与意图读现场；已结毒按剩血截断。搭配：施毒、活敌攻击和真实挡分账，单拳击与三体群分列，不定目标序。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：Q6M2Y34MWKRE单拳击2血恰损2死；BJLTVSYXCSGS A10三试均12血空药，三体各1制品，雾先耗后才建毒；末T2方柱力2/10攻、T3力4/12攻，毒退两体后仍需损8，三试0赢。', ['silent-0025', 'silent-0079'])
change('silent-expose-vulnerable', [N[0]], '暴露普通/升级均保留消耗，易伤与清挡/制品分别核。机制：已见易伤2/3，后续攻击核1.5倍；历史两局同一步清挡与全部制品，内部顺序未隔离。搭配：本战复用受消耗限制，后续攻击/施毒实际兑现才计收益。决定胜负的战斗：{n}支持/0反例，清制品子证据仍2局，单牌胜因未控（n={n}）。典型案例：53FLQ68CETW0沙漏重放清33挡/2制品、易伤6；BJLTVSYXCSGS A10末试T2普通暴露去拳击8挡、施2易伤而HP50不变，后打击+18/打击13；末仍败，不称换目标必胜。', ['silent-0208'])
change('silent-iron-club-four-card-draw', [N[0]], '铁棒每累计出4张牌抽1张，计数跨回合。机制：已见第4/8/24张额外抽1，牌自身抽弃另计，重放/自动出牌计数未核。搭配：新增手牌后重核，不能预定抽入牌或保证空堆。决定胜负的战斗：{n}支持/0反例，无移除遗物或换序整战对照（n={n}）。典型案例：SADL3CGYTGSR沙漏第24张抽1、持牌血价另核；BJLTVSYXCSGS A10构装体首/末试T2计数3经防御跨4额外抽蜃景，均重问；末试改目标多挡仍多损3，抽牌不保证胜线。', ['silent-0122'])
change('silent-mr-struggles-turn-start-damage', [N[0]], '抱抱先生轮初自动伤与卡牌、毒、荆棘分账。机制：现场文本轮初对全体造成当前回合数伤害，按剩血截断，不预支死亡后触发；多遗物同窗缺帧不强拆。搭配：逐轮活敌与实际窗口核对。决定胜负的战斗：{n}支持/0反例，移除遗物整战胜负未知（n={n}）。典型案例：NHA2KW0RB7VP蟹T2两侧各扣2；BJLTVSYXCSGS A10构装体T3无毒方柱58→55实3，另有毒结/补毒；末敌剩51血仍杀玩家，不能把该3记为卡牌伤或未来救命。', ['silent-0162'])
change('silent-dexterity-potion-card-block', N, '敏捷药水实饮建2敏捷，已有挡不倒补。机制：后续牌挡加敏再核脆弱，换战撤；历史逐饮分账。搭配：多挡牌重复收益，其他来源另计，不定喝留时点。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：H1T1F8ML9FUE两饮各＋2、防御5→7另余像1；Y5H4CFAQ2WTG A10虱祖T3饮前旧挡0，脆弱下蜃景4→6、防御3→5，实11挡抵17损6，下一场无这2敏；BJLTVSYXCSGS盛碗虫亦实饮，未有留药整战对照。', ['silent-0276'])
change('silent-mirage-poison-card-block', N, '蜃景按施放时活敌毒总量给牌挡，后施毒不追补。机制：加敏后核脆弱，施放不耗毒，重放逐次核。搭配：启毒和真实存活窗口合核，零毒零敏0挡。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：NEWRFAYKTQHR先毒11挡、倒序4；Y5H4CFAQ2WTG A10沙虫T10毒23，蜃景23+防御5=28，对30攻/1血仍死；BJLTVSYXCSGS末试T2毒6+敏1给7挡，却未杀方柱，三敌32攻仍损10。', ['silent-0010'])
change('silent-piercing-wail-temporary-strength', [N[1]], '尖啸临时降力按攻击段兑现，次轮恢复重核。机制：普通/升级减6/8，各段核力/弱，制品可阻减力，攻击不降到负伤。搭配：群攻/多击受益，毒杀攻击者另计，不当常驻关停成长。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：AD3QSC3P41JU女王爆发重放减12力、次轮撤；Y5H4CFAQ2WTG A10沙虫T5力3→−3并虚弱，当轮少攻，T6力恢复3；T9已力6/15×2、实损30，不能把临时减力当持续防御。', ['silent-0046'])
change('silent-insatiable-dual-clock', [N[1]], '沙虫沙坑与攻击分别核，延长不等挡攻击，未来毒不预支。机制：逃离已见加1，沙坑归零判死；毒按实结与剩血核。搭配：保留仍需逃离，血/挡与可活输出共同验收。决定胜负的战斗：{n}支持/0反例，历史重打12场46试7赢，本局未重载（n={n}）。典型案例：H1T1F8ML9FUE第二试延1→2后毒胜；Y5H4CFAQ2WTG A10首试T10逃离1→2、结算后沙坑仍1，1血/28挡对30实死，敌23毒结后剩71；未知重抽超集可活不证明实际抽序胜。', ['silent-0018'])
change('silent-giant-explosion-window', [N[1]], '巨兽本体结束后仍须承受自爆，击杀时点与当轮血挡共同验收。机制：A10已见蒸汽T2=20后每轮+3，本体结束固定下一轮自爆；血{@2:HP:WATERFALL_GIANT}，999999999残壳不计新需伤。搭配：本体毒、回复与残壳攻击分账，真实挡/弱化可降血价，打残壳不消爆。决定胜负的战斗：{n}支持/0反例，提前击杀整战胜因未隔离（n={n}）。典型案例：G8NHLL09DLBX末试自爆56弱成42、损33剩1；Y5H4CFAQ2WTG A10 T8本体14被44毒结束，T9自爆38对两防御10挡损28，46→18胜，整战净损41。', ['silent-0017'])
change('silent-tingsha-discard-damage', [N[1]], '观察：铜钹弃牌附加伤与原牌攻击分账。机制：历史7局107次单弃，100次一敌HP/挡合减3，另7次Vantom滑溜同现减1，未隔离因果；新局确认五弃合15，仅一敌，不推随机分配规律。搭配：完成弃牌才计，未执行不预支。决定胜负的战斗：{n}支持/0反例，单遗物整战胜因未控（n={n}）。典型案例：ZTRGYYMLR8SC同族投掷后弃打击额外3仍败；Y5H4CFAQ2WTG A10沙虫T1赌博筹码确认五弃341→326实15，T3生存者弃打击214→211实3，与直伤/毒分账。', ['silent-0284'])
change('silent-act-transition-missing-hp-heal', N, '已见A9/A10跨幕按缺失HP的80%向下取整回复。机制：同上限⌊(最大HP−当前HP)×0.8⌋，低阶/其他先古未核，连续boss非跨幕。搭配：营火、事件、遗物与SL恢复分账。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：AD3QSC3P41JU跨幕47/40、连boss无回复；BJLTVSYXCSGS A10跨幕14/71→59、9/83→68实回45/59，另五火111；Y5H4CFAQ2WTG 18/70→59实回41，另四火84。', ['silent-0243'])
rest = next(r for r in json.load((O / 'rest-summary.json').open()) if r['asc'] == 10)
band = next(r for r in A['bands'] if (r['asc'], r['act'], r['type'], r['band']) == (10, 2, 'Monster', '<25%'))
change('silent-rest-buffer-observation', N, f'观察：实际回复与下一战分账，不预支未到营火。A10 {rest["runs"]}局{rest["rests"]}火/{rest["heal"]}回血实回{sum(rest["gains"])},去重{rest["nexts"]}后战{rest["deaths"]}死（{100*rest["deaths"]/rest["nexts"]:.2f}%），活损中位{rest["median"]}；分阶另列（n={{n}}）。典型案例：BJLTVSYXCSGS五休息补111，F32回61、蟹胜9血，但F43未抵达；Y5H4CFAQ2WTG F29锻造不回血、F32回21后59血仍败，替选择整段胜负未知。', ['silent-0020'])
change('silent-route-hp-observation', N, f'观察：问号可战，胜当前战/避精英不保证到营火的血药。A10 {rest["runs"]}局二幕Monster以<25%入血{band["n"]}房/{band["runs"]}局、{band["deaths"]}死（{100*band["deaths"]/band["n"]:.2f}%），活损中位{band["median_win"]}；分阶/幕/房型/血档另列（n={{n}}）。典型案例：BJLTVSYXCSGS改F40火为问号、下火F43，事件主动战20→21再巨斧21→12、末42败；Y5H4CFAQ2WTG F31问号44→38后火补21进boss，替路线未实打。', ['silent-0019'])
change('silent-deck-burst-observation', N, '观察：开场爆发、已建能力、短程胜率与后场血药分账。机制：只计实际毒/能力/抽牌和可活轮，未来结算不预支，换战重建。搭配：即时伤/持续输出与实际挡合核。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：BJLTVSYXCSGS A10三雾/触媒蟹模拟0胜，实T5净进度227、T6胜9血，早轮仍损12/34；Y5H4CFAQ2WTG沙虫前两轮127、T4才启毒、十轮270尚缺71，未取得能力组件不是已证选牌错误。', ['silent-0021'])
change('silent-kaiser-crab-facing-sl', [N[0]], '观察：帝王蟹朝向、毒/能力与即时血价同核，固定击杀序胜因未控。机制：后方攻击、力/弱读现场，毒实结、换战重建。搭配：输出与真实挡合核，有限全败不等实际必败或血价相同。决定胜负的战斗：{n}支持/0反例，历史真正重打10场52试2赢，本局首试赢（n={n}）。典型案例：K2JAGKVJAWZJ同首29张抽序但目标/减力/挡同变，第二试胜28；BJLTVSYXCSGS A10模拟512样本0胜，实61→9/T6胜，需血408/359/347/309/249/22与进度49/12/38/60/227/22分账，不拟固定输出。', ['silent-0079', 'silent-0021'])

E['version'] = '2026-10-08.20'
E['_about'] = '静默经验只来自本角色实盘与复盘。第103次增量合并BJLTVSYXCSGS/Y5H4CFAQ2WTG两局A10；截至2026-10-08T08:26:07.074Z共135完局，旧133局七数组、血档/节点后战、休息与SL复算一致。力敏/脆弱、毒雾/触媒/蜃景、制品/临时减力、自爆/沙坑攻击与遗物分源核。三试构装体零赢不拟改线必胜，模拟0胜不当实盘必败，未得能力不当已证选牌错误。连续血药和未到营火不预支。相关经验/账本/代码提案关联独立strategy-proposal，不改打法源码；纯抽牌识别bug留代码记录。'

def stats(x):
    a = [e for e in x['entries'] if e['status'] == 'active']
    return dict(active=len(a), chars=sum(len(e['lesson']) for e in a), confidence=dict(collections.Counter(e['confidence'] for e in a)), asc={k:dict(entries=sum(e['asc'][0]<=k<=e['asc'][1] for e in a), chars=sum(len(e['lesson']) for e in a if e['asc'][0]<=k<=e['asc'][1])) for k in [8,9,10]})

summary = dict(old_version=B['version'], version=E['version'], added=0, updated=len(C), retired=0, before=stats(B), after=stats(E), evidence=[dict(id=c['id'], evidence=c['after']['evidence'], contradicting=c['after'].get('contradicting', []), by_asc=dict(collections.Counter(R[r]['ascension'] for r in c['after']['evidence']))) for c in C])
assert summary['before']['chars'] < 55000 and summary['after']['chars'] < 55000
Path('knowledge/characters/silent/experience.json').write_text(json.dumps(E, ensure_ascii=False, indent=2)+'\n')
for name, value in [('changes', dict(entries=C)), ('update-summary',summary), ('ledger-map',M)]:
    (O/(name+'.json')).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k!='evidence'},ensure_ascii=False))
