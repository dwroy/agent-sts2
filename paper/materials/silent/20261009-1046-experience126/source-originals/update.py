import collections
import copy
import json
from pathlib import Path

O = Path(__file__).parent
A = json.load(open(O/'audit.json'))
R = {r['run_id']: r for r in json.load(open(O/'run-metadata.json'))}
E = json.load(open(O/'experience-before.json'))
before = copy.deepcopy(E)
N = 'NTMAU4XZ2NN2'
changes = []
mapping = {}

def revise(ident, ledger, text):
    e = next(e for e in E['entries'] if e['id'] == ident)
    assert N not in e['evidence']
    e['evidence'].append(N)
    e['n_support'] = len(e['evidence'])
    e['n_contradict'] = len(e.get('contradicting', []))
    e['confidence'] = 'high' if e['n_support'] >= 5 and e['n_contradict'] <= e['n_support']/3 else 'med' if e['n_support'] >= 2 else 'low'
    e['last_seen'] = '2026-10-09'
    e['lesson'] = text.replace('【n】', str(e['n_support']))
    changes.append({'id': ident, 'before': next(x for x in before['entries'] if x['id']==ident), 'after': e})
    mapping[ident] = ledger

nr = sum(r['ascension']==10 for r in R.values())
low = next(x for x in A['bands'] if (x['asc'],x['act'],x['type'],x['band'])==(10,1,'Monster','<25%'))
rest = next(x for x in json.load(open(O/'rest-summary.json')) if x['asc']==10)
revise('silent-route-hp-observation', ['silent-0019'],
    f'观察：赢战仍耗血药，问号另算，未来恢复不预支。A10 {nr}局一幕Monster入口<25%共{low["n"]}房/{low["runs"]}局、{low["deaths"]}死（{low["deaths"]/low["n"]:.2%}），活损中位{low["median_win"]}；各阶/幕/房型见报告（n=【n】）。典型案例：{N} F11赢损17后改线加营火，F12回到66，F13赢再损23，F14实43血空药死；投影63/p75为58，分别高20/15。旧线投影42未实走，无改线/留药受控胜果，不立安全血线。')
revise('silent-rest-buffer-observation', ['silent-0020'],
    f'观察：回血增加即时缓冲，锻造不回血，不能保证后战。A10 {nr}局{rest["rests"]}独立火/{rest["heal"]}回血实回{sum(rest["gains"]) }，去重{rest["nexts"]}后战{rest["deaths"]}死（{rest["deaths"]/rest["nexts"]:.2%}），活损中位{rest["median"]}；各阶另列（n=【n】）。典型案例：{N} F9/F12各回21共42，六战净损98，56＋42−98=0；F12理由“走廊后强制精英，中间没有恢复或商店，而且没有药水”，实走廊损23再43血进精英死。F12模拟boss入场61不是实休后66；无另一休息方案实打对照。')
revise('silent-deck-burst-observation', ['silent-0021','silent-0125'],
    '观察：计划能力、生成节点和后续生存分核。机制：毒层不等即时伤，未建立能力与未打延迟挡不预支，生成节点0伤不等生成牌整轮0伤。搭配：持续输出与当轮实挡/费用合核，护栏血价与后续生成机会同题比较。决定胜负的战斗：【n】支持/0反例，整战单因未控（n=【n】）。典型案例：NTMAU4XZ2NN2 F14T2护栏把防御→刀刃之舞改冲刺→防御，题面损12→2/扣敌0→10，实损2扣10，取消三小刀但原线未实打；计划步法/毒雾/触媒均未得，本体T6死后新四虫79血，T10尚余26。')
revise('silent-strength-weak-observation', ['silent-0012'],
    '力量逐击加伤、敏捷逐张加牌挡，临时层/弱/易伤按现场分核。机制：基础加属性后核倍率，毒/被动挡另源；弱不关闭成长，力量不跨战继承。搭配：多击/多挡重复收益仍核当前血价。决定胜负的战斗：【n】支持/0反例，整战单因未控（n=【n】）。典型案例：LYBHQ1X230ZB四段1力多4伤；NTMAU4XZ2NN2 F4力量药建2力使打击6→8，T2两次各扣8；F14无玩家力量/敏捷，原19血虫力量0/2/4时同招7/9/11，末T10感染9＋攻击11−挡5需损15，8血至少差8存活血。')
revise('silent-gorget-plating', ['silent-0016'],
    '护喉甲开场覆甲不等整场固定格挡。机制：已见开场4，按当前剩层给挡；完整减层条件未隔离。搭配：覆甲、牌挡与余像分源，未来末挡不预支。决定胜负的战斗：【n】支持/0反例，单项整战因果未控（n=【n】）。典型案例：79UCJ0K6R9C1寄生虫T5覆甲归零、T6损32；NTMAU4XZ2NN2 A10 F14T1—T4为4/3/2/1，T5起无；T2冲刺10＋防御5＋覆甲3对20实损2，T4生存者8＋覆甲1对中和后12实损3，不能继续加开场4。')
toric = [x for x in A['cards'] if x['card']=='TORIC_TOUGHNESS' and x['run'] in next(e['evidence'] for e in E['entries'] if e['id']=='silent-toric-toughness-delayed-block')+[N]]
revise('silent-toric-toughness-delayed-block', ['silent-0289'],
    f'坚韧之环即时给挡并建立两次轮初同额挡，施放额度与后来敏捷分账。机制：{len(set(x["run"] for x in toric))}局{len(toric)}次实打；未附魔普通牌已见基础5加敏再核脆弱，建2次；附魔增量另核，延迟挡沿施放额度，未知升级/重放/叠层不外推。搭配：实挡与当前攻合核，不预支未打或未活到轮次。决定胜负的战斗：【n】支持/0反例，单牌整战因果未控（n=【n】）。典型案例：ZVYUL2YP3518蟹T6六敏实11、T7/T8回二敏仍各11；{N} F11T4附魔环实7建2次，T5/T6轮初各7，T5配冲刺到17对9零损；F14抽到却未打，不算未来挡。')
revise('silent-infection-end-turn-block', ['silent-0286'],
    '感染留手每张在玩家回合结束造成3伤，先付持牌血价再验毒杀。机制：3×张数先耗挡，死亡可阻断敌毒/攻击；严格先后隔离见历史A10末轮，其他免减伤未知。搭配：牌挡与敌攻共付持牌伤，毒只取消实结后已死敌攻击。决定胜负的战斗：【n】支持/0反例，替弃牌整战因果未控（n=【n】）。典型案例：79UCJ0K6R9C1三感染9耗7挡、扣2血先死，敌8血10毒未结；NTMAU4XZ2NN2 F14T9弃一感染后仍两张6＋攻击9−挡8=7，15→8；T10三张9＋毒后幸存虫攻击11−挡5=15，8血实死、余22/4血两虫，不报代码−7剩HP为掉血7。')
revise('silent-deadly-poison-application', ['silent-0007'],
    '致命毒药普通/升级施5/7毒，不即时扣血。机制：实结按当前毒再减1，制品/头骨/触媒/阶段另核，过量毒按剩血截断。搭配：补层与存活结算合核，不预支整场免攻。决定胜负的战斗：【n】支持/0反例，单卡整战胜因未控（n=【n】）。典型案例：RZ6YAC7K89NM潮湿2→7毒、36血当步不变；NTMAU4XZ2NN2 F14T9给原19血虫施5毒，T10打击后8血实结4毒到4，原18血虫1血被1毒结束，但另虫11攻仍杀玩家；早施毒无整场对照。')
revise('silent-poisoned-stab-components', ['silent-0007'],
    '带毒刺击直伤、施毒和本方失血分列，尚存毒不当已伤。机制：普通/升级基础6/8伤与3/4毒，力/弱/易伤改攻击，制品可阻毒；触媒/无实体/剩血另核。搭配：实结毒可清残血敌取消其攻击，仍核其他活敌与新生血池。决定胜负的战斗：【n】支持/0反例，单卡整战胜因未控（n=【n】）。典型案例：RZ6YAC7K89NM钙化6血7毒退场取消13攻；NTMAU4XZ2NN2 F8T4刺击使小树叶9→3、建3毒，结束实毒杀取消4攻、41血不变；F14T8刺击使原18血虫12→6建3毒，当轮仅结到3，双9攻仍兑现，不当提前毒杀。')
E['version'] = '2026-10-09.15'
E['_about'] = f'静默经验只从本角色实盘与复盘学习。第126次增量并{N}一局A10，截至{A["cutoff"]}共{len(R)}完局；旧162局七数组/血档/节点/回血/SL同口径复算。补覆甲剩层、附魔坚韧延迟挡、力量逐击、感染与毒结算；两次营火42与六战净损98分账，路线投影不是实到血量。无本局SL、未建能力不预支；缺改线/留药/护栏原线/早施毒整场受控胜果，不拟新阈值。相关源码交独立strategy-proposal。'
for e in E['entries']:
    assert e['n_support']==len(set(e['evidence']))
    assert all(r in R and R[r]['character'].lower()=='silent' for r in e['evidence']+e.get('contradicting',[]))
active=[e for e in E['entries'] if e['status']=='active']
assert sum(len(e['lesson']) for e in active)<=60000
(O.parents[2]/'knowledge/characters/silent/experience.json').write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2)+'\n')
(O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
summary={'added':0,'updated':len(changes),'retired':0,'active':len(active),'chars':sum(len(e['lesson']) for e in active),'confidence':dict(collections.Counter(e['confidence'] for e in active)),'applicable':{a:{'entries':len(es:=[e for e in active if e['asc'][0]<=a<=e['asc'][1]]),'chars':sum(len(e['lesson']) for e in es)} for a in [8,9,10]}}
(O/'update-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(summary)
