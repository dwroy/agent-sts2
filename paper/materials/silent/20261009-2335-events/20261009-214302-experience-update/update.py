import collections
import json
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = O.parents[2]
A = json.load(open(O / 'audit.json'))
E = json.load(open(O / 'experience-before.json'))
RUN = '9663Y88TYK73'
C, M = [], {}

def revise(ident, ledger, text):
    e = next(x for x in E['entries'] if x['id'] == ident)
    before = json.loads(json.dumps(e))
    assert RUN not in e['evidence']
    e['evidence'].append(RUN)
    e['n_support'] = len(set(e['evidence']))
    e['last_seen'] = '2026-10-09'
    n, c = e['n_support'], e['n_contradict']
    e['confidence'] = 'high' if n >= 5 and c <= n / 3 else 'med' if n >= 2 else 'low'
    e['lesson'] = text.replace('【n】', str(n))
    C.append(dict(id=ident, before=before, after=e))
    M[ident] = ledger

def mechanism(ident, ledger, conclusion, formula, pair, case):
    revise(ident, ledger, f'{conclusion}。机制：{formula}。搭配：{pair}。决定胜负的战斗：【n】支持/0反例，单项整战胜因未控（n=【n】）。典型案例：{case}')

r = next(x for x in json.load(open(O / 'rest-summary.json')) if x['asc'] == 10)
b = next(x for x in A['bands'] if (x['asc'], x['act'], x['type'], x['band']) == (10, 3, 'Unknown', '<25%'))
revise('silent-route-hp-observation', ['silent-0019'], f'观察：赢战血药成本接下一战，问号另算，未来回血不预支。A10 {r["runs"]}局三幕问号入口<25%共{b["n"]}房/{b["runs"]}局、{b["deaths"]}死（{100*b["deaths"]/b["n"]:.2f}%），活损中位{b["median_win"]}（n=【n】）。典型案例：9663Y88TYK73 F43满70赢离19，F44休到55，F45赢离9，F46开场扣至5后死；F47未到，改线胜因未控。')
revise('silent-rest-buffer-observation', ['silent-0020'], f'观察：HEAL兑现即时缓冲，不保证下战；锻造/SL恢复另账。A10 {r["runs"]}局{r["rests"]}独立火/{r["heal"]}HEAL回{sum(r["gains"])}，去重{r["nexts"]}后战/{r["deaths"]}死（{100*r["deaths"]/r["nexts"]:.2f}%），活损中位{r["median"]}（n=【n】）。典型案例：9663Y88TYK73七次HEAL回152，末火19→55、下战损46；未来火未到，替升级/路线整战未控。')
mechanism('silent-deck-burst-observation', ['silent-0021','silent-0057'], '观察：已建能力与可活回合同验，库存牌不计收益', '未施放不建增益，未来毒不代付当前血价', '补毒、结算次数、逐牌挡和活敌攻击合核', '9663Y88TYK73 F45触媒三结毒60/63仍胜耗46；F46没有余像/触媒建立，两瓶毒结33后敌49血、5血3挡对8攻死，提前施放整战未控')
mechanism('silent-strength-weak-observation', ['silent-0012'], '力量逐击加伤、敏捷逐牌加挡，弱/脆弱另核', '已弱攻击新增减力须重新核倍率/取整，不能直接减显示伤害', '多段减力、多牌挡按实际窗口兑现', '9663Y88TYK73 F46末T3敌已有弱，尖啸减6力使12→8而非6；防御脆弱实3，需损5且HP5死。F17速度三挡多15，当轮33挡抵33攻')
mechanism('silent-piercing-wail-temporary-strength', ['silent-0046'], '尖啸临时减6/8力，弱和次轮恢复另核', '每段伤先核现场力量再核倍率/取整，不直接从已弱显示值扣6', '实际挡与毒结后仍活敌攻击同预算', '9663Y88TYK73 F46末T2弱配尖啸令7×3→0×3；T3已有弱12攻减6力后实8，5血3挡死亡；54G5683J0E5S巨斧次轮恢复8力')
mechanism('silent-frail-card-block', ['silent-0013'], '脆弱逐张折减牌挡，余像被动挡另源', '基础加现场敏捷后已见×0.75向下取整，旧挡不补', '当前实际施放与活敌攻击共同核', '9663Y88TYK73 F46末T3无敏且脆弱1，防御⌊5×0.75⌋=3，5血对8攻死；54G5683J0E5S一敏脆弱冲刺实8')
mechanism('silent-speed-potion-temporary-dexterity', ['silent-0253'], '速度药实加5临时敏捷，只在本轮兑现', '已有挡不补，后继每张牌加敏；次轮撤回，脆弱另核', '多张实可打挡牌与费用共同验收，不定药时门槛', '9663Y88TYK73 F17T5饮后0挡，生存者13/两防御各10合33，比基础18多15、抵33攻零损；T6速度和敏捷消失')
mechanism('silent-afterimage-per-card-block', ['silent-0023'], '余像建立后每层每次实出牌补1挡，自身首次不触发自己', '重放/牌挡/脆弱分源，换战重建', '多牌补挡仍须支付活敌攻击，未打能力不预支', '9663Y88TYK73 F43T2建1层，T3防御基础5加三次触发共8挡，对28损20；F46四试均未建立，库存余像不计挡')
mechanism('silent-accelerant-triggers', ['silent-0027'], '触媒增加毒结次数，不倍增毒层', '普通/升级建1/2；k层至多k+1结，每结减1，零/剩HP/阶段另核', '补毒与存活窗口共同兑现，尚活敌攻击仍付血挡', '9663Y88TYK73 F43T4末19毒三结19+18+17=54、106→52；F45T4/T5三结60/63；F46未建触媒只结一次、末敌49仍杀玩家')
mechanism('silent-deadly-poison-application', ['silent-0025'], '致命毒药普通/升级实加5/7毒，施毒不是当步扣血', '实际结算次数、头骨/制品和敌余血分源', '补毒与当前实挡/可活回合同核', '9663Y88TYK73持致命毒药实加毒，F45触媒后21毒结60；F46末施毒与两药至33，结后敌49仍攻击；54G5683J0E5S毒药+实加7而本体HP不变')
mechanism('silent-royal-poison-blood-vial-opening-net', ['silent-0255'], '王室猛毒血价须计入可操作入口，读档恢复分账', '无小血瓶已见新战净扣4；同持旧两场净扣2，内部先后未核', '茶/休息与开场扣血分账，不把恢复当回血或新药', '9663Y88TYK73 F43/45/46入口70/55/9各扣4至66/51/5；F46三次读档从1空药恢复5两药，未再见扣4，四试零赢')
mechanism('silent-act-transition-missing-hp-heal', ['silent-0243'], '已见A9/A10跨幕按缺失HP80%向下取整回复', '同上限⌊(maxHP−HP)×0.8⌋，连续boss不回，低阶未核', '营火/药/事件/SL各自分账，未来回复不预支', '9663Y88TYK73 F17/F33各29/70胜，跨幕均⌊41×0.8⌋=32至61；七火回152和茶回31另账，F46读档恢复非普通回血')
p_evidence = set(next(e['evidence'] for e in E['entries'] if e['id']=='silent-poison-potion-observed-application')) | {RUN}
p = [x for x in A['potions'] if x['run'] in p_evidence and (x['potion'] or {}).get('id') == 'POISON_POTION']
mechanism('silent-poison-potion-observed-application', ['silent-0278'], '毒药水先施毒，饮用当步不扣敌本体HP', f'支持局{len(p)}次completed饮用；常态加6、头骨加7、制品可阻毒，SL恢复非新获', '实际存活窗口/限伤/结算分核，不定喝留门槛', '9663Y88TYK73 F46末T3两瓶21→27→33毒，敌82血当步不变，随后结33至49仍杀5血3挡玩家；四试八饮为两实得瓶、六饮依赖恢复')

E['version'] = '2026-10-09.29'
E['_about'] = f'静默经验只从本角色实盘/复盘学习。第140次增量核9663Y88TYK73；全引擎学习观察截至{A["cutoff"]}，主题支持局与独立公式动作/血档/节点/SL分母分开，未控观察不当整战因果。'
(ROOT/'knowledge/characters/silent/experience.json').write_text(json.dumps(E, ensure_ascii=False, indent=2)+'\n')
for name, value in [('changes',C),('ledger-map',M)]:
    (O/(name+'.json')).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def sizes(data):
    active=[e for e in data['entries'] if e['status']=='active']
    return dict(active=len(active),chars=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),by_asc={str(i):dict(entries=len(v),chars=sum(len(e['lesson']) for e in v)) for i in [8,9,10] if (v:=[e for e in active if e['asc'][0]<=i<=e['asc'][1]])})
summary=dict(old_version='2026-10-09.28',version=E['version'],added=0,updated=len(C),evidence=len(C),numbers=0,retired=0,before=sizes(json.load(open(O/'experience-before.json'))),after=sizes(E))
assert summary['after']['chars']<=60000
(O/'update-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False))
