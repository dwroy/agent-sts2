import collections
import copy
import json
import subprocess
from pathlib import Path

O = Path(__file__).parent
P = Path('knowledge/characters/silent/experience.json')
RUN = 'PBUBM0LRTEDD'
B = json.load(open(O / 'experience-before.json'))
E = copy.deepcopy(B)
A = json.load(open(O / 'audit.json'))
R = json.load(open(O / 'rest-summary.json'))[-1]
day = subprocess.check_output(['date', '+%Y-%m-%d'], text=True).strip()
C = []
M = {}

def update(ident, ledgers, case=None, lesson=None):
    e = next(e for e in E['entries'] if e['id'] == ident)
    old = copy.deepcopy(e)
    assert RUN not in e['evidence']
    e['evidence'].append(RUN)
    n = e['n_support'] = len(e['evidence'])
    e['confidence'] = 'high' if n >= 5 and e['n_contradict'] <= n / 3 else 'med' if n >= 2 else 'low'
    e['last_seen'] = day
    e['lesson'] = lesson or e['lesson'].replace(str(old['n_support']) + '支持', str(n) + '支持').replace('（n=' + str(old['n_support']) + '）', '（n=' + str(n) + '）')
    if case:
        e['lesson'] = e['lesson'].split('典型案例：')[0] + '典型案例：' + case
    C.append(dict(id=ident, kind='updated', before=old, after=e, new_runs=[RUN]))
    M[ident] = ledgers

update('silent-strength-weak-observation', ['silent-0012'], case='LYBHQ1X230ZB四段1力多4伤；PBUBM0LRTEDD A10实验体末T1三技能令敌0→9力、弱下23攻，3敏与暗影使后空翻22挡仍损1；T3易伤下防御再加敌3力，34→38攻、11挡需损27，3血实死。')
b = next(b for b in A['bands'] if (b['asc'], b['act'], b['type'], b['band']) == (10, 2, 'Monster', '≥60%'))
update('silent-route-hp-observation', ['silent-0019'], lesson=f'观察：前战胜/避可选精英不保证续战血药，问号可战，未来营火不预支。A10 {R["runs"]}局二幕Monster≥60%入血{b["n"]}房/{b["runs"]}局、{b["deaths"]}死（{b["deaths"]/b["n"]*100:.2f}%），活损中位{b["median_win"]}；分阶/幕/房型另列（n={len(A["runs"])}）。典型案例：PBUBM0LRTEDD F27棱柱88→14、F28/32回血后沙虫66入胜2；三幕首boss满114仍胜出26空药、次boss败。另一条路线未实打，不定改线必优。')
update('silent-rest-buffer-observation', ['silent-0020'], lesson=f'观察：即时回复增加血缓冲，不保证后战，未到营火不预支。A10 {R["runs"]}局{R["rests"]}独立火/{R["heal"]}回血实回{sum(R["gains"])}，去重{R["nexts"]}后战{R["deaths"]}死（{R["deaths"]/R["nexts"]*100:.2f}%），活损中位{R["median"]}；各阶另列（n={len(A["runs"])}）。典型案例：PBUBM0LRTEDD十一火八回血三锻造，八回血上限各增5；F42满104仍回至109，F47实回35至114，女王胜26后无回复节点直接接实验体，不预支SL恢复。')
update('silent-deck-burst-observation', ['silent-0021'], case='WZL2AMEY85S7三毒雾仍余109死；PBUBM0LRTEDD A10实验体末T1神化+、暗影、步法组合实22挡而未输出；T3两毒雾实建6层但未活到下轮，已结毒仅带毒刺击的5。没取得计划触媒、不预支下一轮成长或上一战能力。')
update('silent-footwork-block', ['silent-0005'], case='M0GY0A4M2F7H两敏三挡20仍死；PBUBM0LRTEDD A10末试实验体T1神化使步法2→3敏，建立时仍0挡、敌力不增；后空翻基础8与暗影实22挡，次轮倍率撤但3敏留，T3防御11挡仍不够38攻。')
update('silent-noxious-fumes-growth', ['silent-0011'], case='WZL2AMEY85S7三普通毒雾建2→4→6；PBUBM0LRTEDD A10实验体末T3两毒雾+建3→6层，能力不增敌力、建层不即时施毒；轮末只结带毒刺击5毒、敌余57且玩家死，六层未来收益没有兑现。')
update('silent-apotheosis-combat-upgrades', ['silent-0238', 'silent-0323'], lesson='神化在已见战内升级卡牌并消耗，普通/升级实费2/1，场外不当永久锻造。机制：普通版已核手牌/后续抽牌升级；升级版本局同手暗影1→0费、步法2→3敏、后空翻基础5→8挡，未知牌/交互不外推。搭配：当前能量、后续牌与敌技能增力合算。决定胜负的战斗：2支持/0反例，普通与升级子集各1局、非整战单因（n=2）。典型案例：VLZ6CCT8AQ0A A10 F43神化后同序51伤兑现；PBUBM0LRTEDD A10实验体末T1神化+实花1，暗影/步法/后空翻实(8+3)×2=22挡，三技能敌9力弱下23攻仍损1，T3败；升级组合不算两局都验证。')
update('silent-shadowmeld-new-block-double', ['silent-0077'], case='K2JAGKVJAWZJ旧7挡不变；PBUBM0LRTEDD A10实验体末T1神化把暗影降0费，建立不加挡，步法3敏后后空翻(8+3)×2=22；暗影自身技能也使敌增3力，次轮倍率撤、T3防御仅11挡，不能把翻倍当常驻。')
update('silent-snecko-skull-poison-application', ['silent-0087'], case='GXNKW8X1XYJP A10恶魔两雾4轮初补5后胜；PBUBM0LRTEDD A10实验体末T3带毒刺击+基础4毒实加5，攻击先79→71、另打击至62、轮末结5至57并残4毒。雾6层未来补毒未发生，不把能力层数当已施毒。')
test = next(e for e in E['entries'] if e['id'] == 'silent-test-subject-phase-reset')
test_runs = set(test['evidence']) | {RUN}
test_groups = collections.defaultdict(list)
for x in A['attempts']:
    if x['run'] in test_runs and 'TEST_SUBJECT' in next(f['enemies'] for f in A['fights'] if f['run'] == x['run'] and f['floor'] == x['floor']):
        test_groups[(x['run'], x['floor'])].append(x)
test_multi = [v for v in test_groups.values() if max(x['attempt'] for x in v) > 1]
tn = len(test_runs)
update('silent-test-subject-phase-reset', ['silent-0028', 'silent-0079'], lesson=f'实验体按现场激怒计技能成本，换阶段重核状态。机制：首阶段每技能加激怒层数力量、能力不加；历史换阶段清敌力/激怒/毒、留玩家能力，本局未跨阶段。搭配：真实牌挡、弱/易伤与毒结算合核，全败推演仍有血价。决定胜负的战斗：{tn}支持/0反例，真正重打{len(test_multi)}场{sum(len(v) for v in test_multi)}试{sum(x["result"]=="won" for v in test_multi for x in v)}赢（n={tn}）。典型案例：9R916WW0V65N A10第三试15轮胜；PBUBM0LRTEDD A10六试0赢，第三试T1实22挡/清9只损1，第四试只神化/步法0挡损18，多损17少清9；末T3易伤下38攻对11挡，3血需损27、至少缺25存活，毒结后敌余57，未见后阶段。')
queen = next(e for e in E['entries'] if e['id'] == 'silent-queen-poison-main-target')
qgroups = collections.defaultdict(list)
for x in A['attempts']:
    if x['run'] in set(queen['evidence']) | {RUN} and 'QUEEN' in next(f['enemies'] for f in A['fights'] if f['run'] == x['run'] and f['floor'] == x['floor']):
        qgroups[(x['run'], x['floor'])].append(x)
qmulti = [v for v in qgroups.values() if max(x['attempt'] for x in v) > 1]
qn = len(queen['evidence']) + 1
update('silent-queen-poison-main-target', ['silent-0090', 'silent-0079'], lesson=f'观察：女王两种击杀序均有赢例，不定固定顺序或提前能力必胜。机制：血按进阶{{@2:HP:QUEEN}}/{{@4:HP:QUEEN}}/{{@8:HP:QUEEN}}读，本体死可终战；弱/脆/易伤改变攻防，爪牙死不关闭成长。搭配：实建毒、防御和续战血药合核。决定胜负的战斗：{qn}支持/0反例，真正重打{len(qmulti)}场{sum(len(v) for v in qmulti)}试{sum(x["result"]=="won" for v in qmulti for x in v)}赢，替序胜因未控（n={qn}）。典型案例：ZZMYZ5UBCG72 A2本体先死、爪余87；PBUBM0LRTEDD A10第三试T6聚合体退场、T9女王退场胜26空药，下场22血六败；退场缺0HP中间帧，不能把移除血量全归实伤或保证同顺序整战胜。')
sl = next(e for e in E['entries'] if e['id'] == 'silent-queen-poison-window-sl-observation')
slgroups = [v for (run, floor), v in qgroups.items() if run in set(sl['evidence']) | {RUN}]
sn = len(sl['evidence']) + 1
update('silent-queen-poison-window-sl-observation', ['silent-0079'], lesson=f'观察：女王重打核实际启动/血价，推演全死仍有血价；赢试多处变化不作药水或顺序的单因胜果。机制：实建毒与可活轮限制结算，抽弃后旧后缀不预支。搭配：真实挡/药/牌序和SL恢复分账。决定胜负的战斗：{sn}场{sum(len(v) for v in slgroups)}试{sum(x["result"]=="won" for v in slgroups for x in v)}赢，{sum(x["result"]=="dead" for v in slgroups for x in v)}次判死读档，后续抽牌/生成未全控（n={sn}）。典型案例：9YBKCNBFP0X5 A4同盘多损8多清9仍败；PBUBM0LRTEDD A10前两试T6判死、第三T9胜26空药；预知之滴T2改T5并取生存者、弃步法，后序/目标也变，不能单独归因延后饮药；第二boss仍六败。')
update('silent-royal-poison-blood-vial-opening-net', ['silent-0198', 'silent-0255'], case='TXZ6RVMQA09D A10 F49以4血进房、出牌前死；PBUBM0LRTEDD A10无小血瓶，F43/48/49入房109/114/26各扣4到105/110/22；女王两读档回110两药、实验体五读档回22空药，不重复开场扣4或计新回血。')
update('silent-stone-humidifier-rest-growth', ['silent-0204'], lesson='石炉加湿器在已观察休息回血时增5最大血并补当前血，锻造不触发；满旧上限也可增血。机制：基础回复与增量5合算后按新上限截断，实际完成HEAL才兑现。搭配：当前血/回复/上限增长与战耗分账，不预支未到营火或锻造增长。决定胜负的战斗：5支持/0反例，遗物整战因果未控（n=5）。典型案例：UMVLWER4CD98十回血上限70→120、实回321；PBUBM0LRTEDD A10十一火八回血共增40上限、梨另增10、卷轴另减6，末70+40+10−6=114；F42满104回血至109，三次锻造均不增，F47回满仍双王未过。')
update('silent-act-transition-missing-hp-heal', ['silent-0243'], case='LY83ZMTFVKJH同族胜11/77跨幕回52到63；PBUBM0LRTEDD A10巨兽战胜34后奖励另回20至54，再跨幕⌊(85−54)×0.8⌋=24至78；沙虫胜2后奖励另回20至22，跨幕再70至92。女王26接实验体26无跨幕回复，奖励/遗物/SL分账。')
update('silent-double-boss-resource-handoff', ['silent-0228'], lesson='观察：A10首boss胜后直接接续实血药，能力换战重建。机制：12局F48出口HP与F49入房相同，全部后战败；遗物开场变化与可操作HP另核，连续boss非跨幕。搭配：回复/复活/SL恢复分账，不由全败拟固定终局权重或留药价。决定胜负的战斗：12支持/0反例，无保药/改线整战胜利对照（n=12）。典型案例：AD3QSC3P41JU女王胜15→实验体15入房/11可操作；PBUBM0LRTEDD首boss114两药三试一赢，胜26空药直接接实验体26/22，六试全败。p2804/2805已明连王、无恢复与能力重建，是交接支持，不称大脑忘第二场。')
update('silent-dexterity-potion-card-block', ['silent-0276'], case='QHK1XQ928TTM族母饮后仍被吸取；PBUBM0LRTEDD A10 F43T2格挡药与敏捷药均实饮，敏捷单步实加2、已有挡不补，胜后两瓶空；女王用预知/格挡药而非敏捷药，实验体重建步法3敏，不把上战药2敏带过或据此定留药时点。')

seq = int(B['version'].split('.')[-1]) + 1 if B['version'].startswith(day + '.') else 1
E['version'] = day + '.' + str(seq)
E['_about'] = f'静默经验只来自本角色实盘与复盘。第116次增量合并PBUBM0LRTEDD A10；截至{A["cutoff"]}共{len(A["runs"])}完局。旧150局同口径逐行复算；核神化普通/升级子样本、暗影/敏捷/激怒、加湿器满血成长、双boss血药交接及SL实线血价。没有留药/改线整场胜果，不拟新阈值/药价；提案交独立strategy-proposal，不改打法源码或其他角色。'
P.write_text(json.dumps(E, ensure_ascii=False, indent=2) + '\n')
(O / 'changes.json').write_text(json.dumps(dict(entries=C), ensure_ascii=False, indent=2) + '\n')
(O / 'ledger-map.json').write_text(json.dumps(M, ensure_ascii=False, indent=2) + '\n')
active = [e for e in E['entries'] if e['status'] == 'active']
summary = dict(old_version=B['version'], version=E['version'], added=0, updated=len(C), retired=0, active_before=sum(e['status']=='active' for e in B['entries']), active=len(active), chars_before=sum(len(e['lesson']) for e in B['entries'] if e['status']=='active'), chars=sum(len(e['lesson']) for e in active), confidence=dict(collections.Counter(e['confidence'] for e in active)), asc={str(a):dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in active), chars=sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]})
assert summary['chars'] <= 60000
(O / 'update-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(summary, ensure_ascii=False))
