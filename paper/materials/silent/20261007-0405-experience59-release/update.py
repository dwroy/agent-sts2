import collections
import copy
import json
import re
from pathlib import Path

O = Path(__file__).parent
ROOT = O.parents[2]
FILE = ROOT / '.worktrees/exp/knowledge/characters/silent/experience.json'
OLD = json.load(open(O / 'experience-before.json'))
NEW = copy.deepcopy(OLD)
RUN = 'UMVLWER4CD98'
TEXTS = {
    'silent-footwork-block': '步法普通/升级建2/3敏捷，逐挡牌兑现、不补旧挡。机制：基础挡加敏，再按脆弱逐牌取整；临时敏撤回、被动挡另算，换阶段留而新战重置。搭配：多挡牌重复获益，未建/缺牌不预支。决定胜负的战斗：42支持局、胜因未控（n=42）。典型案例：JMH5C51RLN4E A10实验体T11四牌基础26加四次6敏=50、多24挡，10血零损；UMVLWER4CD98 A10沙漏末试三步法实建3＋2＋2=7敏，T11防御+基础8加7为15，音叉另7合22，仍不足40攻击＋12凋萎，8血差22。',
    'silent-strength-weak-observation': '力量逐击改攻击，敏捷逐挡牌；虚弱/脆弱与被动分核。机制：2力三击多6，虚弱逐击取整，临时减力撤回不关闭成长，敏捷不补旧挡。搭配：多段放大力、多挡牌兑现敏，遗物挡与持牌伤另核。决定胜负的战斗：68支持局、子公式与胜因分核（n=68）。典型案例：LS8035TB32P3 A10四击0/3力20/32、多12；UMVLWER4CD98 A10末试燃烧T3建2力，打击6→8、带毒刺击+8→10，但攻击被敌挡吸收，施4毒后8→12、结算12才扣血；敌15力且有虚弱仍20×2，玩家7敏不关闭敌成长。',
    'silent-route-hp-observation': '观察：血档/净损/回复按首COMBAT→末结算，问号不算Monster，不定安全线。72静默局1138房62死；A8一局25房0死、A9三局48房2死、A10三十二局424房32死，分档/节点见第59节。A10三幕≥60%走廊29房13局1死=3.45%、活损中位20.5。典型案例：UMVLWER4CD98 A10三火单精英路线，F44投影F47入37/115、boss76/120，实到31/115及70/120，沙漏六败、第二boss未到；HUVEPWQAHWFU避精英仍57/70死于首走廊。无替路线实打，只观察（n=72）。',
    'silent-rest-buffer-observation': '观察：已回复增加血池，未来营火/模拟优势不预支。A8一局9火8回血7非回血回111、后战7/0死/中位10；A9三局21火16回血5非回血回341、后战15/1死/中位34；A10三十二局200火135回血65非回血回3365，去重后战128/18死=14.06%、活损中位25.5。典型案例：UMVLWER4CD98 A10十次回血共321、最大血70→120；F44回44/110→82/115后三骑士损51，F47再31/115→70/120，沙漏仍六败。回血/上限增益确实兑现，不等boss通路保证；未选锻造/替路线未实打（n=72）。',
    'silent-deck-burst-observation': '观察：取得/建立/触发/足额输出分核，组件和当轮保血不单独定整战胜因。机制：能力须实建并活到触发，毒按目标/次数/剩血核，生成入堆不等当轮抽牌；护栏短段节血还要重问后的整轮验收。搭配：费用、抽牌、启动、防御与敌成长窗口一起核。决定胜负的战斗：67支持局，A8一/A9三/A10二十八，低阶仅背景（n=67）。典型案例：UMVLWER4CD98 A10终39张/9永久升级、两毒雾三步法，沙漏首试实建5毒雾且已扣317，末试7敏/2力但未建毒雾、11轮扣222仍缺313；抽牌/探索也变，差95不定单牌因果。棱柱T3护栏短段预计零损，重问又打两技能、污染3→9，整轮5挡对18实损13；巨斧护栏即时零损兑现，却把毒雾启动延到T5，原线整战未实打。',
    'silent-noxious-fumes-growth': '毒雾普通/升级建2/3层，后续玩家轮初给每敌补毒，打出不即时施毒。机制：无其他施毒/阻挡、单结算时补a后净增a−1；无加成a=s，头骨已见a=s+1、能力仍s；触媒逐次减1，制品/无实体/剩血/换阶段另核，能力跨阶段留、新战归零。搭配：防御支撑实际启动与未来轮初，未建不预支。决定胜负的战斗：36支持局、胜因未控（n=36）。典型案例：D4LJ9QMGFB8Q A10异鱼29毒受无实体限只扣1；UMVLWER4CD98 A10沙漏首试T2/T3建3＋2，T10判死前实扣317、47毒未结算不补；末试全战未建毒雾，11轮扣222、敌余313，持有两张不等实际轮初补毒，缺受控启毒胜局。',
    'silent-piercing-wail-temporary-strength': '尖啸临时减力只降当轮威胁，次轮重新核。机制：普通/升级减6/8，逐击加减力后核弱、制品/技能污染，临时部分撤回、永久减力另计；敌成长不停止。搭配：多段放大减力，牌/遗物挡与持牌伤另算。决定胜负的战斗：32支持局、当轮减伤不保整战（n=32）。典型案例：VPW8YH7A4QFM A10双普通合−12使三敌42→6，9挡零损；UMVLWER4CD98 A10棱柱T3先施尖啸，后加防御/毒药令污染3→9、三击总6→18，5挡仍损13；沙漏末轮15力且有弱仍40攻击，临时减力不能代替后续防御预算。',
    'silent-wither-end-turn-loss': '凋萎回合末伤与攻击/格挡合核，毒斩杀也可能留持牌失血。机制：按现场文本3/6/9/12核，不外推其他状态牌；攻击/状态逐项致死先后未完整记录，未派发结束不预支毒。搭配：牌挡/遗物挡与持牌状态一起算，既往挡不跨轮。决定胜负的战斗：11支持局、整战胜因未控（n=11）。典型案例：K3676LU8B0UH A1毒杀9血敌但两张12使29→5；UMVLWER4CD98 A10末试T11的40攻击＋一张12凋萎−22挡=完整需损30，8血差22，实扣剩8是死亡截断；12毒结算后敌313/535。DPYF2BAA3DKT实际第30次串刺新增第二张9，26＋18−9=35杀28血，原始手动计数与重放另核。',
    'silent-aeonglass-artifact-growth-sl': '观察：沙漏制品/力量成长/挡/凋萎一起核，血池和能力组件不保过关。机制：制品耗完才施减益；敌力逐击、弱化取整，持牌伤另算，临时减力不关闭成长。搭配：实建毒/敏捷与存活轮数共同验收。决定胜负的战斗：12局50试3赢，真正重打10场48次2赢，A10四场24次0赢（n=12）。典型案例：ZE8F192FKX24 A5滚石T12扣50后毒胜余3；UMVLWER4CD98 A10六次70/120开，前五T10/8/10/11/11判死、末T11实死。首试建5毒雾已扣317、末试建7敏/2力却未建毒雾，11轮扣222余313；末8血22挡对40攻击＋12凋萎差22血。首末原始抽序42/46项不同、升级和到手轮也变，没有同抽完整转胜对照，不由差95定毒雾单因；首五未结束轮不补未来毒伤。',
    'silent-tuning-fork-skill-block': '音叉技能计数与牌面挡分账。机制：已见9→10补7挡、4→5无7，计数非攻击段数；未补全其他计数/自动牌触发条件。搭配：敏捷/脆弱只核牌面，被动挡另计、未触发轮不预支。决定胜负的战斗：7支持局，遗物非受控整战胜因（n=7）。典型案例：6EV5V6PJJS9D A6生存者+脆弱下8、音叉另7、防御3合18对32损14；UMVLWER4CD98 A10沙漏末T11防御+基础8＋7敏=15，技能计数9→10的音叉另7、实增22；40攻击＋12凋萎需损30，8血仍死，22不是全由敏捷产生。',
    'silent-infested-prism-tainted-skill-cost': '感染棱柱技能血价按火花层数和攻击段数核，护栏短段零损须整轮重验。机制：火花N令每技能加N污染，增加当前每段攻击、次玩家轮消失；能力毒雾不加污染。搭配：逐击弱/临时减力/挡与毒实伤分账。决定胜负的战斗：9支持局、七胜两败，JQPT一场四次零赢，整战胜因未控（n=9）。典型案例：UMVLWER4CD98 A10 F27 T3护栏删施毒技能后题面零损，重问再打防御/毒药，污染3→6→9、三击6→12→18，5挡实损13、实扣17；五轮77→36损41胜，短段预计省9未成为整轮零损，原线整战未实打。',
}

changes = []
for e in NEW['entries']:
    if e['id'] not in TEXTS:
        continue
    before = copy.deepcopy(e)
    assert RUN not in e['evidence']
    e['evidence'].append(RUN)
    e['n_support'] = len(e['evidence'])
    e['lesson'] = TEXTS[e['id']]
    for clause in re.split(r'(?<=[。；;\n])', before['lesson']):
        if '药' in clause and clause.strip() not in e['lesson']:
            e['lesson'] += ' ' + clause.strip()
    e['last_seen'] = '2026-10-07'
    assert e['n_support'] >= 5 and e['n_contradict'] <= e['n_support'] / 3
    e['confidence'] = 'high'
    changes.append(dict(id=e['id'],old_n=before['n_support'],new_n=e['n_support'],old_chars=len(before['lesson']),new_chars=len(e['lesson'])))

added = {
    'id': 'silent-stone-humidifier-rest-growth',
    'scope': 'relic:STONE_HUMIDIFIER',
    'name': '石炉加湿器',
    'asc': [0, 20],
    'lesson': '加湿器已见在选择休息回血时增5最大血并补5当前血，锻造不触发。机制：实测当前血增量=题面基础回血＋5，上限另增5；只有实际完成回血才兑现，进入火堆不等触发，满血截断未验证。搭配：路线/休息分账当前血、基础回复、上限增益与未来战耗，不预支未到营火。决定胜负的战斗：1支持局、十次回血共321及上限70→120，仍沙漏六败，非遗物胜因（n=1）。典型案例：UMVLWER4CD98 A10 F16基础回25加5，51/85→81/90；F47回34加5，31/115→70/120；F9锻造54/75不变。未知选项与缺受控替路线不外推。',
    'evidence': [RUN],
    'n_support': 1,
    'n_contradict': 0,
    'confidence': 'low',
    'last_seen': '2026-10-07',
    'status': 'active',
}
NEW['entries'].append(added)
NEW['version'] = '2026-10-07.5'
NEW['_about'] = '静默猎手独立经验库，只用本角色复盘/日志。截至2026-10-06T19:08:26.667Z共72完局，A0—A10各7/3/2/1/4/1/11/7/1/3/32局，1138战斗房62实死。旧71局七数组/血档/源节点/回血/SL重算一致；新增UMVLWER4CD98 A10及勘误，MCCK2602T1SR仅进数字。净损＝首COMBAT帧HP−同房最终末结算HP，回复负值/实死/复活分账；Monster/Unknown分开，SL读档恢复不计回复、未结束轮不补毒伤。力逐击/敏逐牌与被动挡独立核；毒雾取得与实际启动分账，棱柱护栏短段零损不预支整轮收益。加湿器回血/上限增长仅本角色首证，沙漏一场六败的抽序/升级/探索同变，不定单组件整场因果。无新用药规则。'
active = [e for e in NEW['entries'] if e['status'] == 'active']
assert len({e['id'] for e in NEW['entries']}) == len(NEW['entries'])
assert sum(len(e['lesson']) for e in active) <= 60000
for old, new in zip(OLD['entries'], NEW['entries']):
    if old['scope'].startswith('potion:') or old['scope'] == 'general:potion':
        assert old == new
    for clause in re.split(r'(?<=[。；;\n])', old['lesson']):
        if '药' in clause:
            assert clause.strip() in new['lesson'], (old['id'], clause)
FILE.write_text(json.dumps(NEW, ensure_ascii=False, indent=2) + '\n')
result = dict(added=[added['id']],updated=list(TEXTS),retired=[],details=changes,active_before=sum(e['status']=='active' for e in OLD['entries']),active=len(active),chars_before=sum(len(e['lesson']) for e in OLD['entries'] if e['status']=='active'),chars=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),applicable={str(a):dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in active),chars=sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]})
(O/'changes.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
