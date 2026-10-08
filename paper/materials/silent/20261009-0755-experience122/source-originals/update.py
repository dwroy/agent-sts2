import collections
import copy
import json
import subprocess
from pathlib import Path

O = Path(__file__).parent.resolve()
W = O.parents[2]
N = 'CSLHFCBSC1UM'
A = json.load(open(O / 'audit.json'))
E = json.load(open(O / 'experience-before.json'))
B = copy.deepcopy(E)
M = {e['id']: e for e in E['entries']}
R = {r['run_id']: r for r in json.load(open(O / 'run-metadata.json'))}
changes = []
mapping = {}
day = subprocess.check_output(['date', '+%Y-%m-%d'], text=True).strip()

def update(ident, text, lids):
    e = M[ident]
    before = copy.deepcopy(e)
    assert N not in e['evidence']
    e['evidence'].append(N)
    e['n_support'] = len(e['evidence'])
    e['n_contradict'] = len(e.get('contradicting', []))
    n, c = e['n_support'], e['n_contradict']
    e['confidence'] = 'high' if n >= 5 and c <= n / 3 else 'med' if n >= 2 else 'low'
    e['last_seen'] = max(e['last_seen'], '2026-10-09')
    e['lesson'] = text.replace('{n}', str(n))
    changes.append(dict(id=ident, before=before, after=copy.deepcopy(e)))
    mapping[ident] = lids

rest = json.load(open(O / 'rest-summary.json'))[-1]
band = next(r for r in A['bands'] if (r['asc'], r['act'], r['type'], r['band']) == (10, 1, 'Boss', '≥60%'))
update('silent-route-hp-observation', f'观察：赢战仍耗血药，问号另算，未来火不预支。A10 {rest["runs"]}局一幕Boss入口≥60%共{band["n"]}房/{band["runs"]}局、{band["deaths"]}死（{100*band["deaths"]/band["n"]:.2f}%），活损中位{band["median_win"]}；各阶/幕/房型见报告（n={{n}}）。典型案例：SV2GP9NX4HQD F43赢仍耗精灵；CSLHFCBSC1UM F11/F15精英损13/19，F12/F14赢且零损但F14饮尽明耀，三火各回21后64/70空药进族母仍六败。F9改避精英时两精英已必经，缺另一条路线/留药实打，不立安全血线。', ['silent-0019'])
update('silent-rest-buffer-observation', f'观察：回血增加即时缓冲，锻造不回血，不能保证后战。A10 {rest["runs"]}局{rest["rests"]}独立火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{100*rest["deaths"]/rest["nexts"]:.2f}%），活损中位{rest["median"]}；各阶另列（n={{n}}）。典型案例：KSX97DF5H3NY回54后两强制战败；CSLHFCBSC1UM F7以39锻造不回血，F8问号战到33，F9/F13/F16各回21；初56−九胜净损55＋实回63＝boss64。五次SL恢复64另账，不是新回血；无锻造/回血整场受控胜线。', ['silent-0020'])
update('silent-deck-burst-observation', '观察：计划组件、实建能力、可支付后续与已结本体进度分核。机制：毒层不是即时伤，存活轮与费用约束兑现；护栏同轮重问不重复计价。搭配：持续输出与实挡共同验收，未得能力不预支。决定胜负的战斗：{n}支持/0反例，整战单因未控（n={n}）。典型案例：WZL2AMEY85S7三雾仍败；CSLHFCBSC1UM无步法/毒雾/触媒，族母首/末十轮已扣202/177、余31/56，首试截断未结末毒、末试已结16毒；清233需23.3/轮仅事后预算。末T10负4敏三挡仅6、10血对25死，不由已拿毒牌认定必胜/必输。', ['silent-0021'])
update('silent-strength-weak-observation', '力量逐击加伤、敏捷逐张加牌挡，临时层/弱/易伤按现场分核。机制：基础加属性后核倍率，毒/被动挡另源，临时减力不停止成长。搭配：多段/多挡重复收益与当前血价合核。决定胜负的战斗：{n}支持/0反例，整战单因未控（n={n}）。典型案例：LYBHQ1X230ZB四段1力多4伤；CSLHFCBSC1UM A10族母末T5/T9吸取使力敏0→−2→−4、敌力0→2→4；同无弱SLASH从21到25，T6含弱17不全归力。T10防御1＋生存者4＋防御1＝6，较无负敏18少12，10血仍需损19而死；玩家未建正力量/敏捷。', ['silent-0012'])

groups = collections.defaultdict(list)
for x in A['attempts']:
    if any(f['run'] == x['run'] and f['floor'] == x['floor'] and 'LAGAVULIN_MATRIARCH' in f['enemies'] for f in A['fights']):
        groups[(x['run'], x['floor'])].append(x)
multi = [v for v in groups.values() if max(x['attempt'] for x in v) > 1]
def slstat(v):
    return (len(v), sum(len(x) for x in v), sum(a['result'] == 'won' for x in v for a in x))
allsl = slstat(multi)
a10sl = slstat([v for v in multi if R[v[0]['run']]['ascension'] == 10])
update('silent-lagavulin-siphon-poison-sl', f'族母吸取压缩直伤/牌挡，已建毒按现场层数结算。机制：每次玩家力敏各−2、敌力＋2，负力量不减技能毒层。搭配：实建增益/临时减力与可活轮共同核，不由拥有牌代替净属性。决定胜负的战斗：{{n}}支持/0反例，真正重打{allsl[0]}场{allsl[1]}试{allsl[2]}赢，A10 {a10sl[0]}场{a10sl[1]}试{a10sl[2]}赢（n={{n}}）。典型案例：QHK1XQ928TTM负力下T12毒终结；CSLHFCBSC1UM A10六试64血空药全败，末T10力敏−4、10血6挡对25，毒16结后仍56。第4试T2同首试指纹少挡换伤，实多损5、多扣9；五轮saturated/两线tied且无赢样本不等血价相同。末试T3反向省5血少11伤，后继亦变，无整战原线胜果。', ['silent-0030', 'silent-0079'])
update('silent-deadly-poison-application', '致命毒药普通/升级施5/7毒，不即时扣血。机制：实结按当前毒再减1，制品/头骨/触媒/阶段另核，过量毒按剩血截断。搭配：补层与存活结算合核，不预支免攻。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：KSX97DF5H3NY毒10只计6剩血；CSLHFCBSC1UM A10族母末T5升级致命3→10毒、本体172不变，迷雾再至14、结束实扣14到158；末T10毒16只将72→56而玩家死，施毒成功不等已击杀。', ['silent-0007'])
update('silent-haze-group-poison-weak', '迷雾群毒与当轮虚弱分账，施放不即时扣本体。机制：普通/升级4/6毒及1/2弱，结束结毒再减1，制品逐项阻减益，弱不清成长。搭配：爆发增加次数，仍需活到结算。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：H1T1F8ML9FUE沙漏制品逐项阻毒/弱；CSLHFCBSC1UM A10族母末T5/T9普通迷雾各加4毒/1弱，T5致命后10→14、172当步不变、末扣14；T9刺击后13→17、89当步不变、末扣17到72。弱不撤敌成长，T10余16毒仍未斩杀。', ['silent-0235'])
update('silent-poisoned-stab-components', '带毒刺击直伤、施毒和本方失血分列，尚存毒不当已伤。机制：普通/升级基础6/8伤与3/4毒，力/弱/易伤改攻击，制品可阻毒；触媒/无实体/剩血另核。搭配：真实生存轮限制输出，先前血价不能由后来挡补回。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：G8NHLL09DLBX刺击荆棘先损5；CSLHFCBSC1UM A10族母末T9负2力普通刺击实4伤只使敌挡14→10、本体89不变，仍加3毒10→13；迷雾补至17后实结到72，下一轮16毒结后仍56，破挡/施毒/本体进度各算。', ['silent-0030'])
update('silent-replay-effect-counter-observation', '观察：已见重放附魔的效果再次兑现，原始手动计数不等全部实际打出。机制：重放格挡/余像按实际再次打出触发，cards_played_this_turn在已核窗口仅加1；凋萎门槛需核实际生成，不外推所有自动出牌。搭配：重放与逐牌被动有收益，也可能跨状态伤门槛，按当前挡/持牌合核。决定胜负的战斗：{n}支持/0反例，整战修正后对照未有（n={n}）。典型案例：LRN0HPZ0FZS1重放使余像挡13→15而计数8→9；CSLHFCBSC1UM A10族母末T3重放防御实0→10挡、手动计数0→1，下一普通防御到15、零损；T10未抽到重放牌，三挡仅6仍死，不预支重复挡。', ['silent-0200'])
E['version'] = day + '.11'
E['_about'] = f'静默经验只从本角色实盘与复盘学习。第122次增量并CSLHFCBSC1UM A10，截至{A["cutoff"]}共{len(R)}完局；旧157局七数组/血档/节点/回血/SL同口径复算。补族母吸取负力敏与敌成长、致命/迷雾/刺击施毒实结、附魔重复挡与手动计数、九胜血药链和六败SL血价。未得能力不预支；无整场原线、改线或留药受控胜果，不拟新阈值/药价；源码交独立strategy-proposal。'
for e in E['entries']:
    if e['status'] != 'active': continue
    assert e['n_support'] == len(set(e['evidence']))
    assert e['n_contradict'] == len(set(e.get('contradicting', [])))
    assert all(R[r]['character'].lower() == 'silent' for r in e['evidence'] + e.get('contradicting', []))
    assert e['scope'].split(':')[0] in ['boss', 'elite', 'hallway', 'act', 'general', 'card', 'relic', 'potion', 'event']
    if e['scope'].split(':')[0] in ['card', 'relic', 'potion', 'event']: assert e.get('name')
def stats(e):
    a = [x for x in e['entries'] if x['status'] == 'active']
    return dict(active=len(a), chars=sum(len(x['lesson']) for x in a), confidence=dict(collections.Counter(x['confidence'] for x in a)), applicable={str(n): dict(entries=len(z := [x for x in a if x['asc'][0] <= n <= x['asc'][1]]), chars=sum(len(x['lesson']) for x in z)) for n in [8, 9, 10]})
assert stats(E)['chars'] <= 60000
assert len(changes) == 9
(W / 'knowledge/characters/silent/experience.json').write_text(json.dumps(E, ensure_ascii=False, indent=2) + '\n')
(O / 'changes.json').write_text(json.dumps(dict(entries=changes), ensure_ascii=False, indent=2) + '\n')
(O / 'ledger-map.json').write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + '\n')
(O / 'update-summary.json').write_text(json.dumps(dict(added=0, updated=len(changes), retired=0, before=stats(B), after=stats(E), lag_sl=dict(all=allsl, a10=a10sl)), ensure_ascii=False, indent=2) + '\n')
print(json.dumps(json.load(open(O / 'update-summary.json')), ensure_ascii=False))
