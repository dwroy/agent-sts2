import collections, copy, json, subprocess
from pathlib import Path

O = Path(__file__).parent
P = Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json')
RUN = 'Z91JN3S3PQX2'
day = subprocess.check_output(['date', '+%Y-%m-%d'], text=True).strip()
B = json.load(open(O/'experience-before.json')); E = copy.deepcopy(B)
A = json.load(open(O/'audit.json')); R = json.load(open(O/'rest-summary.json'))[-1]
C = []; M = {}

def update(ident, ledgers, case=None, lesson=None):
    e = next(e for e in E['entries'] if e['id'] == ident)
    old = copy.deepcopy(e)
    assert RUN not in e['evidence']
    e['evidence'].append(RUN); n = e['n_support'] = len(e['evidence'])
    e['confidence'] = 'high' if n >= 5 and e['n_contradict'] <= n/3 else 'med' if n >= 2 else 'low'
    e['last_seen'] = '2026-10-08'
    e['lesson'] = lesson or e['lesson'].replace(str(old['n_support'])+'支持', str(n)+'支持').replace('（n='+str(old['n_support'])+'）', '（n='+str(n)+'）')
    if ident == 'silent-cure-all-energy-draw': e['lesson'] = e['lesson'].replace('8局14次', '9局15次')
    if case: e['lesson'] = e['lesson'].split('典型案例：')[0]+'典型案例：'+case
    C.append(dict(id=ident, kind='updated', before=old, after=e, new_runs=[RUN])); M[ident] = ledgers

update('silent-footwork-block', ['silent-0005'], case='M0GY0A4M2F7H A10两敏三挡20仍死；Z91JN3S3PQX2 A10巨兽T5建3敏、T11两防御5→8合16，多6挡，虚弱自爆33仍需损17；沙虫T7建3敏，T13防御8对13×2，钨棍攻击预算余1而沙坑归零死，敏捷不延截止。')
update('silent-strength-weak-observation', ['silent-0012'], case='LYBHQ1X230ZB四段1力多4伤；Z91JN3S3PQX2 A10异鱼油建1力1敏、步法再3敏；沙虫力量3/6/9时虚弱双击18/22/26，T2无虚弱时尖啸临时减6使18→6、钨棍后实损4，次轮恢复，不当永久阻成长。')
b = next(b for b in A['bands'] if (b['asc'], b['act'], b['type'], b['band']) == (10, 2, 'Monster', '<25%'))
runs = len(A['runs']); a10 = R['runs']
update('silent-route-hp-observation', ['silent-0019'], lesson=f'观察：胜前战/避可选精英不保证后段血药，问号可战，未来营火不能预支。A10 {a10}局二幕Monster<25%入血{b["n"]}房/{b["runs"]}局、{b["deaths"]}死（{b["deaths"]/b["n"]*100:.2f}%），活损中位{b["median_win"]}；分阶/幕/房型另列（n={runs}）。典型案例：M0GY0A4M2F7H改避精英仍29进boss六败；Z91JN3S3PQX2十二胜战净耗95、五火回113，事件另付29、跨幕另回34，79/80进沙虫仍死；芝士胜后各补1血/上限须分账，无未走路线整战对照。')
update('silent-rest-buffer-observation', ['silent-0020'], lesson=f'观察：即时回复增加血缓冲，不等后战保证，未来营火不预支。A10 {a10}局{R["rests"]}独立火/{R["heal"]}回血实回{sum(R["gains"])}，去重{R["nexts"]}后战{R["deaths"]}死（{R["deaths"]/R["nexts"]*100:.2f}%），活损中位{R["median"]}；各阶另列（n={runs}）。典型案例：Z91JN3S3PQX2 F11/16/24/27/32实回21/22/23/23/24合113，三锻造无回血；F32即时/模拟输入/实际进boss均79，但沙坑归零仍死。较早投影假设后火回血而实际锻造、上限亦变，不由差额拟统一误差或改锻造胜因。')
update('silent-deck-burst-observation', ['silent-0021', 'silent-0125'], case='WZL2AMEY85S7三毒雾建层仍余109死；Z91JN3S3PQX2 A10沙虫T7才步法/T9滚石，T10—13滚石70、抱抱46分账，下一轮30滚石未结；T5/T11护栏题面省22血少26即时伤，T11两线8/8死，末余45沙坑归零。原线未完整执行，不称必省22或早建必胜。')
update('silent-afterimage-per-card-block', ['silent-0023'], case='H1T1F8ML9FUE脆弱下重放被动挡另计；Z91JN3S3PQX2 A10 F12T1能力药生成余像并实打，后续每牌补1挡，与同轮敏捷药2敏的牌挡分源；战后54→55含芝士+1，不归能力回血或单药整战因果。')
update('silent-rolling-boulder-start-growth', ['silent-0093', 'silent-0094'], case='ZE8F192FKX24 A5滚石实扣50后毒胜；Z91JN3S3PQX2 A10巨兽T3实建10，沙虫T3在手未打、T9才建10，T10—13扣10/15/20/25合70；末30只是下轮待结，不能用来抹去沙坑死。提前启动血价/逃离支付未有同盘整战对照。')
update('silent-mr-struggles-turn-start-damage', ['silent-0162'], case='NHA2KW0RB7VP蟹T2两侧各扣2；Z91JN3S3PQX2 A10沙虫T10—13各实扣10/11/12/13合46，与滚石同轮70分开；末行动敌50、结5毒余45，死亡后T14抱抱14与滚石30均不预支。')
update('silent-tungsten-rod-hp-loss-observation', ['silent-0178', 'silent-0313'], lesson='观察：钨合金棍逐次穿挡失血减1，不能据此抵挡已见沙坑归零。机制：逐击先消耗挡，正HP损失各少1、零损不回血；沙坑组合只核本局，独立攻击结算顺序缺帧，其他防死交互未知。搭配：完整攻击预算、实际死亡扣血和特殊截止分账。决定胜负的战斗：逐击5支持/0反例，沙坑组合1局/0反例，无移除遗物整战对照（n=5）。典型案例：T0DGVABPV60U四击需40、只扣剩16；Z91JN3S3PQX2 A10沙虫T6无挡18双击实损16，T13以17血/8挡对26双击仅攻击需16可余1，沙坑1归零实0血而挡仍8、敌结5毒余45；不称实际先损16再扣1，不证SL必胜。')
update('silent-insatiable-dual-clock', ['silent-0018', 'silent-0313'], lesson='沙虫沙坑与攻击分别核，逃离续时不挡攻击，钨棍不保证抵挡沙坑，未来伤不预支。机制：已见逃离加1、沙坑归零死亡；攻击预算和实结毒另算，其他防死交互未核。搭配：可支付逃离、血挡与剩敌HP合核，不由延长定整战胜果。决定胜负的战斗：22支持/0反例，真正重打15场60试8赢（n=22）。典型案例：R3AJCGQGGMR4第2试延长后毒收尾3血胜、后序亦变；Z91JN3S3PQX2 A10 T6三逃离续3却损16，T7建敏损24；T13沙坑1、17血8挡对26双击，仅攻击加钨棍预算余1，沙坑归零死、敌结5毒余45，无实际重打。')
update('silent-piercing-wail-temporary-strength', ['silent-0046'], case='KAY522KT5NXR实验体三击30→12；Z91JN3S3PQX2 A10沙虫T2普通尖啸减6力量，双击18→6，零挡钨棍逐击减后79→75实损4；次轮恢复，后续敌3/6/9力对应虚弱双击18/22/26，不预支旧临时降力。')
update('silent-act-transition-missing-hp-heal', ['silent-0243'], case='R3AJCGQGGMR4 A10沙虫胜3/77回59到62；Z91JN3S3PQX2 A10巨兽胜33/76后跨幕实回⌊43×0.8⌋=34到67，上限不变；五火113及芝士十胜各+1另账，无SL恢复，不预支未到三幕/连续boss资源。')
update('silent-dexterity-potion-card-block', ['silent-0276'], case='QHK1XQ928TTM族母饮后仍被吸取；Z91JN3S3PQX2 A10 F12T1实饮2敏，后续牌挡加2、已有挡不补，能力药另生成并实打余像、每牌1挡另计；后战需重建，不能当常驻全局敏捷。')
pois = [x for x in A['potions'] if x['run'] in next(e for e in E['entries'] if e['id']=='silent-poison-potion-observed-application')['evidence']+[RUN] and (x.get('potion') or {}).get('id')=='POISON_POTION']
delta = []
for x in pois:
    target = x['chosen'].get('target_index', 0)
    a = next(y for y in x['before']['enemies'] if y['index']==target)
    z = next(y for y in x['after']['enemies'] if y['index']==target)
    delta.append(z['powers'].get('POISON_POWER',0)-a['powers'].get('POISON_POWER',0))
assert set(delta) <= {0,6,7}
counts = collections.Counter(delta)
update('silent-poison-potion-observed-application', ['silent-0278'], lesson=f'毒药先加毒，饮用当步不扣本体HP。机制：37局{len(pois)}饮，常态{counts[6]}饮加6、头骨{counts[7]}饮加7、制品{counts[0]}饮阻毒耗1层；组合外不推。搭配：须活到实结，当前挡与截止另核，不定喝留门槛。决定胜负的战斗：37支持/0反例，单药整战未控（n=37）。典型案例：79UCJ0K6R9C1先自死未结毒；Z91JN3S3PQX2 A10沙虫T12实饮毒0→6、当步不扣血，随后实结6＋5合11，T13敌仍45、沙坑归零；无早喝的受控整战胜果。')
update('silent-cure-all-energy-draw', ['silent-0240'], case='VLZ6CCT8AQ0A实饮加能换手，不是回复；Z91JN3S3PQX2 A10 F28T1痊愈实饮加1能抽2、HP不变并重算选线；消亡粉末/抱抱/滚石同时在战，不把整战胜或净清70全归这瓶，不定时点。')
seq = int(B['version'].split('.')[-1])+1 if B['version'].startswith(day+'.') else 1
E['version'] = day+'.'+str(seq)
E['_about'] = f'静默经验只来自本角色实盘与复盘。第112次增量合并Z91JN3S3PQX2 A10；截至{A["cutoff"]}共147完局。旧146局七数组/血档/节点后战/休息/SL逐行复算；敏捷牌挡、临时减力、滚石/抱抱轮初兑现、钨棍逐击与沙坑截止分账。原线/早建/早喝整战胜因未控；同步独立strategy-proposal，不改打法源码或其他角色。'
P.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(dict(entries=C),ensure_ascii=False,indent=2)+'\n')
(O/'ledger-map.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n')
active = [e for e in E['entries'] if e['status']=='active']
summary = dict(old_version=B['version'], version=E['version'], added=0, updated=len(C), retired=0, active_before=sum(e['status']=='active' for e in B['entries']), active=len(active), chars_before=sum(len(e['lesson']) for e in B['entries'] if e['status']=='active'), chars=sum(len(e['lesson']) for e in active), confidence=dict(collections.Counter(e['confidence'] for e in active)), asc={str(a):dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in active), chars=sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]})
assert summary['chars'] < 55000
(O/'update-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False))
