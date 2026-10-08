import collections
import copy
import json
import subprocess
from pathlib import Path

O = Path(__file__).parent
P = Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json')
RUN = 'LY83ZMTFVKJH'
B = json.load(open(O / 'experience-before.json'))
E = copy.deepcopy(B)
A = json.load(open(O / 'audit.json'))
R = json.load(open(O / 'rest-summary.json'))[-1]
C = []
M = {}

def update(ident, ledgers, case=None, lesson=None):
    e = next(e for e in E['entries'] if e['id'] == ident)
    old = copy.deepcopy(e)
    assert RUN not in e['evidence']
    e['evidence'].append(RUN)
    n = e['n_support'] = len(e['evidence'])
    e['confidence'] = 'high' if n >= 5 and e['n_contradict'] <= n / 3 else 'med' if n >= 2 else 'low'
    e['last_seen'] = '2026-10-08'
    e['lesson'] = lesson or e['lesson'].replace(str(old['n_support']) + '支持', str(n) + '支持').replace('（n=' + str(old['n_support']) + '）', '（n=' + str(n) + '）')
    if case:
        e['lesson'] = e['lesson'].split('典型案例：')[0] + '典型案例：' + case
    C.append(dict(id=ident, kind='updated', before=old, after=e, new_runs=[RUN]))
    M[ident] = ledgers

def add(ident, scope, evidence, ledgers, lesson):
    assert not any(e['id'] == ident for e in E['entries'])
    e = dict(id=ident, scope=scope, asc=[0, 20], lesson=lesson, evidence=evidence,
             n_support=len(evidence), n_contradict=0, confidence='high' if len(evidence) >= 5 else 'med' if len(evidence) >= 2 else 'low', last_seen='2026-10-08', status='active')
    E['entries'].append(e)
    C.append(dict(id=ident, kind='added', before=None, after=e, new_runs=evidence))
    M[ident] = ledgers

update('silent-strength-weak-observation', ['silent-0012'], case='LYBHQ1X230ZB四段1力多4伤；LY83ZMTFVKJH A10虱虫四次成长建7/14/21/28力，无弱同猛扑T9为37、T12为44，中和+使44→33；玩家无力敏增益，1血9挡仍死，不把临时弱当阻止成长。')
b = next(b for b in A['bands'] if (b['asc'], b['act'], b['type'], b['band']) == (10, 2, 'Monster', '≥60%'))
update('silent-route-hp-observation', ['silent-0019'], lesson=f'观察：高血/前战获胜不保证后段血药与牌组，问号可战，未来营火不能预支。A10 {R["runs"]}局二幕Monster≥60%入血{b["n"]}房/{b["runs"]}局、{b["deaths"]}死（{b["deaths"] / b["n"] * 100:.2f}%），活损中位{b["median_win"]}；分阶/幕/房型另列（n={len(A["runs"])}）。典型案例：LY83ZMTFVKJH F20草蜢净损4却携手斧逃，F21首帧61/77、血瓶补至63、无药无手斧仍死；三火无精英线尚未到F22店/F24火，未走路线无因果对照。')
update('silent-rest-buffer-observation', ['silent-0020'], lesson=f'观察：即时回复增加血缓冲，不保证后战，未来营火不预支。A10 {R["runs"]}局{R["rests"]}独立火/{R["heal"]}回血实回{sum(R["gains"])}，去重{R["nexts"]}后战{R["deaths"]}死（{R["deaths"] / R["nexts"] * 100:.2f}%），活损中位{R["median"]}；各阶另列（n={len(A["runs"])}）。典型案例：LY83ZMTFVKJH F8锻造49不回血，F13/16实回23/21到53/77；同族末试损66剩11，跨幕另回52。F16回复兑现但未免重打/后幕死，无改锻造或路线的整战对照。')
update('silent-deck-burst-observation', ['silent-0021'], case='WZL2AMEY85S7三毒雾建层仍余109死；LY83ZMTFVKJH A10计划求毒/敏却终局无能力牌，F20手斧+被携逃后从永久牌组缺失；F21十二轮实清134/138仍死。取得、失窃、实际可打牌和已结收益分核，不能按未兑现计划算防御或成长。')
update('silent-frail-card-block', ['silent-0013'], case='UZ1T7AH49WMB两防御各7与偏折6合20；LY83ZMTFVKJH A10虱虫T12零敏脆弱三防御各⌊5×0.75⌋=3合9，中和+使44→33，完整需损24，1血只扣1实死、存活至少差24；敌挡14/本体4仍存，不把死亡截断当只需1血。')
update('silent-piercing-wail-temporary-strength', ['silent-0046'], case='KAY522KT5NXR实验体三击30→12；LY83ZMTFVKJH A10虱虫T6力14→8，已有虚弱意图22→18，9挡实损9，T7力恢复14；后又长到21/28，不当永久阻成长，无提前尖啸转胜对照。')
update('silent-strangle-following-card-hp-loss', ['silent-0261'], case='Q6M2Y34MWKRE骇鳗后两牌各多2；LY83ZMTFVKJH A10虱虫T7紧勒→偏折报8实10（77→69→67），T10紧勒→匕首雨+→偏折报20实24（40→32→18→16）；次轮紧勒消失。两线完整执行，无穿挡/早打紧勒的整战胜果，末余4不证明修模必胜。')
update('silent-kin-poison-sl-observation', ['silent-0079', 'silent-0209'], lesson='观察：同族重打须分核实际退场窗口、血价与弃牌后的执行，不定固定杀序。机制：敌退场改变后轮攻击来源，临时减力不阻后轮成长；后继抽牌/药也可变。搭配：群伤/单体进度、实际挡与血池合核。决定胜负的战斗：10场36试6赢，真正重打7场33试3赢；支持10局含A0背景，策略只A10九局（n=10）。典型案例：LY83ZMTFVKJH A10 F17第2/3试T5同50血、信徒38/神官147，手斧改打信徒后原报20实都14、实损都5；末信徒35→24使退场T7→T6，T7实损10→0，第3试T14剩11胜；后序亦变，不把局部多活等同唯一胜因。')
regen = [p for p in A['potions'] if (p.get('potion') or {}).get('id') == 'REGEN_POTION' and p['run'] in next(e for e in E['entries'] if e['id'] == 'silent-regen-potion-decay-heal')['evidence'] + [RUN]]
update('silent-regen-potion-decay-heal', ['silent-0259'], lesson=f'再生逐轮回复并受上限截断，不当即时15血。机制：19局{len(regen)}饮均增5层，完整层序5/4/3/2/1共15；短战/封顶按实回，先回后敌伤已核。搭配：牌挡与再生分源，净损不当敌总伤，不定留药门槛。决定胜负的战斗：19支持/0反例，单项胜因未控（n=19）。典型案例：T0DGVABPV60U猫头鹰实回15、失血27净损12；LY83ZMTFVKJH A10 F14T1饮后T1/2/3各回5/4/3合12、战止，另血瓶2和攻击损1使53→66；未结2/1不补成实回15。')
update('silent-act-transition-missing-hp-heal', ['silent-0243'], case='R3AJCGQGGMR4 A10沙虫胜3/77回59到62；LY83ZMTFVKJH A10同族末试11/77→跨幕63/77，实回⌊66×0.8⌋=52；两次读档6/11→77是存档恢复，不算回复137，也不算另获两瓶狡诈药水。')
add('silent-stolen-card-availability-observation', 'general:deck', ['PU80F84P6HPN', 'NB8KCF6HRGVF', RUN], ['silent-0314', 'silent-0315'], '失窃牌须按实际可用牌组和返还结果核，不把未知HP血价写成零损失。机制：顺走使所携牌离开永久牌组；已见普通步法/手斧+逃脱后持续缺牌，药瓶+战后返还，不能把暂缺一律算永久移除。搭配：构筑进度、逃脱概率与未知HP换算分账，无固定保牌血价。决定胜负的战斗：失窃/返还3支持0反例、正进度而HP换算未知仅A10一局；整战反事实未控（n=3）。典型案例：NB8KCF6HRGVF F21药瓶+战后返；LY83ZMTFVKJH F20T2丢手斧+模拟boss余血多21.464±0.9731、HP斜率−0.2843±0.0417故hp=null，却题面loot cost 0；各线8/8预计逃，实敌30血携牌逃至死亡未返，不称零价导致Jev选择或追回必胜。')
lh = json.load(open(O / 'louse-history.json'))
le = [h['run'] for h in lh]
add('silent-louse-progenitor-strength-growth', 'hallway:LOUSE_PROGENITOR', le, ['silent-0316'], '虱虫成长力量与建挡须逐轮核，临时弱/减力不等停止成长。机制：已见A0/2/6/7每次加5力，A8加{@8:GAIN:LOUSE_PROGENITOR:CURL_AND_GROW_MOVE:STRENGTH_POWER}，A10加{@10:GAIN:LOUSE_PROGENITOR:CURL_AND_GROW_MOVE:STRENGTH_POWER}且建{@10:BLOCK:LOUSE_PROGENITOR:CURL_AND_GROW_MOVE}挡；初蜷身低阶14/A8及A10为18，剩挡可受自动伤影响。搭配：本体进度与敌挡分账，尖啸后次轮恢复。决定胜负的战斗：22支持0反例（A0/2/6各1、A7两局/A8一局/A10十六局），四成长仅一局，无加速击杀整战对照（n=22）。典型案例：T082DRCUHRRD A0 T3力5/14挡；LY83ZMTFVKJH A10 F21四成长力7/14/21/28，无弱猛扑T9的37→T12的44，弱至33仍令1血9挡实死、敌4血，玩家无能力/敏捷。')
day = subprocess.check_output(['date', '+%Y-%m-%d'], text=True).strip()
seq = int(B['version'].split('.')[-1]) + 1 if B['version'].startswith(day + '.') else 1
E['version'] = day + '.' + str(seq)
E['_about'] = f'静默经验只来自本角色实盘与复盘。第113次增量合并LY83ZMTFVKJH A10；截至{A["cutoff"]}共148完局。旧147局同口径复算，失窃返还/未知HP换算、虱虫成长、紧勒逐牌失血和同族实际退场窗口分账。无未走路线/保牌/早喝的受控胜果；同步独立strategy-proposal，不改打法源码或其他角色。'
P.write_text(json.dumps(E, ensure_ascii=False, indent=2) + '\n')
(O / 'changes.json').write_text(json.dumps(dict(entries=C), ensure_ascii=False, indent=2) + '\n')
(O / 'ledger-map.json').write_text(json.dumps(M, ensure_ascii=False, indent=2) + '\n')
active = [e for e in E['entries'] if e['status'] == 'active']
summary = dict(old_version=B['version'], version=E['version'], added=sum(c['kind'] == 'added' for c in C), updated=sum(c['kind'] == 'updated' for c in C), retired=0, active_before=sum(e['status'] == 'active' for e in B['entries']), active=len(active), chars_before=sum(len(e['lesson']) for e in B['entries'] if e['status'] == 'active'), chars=sum(len(e['lesson']) for e in active), confidence=dict(collections.Counter(e['confidence'] for e in active)), asc={str(a): dict(entries=sum(e['asc'][0] <= a <= e['asc'][1] for e in active), chars=sum(len(e['lesson']) for e in active if e['asc'][0] <= a <= e['asc'][1])) for a in [8, 9, 10]})
assert summary['chars'] < 55000
(O / 'update-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(summary, ensure_ascii=False))
