import collections
import json
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = O.parents[2]
A = json.load(open(O / 'audit.json'))
E = json.load(open(O / 'experience-before.json'))
R = {r['run_id']: r for r in json.load(open(O / 'run-metadata.json'))}
HX, N8 = 'HXCY44VD9QWU', 'N8A2W8LH39N0'
C, M = [], {}

def revise(ident, ledger, runs, text):
    e = next(x for x in E['entries'] if x['id'] == ident)
    before = json.loads(json.dumps(e))
    for run in runs:
        assert run not in e['evidence']
        e['evidence'].append(run)
    e['n_support'] = len(set(e['evidence']))
    e['last_seen'] = '2026-10-09'
    n, c = e['n_support'], e['n_contradict']
    e['confidence'] = 'high' if n >= 5 and c <= n / 3 else 'med' if n >= 2 else 'low'
    e['lesson'] = text.replace('【n】', str(n))
    C.append(dict(id=ident, before=before, after=e))
    M[ident] = ledger

def mechanism(ident, ledger, runs, conclusion, formula, pair, case, limit='单项整战胜因未控'):
    revise(ident, ledger, runs, f'{conclusion}。机制：{formula}。搭配：{pair}。决定胜负的战斗：【n】支持/0反例，{limit}（n=【n】）。典型案例：{case}')

r = next(x for x in json.load(open(O / 'rest-summary.json')) if x['asc'] == 10)
b = next(x for x in A['bands'] if (x['asc'], x['act'], x['type'], x['band']) == (10, 1, 'Elite', '≥60%'))
revise('silent-route-hp-observation', ['silent-0019'], [HX, N8], f'观察：赢战血药成本须接下一战，未来营火不预支，问号另算。A10 {r["runs"]}局一幕Elite入口≥60%共{b["n"]}房/{b["runs"]}局、{b["deaths"]}死（{100*b["deaths"]/b["n"]:.2f}%），活损中位{b["median_win"]}（n=【n】）。典型案例：N8A2W8LH39N0雕像70→1、异鸟43→2，两药助下战零净损后仍2血空药死；HXCY44VD9QWU异鸟/雕像耗49/32。改线胜因未控。')
revise('silent-rest-buffer-observation', ['silent-0020'], [HX, N8], f'观察：HEAL给即时缓冲，不保证到下一营火；锻造与SL恢复另账。A10 {r["runs"]}局{r["rests"]}独立火/{r["heal"]}HEAL回{sum(r["gains"])}，去重{r["nexts"]}后战/{r["deaths"]}死（{100*r["deaths"]/r["nexts"]:.2f}%），活损中位{r["median"]}（n=【n】）。典型案例：N8A2W8LH39N0三火回62、第四火未到；HXCY44VD9QWU两火回42，29血空药boss六败。没有换升级/路线受控胜果。')
mechanism('silent-deck-burst-observation', ['silent-0021'], [HX, N8], '观察：已建能力、当前血价与下战资源分开验收', '计划want不生增益；随机药物能力只据本场建立，未来毒不代付血价', '实际输出、抽牌、挡与能活回合同核', 'N8A2W8LH39N0 F14药产毒雾建2、胜后常驻组无此牌，F15无雾无药死；HXCY44VD9QWU没有步法/触媒建立，跨阈值取消一击仍败')
mechanism('silent-strength-weak-observation', ['silent-0012'], [HX, N8], '力量逐击加伤、敏捷逐挡牌加挡，敌增力另账', '先加现场属性再核弱/易伤，毒和被动挡另源；无已建玩家增益不预支', '多段/多挡实际施放才兑现，弱退后重核', 'HXCY44VD9QWU兽力0→8令同招20→28，中和令28→21；N8A2W8LH39N0异鸟力0→8，末三击弱后24，坚韧两次各5挡非敏捷', '单公式整战因果未控')
mechanism('silent-shockwave-duration', ['silent-0015'], [HX], '震荡波实建虚弱与易伤，层数与当前窗口分别核', '已见建立3弱/3易伤，攻击与受伤倍率按现场；其他来源和回合递减另账', '多张攻击在易伤窗口兑现，虚弱减来袭仍需实挡', 'HXCY44VD9QWU仪式兽末T3建3/3，22攻→16；T4切割6在易伤下扣9，后段仍死。C48LLXBGKXQ9沙虫T5易伤已消失')
mechanism('silent-noxious-fumes-growth', ['silent-0011'], [N8], '毒雾普通/升级建立2/3层，后轮初补毒', '建立不即时扣HP；旧毒结算减1后补毒，头骨/触媒/制品另核', '持续补毒须活到触发，药产能力不当下战常驻能力', 'N8A2W8LH39N0 F14T2药产雾建2，T3补2结2令12→10；T4补到3再蛇咬至10胜，末杀拆分缺帧；F15无雾。HNX4A2WBC34W三结毒仍败')
mechanism('silent-deadly-poison-application', ['silent-0025'], [HX], '致命毒药普通/升级实施5/7毒，不即时扣本体', '施毒与实际结算分源，制品/头骨/触媒及剩HP限制另核', '毒进度与存活挡同核，限牌时未打出的毒不计', 'HXCY44VD9QWU升级毒药已实加7；末T8昏眩首生存者后毒药+被阻，只有旧7毒结至敌116，不能预支再施毒')
groups = collections.defaultdict(list)
for x in A['attempts']:
    if any(e['id'] == 'CEREMONIAL_BEAST' for e in x['terminal']['enemies']):
        groups[(x['run'], x['floor'])].append(x)
multi = [v for v in groups.values() if max(x['attempt'] for x in v) > 1]
sltext = f'真正重打{len(multi)}场{sum(len(v) for v in multi)}试{sum(x["result"] == "won" for v in multi for x in v)}赢，替序整战单因未控'
mechanism('silent-ceremonial-beast-threshold-growth-sl', ['silent-0133'], [HX], '仪式兽跨现场阈值清横冲与阶段力量，后段仍有血价', '本体HP读{@10:HP:CEREMONIAL_BEAST}、阈值读PLOW_POWER；已见低阶150/A9与A10为160，不推统一阈值公式', '直伤及已结毒推进阶段，仍核剩敌HP/昏眩/攻击', 'HXCY44VD9QWU末T6直伤24令190→166、9毒至157，清8力/横冲且1血不变；T8余敌116仍死。六试0赢，同抽前缀不等全场同状态', sltext)
mechanism('silent-ceremonial-beast-ringing-one-card', ['silent-0222'], [HX], '已见1层昏眩窗口打首牌后阻止其他牌，余能不等可出牌', '首牌后其余手牌blocked_by_hook，仅核1层；生成牌与药水按现场另核', '首牌的实际攻防与后结毒同预算，不推另一首牌能赢', 'HXCY44VD9QWU末T8生存者8挡后余3能量、三牌被阻；1血对17需损9，至少差9存活血，7毒后敌116。MTQ0EUBJ3R6T首防御后胜')
mechanism('silent-byrdonis-strength-multihit-observation', ['silent-0134'], [HX, N8], '观察：异鸟领地意识持续时轮初力量增长，同招逐击增伤', '每段加现场力再核弱，已见逐轮加1；触发独立条件未隔离', '输出、可活轮与弱/实挡共同核，弱不清力量', 'HXCY44VD9QWU F8力0—5、飞扑19/21/23、三击15/21/27，胜耗49；N8A2W8LH39N0九轮力0—8，T8弱后三击24，胜43→2')
mechanism('silent-horn-cleat-second-turn-block', ['silent-0242'], [N8], '观察：船夹板已见第二轮轮初14挡，不是每轮固定挡', '轮初已有挡与卡牌挡分源，不跨轮，不加敏捷', '只支付当前攻，未受击的剩挡不预支到下一轮', 'N8A2W8LH39N0 F15T2轮初14挡对6攻零损，T3轮初0挡；2血对22攻死，不能把前轮14再减一次')
toric_n = len([x for x in A['cards'] if x['card'] == 'TORIC_TOUGHNESS' and x['run'] in next(e for e in E['entries'] if e['id'] == 'silent-toric-toughness-delayed-block')['evidence'] + [N8]])
mechanism('silent-toric-toughness-delayed-block', ['silent-0289'], [N8], '坚韧之环即时给挡，并兑现两次轮初同额挡', f'{toric_n}次completed实打；普通基础5加现场敏/脆弱，延迟沿施放额度；升级/重放/叠层未核不外推', '当前血价和可活后轮合核，未施放不建立', 'N8A2W8LH39N0 F12T7实5并建2，T8/T9各轮初5、额度1→消失，延迟合10挡仍胜耗41；F15T2持牌未打不计延迟收益。ZVYUL2YP3518六敏实11后仍各11')
mechanism('silent-bygone-effigy-wake-strength', ['silent-0307'], [HX, N8], '雕像沉睡/苏醒后十力斩击按每轮真实挡核', '基础伤按{@0:DMG:BYGONE_EFFIGY:SLASHES_MOVE}/{@10:DMG:BYGONE_EFFIGY:SLASHES_MOVE}加现场力弱，前轮挡不跨轮', '沉睡窗口实际输出与后轮防御共同核，不定固定首轮序', 'N8A2W8LH39N0 F8满70进，苏醒后10力25攻，T3/T4零直伤各损8/7，11轮胜余1；HXCY44VD9QWU F15五轮40→8')
new = dict(id='silent-jaxfruit-strength-vulnerable-observation', scope='hallway:SNAPPING_JAXFRUIT', asc=[0, 20], lesson='观察：闪光贾克斯果同一能量球招式兼攻与增益，后轮力量增长；易伤并存时不能把全部涨幅归力量。机制：已见力量0→2→4，现场力与玩家易伤分别核，Buff触发和跨进阶基伤未独立拟合。搭配：弱、实挡与两敌剩血同预算，不定固定杀序。决定胜负的战斗：3支持/0反例，单项整战胜因未控（n=3）。典型案例：N8A2W8LH39N0 A10 F15三轮意图4/6/12，末另有2易伤，果12加菌弱后10共22对2血0挡死；F9PP859XZ3RJ A4 F14力0→2、意图3→5；9YBKCNBFP0X5 A4 F6见4力且胜。', evidence=['F9PP859XZ3RJ', '9YBKCNBFP0X5', N8], n_support=3, n_contradict=0, confidence='med', last_seen='2026-10-09', status='active')
assert not any(e['id'] == new['id'] for e in E['entries'])
E['entries'].append(new)
C.append(dict(id=new['id'], before=None, after=new))
M[new['id']] = ['silent-0345']
E['version'] = '2026-10-09.27'
E['_about'] = f'静默经验只从本角色实盘/复盘学习。第138次增量核HXCY44VD9QWU、N8A2W8LH39N0；全引擎学习观察截至{A["cutoff"]}；主题支持局、公式动作、血档/节点/SL分母分开，未配对观察不当整战因果。'
(ROOT / 'knowledge/characters/silent/experience.json').write_text(json.dumps(E, ensure_ascii=False, indent=2) + '\n')
for name, value in [('changes', C), ('ledger-map', M)]:
    (O / (name + '.json')).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
def sizes(e):
    active = [x for x in e['entries'] if x['status'] == 'active']
    return dict(active=len(active), chars=sum(len(x['lesson']) for x in active), confidence=dict(collections.Counter(x['confidence'] for x in active)), by_asc={str(i): dict(entries=len(v), chars=sum(len(x['lesson']) for x in v)) for i in [8, 9, 10] if (v := [x for x in active if x['asc'][0] <= i <= x['asc'][1]])})
summary = dict(old_version=json.load(open(O / 'experience-before.json'))['version'], version=E['version'], added=1, updated=len(C)-1, evidence=len(C)-1, numbers=0, retired=0, before=sizes(json.load(open(O / 'experience-before.json'))), after=sizes(E))
assert summary['after']['chars'] <= 60000
(O / 'update-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(summary, ensure_ascii=False))
