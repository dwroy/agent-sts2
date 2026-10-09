import collections
import copy
import json
import subprocess
from pathlib import Path

O = Path(__file__).parent.resolve()
W = O.parents[2]
N = 'SDY5T9XCSQN2'
A = json.load(open(O / 'audit.json'))
E = json.load(open(O / 'experience-before.json'))
B = copy.deepcopy(E)
M = {e['id']: e for e in E['entries']}
R = {r['run_id']: r for r in json.load(open(O / 'run-metadata.json'))}
day = subprocess.check_output(['date', '+%Y-%m-%d'], text=True).strip()
changes = []
mapping = {}

def update(ident, text, lids):
    e = M[ident]
    old = copy.deepcopy(e)
    assert N not in e['evidence']
    e['evidence'].append(N)
    e['n_support'] = len(set(e['evidence']))
    e['lesson'] = text.replace('{n}', str(e['n_support']))
    e['last_seen'] = day
    n, c = e['n_support'], e['n_contradict']
    e['confidence'] = 'high' if n >= 5 and c <= n / 3 else 'med' if n >= 2 else 'low'
    mapping[ident] = lids
    changes.append(dict(id=ident, before=old, after=copy.deepcopy(e)))

band = next(x for x in A['bands'] if (x['asc'], x['act'], x['type'], x['band']) == (10, 1, 'Monster', '<25%'))
rest = next(x for x in json.load(open(O / 'rest-summary.json')) if x['asc'] == 10)
update('silent-route-hp-observation', f'观察：赢战仍耗血药，问号另算，未来恢复不预支。A10 {rest["runs"]}局一幕Monster入口<25%共{band["n"]}房/{band["runs"]}局、{band["deaths"]}死（{100*band["deaths"]/band["n"]:.2f}%），活损中位{band["median_win"]}；各阶/幕/房型见报告（n={{n}}）。典型案例：CSLHFCBSC1UM三火后64血仍boss六败；SDY5T9XCSQN2 F7满血70进骇鳗赢损66，后两火及事件补52才56血进强制精英；两瓶药路上已饮。F9改避可选精英但F13仍必经，无改线/留药受控胜果，不立安全血线。', ['silent-0019'])
update('silent-rest-buffer-observation', f'观察：回血增加即时缓冲，锻造不回血，不能保证后战。A10 {rest["runs"]}局{rest["rests"]}独立火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{100*rest["deaths"]/rest["nexts"]:.2f}%），活损中位{rest["median"]}；各阶另列（n={{n}}）。典型案例：KSX97DF5H3NY回54后两强制战败；SDY5T9XCSQN2三火实回63、事件10、缩放仪进boss再回25，最终65/70空药六败；F16锻造未兑现皇家枕头回血。B2锻造/休息胜率10.37%/9.71%仅低可信估计，无两选项实战胜果，不能以六读档作六独立校准样本。', ['silent-0020'])
update('silent-deck-burst-observation', '观察：计划能力、已结本体进度和后续生存分别验收。机制：毒层不等即时伤，回复增加本体需清，结束本体仍须支付后段攻击。搭配：持续输出与当轮实挡同核，未得步法/毒雾/触媒不预支。决定胜负的战斗：{n}支持/0反例，整战单因未控（n={n}）。典型案例：WZL2AMEY85S7三雾仍败；SDY5T9XCSQN2巨兽末试15轮直扣213+毒75=288，对250初血+三次15回复共295仍余7；11血9挡对33需损24，活命至少差14血，补7伤也不证明能过自爆。F13护栏替线实省当轮5血少1伤，原线未实打。', ['silent-0021', 'silent-0125'])
update('silent-strength-weak-observation', '力量逐击加伤、敏捷逐张加牌挡，临时层/弱/易伤按现场分核。机制：基础加属性后核倍率，毒/被动挡另源；仪式按现场层数增力，弱不关闭成长。搭配：多击/多挡重复收益仍核当前血价。决定胜负的战斗：{n}支持/0反例，整战单因未控（n={n}）。典型案例：LYBHQ1X230ZB四段1力多4伤；SDY5T9XCSQN2 A10花园T2力量药建2力，打击6→8、中和3→5、匕首雨每敌4×2→6×2，三无挡目标共36比无力多12；敌挡另扣，T3仍2力、换战清。巨兽无力量/敏捷或能力，末T15仅9挡，不沿用T11的17。', ['silent-0006', 'silent-0012'])
update('silent-poisoned-stab-components', '带毒刺击直伤、施毒和本方失血分列，尚存毒不当已伤。机制：普通/升级基础6/8伤与3/4毒，力/弱/易伤改攻击，制品可阻毒；触媒/无实体/剩血另核。搭配：实结毒可清残血敌取消其攻击，仍核其他活敌与回复。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：RZ6YAC7K89NM钙化6血7毒退场取消13攻；SDY5T9XCSQN2巨兽末试T14刺击与打击把敌38→26、2→5毒，但结束毒5同时回复15到36；T15再扣25、结4毒仍7血，毒成功不等已杀或免攻。', ['silent-0030'])
update('silent-giant-explosion-window', '巨兽本体结束后仍有自爆，残壳近十亿血不当新需伤。机制：A10已见蒸汽T2=20后每轮+3，本体结束下一轮自爆；本体血读{@10:HP:WATERFALL_GIANT}，弱/减力与实挡另核。搭配：结束本体后核可活血挡，打残壳不消爆，净进度含回复不叫毛伤。决定胜负的战斗：{n}支持/0反例，提前击杀整战单因未控（n={n}）。典型案例：0DJ6GFZZ0TG9 T8弱后26、16挡实损10胜；SDY5T9XCSQN2六试零赢，四次T15结束本体，T16自爆59弱化44仍仅8/11/11/6血零挡、判死读档；末试T15仍7本体血阵亡。第5试T5多付5血换题面6伤，后序有差，不认单因翻盘。', ['silent-0017', 'silent-0079'])
update('silent-terror-eel-vigor-vulnerable', '骇鳗过阈值取消当轮攻击，后段仍核未耗活力与易伤。机制：撞击基础读{@10:DMG:TERROR_EEL:CRASH_MOVE}后加现场活力再核弱/易伤；A0/A1惊叫70、A10为75，恐吓已见99易伤。搭配：眩晕不清活力，毒进度/实挡/可活轮合核。决定胜负的战斗：{n}支持/0反例，无真正重打，整战单因未控（n={n}）。典型案例：0DJ6GFZZ0TG9越75后T7毒杀31血敌胜；SDY5T9XCSQN2 F8满血70→4赢损66，T5至75眩晕、T7六活力及99易伤把撞击24变36，5挡实损31；该6层是活力，不记力量或阶段结束。', ['silent-0050'])
update('silent-gardener-skittish-shield', '花园幽灵鳗胆小使已观察非致死攻击后补对应层数敌挡，实扣与退场分开。机制：逐次攻击/群伤与后续盾、力量成长和已结算毒分别核，不外推所有触发。搭配：当前目标剩血、敌挡与仍在场攻击者共同验收，不定固定击杀序。决定胜负的战斗：{n}支持/0反例，另一目标顺序整战因果未控（n={n}）。典型案例：R0HEV5E3QT6G中和+扣6后补6挡；SDY5T9XCSQN2 A10 F13T2二力打击19→11后补7挡，中和5只把挡7→2不扣血，匕首雨12先抵2再扣10至1，2毒结束使其退场；该体弱后6攻未兑现。整战56→49损7，未打另一目标顺序。', ['silent-0211'])

E['version'] = day + '.13'
E['_about'] = f'静默经验只从本角色实盘与复盘学习。第124次增量并{N} A10，截至{A["cutoff"]}共{len(R)}完局；旧159局七数组/血档/节点/回血/SL同口径复算。补满血骇鳗后段血价、力量逐段/胆小盾/毒实结，以及巨兽本体回复与自爆分阶段验收；三火、事件、进场遗物和SL恢复分账。缺留药/改线/护栏原线及提前击杀存活的受控整战，不拟新阈值/药价；源码交独立strategy-proposal。'
for e in E['entries']:
    assert e['n_support'] == len(set(e['evidence']))
    assert e['n_contradict'] == len(set(e.get('contradicting', [])))
    assert all(n in R and R[n]['character'].lower() == 'silent' for n in e['evidence'] + e.get('contradicting', []))
active = [e for e in E['entries'] if e['status'] == 'active']
chars = sum(len(e['lesson']) for e in active)
assert chars <= 60000
def size(entries, asc=None):
    rows = [e for e in entries if e['status'] == 'active' and (asc is None or e['asc'][0] <= asc <= e['asc'][1])]
    return dict(entries=len(rows), chars=sum(len(e['lesson']) for e in rows))
summary = dict(old_version=B['version'], version=E['version'], added=0, updated=len(changes), evidence_updates=len(changes), numeric_only=0, retired=0, before=size(B['entries']), after=size(E['entries']), confidence=dict(collections.Counter(e['confidence'] for e in active)), by_asc={str(a):size(E['entries'],a) for a in [8,9,10]})
(W / 'knowledge/characters/silent/experience.json').write_text(json.dumps(E, ensure_ascii=False, indent=2) + '\n')
for name, value in [('changes',dict(entries=changes)), ('ledger-map',mapping), ('update-summary',summary)]:
    (O / (name+'.json')).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(summary, ensure_ascii=False))
