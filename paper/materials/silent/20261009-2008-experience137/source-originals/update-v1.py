import collections
import json
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = O.parents[2]
N = 'HNX4A2WBC34W'
E = json.load(open(O / 'experience-before.json'))
A = json.load(open(O / 'audit.json'))
C, M = [], {}

def revise(ident, ledger, text):
    e = next(x for x in E['entries'] if x['id'] == ident)
    before = json.loads(json.dumps(e))
    assert N not in e['evidence']
    e['evidence'].append(N)
    e['n_support'] = len(set(e['evidence']))
    e['last_seen'] = '2026-10-09'
    n, c = e['n_support'], e['n_contradict']
    e['confidence'] = 'high' if n >= 5 and c <= n / 3 else 'med' if n >= 2 else 'low'
    e['lesson'] = text.replace('【n】', str(n))
    C.append(dict(id=ident, before=before, after=e))
    M[ident] = ledger

def mechanism(ident, ledger, conclusion, formula, pair, case, limit='单项整战胜因未控'):
    revise(ident, ledger, f'{conclusion}。机制：{formula}。搭配：{pair}。决定胜负的战斗：【n】支持/0反例，{limit}（n=【n】）。典型案例：{case}')

def sl_counts(enemy, evidence):
    groups = collections.defaultdict(list)
    for x in A['attempts']:
        if x['run'] in evidence and any(e['id'] == enemy for e in x['terminal']['enemies']):
            groups[(x['run'], x['floor'])].append(x)
    multi = [v for v in groups.values() if max(x['attempt'] for x in v) > 1]
    return f'{len(multi)}场{sum(len(v) for v in multi)}试{sum(x["result"] == "won" for v in multi for x in v)}赢'

r = next(x for x in json.load(open(O / 'rest-summary.json')) if x['asc'] == 10)
b = next(x for x in A['bands'] if (x['asc'], x['act'], x['type'], x['band']) == (10, 3, 'Monster', '25–40%'))
revise('silent-route-hp-observation', ['silent-0019'], f'观察：赢战仍耗血药，未来营火不预支，问号另算。A10 {r["runs"]}局三幕Monster入口25–40%共{b["n"]}房/{b["runs"]}局、{b["deaths"]}死（{100*b["deaths"]/b["n"]:.2f}%），活损中位{b["median_win"]}（n=【n】）。典型案例：HNX4A2WBC34W F35/36/39胜耗6/19/37，38血打猫头鹰至1；回血23后电球头再耗15。不同节点无同条件对照，避精英不等后战安全。')
revise('silent-rest-buffer-observation', ['silent-0020'], f'观察：HEAL增加即时缓冲，锻造不回血，SL恢复另账。A10 {r["runs"]}局{r["rests"]}独立火/{r["heal"]}HEAL实回{sum(r["gains"])}，去重{r["nexts"]}后战{r["deaths"]}死（{100*r["deaths"]/r["nexts"]:.2f}%），活损中位{r["median"]}（n=【n】）。典型案例：HNX4A2WBC34W八HEAL回178、两锻造不回；F44回22、大蘑菇增上限20和HP20、F47回28至78/95，首boss三败。没有回血换升级整战胜局。')
mechanism('silent-deck-burst-observation', ['silent-0021', 'silent-0125'], '观察：即时保血与持续毒、减力和能力收益需一起验收', '未施放不生效，未结毒不代付血价；模型当轮省血不等整场救血', '输出、过牌、实际挡与可活回合合核', 'HNX4A2WBC34W三次HP护栏题面合省31血/少32即时伤，另让渡减力与新毒；沙虫首试判死、重打19血胜但药时和后序也变，不能归单因')
mechanism('silent-strength-weak-observation', ['silent-0012'], '力量逐击加伤、敏捷逐挡牌加挡，敌成长另账', '先加现场属性再核弱等倍率；毒和余像被动挡不加力敏', '多击/多挡须实际施放，临时属性撤后重核', 'HNX4A2WBC34W沙漏末T7三刀各4+1=5共15；T8两基础5挡各加2敏共多4挡，仍死。敌力T3后−1→3、T6后3→8，弱退后T8显示40攻', '单公式整战因果未控')
mechanism('silent-footwork-block', ['silent-0005'], '步法普通/升级实建2/3敏捷，随后牌挡逐张兑现', '旧挡不追补，换战重建；被动余像另源', '多挡牌须有费用与存活窗口，临时速度分开', 'HNX4A2WBC34W沙漏末T4建2敏；T8后空翻和防御各5+2=7、各余像1再暴露1共17，比无敏多4仍对40攻加9凋萎死；C48LLXBGKXQ9升级建3')
mechanism('silent-noxious-fumes-growth', ['silent-0011'], '毒雾普通/升级建立2/3层，后续轮初施毒', '建立不即时扣血；头骨、触媒、制品与阶段另核', '持续补毒须活到触发，已有毒和新补毒分账', 'HNX4A2WBC34W沙漏末T5建雾2，T6旧毒12补到14，触媒三结39；T8旧27补到29结84仍余130。XW8B5CHJ814J女王T3建雾却无T4')
mechanism('silent-deadly-poison-application', ['silent-0025'], '致命毒药普通/升级实施5/7毒，不即时扣血', '结毒减1，制品、头骨、触媒及剩HP限制另核', '补毒和实际结算分账，毒进度不能替生存挡', 'HNX4A2WBC34W沙漏末T7两毒药把13→20→25毒，刀刃之舞再触发腐蚀波抽牌施毒到30，三结87仍余214；手持凋萎使38→2')
mechanism('silent-accelerant-triggers', ['silent-0027'], '触媒增加毒结次数，不倍增毒层', '普通/升级建1/2；k层至多k+1结，每结减1，零停止，剩HP/限伤/阶段另核', '补毒与存活窗口兑现，尚活敌攻击另付血挡', 'HNX4A2WBC34W沙漏末T6三结14+13+12=39、T7为30+29+28=87、T8为29+28+27=84，敌535合扣405余130；沙虫末T10仅8血被11毒结束而22攻未兑现', '单卡整战胜因未控')
mechanism('silent-afterimage-per-card-block', ['silent-0023'], '余像建立后每层每次实际出牌补1挡，自身首次不触发自己', '重放与牌挡分源，脆弱不折被动挡，换战重建', '多牌补挡仍须支付抽入持牌伤及活敌攻击', 'HNX4A2WBC34W沙漏末T7七牌实7挡，两9伤凋萎加25攻需损36；T8两牌挡14另三次余像3共17仍死。64R0P0MTZWAX建立自身未给挡')
mechanism('silent-wither-end-turn-loss', ['silent-0024'], '凋萎持牌伤与攻击和挡同核，毒进度不免当前血价', '按现场3/6/9/12/15文本及末持牌数，弃去不计，挡可吸收；内部全序缺帧不补', '弃牌与实挡可改局部血价，未执行替序不声称能赢', 'HNX4A2WBC34W沙漏末T6三张6伤由18挡吸收、38血不变；T7两9伤加25攻减7挡实损36，T8一9伤加40攻减17挡静态32、实扣仅2因死亡裁剪；预测30差2未归因', '保血替线整战未控')
mechanism('silent-vajra-opening-strength', ['silent-0049'], '金刚杵开场给1力量，收益按实际攻击段兑现', '无其他修正每段基础加1，弱/削力/无实体另核；不加毒或挡', '小刀和多击逐段获益，增伤不替存活窗口', 'HNX4A2WBC34W沙漏末T7三小刀每张4→5合15，比无力多3，余87为毒；LYBHQ1X230ZB四攻击段多4伤', '遗物整战胜因未控')
mechanism('silent-malaise-x-debuff', ['silent-0053'], '萎靡普通按X、升级按X+1减力并加虚弱', '现场X及制品/激怒另核，减力不关闭以后成长，本牌不直接给挡', '逐击攻击、虚弱、实际挡与后轮持续收益合核', 'HNX4A2WBC34W沙虫首T3护栏实−2力/2弱，重打同轮投入−4/4弱配速度21挡零损；资源与后序同时变化，不归药时或萎靡单因', '单卡整战未控')
mechanism('silent-mirage-poison-card-block', ['silent-0010'], '蜃景按施放时活敌毒总量给牌挡，后来施毒不追补', '现场敏捷和倍率核牌挡，被动来源另账，不消毒', '先建实毒、再以可支付的挡牌兑现当轮防御', 'HNX4A2WBC34W沙虫重打T3敌6毒、速度给5敏，蜃景基础6实11挡、防御10合21；配萎靡后对20攻实零损，下轮敏撤5', '单卡整战未控')
mechanism('silent-speed-potion-temporary-dexterity', ['silent-0253'], '速度药实加5临时敏捷，次轮撤回', '后续每张牌挡加5，旧挡不追补，其他敏捷变化另账', '与蜃景/防御/步法逐张核，不拟早喝留药门槛', 'HNX4A2WBC34W沙虫重打T3敏0→5，防御10加蜃景11共21，比无药同两牌11多10；T4敏回0。首试T2饮与重打T3饮且萎靡/后序也变，非药时单因')
pots = [x for x in A['potions'] if x['potion'] and (x['potion'].get('id') if isinstance(x['potion'], dict) else x['potion']) == 'POISON_POTION']
ev = next(x for x in E['entries'] if x['id'] == 'silent-poison-potion-observed-application')['evidence'] + [N]
pc = len([x for x in pots if x['run'] in ev])
mechanism('silent-poison-potion-observed-application', ['silent-0278'], '毒药水先施毒，饮用当步不扣敌本体HP', f'支持局{pc}次completed饮用，常态加6、头骨加7、制品可阻毒；SL恢复非新获', '存活窗口、限伤与实结分核，不定喝留门槛', 'HNX4A2WBC34W沙漏三试分别T3/T1/T3实饮，药槽均消失、施毒与后来结算分账；三次同78/95两药入口仍全败，没有留药或早喝受控胜果', '单药整战未控')
mechanism('silent-cure-all-energy-draw', ['silent-0240'], '痊愈药水实见加1能量并抽2牌，不直接回血', '以实际能量/手牌/HP前后帧核，不按名字计治疗；满手等未见边界不外推', '抽入牌与费用、弃牌及持牌伤重核，不定喝药时机', 'HNX4A2WBC34W沙漏首/末T1和第二试T2饮药，三次均HP当步不变、能量+1与手牌+2，随后真实血价另付；SL恢复两瓶不当新取得', '单药整战未控')
mechanism('silent-act-transition-missing-hp-heal', ['silent-0243'], '已见A9/A10跨幕按缺失HP的80%向下取整回血', '同上限⌊(maxHP−当前HP)×0.8⌋；连续boss不回血，未观察低阶范围不补', '营火、事件、遗物与SL恢复分源，未来血不预支', 'HNX4A2WBC34W仪式兽后35/75→67回32，沙虫后19/75→63回44；两次沙漏读档21→78、2→78另恢复药水，非回血；本局未到F49', '回复不保证后战')
for ident, ledger, enemy, conclusion, formula, pair, case in [
    ('silent-aeonglass-artifact-growth-sl', ['silent-0024', 'silent-0125'], 'AEONGLASS', '观察：沙漏成长、持牌伤、实际毒与入口资源合核', '本体HP按进阶{@10:HP:AEONGLASS}读；制品消耗后才加毒，弱退后重读攻击，玩家增益不取消敌力', '实毒/血挡和有限重打边界分账，不由全败模拟独立定必死', 'HNX4A2WBC34W三次78/95两药均败，前两次T7判死，末T8真实死；末T7实损36，T8静态需32而仅2血、结84毒后敌余130；有未知抽牌时判官不确定，未到F49'),
    ('silent-insatiable-dual-clock', ['silent-0018'], 'THE_INSATIABLE', '沙虫沙坑与攻击分别核，逃离续时不挡攻击', '已见逃离加1，毒清场可取消尚未兑现攻击，未来毒不预支；其他防死交互未核', '可支付逃离、当轮血挡与实际剩敌HP合核', 'HNX4A2WBC34W两次58/75同槽速度入口，首T11 12血3挡对33且敌106/9毒判死；重打T3药/萎靡投入及后序一起变化，T10敌8/11毒结束、22攻未兑现，19血胜')
]:
    evidence = next(x for x in E['entries'] if x['id'] == ident)['evidence'] + [N]
    mechanism(ident, ledger, conclusion, formula, pair, case, '真正重打' + sl_counts(enemy, evidence) + '，替序整战单因未控')
mechanism('silent-bygone-effigy-wake-strength', ['silent-0307'], '雕像沉睡后苏醒无攻，随后十力斩击逐轮核挡', '基础伤按{@0:DMG:BYGONE_EFFIGY:SLASHES_MOVE}/{@10:DMG:BYGONE_EFFIGY:SLASHES_MOVE}及现场力弱计算，前轮挡不跨轮', '当轮毒、输出与防御取舍分账，不拟沉睡期固定出牌序', 'HNX4A2WBC34W F14满75进、六轮胜32；T4护栏候选损24/伤25换损14/伤8，实际51→37、敌49→41，原线未完整执行，省血10仅题面差', '固定打法胜因未控')

E['version'] = '2026-10-09.26'
E['_about'] = '静默经验只从本角色实盘/复盘学习。第137次增量核HNX4A2WBC34W；全引擎学习观察截至' + A['cutoff'] + '；主题支持局、公式动作、血档/节点/SL分母分开，未配对观察不当整战因果。'
(ROOT / 'knowledge/characters/silent/experience.json').write_text(json.dumps(E, ensure_ascii=False, indent=2) + '\n')
for name, value in [('changes', C), ('ledger-map', M)]:
    (O / (name + '.json')).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def sizes(e):
    active = [x for x in e['entries'] if x['status'] == 'active']
    return dict(active=len(active), chars=sum(len(x['lesson']) for x in active), confidence=dict(collections.Counter(x['confidence'] for x in active)), by_asc={str(i): dict(entries=len(v), chars=sum(len(x['lesson']) for x in v)) for i in [8, 9, 10] if (v := [x for x in active if x['asc'][0] <= i <= x['asc'][1]])})

summary = dict(old_version=json.load(open(O / 'experience-before.json'))['version'], version=E['version'], added=0, updated=len(C), evidence=len(C), numbers=0, retired=0, before=sizes(json.load(open(O / 'experience-before.json'))), after=sizes(E))
assert summary['after']['chars'] <= 60000
(O / 'update-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(summary, ensure_ascii=False))
