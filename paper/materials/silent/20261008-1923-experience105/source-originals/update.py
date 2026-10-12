import collections, copy, json
from pathlib import Path
O=Path(__file__).parent
B=json.load((O/'experience-before.json').open());E=copy.deepcopy(B)
I={e['id']:e for e in E['entries']};A=json.load((O/'audit.json').open())
R={r['run_id']:r for r in json.load((O/'run-metadata.json').open())}
N='4XLZURXMD872';C=[];M={}
def change(eid,text,ledgers,runs=None,scope=None,name=None,asc=None):
    runs=runs or [N];old=copy.deepcopy(I.get(eid));e=I.get(eid)
    if e is None:
        e=dict(id=eid,scope=scope,name=name,asc=asc or [0,20],lesson='',evidence=[],n_support=0,n_contradict=0,confidence='low',last_seen='2026-10-08',status='active')
        E['entries'].append(e);I[eid]=e
    added=[]
    for run in runs:
        assert R[run]['character'].lower()=='silent'
        if run not in e['evidence']:e['evidence'].append(run);added.append(run)
    e['n_support']=len(e['evidence']);e['last_seen']='2026-10-08'
    e['lesson']=text.replace('{n}',str(e['n_support']))
    n=e['n_support'];z=e['n_contradict'];e['confidence']='high' if n>=5 and z<=n/3 else 'med' if n>=2 else 'low'
    C.append(dict(id=eid,before=old,after=copy.deepcopy(e),new_runs=added));M[eid]=ledgers
change('silent-strength-weak-observation','力量逐击加伤，敏捷逐张加牌挡，乘区与来源分账。机制：现场力敏后核弱/脆弱，临时量另核，旧挡不倒补。搭配：多击/多挡重复受益，毒与被动挡另算。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：LYBHQ1X230ZB四攻击段1力多4伤；4XLZURXMD872 A10族母吸取后负2力使回响10→8、负2敏使后空翻5→3；尖啸敌力2→−4，双击24→12少12威胁，次轮恢复。',['silent-0012'])
change('silent-noxious-fumes-growth','毒雾普通/升级建立2/3层，后续玩家轮初补毒。机制：建层不即时施毒，可叠加；制品可阻一次，换战重建。搭配：须活到结算，负力量不改变技能毒层。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：NEWRFAYKTQHR建2后下一轮补2；4XLZURXMD872 A10族母T3建3，T8直扣后40血/40毒退出胜；沙虫六试全无毒雾能力，不把牌组毒雾+当已启动。',['silent-0011'])
change('silent-bubble-bubble-condition','咕嘟冒泡仅对当前中毒目标补毒，普通/升级9/12，不即时伤。机制：无毒仍耗费零效果，后来施毒不追补；触媒/剩血/限伤另核。搭配：初毒与可活结算窗口共同验收，爆发各次补量分算。决定胜负的战斗：{n}支持/0反例，单卡整战因果未控（n={n}）。典型案例：5PM6JAQG6FNQ无毒空打仍35血；4XLZURXMD872 A10族母T6爆发复制使18→36毒，立即HP仍129、结束扣36；沙虫末T3药6再加9成15毒、实结15仍败。',['silent-0010'])
change('silent-lagavulin-siphon-poison-sl','族母吸取压缩直接伤/牌挡，已建毒按现场层数结算。机制：已见每次玩家力敏各−2、敌力+2，负力量不减技能毒层。搭配：实际能力、临时减力与可活轮共同核，重打抽牌另列。决定胜负的战斗：{n}支持/0反例，单项胜因未控（n={n}）。典型案例：GXNKW8X1XYJP重打36→2毒胜；4XLZURXMD872 A10 T6吸取后回响10→8、T7后空翻5→3；尖啸双击24→12、实损9，T8敌40血/40毒退出胜，70→21净损49。',['silent-0030'])
change('silent-piercing-wail-temporary-strength','尖啸临时降力按攻击段兑现，次轮恢复重核。机制：普通/升级减6/8，各段核力弱，制品可阻，攻击不降成负伤。搭配：爆发逐次减力，毒杀另计，不当常驻关停成长。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：AD3QSC3P41JU爆发重放减12力；4XLZURXMD872 A10族母T7力2→−4，双击24→12、3挡后损9、次轮力恢复2；蟾蜍两试T2爆发减12使25→13，只有重试另抽挡才实损2。',['silent-0046'])
change('silent-burst-next-skills-replay','爆发本轮使普通下一张、升级下两张技能各额外打出一次，攻击不耗层、未用不跨轮。机制：每张符合技能耗一层，各次牌效/被动独立兑现，敏捷计入每次牌挡。搭配：毒、减力与挡逐次核，两层不等同牌再打两次。决定胜负的战斗：{n}支持/0反例，单组件胜因未控（n={n}）。典型案例：AD3QSC3P41JU重放尖啸减12力；4XLZURXMD872 A10族母T6两冒泡各9使18→36毒；蟾蜍重试T5两究极防御各11合22挡，对25实损3至2血，T6胜。',['silent-0115'])
change('silent-speedster-draw-damage','速行者使回合中抽牌兼有逐次伤害，按实际触发分源。机制：已建2层，每抽一牌对所有敌人造成2伤；独立数字只核单目标，无实体每次仅1，多目标总收益未核。搭配：抽牌技能/附魔/遗物与攻击本体、毒分列，未建立不预支。决定胜负的战斗：{n}支持/0反例，整战单卡胜因未控（n={n}）。典型案例：KAY522KT5NXR无实体两抽只扣2；4XLZURXMD872 A10蟾蜍重试T2换手三抽，已建2层使103→97多6伤，再究极防御11挡，损2；首轮行动亦变，不归单卡胜因。',['silent-0045'])
change('silent-toxic-paid-exhaust-end-turn-loss','毒素可付1能量离手，留手末回合每张5伤，挡可抵；毒杀不免已发生持牌伤。机制：已见消耗，玩家先死可阻敌毒结算，其他状态不外推。搭配：持牌伤、敌攻击与牌挡一起核，未知抽牌/整战替线保留未知。决定胜负的战斗：{n}支持/0反例，单卡整战因果未控（n={n}）。典型案例：TKXQ6L4N9A6U两留手毒素、7血0挡先死而敌毒未结；4XLZURXMD872 A10异螨T5从三张付费离手一张、弃一张、留一张，20血0挡结束到15且敌退出，实损5不全记敌攻。',['silent-0214'])
poison=json.load((O/'poison-potion-checks.json').open());counts=collections.Counter(p['delta'] for p in poison)
extra=[r for r in R if r in {p['run'] for p in poison} and r not in I['silent-poison-potion-observed-application']['evidence']]
assert extra==['T0DGVABPV60U',N] and counts=={6:115,7:15,0:2}
change('silent-poison-potion-observed-application','毒药水先加毒，饮用当步不扣本体HP。机制：34局132饮，常态115饮加6、头骨4局15饮加7、制品2局2饮阻毒耗1层；组合外不推。搭配：须活到实结，持牌伤先核，不定提前喝/留药阈值。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：79UCJ0K6R9C1饮后敌8血10毒，持牌伤先致死未结毒；4XLZURXMD872 A10同瓶随SL恢复6次、实饮7次，末沙虫T3药加6再冒泡加9，实结15、仍275血杀玩家。',['silent-0278'],runs=extra)
change('silent-act-transition-missing-hp-heal','已见A9/A10跨幕按缺失HP的80%向下取整回复。机制：同上限⌊(最大HP−当前HP)×0.8⌋，低阶/其他先古未核，连续boss非跨幕。搭配：营火、事件、药水与SL恢复分账。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：AD3QSC3P41JU连boss无回复；4XLZURXMD872 A10族母胜21/70，跨幕实回39到60；七火另回147、六次SL恢复不计治疗或新药。',['silent-0243'])
rest=json.load((O/'rest-summary.json').open())[-1]
band=next(r for r in A['bands'] if (r['asc'],r['act'],r['type'],r['band'])==(10,2,'Monster','<25%'))
change('silent-route-hp-observation',f'观察：问号可战，胜当前战/避精英不保证后段血药。A10 {rest["runs"]}局二幕Monster以<25%入血{band["n"]}房/{band["runs"]}局、{band["deaths"]}死（{100*band["deaths"]/band["n"]:.2f}%），活损中位{band["median_win"]}；分阶/幕/房型/血档另列（n={{n}}）。典型案例：4XLZURXMD872 F28回到57后三胜净损34/8/13共55，F32实到2、休后23；同期投影24/45均高22，未有替路线或留药整场对照。',['silent-0019'])
change('silent-rest-buffer-observation',f'观察：实际回复与下一战分账，不预支未到营火。A10 {rest["runs"]}局{rest["rests"]}火/{rest["heal"]}回血实回{sum(rest["gains"])},去重{rest["nexts"]}后战{rest["deaths"]}死（{100*rest["deaths"]/rest["nexts"]:.2f}%），活损中位{rest["median"]}；各阶另列（n={{n}}）。典型案例：4XLZURXMD872七次各回21共147，末火2→23，进沙虫六试均败；路线投影误差与休息即时回复分开，无改锻造整场胜线。',['silent-0020'])
change('silent-deck-burst-observation','观察：取得能力、实际建立、后续兑现与整场结果逐段核，不由持有主轴或高开场能量推输出闭环。机制：只计实建增益、已结毒与可活轮，换战重建。搭配：能力须抽到/可支付，即时伤与真实挡合核。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：4XLZURXMD872 A10沙虫六试T1有7能但无能力手牌，全程未建毒雾/谋划专家/速行者；末三轮本体实扣41/0/25共66，仍缺275，不能把牌组毒雾+当已生效。',['silent-0021'])
groups=collections.defaultdict(list)
for r in A['attempts']:
    f=next(f for f in A['fights'] if f['run']==r['run'] and f['floor']==r['floor'])
    if 'THE_INSATIABLE' in f['enemies']:groups[(r['run'],r['floor'])].append(r)
multi=[v for v in groups.values() if max(r['attempt'] for r in v)>1]
sl=dict(fights=len(multi),attempts=sum(len(v) for v in multi),wins=sum(r['result']=='won' for v in multi for r in v))
(O/'insatiable-sl-summary.json').write_text(json.dumps(sl)+'\n')
change('silent-insatiable-dual-clock',f'沙虫沙坑与攻击分别核，延长不等挡攻击，未来毒不预支。机制：逃离已见加1，沙坑归零判死，毒按实结/剩血核。搭配：真实挡/血与可活输出共同验收，抽牌重问须重核。决定胜负的战斗：{{n}}支持/0反例，历史重打{sl["fights"]}场{sl["attempts"]}试{sl["wins"]}赢，本局六试0赢（n={{n}}）。典型案例：H1T1F8ML9FUE第二试延沙坑后毒胜；4XLZURXMD872 A10末T3逃离3→4、末仍3，却23血0挡对31死，完整损31、存活至少差9；先结15毒仍275血，不称整场只差9血。',['silent-0018'])
cocoa=json.load((O/'cocoa-history.json').open());cruns=[r for r in R if r in {x['run'] for x in cocoa}]
change('silent-very-hot-cocoa-opening-energy','观察：可可首轮能量窗口不等于能力已启动。机制：现场文本限定每战第一轮额外能量；20局165个独立房首个可操作开场147次7能、13次8能、5次9能，其他增能未逐项隔离。本局普通轮3能、无其他开场增能遗物时首轮7能，差4。搭配：只有实际到手/可打能力与挡牌能用该窗口，不预定抽牌。决定胜负的战斗：20支持/0反例，移除遗物整战对照未做（n={n}）。典型案例：C48LLXBGKXQ9 A0七房均7能；4XLZURXMD872 A10八房均7能，蟾蜍T1实建能力、沙虫六试T1无能力牌且全败。',[],runs=cruns,scope='relic:VERY_HOT_COCOA',name='烫嘴可可')
change('silent-spiny-toad-draw-block-sl','观察：蟾蜍重打的抽牌后挡收益与有限全败参考分开，不能把换手视为必胜。机制：爆发尖啸25→13，速行者2层令换手三抽另扣6，抽到究极防御实给11挡。搭配：换手后重新核可打牌/能量和后轮血价；未抽到不预支。决定胜负的战斗：一场两试1赢，T2同手/能量/25攻，T1多打群伤与后续抽牌同时变，整战单因未控（n={n}）。典型案例：4XLZURXMD872 A10 F31首T2结束损13，重试换手后11挡仅损2，敌入轮111/103不同；首参考8/8死、重试23/24死但实T6以2血胜。',['silent-0239'],scope='hallway:SPINY_TOAD',name='棘刺蟾蜍',asc=[10,20])
E['version']='2026-10-08.22'
E['_about']='静默经验只来自本角色实盘与复盘。第105次增量合并4XLZURXMD872一局A10；截至2026-10-08T09:40:05.808Z共137完局，旧136局七数组/血档/节点后战/休息/SL复算一致。新增可可开场能量观察和蟾蜍抽牌后格挡SL对照；力量敏捷、减力、毒/重放/抽牌伤逐源核，未建能力不预支。历史毒药漏T0DGVABPV60U一饮，重算34局132饮，不以SL恢复当新瓶。三连胜仍净损55，末营火仅回21，沙虫六试全败；局部血价与整战因果分账。相关经验/账本/代码提案交独立strategy-proposal，不改打法源码或其他角色。'
def stats(x):
    a=[e for e in x['entries'] if e['status']=='active']
    return dict(active=len(a),chars=sum(len(e['lesson']) for e in a),confidence=dict(collections.Counter(e['confidence'] for e in a)),asc={k:dict(entries=sum(e['asc'][0]<=k<=e['asc'][1] for e in a),chars=sum(len(e['lesson']) for e in a if e['asc'][0]<=k<=e['asc'][1])) for k in [8,9,10]})
summary=dict(old_version=B['version'],version=E['version'],added=sum(c['before'] is None for c in C),updated=sum(c['before'] is not None for c in C),retired=0,before=stats(B),after=stats(E),evidence=[dict(id=c['id'],evidence=c['after']['evidence'],contradicting=c['after'].get('contradicting',[]),by_asc=dict(collections.Counter(R[r]['ascension'] for r in c['after']['evidence']))) for c in C])
assert summary['after']['chars']<=55000
Path('knowledge/characters/silent/experience.json').write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
for name,value in [('changes',dict(entries=C)),('update-summary',summary),('ledger-map',M)]:
    (O/(name+'.json')).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k!='evidence'},ensure_ascii=False))
