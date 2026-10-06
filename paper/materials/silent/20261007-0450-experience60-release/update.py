import collections
import copy
import json
import re
from pathlib import Path

O = Path(__file__).parent
FILE = Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json')
OLD = json.load(open(O/'experience-before.json'))
NEW = copy.deepcopy(OLD)
tu, vo = 'TU3XB4CAEDAW', 'V0383V5S9BCQ'
TEXTS = {
 'silent-footwork-block': ('步法普通/升级建2/3敏捷，收益逐挡牌兑现、不补旧挡。机制：基础挡加现场敏捷，再逐牌核脆弱；被动挡另算，吸取会削已有敏捷。搭配：多挡牌重复获益，缺挡牌不预支。决定胜负的战斗：N支持局、整战胜因未控（n=N）。典型案例：TU3XB4CAEDAW A10族母石头1＋步法+3=4敏、防御5→9，吸取后降2/0；雕刻师T6双防御各9合18，弱后33来袭仍损15。UMVLWER4CD98末7敏防御+15另加音叉7仍死。', [tu]),
 'silent-strength-weak-observation': ('力量逐击改攻击，敏捷逐挡牌；弱化与被动分核。机制：2力三击多6，虚弱逐击取整，临时减力撤回不关闭成长，敏捷不补旧挡。搭配：多段放大力、多挡牌兑现敏，持牌伤另核。决定胜负的战斗：N支持局、各子公式与胜因分账（n=N）。典型案例：TU3XB4CAEDAW A10雕刻师力9/18/27/36/45；T6尖啸36→30使弱后38→33，仍损15。V0383V5S9BCQ雕像苏醒后10力/25攻击，突然一拳弱化成18、10挡损8；下一轮弱消失18挡对25再损7。', [tu,vo]),
 'silent-route-hp-observation': ('观察：首COMBAT→同房末结算净损，回复/实死分账，问号不算Monster，不定安全线。74静默局1163房64死；A8一局25/0死、A9三局48/2死、A10三十四局449/34死，各格见第60节。A10三幕<25%走廊7房5局2死=28.57%、活损中位2；≥60%30房14局1死=3.33%、中位22。典型案例：TU3XB4CAEDAW A10 F38后8/89改问号线、营火F40延至F42，F39笨拙换节日拉炮未回血，F40四败；原线未实打，恢复机会不当已恢复（n=74）。', [tu,vo]),
 'silent-rest-buffer-observation': ('观察：已回复增加血池，未来营火/模拟优势不预支。A8一局9火8回血7非回血动作回111、后战7/0死/中位10；A9三局21火16回血5非回血回341、后战15/1死/中位34；A10三十四局206火140回血66非回血回3480，去重后战133/18死=13.53%、活损中位25。典型案例：TU3XB4CAEDAW四回血共94、F32回14→39过知识恶魔后仍死三幕；V0383V5S9BCQ F8回22→43，精英投影入39实入37仍死，boss投影54依赖未到的F12/F16火；未选锻造/替线未实打（n=74）。', [tu,vo]),
 'silent-deck-burst-observation': ('观察：取得/建立/触发/足额输出分核，单轮保血或开场爆发不定整战胜因。机制：能力须实建并活到触发，毒/群蛇分别核目标、敌挡、实际结算与剩血。搭配：费用、抽牌、启动、防御与敌成长窗口一起核。决定胜负的战斗：N支持局、没有单组件整战对照（n=N）。典型案例：TU3XB4CAEDAW A10末建群蛇，两触发只削8敌挡，毒结算43后仍118敌血/零挡；同初序及到手轮啃咬机两试一胜，但触媒数、后续攻击/目标同时变。V0383V5S9BCQ雕像首扣44、后9/10/0/22，合85仍缺47；开场资源不当持续输出。', [tu,vo]),
 'silent-noxious-fumes-growth': ('毒雾普通/升级建2/3层，后续玩家轮初补毒，建立不即时施毒。机制：无其他施毒/阻挡、单结算时补a净增a−1；头骨实见a=s+1、能力仍s；触媒每次减1，制品/无实体/剩血/换阶段另核。搭配：实际启动与可活到的轮初一起核，未建/未到不预支。决定胜负的战斗：N支持局、胜因未控（n=N）。典型案例：TU3XB4CAEDAW A10末青蛙T2建2、T5再建2到4，随后当前43毒伤来自已施毒及触媒；T5死亡，没有T6补4毒。啃咬机两试T1同建2，仍一判死一胜，不定能力单因。', [tu]),
 'silent-accelerant-triggers': ('触媒增加毒触发次数，不乘毒层；普通/升级建1/2、可叠，自身不施毒。机制：k层至多k+1次，各次减1、零停止；k=1且p≥2合2p−1，k=3且p≥4合4p−6，剩血/阶段限制实伤。搭配：实际施毒、费用与当轮存活分别核。决定胜负的战斗：N支持局，单卡胜因未控（n=N）。典型案例：ZZMYZ5UBCG72 A2三层15/21毒扣54/78；TU3XB4CAEDAW A10末青蛙22毒/1触媒实际22＋21=43、161→118，仍无挡顶28而死；双啃咬机同抽两试，胜试少建一触媒且后续攻/目标也变，不定少建必胜。', [tu]),
 'silent-piercing-wail-temporary-strength': ('尖啸临时减力须按当前攻击核，次轮恢复后重算。机制：普通/升级减6/8，逐击加减力再核弱、制品与技能污染；临时部分撤回，永久成长不停止。搭配：多段放大当轮减伤，实际牌挡/被动与后续成长另算。决定胜负的战斗：N支持局，当轮有效不保整战（n=N）。典型案例：TU3XB4CAEDAW A10雕刻师T6力36→30、弱后38→33，双防御18仍损15；V0383V5S9BCQ雕像T2苏醒轮来袭0，尖啸使0→−6，T3仍10力/25斩击，不能当作抵掉后续增长。', [tu,vo]),
 'silent-lagavulin-siphon-poison-sl': ('族母吸取压缩直伤与卡牌挡，已建立毒按现场层数另算。机制：每次玩家力/敏各−2、敌力+2；负力不减施毒、负敏减牌挡，遗物挡另核。搭配：施毒/保留/能力须实际取得启动，未结算毒不预支。决定胜负的战斗：N支持局，真正重打三场18次1赢；新局首试赢不增加重打分母（n=N）。典型案例：TU3XB4CAEDAW A10族母63→战内34→芝士35，T5/T9吸取后敏4→2→0、力0→−2→−4，T10敌仅2血而已有13毒，实际收尾；NB8KCF6HRGVF A10负力下实际毒183＋行动50=233首试胜。', [tu]),
 'silent-devoted-sculptor-ritual-growth': ('雕刻师仪式持续加力，临时减力/虚弱只改当前威胁。机制：禁忌唱诵建立{@10:GAIN:DEVOTED_SCULPTOR:FORBIDDEN_INCANTATION_MOVE:RITUAL_POWER}仪式；猛烈攻击基础A0/A3/A4已见12，A10为{@10:DMG:DEVOTED_SCULPTOR:SAVAGE_MOVE}，加现场力再核弱；已见每轮加9，其他进阶核现场。搭配：持续输出与实际挡同核，未来毒不抵当前致死来袭。决定胜负的战斗：N支持局、A0四/A3一快杀，A4与A10失败及A10胜例并存（n=N）。典型案例：HUVEPWQAHWFU A10末51对13挡、18血死且敌余52；TU3XB4CAEDAW A10 T6尖啸后33对18挡损15，T7触媒下32＋30毒清62、仍付战内61血，战后75→15；构筑/进场血不同，不定某卡转胜。', [tu]),
 'silent-serpent-form-per-card-damage': ('群蛇建立后按实际后续出牌触发，取得不当输出。机制：普通/升级已见4/6层，后续每张向随机敌补4/6伤，先扣敌挡才计实体伤；负力已见仍4，只限实测窗口。搭配：防御/抽牌也触发，费用/牌数/存活窗口共同约束，未派发不算。决定胜负的战斗：N支持局、存活与boss败例均有、单项胜因未控（n=N）。典型案例：5X2GHKJ89PN1 A10女王六触发24中8被挡、净16；TU3XB4CAEDAW A10知识恶魔T8实建群蛇，末青蛙T5才建4，毒雾/触媒两次各4只使挡16→12→8、实体161不变，不能预支能力伤害或未来轮。', [tu]),
}
details=[]
for e in NEW['entries']:
    if e['id'] not in TEXTS:continue
    before=copy.deepcopy(e)
    text,runs=TEXTS[e['id']]
    for run in runs:
        if run not in e['evidence']:e['evidence'].append(run)
    e['n_support']=len(e['evidence'])
    e['lesson']=text.replace('N支持',str(e['n_support'])+'支持').replace('n=N','n='+str(e['n_support']))
    for clause in re.split(r'(?<=[。；;\n])',before['lesson']):
        if '药' in clause and clause.strip() not in e['lesson']:e['lesson']+=' '+clause.strip()
    e['last_seen']='2026-10-07'
    e['confidence']='high' if e['n_support']>=5 and e['n_contradict']<=e['n_support']/3 else 'med' if e['n_support']>=2 else 'low'
    details.append(dict(id=e['id'],old_n=before['n_support'],new_n=e['n_support'],old_chars=len(before['lesson']),new_chars=len(e['lesson'])))
added=dict(id='silent-survivor-neutralize-discard',scope='card:SURVIVOR',name='生存者',asc=[6,20],lesson='观察：生存者后的弃牌会改变原计划的当轮减伤，保留攻击时也要核已取消的虚弱。机制：中和须实际施放才建立虚弱，弃掉便没有该项收益；生存者自身格挡与后续减伤分核。搭配：当前来袭/易伤、已有挡与保留牌的攻击或弱化一起比较，不把初题预计沿用到改手牌后。决定胜负的战斗：A6/A10各一支持、零反例，另A0/A6保留中和均零损，完整替线胜负未实打（n=2）。典型案例：53FLQ68CETW0 A6 F2 T4弃中和后预计0→1损、55→54；V0383V5S9BCQ A10蛮兽T5弃中和留切割，18挡对24实损6/扣6，原含中和题预计零损/扣9，不据此宣称整局可转胜。',evidence=['53FLQ68CETW0',vo],n_support=2,n_contradict=0,confidence='med',last_seen='2026-10-07',status='active')
NEW['entries'].append(added)
NEW['version']='2026-10-07.6'
NEW['_about']='静默猎手经验只来自本角色复盘及日志。第60次增量截至V0383V5S9BCQ结束2026-10-06T20:01:20.463Z，74完局；上一节72局七数组及血档/节点/回血/SL重新分析一致。净损按首COMBAT→同房末结算，回复/死亡/SL尝试分别统计，未结束不补未来毒。力逐击/敏逐牌、仪式成长/临时减力、群蛇扣挡及毒结算分核；同抽啃咬机对照仍多动作同变，无单组件整战因果，无新用药规则。'
active=[e for e in NEW['entries'] if e['status']=='active']
assert sum(len(e['lesson']) for e in active)<=60000
for old,new in zip(OLD['entries'],NEW['entries']):
    if old['scope'].startswith('potion:') or old['scope']=='general:potion':assert old==new
    for clause in re.split(r'(?<=[。；;\n])',old['lesson']):
        if '药' in clause:assert clause.strip() in new['lesson'],old['id']
FILE.write_text(json.dumps(NEW,ensure_ascii=False,indent=2)+'\n')
result=dict(added=[added['id']],updated=list(TEXTS),retired=[],details=details,active_before=sum(e['status']=='active' for e in OLD['entries']),active=len(active),chars_before=sum(len(e['lesson']) for e in OLD['entries'] if e['status']=='active'),chars=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),applicable={str(a):dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in active),chars=sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]})
(O/'changes.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
