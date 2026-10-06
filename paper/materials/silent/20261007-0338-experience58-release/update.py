import collections
import copy
import hashlib
import json
import re
from pathlib import Path

O = Path(__file__).parent
ROOT = O.parents[2]
FILE = ROOT / '.worktrees/exp/knowledge/characters/silent/experience.json'
OLD = json.load(open(O / 'experience-before.json'))
DATA = copy.deepcopy(OLD)
E = {e['id']: e for e in DATA['entries']}
A = json.load(open(O / 'audit.json'))
R = {r['run_id']: r for r in json.load(open(O / 'completed-runs.json'))}
RUN = 'HUVEPWQAHWFU'
assert len(A['runs']) == 71 and len(A['fights']) == 1119
assert sum(x['death'] for x in A['fights']) == 61
assert json.load(open(O / 'baseline-check.json'))['fights']['identical']
assert all((R[r].get('character') or '').lower() == 'silent' for r in A['runs'])
changes = {}

def update(id, lesson):
    e = E[id]
    old = copy.deepcopy(e)
    assert RUN not in e['evidence']
    e['evidence'].append(RUN)
    e['n_support'] = len(e['evidence'])
    e['last_seen'] = '2026-10-07'
    e['confidence'] = 'high' if e['n_support'] >= 4 and e['n_contradict'] == 0 else 'med' if e['n_support'] >= 2 else 'low'
    e['lesson'] = lesson.replace('NN', str(e['n_support']))
    for part in re.split(r'(?<=[。；！？])', old['lesson']):
        if '药' in part:
            if part not in e['lesson']:
                e['lesson'] += part
            assert part in e['lesson'], (id, part)
    changes[id] = {'old_n': old['n_support'], 'new_n': e['n_support'], 'before_chars': len(old['lesson']), 'after_chars': len(e['lesson']), 'added_evidence': [RUN]}

update('silent-footwork-block', '步法普通/升级建2/3敏捷，逐挡牌兑现、不补旧挡。机制：基础挡加敏，再按脆弱逐牌取整；临时敏撤回、被动挡另算，换阶段留而新战重置。搭配：多挡牌重复获益，未建/缺牌不预支。决定胜负的战斗：NN支持局、胜因未控（n=NN）。典型案例：JMH5C51RLN4E A10实验体T11四牌基础26加四次6敏=50、多24挡，10血零损；HUVEPWQAHWFU A10雕刻师T2建2敏，T3两防御8→10和5→7、多4挡；T6预判临时加2至4、防御5→9，水盆另4合13仍对51、18血差20。')
strength_potion = ''.join(part for part in re.split(r'(?<=[。；！？])', E['silent-strength-weak-observation']['lesson']) if '药' in part)
update('silent-strength-weak-observation', '力量逐击改攻击，敏捷逐挡牌；虚弱/脆弱与被动分核。机制：2力三击多6，虚弱逐击取整，临时减力撤回不关仪式增长，敏捷不补旧挡。搭配：多段放大力、多挡牌兑现敏，余像/遗物另核。决定胜负的战斗：NN支持局、子公式与胜因分核（n=NN）。典型案例：LS8035TB32P3 A10四击0/3力20/32、多12；CRK2HNYKSCZC A10九击1逐击弱至0，另一敌13未消失；HUVEPWQAHWFU A10雕刻师T3—6力9/18/27/36，尖啸只当轮24→18，虚弱33→24、42→31，末弱消失后51仍致死。' + strength_potion)
update('silent-route-hp-observation', '观察：血档/净损/回复按首COMBAT→末结算，问号不算Monster，不定安全线。71静默局1119房61死；A8一局25房0死、A9三局48房2死、A10三十一局405房31死，分档/节点见第58节。A10三幕≥60%走廊26房12局1死=3.85%、活损中位22。典型案例：HUVEPWQAHWFU A10取消第二精英并六火回血，F8到F12投影45/p75为29、实到24，F34避精英三火线却57/70死于第一普通战，未到未来火；CRK2HNYKSCZC锻造后下火未到。无替路线实打，只观察（n=NN）。')
update('silent-rest-buffer-observation', '观察：已回复增加血池，未来营火/模拟优势不预支。A8一局9火8回血7非回血回111、后战7/0死/中位10；A9三局21火16回血5非回血回341、后战15/1死/中位34；A10三十一局189火125回血64非回血回3044，去重后战118/17死=14.41%、活损中位24。典型案例：HUVEPWQAHWFU A10六火各回21共126，F29回30→51、后F32入31和沙虫入52均兑现，重打后8血过关；F34回至57仍死于雕刻师。回血真实，不等路线或boss胜率保证；未选锻造/替路线未实打（n=NN）。')
update('silent-deck-burst-observation', '观察：取得/建立/触发/足额输出分核，组件和当轮保血不单独定整战胜因。机制：能力须实建并活到触发，毒按目标/次数/剩血核，生成牌入堆不等当轮抽牌；护栏省当轮血可同时减输出。搭配：费用、抽牌、启动、防御与敌成长窗口一起验收。决定胜负的战斗：NN支持局，A8一/A9三/A10二十七，低阶仅背景（n=NN）。典型案例：HUVEPWQAHWFU A10终32张5升级、三个毒药；雕刻师毒药T4/毒雾T6才建，T2零输出，六轮扣120余52/172，末仅结算旧3毒；骇鳗T3护栏省10当轮血却少10题面扣血/后续9毒，整场损45，原线未实打。DPYF2BAA3DKT沙漏毒316＋其余102仍缺117，不由毒量推足额输出。')
update('silent-noxious-fumes-growth', '毒雾普通/升级建2/3层，后续玩家轮初给每敌补毒，打出不即时施毒。机制：无其他施毒/阻挡、单结算时补a后净增a−1；无加成a=s，头骨已见a=s+1、能力仍s；触媒逐次减1，制品/无实体/剩血/换阶段另核，能力跨阶段留、新战归零。搭配：实际防御支撑启动，未建/未活到轮初不预支。决定胜负的战斗：NN支持局、胜因未控（n=NN）。典型案例：D4LJ9QMGFB8Q A10异鱼29毒受无实体限只扣1，减1后补3至31；HUVEPWQAHWFU A10沙虫两次T1建2，重打T10的39毒收38血、余8胜；雕刻师T6才建2，无下一玩家轮初，只旧3毒实扣3、敌余52，不能预支未来补2。')
update('silent-afterimage-per-card-block', '余像建立后按实际出牌次数补挡，建立本身不触发自己的首次挡。机制：1层每次后续出牌加1，重放再触发，脆弱下被动仍1；卡牌/遗物挡另算，不按攻击段数算出牌。搭配：多牌兑现真实挡，未建/未打/新战归零不预支。决定胜负的战斗：NN支持局、整战胜因未隔离（n=NN）。典型案例：LRN0HPZ0FZS1 A0重放翻越撑击一步余像补2、挡13→15、原始计数只8→9；HUVEPWQAHWFU A10沙虫两次T1均建1，重打T2四牌被动4、T3两敏防御7另计，T9实际43挡和T10毒杀共同过关；首试也已建立却判死，不归单能力。')
wail_potion = ''.join(part for part in re.split(r'(?<=[。；！？])', E['silent-piercing-wail-temporary-strength']['lesson']) if '药' in part)
update('silent-piercing-wail-temporary-strength', '尖啸临时减力只降当轮威胁，次轮重新核。机制：普通/升级减6/8，逐击加减力后核弱、制品/技能污染，临时部分撤回、永久减力另计；仪式增长不停止。搭配：多段放大减力，牌/遗物挡与持牌伤另算。决定胜负的战斗：NN支持局、当轮减伤不保整战（n=NN）。典型案例：VPW8YH7A4QFM A10双普通合−12使三敌42→6，9挡零损；HUVEPWQAHWFU A10雕刻师T3力9→3、24→18，17挡只损1；T4恢复成长至18力，T6达36力、51攻击仍死。DPYF2BAA3DKT A10棱柱T3减6力、三击9，损9。' + wail_potion)
update('silent-ripple-basin-no-attack-block', '波纹水盆在已见不出攻击的回合末补4挡，敏捷/脆弱不改这4。机制：卡牌挡随敏捷/脆弱变化，条件被动挡独立；已建毒在实际敌方回合结算。搭配：防御与毒可并行，但核来袭/总挡/击杀缺口，不定弃攻规则。决定胜负的战斗：NN支持局、单遗物整战胜因未控（n=NN）。典型案例：E6AVMMVCSRPC A1族母末次负2敏仍补4，T12卡牌1＋4对18、11血仍死；HUVEPWQAHWFU A10雕刻师T2/6无攻击，牌挡6/9在2/4敏时都另补4为10/13，末对51需38而仅18血；沙虫首试T10的9＋4对30仍差，毒29未结算就读档。')
update('silent-spiked-gauntlets-power-cost', '带刺手甲的额外能量与能力加费同时核，不由加费推能力不可用。机制：已见回合3→4能量、能力费+1；免费牌与其他费效另算。搭配：实际建立能力的费用和防御/输出窗口分账，干瘪之手可让其他牌本轮免费。决定胜负的战斗：NN支持局、替代遗物与整战胜因未控（n=NN）。典型案例：ZZMYZ5UBCG72 A2付2建立触媒/毒雾，触媒+后尖啸免费；HUVEPWQAHWFU A10 F34取得，雕刻师每轮4能量、步法与毒雾均2费，T2羽化2＋步法2付满4，伤0/损5；T6毒雾才建，没有下一轮补毒收益。')
update('silent-anticipate-temporary-dexterity', '预判普通/升级只本轮建2/4敏捷，须后续挡牌兑现，不当永久防御。机制：敏捷与临时标记同量、不补旧挡，次轮撤临时部分；先逐牌加敏后核脆弱，被动挡另算。搭配：常驻步法/余像/遗物分账，缺后续挡牌不产生牌挡增量。决定胜负的战斗：NN支持局、顺序整战胜因未控（n=NN）。典型案例：DPYF2BAA3DKT A10末T5临时2使防御5→7，四余像＋7＝11对32损21、T6临时敏消失；HUVEPWQAHWFU A10雕刻师T6常驻2加临时2至4，防御5→9、水盆另4合13，对51需38而仅18血，不能把加敏当全挡。')
update('silent-devoted-sculptor-ritual-growth', '虔诚雕刻师仪式持续加力，临时减力/虚弱降低当前来袭而不关成长。机制：禁忌唱诵建立{@10:GAIN:DEVOTED_SCULPTOR:FORBIDDEN_INCANTATION_MOVE:RITUAL_POWER}层仪式，猛烈攻击基础A0/A3/A4已见12，A10为{@10:DMG:DEVOTED_SCULPTOR:SAVAGE_MOVE}，加力后核弱；A0/A3/A4/A10已见每轮加9，其他进阶现场核值。搭配：持续输出与实际挡量同核，未结算未来毒不抵致死来袭。决定胜负的战斗：NN支持局、A0四/A3一快杀，A4与A10各一失败，构筑混杂无替代胜线（n=NN）。典型案例：F9PP859XZ3RJ A4萎靡永久减2后仍25→34→43；HUVEPWQAHWFU A10 F35禁忌仪式后T2首帧已有9仪式，T3—6力9/18/27/36；尖啸24→18只当轮，弱化33→24/42→31，末51对13挡需38、18血死且敌余52。')
sand = E['silent-insatiable-dual-clock']
sand_runs = sand['evidence'] + [RUN]
attempts = [a for a in A['attempts'] if a['run'] in sand_runs and 'THE_INSATIABLE' in [e['id'] for e in a['terminal']['enemies']]]
groups = collections.defaultdict(list)
for a in attempts:
    groups[a['run'], a['floor']].append(a)
multi = [v for v in groups.values() if max(x['attempt'] for x in v) > 1]
stats = dict(attempts=len(attempts), wins=sum(x['result'] == 'won' for x in attempts), multi=len(multi), multi_attempts=sum(len(v) for v in multi), multi_wins=sum(x['result'] == 'won' for v in multi for x in v))
assert stats == dict(attempts=29, wins=7, multi=6, multi_attempts=25, multi_wins=3), stats
update('silent-insatiable-dual-clock', '无厌沙虫的沙坑与攻击是独立结束线，延长沙坑不等挡攻击，满血不保过关。机制：沙坑1在敌回合归零会判死，逃离实加1；同时核沙坑/来袭/剩血，不预支未发生毒。搭配：实结算毒与防御共同推进，输出多也须活到结算。决定胜负的战斗：NN支持局29尝试7胜，真正重打6场25次3赢；单组件胜因未隔离（n=NN）。典型案例：4ANT8D00TP72 A10末试爆发重放生存者16挡盖14，九轮毒先杀、余6胜；首试T6扣89多于末62仍败。HUVEPWQAHWFU A10两次52/70入场，毒雾/余像均T1建立；首试T10剩7血9挡加水盆4对30判死，敌55/29毒未结算；末试T9实建43挡、T10的39毒杀38血，净损44/余8胜。31项原始初序相同，但T1插入逃离后与已知24张辅助、到手回合/出牌同变，不归运气或步法单因。')

entry = dict(id='silent-metamorphosis-generated-free-attacks', scope='card:METAMORPHOSIS', name='羽化', asc=[0, 20], lesson='已见普通羽化花2能量并消耗，向抽牌堆加入三张随机免费攻击，没有即时抽牌。机制：生成到堆与后来抽到/打出分账；持牌或向堆加3不算本轮抽3，也不预支未知随机攻击。搭配：需后续抽牌与生存窗口兑现，免费攻击可节省未来能量，种类/时点不保证。决定胜负的战斗：2支持局、生成公式已核，整战收益未隔离（n=2）。典型案例：C48LLXBGKXQ9 A0 F24 T1手牌9→8、抽牌堆18→21；HUVEPWQAHWFU A10 F35 T2手牌5→4/抽牌堆17→20/能量4→2，无即时攻击，后T4翻越撑击与T5猎杀者分别免费扣7/15，末仍死；升级版数量/费用及跨战费用未验证。', evidence=['C48LLXBGKXQ9', RUN], n_support=2, n_contradict=0, confidence='med', last_seen='2026-10-07', status='active')
assert entry['id'] not in E
DATA['entries'].append(entry)
DATA['version'] = '2026-10-07.4'
DATA['_about'] = '静默猎手独立经验库，只用本角色复盘/日志。截至2026-10-06T18:00:35.645Z共71完局，A0—A10各7/3/2/1/4/1/11/7/1/3/31局，1119战斗房61实死。旧70局七数组/血档/源节点/回血/SL重算一致；新增HUVEPWQAHWFU A10及勘误，MCCK2602T1SR仅进数字。净损＝首COMBAT帧HP−同房最终末结算HP，回复负值/实死/复活分账；Monster/Unknown分开，SL读档恢复不计回复、未结束轮不补毒伤。力逐击/敏逐牌与被动挡独立核，仪式增长不因临时减力/弱化关闭；羽化向堆生成与即时抽牌分账，取得能力与实际启动分账。沙虫一场两试末胜，原序与已知抽牌辅助/到手回合/动作不同，不定单组件整场因果。无新用药规则。'
active = [e for e in DATA['entries'] if e['status'] == 'active']
old_active = [e for e in OLD['entries'] if e['status'] == 'active']
assert sum(len(e['lesson']) for e in active) <= 60000
for e in DATA['entries']:
    assert e['n_support'] == len(set(e['evidence']))
    assert e['n_contradict'] == len(set(e.get('contradicting', [])))
    assert all(re.fullmatch(r'[A-Z0-9]{12}', r) and r in R for r in e['evidence'] + e.get('contradicting', []))
    assert e['scope'].split(':')[0] in ['boss','elite','hallway','act','general','card','relic','potion','event']
for old in OLD['entries']:
    now = next(e for e in DATA['entries'] if e['id'] == old['id'])
    if old['scope'].startswith('potion:') or old['scope'] == 'general:potion':
        assert old == now
    elif old['id'] not in changes:
        assert old == now
applicable = {str(a): dict(entries=len(es := [e for e in active if e['asc'][0] <= a <= e['asc'][1]]), chars=sum(len(e['lesson']) for e in es)) for a in [8,9,10]}
result = dict(added=[entry['id']], updated=list(changes), retired=[], changes=changes, old_active=len(old_active), active=len(active), old_chars=sum(len(e['lesson']) for e in old_active), chars=sum(len(e['lesson']) for e in active), confidence=dict(collections.Counter(e['confidence'] for e in active)), applicable=applicable, sand_stats=stats)
(O / 'changes.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
FILE.write_text(json.dumps(DATA,ensure_ascii=False,indent=2)+'\n')
(O / 'experience-final.sha256').write_text(hashlib.sha256(FILE.read_bytes()).hexdigest()+'\n')
print(json.dumps({k:v for k,v in result.items() if k != 'changes'},ensure_ascii=False))
