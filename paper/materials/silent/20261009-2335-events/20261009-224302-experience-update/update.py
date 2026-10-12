import collections
import json
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = O.parents[2]
RUN = '0PH64C4AWAX9'
A = json.load(open(O / 'audit.json'))
E = json.load(open(O / 'experience-before.json'))
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
    revise(ident, ledger, f'{conclusion}。机制：{formula}。搭配：{pair}。决定胜负的战斗：【n】支持/0反例，整战单因未控（n=【n】）。典型案例：{case}')

r = next(x for x in json.load(open(O / 'rest-summary.json')) if x['asc'] == 10)
b = next(x for x in A['bands'] if (x['asc'], x['act'], x['type'], x['band']) == (10, 2, 'Elite', '<25%'))
revise('silent-route-hp-observation', ['silent-0019'], f'观察：赢战血药成本接下一战，未来回血不预支，问号另账。A10 {r["runs"]}局二幕精英入口<25%共{b["n"]}房/{b["runs"]}局、{b["deaths"]}死（{100*b["deaths"]/b["n"]:.2f}%），活损中位{b["median_win"]}（n=【n】）。典型案例：0PH64C4AWAX9 F21/22/23三胜59→49→28→7，F24小血瓶后9血三试零赢；双火在强制精英后未到，替路线胜负未知。')
revise('silent-rest-buffer-observation', ['silent-0020'], f'观察：HEAL兑现即时缓冲，不保证下战；SL恢复/跨幕另账。A10 {r["runs"]}局{r["rests"]}独立火/{r["heal"]}HEAL回{sum(r["gains"])}，去重{r["nexts"]}后战/{r["deaths"]}死（{100*r["deaths"]/r["nexts"]:.2f}%），活损中位{r["median"]}（n=【n】）。典型案例：0PH64C4AWAX9 F16休41→62，F17胜离6，跨幕回51至57；后二火未到，不制定替锻造胜因。')
mechanism('silent-deck-burst-observation', ['silent-0021','silent-0057'], '观察：库存能力、计划后继与实际兑现分开', '未打能力无已建收益；弃牌与随机施毒后须重核当前攻防', '持续毒、实挡及能活到的结算同预算', '0PH64C4AWAX9 F17负力两打击实8加毒27仍推进35，赢耗56；F24T3才建毒雾2，无下轮施毒，前段毒死后余18攻仍杀2血0挡玩家')
mechanism('silent-strength-weak-observation', ['silent-0012'], '力量逐击加伤、敏捷逐牌加挡，毒分源', '现场属性后核弱/脆弱；负力量不减已建毒，临时减力撤回须重读', '多段攻击、多张挡及实际毒结算共同验收', '0PH64C4AWAX9 F17T8力敏各−2，两打击各4、防御3；T10防御3+冲刺8共11对16损5。F23T1双尖啸令弱化攻击7→3→0，次轮撤减力')
mechanism('silent-frail-card-block', ['silent-0013'], '脆弱逐张折减牌挡，被动挡另源', '已见基础加敏后乘0.75向下取整；负敏及其他倍率分核', '实际施放的挡与毒结后尚活攻击者同预算', '0PH64C4AWAX9 F23T3无敏脆弱生存者8→6，中和使23→17攻击，损11；9663Y88TYK73末防御5→3，5血对8攻死')
mechanism('silent-piercing-wail-temporary-strength', ['silent-0046'], '尖啸临时减6/8力，不能当永久防守', '逐段按现场力量和弱核攻击，次轮撤回；制品另核', '两张可叠加但后轮成长/牌挡须重算', '0PH64C4AWAX9 F23T1两普通尖啸力0→−6→−12、弱攻7→3→0；T2撤回，T3敌7力23攻，中和后17仍损11。9663Y88TYK73已弱12减6力后实8')
mechanism('silent-bouncing-flask-poison', ['silent-0010','silent-0295'], '药瓶按实际次数与落点施毒，不保证指定目标启毒', '普通3毒×3、升级3毒×4；制品逐次核，施毒不即时扣HP', '逐敌毒与冒泡条件同验，不以代表随机落点预支收尾', '0PH64C4AWAX9 A10 F24三试药瓶+均前/中各6、后段0毒；首两试冒泡后段零效果，首试整轮实扣16而预测25。RZ6YAC7K89NM总伤相同但逐敌血差6')
mechanism('silent-bubble-bubble-condition', ['silent-0010'], '冒泡仅对已有毒目标补毒，普通/升级9/12', '无毒仍耗费零效果，后来施毒不倒补；施毒不即时伤', '先核实际初毒再核可活结算次数，随机药瓶不能保证条件', '0PH64C4AWAX9 F24首/二试后段无毒，冒泡能量1→0而50血不变；F23T5有毒目标16→25、本体62不变，随后实结25')
mechanism('silent-noxious-fumes-growth', ['silent-0025'], '毒雾普通/升级建2/3层，后轮初补毒', '建立当步不施毒/扣HP，旧毒结后减1再补；头骨/制品另核', '持续补毒须活到后轮，不因库存或末轮建立预支伤害', '0PH64C4AWAX9 F24末T3实建2层，敌毒与HP当步不变，死亡后无下轮；N8A2W8LH39N0 F14药产雾T2建2、T3补2结2令12→10')
mechanism('silent-lagavulin-siphon-poison-sl', ['silent-0030'], '族母吸取压缩直伤/牌挡，已建毒独立推进', '已见玩家力敏各−2、敌力+2；负力量不减技能毒，血价另账', '毒成长与实际挡/临时减力共同核，重打不补入口资源', '0PH64C4AWAX9 A10 F17T8起负2力敏，T8/T9/T10毒27/26/25、直伤8/6/8；T11首次胜离6，净耗56；QHK1XQ928TTM负力T12毒收尾')
mechanism('silent-decimillipede-reattach-poison', ['silent-0064','silent-0079'], '千足虫需伤只加实际重接，毒杀一段后仍核其他敌', '旧9局见重接，现2局未见重接；显示接续25不等已复活，毒/力按新帧核', '逐敌初毒、实挡及精灵出口同预算，不定固定击杀顺序', '0PH64C4AWAX9 A10三试零赢；末T3前段1血4毒退场，中/后18/50仍活，余18攻杀2血0挡，无重接。累计真正重打3场11试0赢；G33HU22H2543已实见六次各25')
mechanism('silent-survivor-neutralize-discard', ['silent-0205'], '观察：弃掉后继牌会取消其计划收益，也可能省费用/自损', '未施放牌无原攻击/挡/弱效果；生存者普通8挡、脆弱另核', '在选择边界比较实存手牌攻防，不强制保留旧计划', '0PH64C4AWAX9 F17T5弃冲刺，原18挡/零损/扣25变8挡对14损6、扣31；F23T3弃腐化串刺，原损13/扣39变实损11/扣15并免2自损，保留整战未实打')
mechanism('silent-cunning-potion-shiv-capacity', ['silent-0257','silent-0258'], '狡诈有手位时添三张小刀+，缺位只填空位', '手位上限10仅本药观察；每刀基础6，当前力量/虚弱另核，恢复非新得', '实可打刀后缀与活敌攻击及精灵出口同核，不定饮药时点', '0PH64C4AWAX9 F24三饮各添三刀；首试弱下每刀4，后二试每刀6、共18；第二/三试同敌出口但0/5挡令复活出口8/14，三试均败。WQZVENQ7DTRP八手饮只添2')
mechanism('silent-act-transition-missing-hp-heal', ['silent-0243'], '已见A9/A10跨幕按缺失HP80%向下取整回复', '同上限⌊(maxHP−HP)×0.8⌋；连续boss不回，低阶不外推', '营火/事件/小血瓶与SL恢复分账，未来回复不预支', '0PH64C4AWAX9 F17胜6/70，跨幕⌊64×0.8⌋=51回至57；唯一休息回21另账。9663Y88TYK73两次29/70各回32')

ident = 'silent-fairy-revival-exit-observation'
text = '观察：瓶中精灵被动复活出口须按剩余攻击核，不能直接把名义回复当轮末血。机制：本局0血过渡帧耗瓶，独立复活血量/逐击顺序缺帧，不推通用挡收益公式。搭配：当前挡、逐敌攻击及真实出口同验，SL恢复另账。决定胜负的战斗：A10一场三试零赢，局部对照非整战胜因（n=1）。典型案例：0PH64C4AWAX9 F24第二/三试T1同三刀、同敌出口24/40/50，末挡0/5、复活出口8/14；T2前者判死、后者损12余2，T3仍死，独立21血帧未见。'
entry = dict(id=ident, scope='potion:FAIRY_IN_A_BOTTLE', name='瓶中精灵', asc=[0,20], lesson=text, evidence=[RUN], n_support=1, n_contradict=0, confidence='low', last_seen='2026-10-09', status='active')
assert not any(x['id']==ident for x in E['entries'])
E['entries'].append(entry)
C.append(dict(id=ident,before=None,after=entry))
M[ident]=['silent-0350']
E['version']='2026-10-09.30'
E['_about']=f'静默经验只从本角色实盘/复盘学习。第141次增量核0PH64C4AWAX9；全引擎学习观察截至{A["cutoff"]}。主题支持、公式动作、血档、节点及SL分母分开；未控观察不当整战因果，其他角色资料不迁入。'
(ROOT/'knowledge/characters/silent/experience.json').write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
for name,value in [('changes',C),('ledger-map',M)]:
    (O/(name+'.json')).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def sizes(data):
    active=[e for e in data['entries'] if e['status']=='active']
    return dict(active=len(active),chars=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),by_asc={str(i):dict(entries=len(v),chars=sum(len(e['lesson']) for e in v)) for i in [8,9,10] if (v:=[e for e in active if e['asc'][0]<=i<=e['asc'][1]])})
summary=dict(old_version=json.load(open(O/'experience-before.json'))['version'],version=E['version'],added=1,updated=len(C)-1,evidence=len(C)-1,numbers=0,retired=0,before=sizes(json.load(open(O/'experience-before.json'))),after=sizes(E))
assert summary['after']['chars']<=60000
(O/'update-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False))
