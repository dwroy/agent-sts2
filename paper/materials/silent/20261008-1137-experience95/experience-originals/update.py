import collections, copy, json
from pathlib import Path
O=Path(__file__).parent; K=Path('knowledge/characters/silent/experience.json')
B=json.load(open(O/'experience-before.json')); E=copy.deepcopy(B)
I={e['id']:e for e in E['entries']}; changes=[]
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
A=json.load(open(O/'audit.json')); N='79UCJ0K6R9C1'; M='NEWRFAYKTQHR'
def change(eid,runs,text):
    e=I[eid];old=copy.deepcopy(e)
    for run in runs:
        assert run not in e['evidence'];e['evidence'].append(run)
    e['n_support']=len(e['evidence']);e['last_seen']='2026-10-08'
    e['lesson']=text.replace('{n}',str(e['n_support']))
    n=e['n_support'];c=e['n_contradict'];e['confidence']='high' if n>=5 and c<=n/3 else 'med' if n>=2 else 'low'
    changes.append(dict(id=eid,before=old,after=copy.deepcopy(e),new_runs=runs))
def mech(eid,runs,conclusion,mechanism,pair,case):
    change(eid,runs,conclusion+'。机制：'+mechanism+'。搭配：'+pair+'。决定胜负的战斗：{n}支持/0反例，单项整战因果未控（n={n}）。典型案例：'+case)
mech('silent-strength-weak-observation',[N,M],'力量逐击影响攻击，敏捷逐张兑现牌挡，来源分账','现场力/弱按段核，牌挡加敏后核脆弱，已有挡不倒补','多击/多挡牌重复受益，毒与覆甲另算','79UCJ0K6R9C1 A10本体5×4经弱变3×4；2敏使双防御合14，T6无挡牌却不能凭敏补挡。NEWRFAYKTQHR棱柱药建2力、切割6→8，打击木偶另加3后打击实11；末3血15挡对19仍死。')
mech('silent-footwork-block',[N],'步法普通/升级建立2/3敏捷，后续挡牌逐张兑现','基础挡加现场敏捷再核脆弱，已有挡不补，被动挡另算','多挡牌重复收益，无挡牌时不预支','79UCJ0K6R9C1 A10寄生虫T4建2敏，两防御各7加原5挡/1覆甲覆盖20；T6无挡牌、四感染12加敌攻20实损32。PD9AYQVMLQW6沙漏4敏仍不足持牌伤及攻击。')
mech('silent-gorget-plating',[N],'护喉甲开场覆甲不等整场固定格挡','已见开场4，按当前剩层给挡；完整减层条件未隔离','覆甲、敏捷牌挡与轮初环挡分源','79UCJ0K6R9C1 A10寄生虫T1—4覆甲4/3/2/1，T5归零；T6无覆甲不能预支4挡，51→19损32。PD9AYQVMLQW6末沙漏覆甲已0。')
mech('silent-anticipate-temporary-dexterity',[N,M],'预判普通/升级仅本轮建立2/4敏捷','临时标记与敏捷同增，次轮撤回；后续牌挡才兑现，旧挡不补','与药水/步法常驻敏捷分账，多挡牌重复收益','NEWRFAYKTQHR A10蜂群末T1预判4叠药2为6敏，T2回2；两防御借士兵分别14/7合21挡盖20，T4仅14挡对32实损18。79UCJ0K6R9C1雕像T1建2敏不等全战常驻。')
mech('silent-piercing-wail-temporary-strength',[M],'尖啸临时降力按攻击段兑现，次轮恢复须重核','普通/升级减6/8，各段核现场力/弱；成长与临时恢复分账','多击重复受益，仍须真实牌挡','NEWRFAYKTQHR A10蜂群四试均用尖啸+，末T1减8令多击归0；T4敌1力四击合32，T7敌2力八击合40，单轮减力不等全战安全。ZTRGYYMLR8SC同族33→11后次轮恢复。')
mech('silent-envenom-unblocked-attack-poison',[M],'涂毒实建后未挡攻击逐击施毒，施毒不等毒伤','普通/升级已见建1/2层，未挡攻击逐击加对应毒；制品等未见组合不外推','多击/小刀重复触发，原牌自带毒另计，换战重新建立','NEWRFAYKTQHR A10棱柱第二试T1建1层，中和额外施1毒、不增污染；末试未建，不能沿用该1毒。0NZXA12NLDMH升级双段匕首雨两侧各加4毒。')
mech('silent-noxious-fumes-growth',[M],'毒雾普通/升级建立2/3层，后续玩家轮初补毒','建层不即时施毒，可叠加；头骨/制品和触媒另核','须实建并活到结算，前战药水生成能力不跨战','NEWRFAYKTQHR A10 F21能力药取普通毒雾并建2层，下一玩家轮才补2毒；F31四试未建毒雾，永久牌组无该牌。PD9AYQVMLQW6首boss有雾、第二boss未建。')
mech('silent-afterimage-per-card-block',[M],'余像按建立后实际出牌次数补挡，自身首次不触发自己','已见每1层后续每牌+1，重放再触发，脆弱不折被动挡','多牌重复收益，牌挡/遗物挡另算，换战重建','NEWRFAYKTQHR A10 F23能力药取余像、建1层后后续牌补1挡；棱柱未建，不能带入前战增益。PD9AYQVMLQW6沙漏4敏牌挡与余像合32仍不足47威胁。')
mech('silent-mirage-poison-card-block',[M],'蜃景按现场存活敌毒总量给挡，施毒时序影响兑现','加敏后核脆弱，施放不耗毒也不追补之后加毒，零毒零敏加0','施毒、当前牌挡与敌技能血价合核','NEWRFAYKTQHR A10棱柱首/第三试T2毒药4→11再蜃景实11挡，损3/扣30；末SL先蜃景仅4挡、删毒后损8/扣23，三试同28血/151敌血/同五牌，整战皆败。K2JAGKVJAWZJ升级零毒实加0。')
mech('silent-paels-legion-card-block-double',[M],'佩尔的士兵待触发时仅翻倍第一张实际牌挡，后续休眠','牌基础加敏后翻倍，首牌后其他预览回常态；已见休眠2回合，其他组合另核','逐牌核实际触发，与余像/轮初挡分源','NEWRFAYKTQHR A10蜂群末T2两防御实14+7=21；棱柱末T3首防御10但污染增三击18→27、实损17，T4三牌各5合15不翻成30。9Z9H2EXKLF3T已见与暗影叠四倍。')
change('silent-infested-prism-tainted-skill-cost',[M],'棱柱技能收益须合算污染逐击血价，能力不加污染。机制：火花N令每技能加N污染、当前每段增对应值，下一玩家轮撤；A10已见T1—4为3、T5—8为6、T9为9。搭配：毒/蜃景/虚弱与段数同核，不一概禁技能。决定胜负的战斗：{n}支持/0反例，NEWRFAYKTQHR A10一场四试0赢，前三判死截断（n={n}）。典型案例：NEWRFAYKTQHR末T3防御得10挡却污染加3使三击18→27、实损17；T4三技能15挡/9污染对19需损4，3血死。T2同五牌删毒并前置蜃景，少7挡/少7实伤/多损5，后轮亦变，不能归单步整战死因。WQZVENQ7DTRP已见26毒/36损仍过关。')
mech('silent-deck-burst-observation',[N,M],'观察：持牌、计划、短推演估计与实际建立输出分账','按实际施毒/能力/轮初效果核，费用与可活轮限制兑现','本轮生存与持续输出合核，不把有限0赢样本等同必死','79UCJ0K6R9C1 A10寄生虫T3空过和攻击/双毒三案均0/8赢，实空过；T3—5本体45血不变，首次施毒T7，十一轮扣101/144余43而死。NEWRFAYKTQHR末棱柱未建涂毒、四轮扣57/171余114；前战生成能力不继承。')
rest=next(r for r in json.load(open(O/'rest-summary.json')) if r['asc']==10)
change('silent-rest-buffer-observation',[N,M],f'观察：只计已完成回复，后战结果另核。A10 {rest["runs"]}局{rest["rests"]}火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{100*rest["deaths"]/rest["nexts"]:.2f}%），活损中位{rest["median"]}；各阶另列（n={{n}}）。典型案例：79UCJ0K6R9C1雕像敌伤55/再生15分账，三火各21后51血进精英仍败；NEWRFAYKTQHR蜂群赢损26至8，回血到29仍死棱柱。SL恢复165不是新回血，无锻造/改线受控胜负。')
band=next(r for r in A['bands'] if (r['asc'],r['act'],r['type'],r['band'])==(10,2,'Elite','40–60%'))
change('silent-route-hp-observation',[N,M],f'观察：赢战耗下一战缓冲，改线收益须实打核验。A10 86局二幕精英40–60%入血{band["n"]}房/{band["runs"]}局，{band["deaths"]}死（{100*band["deaths"]/band["n"]:.2f}%），活损中位{band["median_win"]}；各阶/幕/房型/血档另列，非路线因果（n={{n}}）。典型案例：NEWRFAYKTQHR F21改两精英线，四走廊胜损46、F24回21后34进蜂群，胜损26、F29回21后29进棱柱败；未走原线未知。79UCJ0K6R9C1投影F14为70、实51，未来商店/火堆不预支。')
mech('silent-act-transition-missing-hp-heal',[M],'已见A9/A10跨幕按缺失HP的80%向下取整回复','同上限按⌊(最大HP−当前HP)×0.8⌋，低阶/其他先古未核；连续boss不属跨幕','营火、开场遗物、事件回复与SL恢复分账','NEWRFAYKTQHR A10仪式兽后19/70→59、⌊51×0.8⌋=40；三次营火各21、F7事件实19另记，六次SL恢复165不算回复。K2JAGKVJAWZJ蟹后28/75→65补37。')
mech('silent-ceremonial-beast-threshold-growth-sl',[M],'仪式兽跨现场阈值清横冲与阶段力量，眩晕不等击杀','阈值/血量按进阶占位符；低阶150、A9/A10实160，后段成长另核','直伤/已结毒推动阶段，与历石结束窗口分账','NEWRFAYKTQHR A10 F17T5打击171→158跨160、清6力并眩晕；T7最后打击后70血24毒，结束胜仍19血，后者须另核非出牌伤。L2TSFU62Z57Z跨阈值仍后段死亡。')
P=json.load(open(O/'historical-potions.json'))
def count(p):
    rr=[r for r in P if r['potion']==p];return len({r['run'] for r in rr}),len(rr)
nd,ad=count('DEXTERITY_POTION');nh,ah=count('HEART_OF_IRON');np,ap=count('POISON_POTION')
mech('silent-dexterity-potion-card-block',[M],'敏捷药水实饮建2敏捷，已有挡不倒补',f'{nd}局{ad}饮均+2，之后每挡牌加敏再核脆弱，换战撤回','多挡牌重复收益、临时预判另计，不定喝留时点','NEWRFAYKTQHR A10蜂群四试敏捷药均建2，末T1预判再加4，T2回2；赢次34→8仍损26，恢复原瓶不算新获药。')
mech('silent-heart-of-iron-plating',[M],'铁心药水建立7覆甲，不等即时或全战恒定7挡',f'{nh}局{ah}饮均覆甲+7、旧牌挡不变；后轮核剩层，完整减层条件未隔离','牌挡/敏捷与覆甲分源，不定喝留阈值','NEWRFAYKTQHR A10 F11T1实建7覆甲，60→54赢仍损6；棱柱无该覆甲，不沿用前战7。ZTRGYYMLR8SC同族T9覆甲归零。')
mech('silent-poison-potion-observed-application',[N],'毒药水先加毒，饮用当步不扣本体HP',f'{np}局{ap}饮，常态107饮加6、头骨4局15饮加7、制品2局2饮阻毒并耗1层；未见组合不外推','活到实际毒结算，持牌伤先核，不定提前喝/留药阈值','79UCJ0K6R9C1 A10末T11目标8血4毒，饮后8血10毒；三感染9先耗7挡扣2血死亡，毒未结，不能当已杀虫。K2JAGKVJAWZJ蟹首饮仍判死、次试留瓶胜但后续行动同变。')
mech('silent-regen-potion-decay-heal',[N],'再生逐轮回复并受上限截断，不当即时15血','13局18饮建立5层，完整层序5/4/3/2/1共15；短战/封顶按实回，先回后敌伤已核','牌挡抵敌伤、再生另记回复，净损非敌伤；不定喝留时点','79UCJ0K6R9C1 A10雕像T1饮，五轮实回15、敌伤55，47→7净损40；Y6GM2CHWJBEY A0封顶只实回14。')

def add(eid,scope,name,runs,text):
    assert eid not in I
    n=len(runs);e=dict(id=eid,scope=scope,name=name,asc=[0,20],lesson=text.replace('{n}',str(n)),evidence=runs,n_support=n,n_contradict=0,confidence='high' if n>=5 else 'med' if n>=2 else 'low',last_seen='2026-10-08',status='active')
    E['entries'].append(e);changes.append(dict(id=eid,before=None,after=copy.deepcopy(e),new_runs=runs))
infections=list(dict.fromkeys(['9YBKCNBFP0X5']+[r['run'] for r in json.load(open(O/'infection-ends.json'))]))
add('silent-infection-end-turn-block','card:INFECTION','感染',infections,'感染留手时每张在玩家回合结束造成3伤，先付持牌血价再验毒杀。机制：11局牌文、10局32次已执行结束；3×张数先耗挡，死亡可阻断敌毒/攻击。精确先后隔离仅A10末轮，其他免减伤未知。搭配：轮初环挡/牌挡共付持牌伤和敌攻，不把毒层当已结伤。决定胜负的战斗：{n}支持/0反例，药水时点整战胜因未控（n={n}）。典型案例：79UCJ0K6R9C1 F14T10两感染6先吃13挡，随后18攻损11；T11三感染9耗7挡扣2血先死，敌仍8血10毒，严格存活差1血。9YBKCNBFP0X5 A4最早仅核牌文。')
add('silent-stone-calendar-end-turn-window','relic:STONE_CALENDAR','历石',[M],'观察：历石参与的T7结束窗口可在敌攻前结束战斗，分源不足不反推固定伤害。机制：须合核已观察非出牌伤及毒的共同结束可能，截断归零不能拆独立伤或精确先后。搭配：已施毒与能活到结束同核，不因单个来源未斩杀就认定必死、不外推拖七轮。决定胜负的战斗：1局两场结束赢，蜂群真正四试仅末次已赢，前两次判死未执行（n=1）。典型案例：NEWRFAYKTQHR A10仪式兽T7敌70血24毒、19血零挡，结束胜仍19；蜂群末T7敌52血9毒、8血零挡对40，结束胜仍8。历石独立精确伤害未知。')
ring=json.load(open(O/'mechanism-counts.json'))['TORIC_TOUGHNESS']['runs']
add('silent-toric-toughness-delayed-block','card:TORIC_TOUGHNESS','坚韧之环',ring,'坚韧之环即时给挡并建立两次轮初同额挡，施放时的额度须与后来敏捷分账。机制：6局24次普通牌实见基础5加敏后核脆弱、建2次；延迟挡沿施放额度，未知升级/重放/叠层组合不外推。搭配：临时敏捷可进入施放值，轮初挡仍须支付持牌伤及敌攻，不预支尚未活到的轮次。决定胜负的战斗：{n}支持/0反例，单牌整战因果未控（n={n}）。典型案例：79UCJ0K6R9C1 A10本体T2实5、T3/T4轮初各5；T10两敏实7、T11带7仍被三感染9杀死。ZVYUL2YP3518 A10蟹T6预判后6敏实11，T7/T8敏回2仍各11。')
E['version']='2026-10-08.12'
E['_about']='静默经验只来自本角色实盘与复盘。第95次增量合并79UCJ0K6R9C1、NEWRFAYKTQHR A10，截至2026-10-08T02:09:41.113Z共126完局；旧124局七数组、血档、节点后战、回血及SL逐行复算一致。感染与毒结算、蜃景/污染血价、坚韧之环定额延迟挡及历石联合结束窗口分源；重打仅登记实赢和已执行代价，未知反事实不推胜因。经验/账本/代码提案关联独立strategy-proposal，本任务不改打法源码。'
def stats(x):
    active=[e for e in x['entries'] if e['status']=='active']
    return dict(active=len(active),chars=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),by_asc={str(a):dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in active),chars=sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]})
summary=dict(old_version=B['version'],version=E['version'],added=sum(c['before'] is None for c in changes),updated=sum(c['before'] is not None for c in changes),retired=0,before=stats(B),after=stats(E),evidence=[dict(id=c['id'],evidence=c['after']['evidence'],contradicting=c['after'].get('contradicting',[]),by_asc=dict(collections.Counter(R[r]['ascension'] for r in c['after']['evidence']))) for c in changes])
assert summary['after']['chars']<=60000
K.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(dict(entries=changes),ensure_ascii=False,indent=2)+'\n')
(O/'update-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k!='evidence'},ensure_ascii=False))
