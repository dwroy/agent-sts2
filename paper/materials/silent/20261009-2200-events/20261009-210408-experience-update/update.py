import collections
import json
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = O.parents[2]
A = json.load(open(O / 'audit.json'))
E = json.load(open(O / 'experience-before.json'))
RUN = '54G5683J0E5S'
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

def mechanism(ident, ledger, conclusion, formula, pair, case, limit='单项整战胜因未控'):
    revise(ident, ledger, f'{conclusion}。机制：{formula}。搭配：{pair}。决定胜负的战斗：【n】支持/0反例，{limit}（n=【n】）。典型案例：{case}')

r = next(x for x in json.load(open(O / 'rest-summary.json')) if x['asc'] == 10)
b = next(x for x in A['bands'] if (x['asc'], x['act'], x['type'], x['band']) == (10, 3, 'Monster', '40–60%'))
revise('silent-route-hp-observation', ['silent-0019'], f'观察：赢战血药成本接下一战，未来营火/商店不预支，问号另算。A10 {r["runs"]}局三幕Monster入口40–60%共{b["n"]}房/{b["runs"]}局、{b["deaths"]}死（{100*b["deaths"]/b["n"]:.2f}%），活损中位{b["median_win"]}（n=【n】）。典型案例：54G5683J0E5S F42问号巨斧58→15耗两药，休21后F44以36/73空药死；后店/火未到，改线胜因未控。')
revise('silent-rest-buffer-observation', ['silent-0020'], f'观察：HEAL给即时缓冲，不保证下一战；锻造/SL恢复另账。A10 {r["runs"]}局{r["rests"]}独立火/{r["heal"]}HEAL回{sum(r["gains"])}，去重{r["nexts"]}后战/{r["deaths"]}死（{100*r["deaths"]/r["nexts"]:.2f}%），活损中位{r["median"]}（n=【n】）。典型案例：54G5683J0E5S七次HEAL各21共147，末火15→36后死，F47未到；没有换升级/路线受控胜果。')
mechanism('silent-deck-burst-observation', ['silent-0021', 'silent-0125'], '观察：能力兑现、当前保血和后战资源须共同验收', '未施放不建能力，未来毒不代付血价；护栏当轮省血不等整场胜因', '输出/抽牌/实挡及可活回合合核', '54G5683J0E5S F42T6护栏预测省14血、少14伤/7毒，实35→33；赢离15空药。F44手持双步法未打，始终1敏死，替线整场未控')
mechanism('silent-strength-weak-observation', ['silent-0012'], '力量逐击加伤、敏捷逐挡牌加挡，临时减力后重核', '先加现场属性再核弱/脆弱，毒与遗物被动伤挡另源', '多击/多挡只按实际施放兑现，换战不继承能力', '54G5683J0E5S巨斧8力单击26，尖啸暂清力成18；次轮恢复8力双击38、中和弱后28。9敏防御14，F44重回1敏', '单公式整战因果未控')
mechanism('silent-footwork-block', ['silent-0005'], '步法普通/升级实建2/3敏捷，后继挡牌逐张兑现', '旧挡不追补，换战重建；临时药/遗物/脆弱分源', '多挡须实际出牌且可活到兑现', '54G5683J0E5S F42步法+1→4，再药到6、步法到9；T6防御5+9=14挡。F44手持两步法+未打、仅1敏，不能预支9敏')
mechanism('silent-deadly-poison-application', ['silent-0025'], '毒药普通/升级实加5/7毒，施毒与扣血分源', '当步不扣本体；实际结毒、制品/头骨及剩HP另核', '毒杀取消该存活攻击者后仍核其他敌', '54G5683J0E5S F44T2毒药+主怪9→16毒、124血不变；T3旧戳刺3血加7毒退场，另两敌32攻仍杀21血8挡玩家')
mechanism('silent-vambrace-opening-block', ['silent-0013'], '臂甲翻倍战内首张实际牌挡，不是每轮翻倍', '首张基础加敏后翻倍，消费后其他挡另核', '首张实际牌序与后继敏捷分账', '54G5683J0E5S F44T1无牌挡，T2首防御(5+1)×2=12、次防御6、生存者9共27，抵12+15零损；T3冲刺脆弱后仅8')
mechanism('silent-frail-card-block', ['silent-0013'], '脆弱按每张实际牌挡折减，被动挡另核', '基础加敏后已见×0.75向下取整，未打能力不计增益', '逐张实可打牌/费用与当前攻击共同核', '54G5683J0E5S F44T3一敏且脆弱1，冲刺⌊(10+1)×0.75⌋=8而非11；毒杀旧戳刺后17+15−8=24、21血至少差4才活')
mechanism('silent-piercing-wail-temporary-strength', ['silent-0046'], '尖啸临时减6/8力，次轮恢复须重读威胁', '每段伤按现场力量/虚弱核，不永久停止成长，制品另核', '减力与实际挡及后轮输出合预算', '54G5683J0E5S F42T9尖啸+令8力→0、26→18；T10恢复8力双击38、中和后28，脆弱两牌共10挡，33→15')
mechanism('silent-mirage-poison-card-block', ['silent-0010'], '蜃景以施放时活敌毒总量给牌挡，后来施毒不追补', '毒总量加现场敏捷再核倍率，毒层不消耗', '先建实毒后以可支付的牌挡兑现，不预支后轮', '54G5683J0E5S F42T9敌7毒/玩家9敏，蜃景实16挡且毒不变；尖啸及后继挡另账。F44T1原计划蜃景未施放，不计收益')
mechanism('silent-smooth-stone-opening-dexterity', ['silent-0158'], '石头开场1敏捷与步法叠加，后续牌挡兑现', '新战只保留遗物入口属性，不继承前战步法或药，脆弱另核', '多挡逐张加敏，旧挡不补', '54G5683J0E5S F42由1敏叠至9；F44新战回1，T2两防御首12/次6、生存者9，T3脆弱冲刺8仍死')
mechanism('silent-mr-struggles-turn-start-damage', ['silent-0162'], '抱抱先生轮初自动群伤与牌/毒分账', '按当前回合数及余血截断，缺内部帧不强拆', '当前活敌和真实触发窗口同核，死亡后收益不预支', '54G5683J0E5S F44T2主怪129→127、戳刺21→19各扣2；T3主怪104→101、戳刺19→16、电击24→21各扣3，之后旧毒另结')
mechanism('silent-zapbot-high-voltage-growth', ['silent-0233'], '观察：高电压2与电击增力同见，新增者不当旧实体', '历史6局连续跨敌轮加2力；本局只核新召唤0→2力/17攻击，无后续19攻帧', '活敌、现场力量和已结毒分核，不定固定杀序', '54G5683J0E5S F44T2末新电击24血/高电压2，T3力2攻17且仍活；5PM6JAQG6FNQ同23上限者T3/T4力2→4、攻17→19', '主题7局支持，连续成长仅历史6局；整战因果未控')
mechanism('silent-regen-potion-decay-heal', ['silent-0259'], '再生逐轮衰减回血且受上限截断，不当即时15血', '实饮建5层，完整5/4/3/2/1共15；敌伤与净损另账', '可活回合和封顶核实际回复，不拟喝留门槛', '54G5683J0E5S F20再生五轮实回15、43→57净增14，T4回2但净+1；E6DYYXRX7GVE四轮实回14、承伤14、进出同9血')
mechanism('silent-act-transition-missing-hp-heal', ['silent-0243'], '已见A9/A10跨幕按缺失HP80%向下取整回血', '同上限⌊(maxHP−HP)×0.8⌋，连续boss不回，低阶未核不外推', '营火/药/事件与SL恢复分源，未来回血不预支', '54G5683J0E5S F17→18为46/70→65回19，F33→34为34/75→66回32；果汁战内回5另账，三次attempt1非读档')
mechanism('silent-dexterity-potion-card-block', ['silent-0276'], '敏捷药实建2敏捷，已有挡不补', '后继牌挡加敏再核脆弱，换战撤；步法/遗物另源', '多挡逐张兑现，不设喝留门槛', '54G5683J0E5S F42T2饮后4→6敏、原0挡不变，后步法到9；T6防御14。F44回1敏空药死，未记录留药/改药时胜果')
mechanism('silent-speed-potion-temporary-dexterity', ['silent-0253'], '速度药实加5临时敏捷，次轮撤回', '后继牌挡加敏，旧挡不追补；脆弱及其他敏捷来源另核', '本轮实可打挡牌与费用合核，不定药时门槛', '54G5683J0E5S F17T3饮后4→9敏、SPEED_POTION_POWER5，T4回4；HNX4A2WBC34W沙虫重打T3防御10/蜃景11，次轮撤5')
mechanism('silent-axebot-stock-phase-budget', ['silent-0312'], '巨斧库存耗用后还须清末台，后体上限读现场', '两次恢复清旧毒，后体血量/力量重核；不以首上限乘3，内部满血帧缺失不补', '新体重建毒/减益和实挡，不继承旧毒收益', '54G5683J0E5S F42三台上限77/93/96，第二首见88/93；库存2→1→无、后力4/8，11轮赢耗43血两药；R3AJCGQGGMR4末台余87败')

new = dict(id='silent-fabricator-living-summon-observation', scope='hallway:FABRICATOR', asc=[0,20], lesson='观察：组装师活着时招式后加入机器人，攻击者须随新实体刷新。机制：已见FABRICATE_MOVE/FABRICATING_STRIKE_MOVE后增噪音/戳刺/电击；顺序、数量、概率与永久实体ID未核，不外推固定杀序。搭配：现场新攻击/增力、脆弱和毒退场同预算。决定胜负的战斗：2支持/0反例，替序整战未控（n=2）。典型案例：10GPK5XGHCK3 A3 F39T1新噪音22/戳刺19，T3新电击21；54G5683J0E5S A10 F44T1新戳刺21、T2新电击24，T3毒杀旧戳刺后32攻对21血8挡死、主怪余86，补召唤内部帧缺失。', evidence=['10GPK5XGHCK3',RUN], n_support=2, n_contradict=0, confidence='med', last_seen='2026-10-09', status='active')
assert not any(e['id']==new['id'] for e in E['entries'])
E['entries'].append(new)
C.append(dict(id=new['id'],before=None,after=new))
M[new['id']]=['silent-0348']
E['version']='2026-10-09.28'
E['_about']=f'静默经验只从本角色实盘/复盘学习。第139次增量核54G5683J0E5S；全引擎学习观察截至{A["cutoff"]}；主题支持局、公式动作、血档/节点/SL分母分开，未配对观察不当整战因果。'
(ROOT/'knowledge/characters/silent/experience.json').write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
for name,value in [('changes',C),('ledger-map',M)]:
    (O/(name+'.json')).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def sizes(e):
    active=[x for x in e['entries'] if x['status']=='active']
    return dict(active=len(active),chars=sum(len(x['lesson']) for x in active),confidence=dict(collections.Counter(x['confidence'] for x in active)),by_asc={str(i):dict(entries=len(v),chars=sum(len(x['lesson']) for x in v)) for i in [8,9,10] if (v:=[x for x in active if x['asc'][0]<=i<=x['asc'][1]])})
summary=dict(old_version='2026-10-09.27',version=E['version'],added=1,updated=len(C)-1,evidence=len(C)-1,numbers=0,retired=0,before=sizes(json.load(open(O/'experience-before.json'))),after=sizes(E))
assert summary['after']['chars']<=60000
(O/'update-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False))
