import collections,copy,json,subprocess
from pathlib import Path
O=Path(__file__).parent
P=Path('knowledge/characters/silent/experience.json')
RUN='P2M3DFJ4DEZ3'
B=json.load(open(O/'experience-before.json'));E=copy.deepcopy(B)
A=json.load(open(O/'audit.json'));R=json.load(open(O/'rest-summary.json'))[-1]
day=subprocess.check_output(['date','+%Y-%m-%d'],text=True).strip()
C=[];M={}
def update(ident,ledgers,case=None,lesson=None):
 e=next(e for e in E['entries'] if e['id']==ident);old=copy.deepcopy(e)
 assert RUN not in e['evidence']
 e['evidence'].append(RUN);n=e['n_support']=len(e['evidence'])
 e['confidence']='high' if n>=5 and e['n_contradict']<=n/3 else 'med' if n>=2 else 'low'
 e['last_seen']=day
 e['lesson']=lesson or e['lesson'].replace(str(old['n_support'])+'支持',str(n)+'支持').replace('（n='+str(old['n_support'])+'）','（n='+str(n)+'）')
 if case:e['lesson']=e['lesson'].split('典型案例：')[0]+'典型案例：'+case
 C.append(dict(id=ident,kind='updated',before=old,after=e,new_runs=[RUN]));M[ident]=ledgers
update('silent-strength-weak-observation',['silent-0012'],case='LYBHQ1X230ZB四段1力多4伤；P2M3DFJ4DEZ3 A10女王末T1华彩步法建6敏、专长科学另增2力2敏，力量1→3、敏6→8，重放防御13×2=26；沙漏敌力T4/7/10为4/9/15，不能按开场来袭预算后轮。')
b=next(b for b in A['bands'] if (b['asc'],b['act'],b['type'],b['band'])==(10,2,'Monster','≥60%'))
update('silent-route-hp-observation',['silent-0019'],lesson=f'观察：前战胜/避可选精英不保证续战血药，问号可战，未来营火不预支。A10 {R["runs"]}局二幕Monster≥60%入血{b["n"]}房/{b["runs"]}局、{b["deaths"]}死（{b["deaths"]/b["n"]*100:.2f}%），活损中位{b["median_win"]}；分阶/幕/房型另列（n={len(A["runs"])}）。典型案例：P2M3DFJ4DEZ3 F42精英68→45耗攻击药、F43问号战45→24；华夫饼补满77后首boss仍胜出19空药、第二boss败。实际改线但未选节点无实打对照，不定改线必优。')
update('silent-rest-buffer-observation',['silent-0020'],lesson=f'观察：即时回复增加血缓冲，不保证后战，未到营火不预支。A10 {R["runs"]}局{R["rests"]}独立火/{R["heal"]}回血实回{sum(R["gains"])}，去重{R["nexts"]}后战{R["deaths"]}死（{R["deaths"]/R["nexts"]*100:.2f}%），活损中位{R["median"]}；各阶另列（n={len(A["runs"])}）。典型案例：P2M3DFJ4DEZ3八火六回血各21合126；F45华夫饼24/70→77/77，F47满血锻造不回血。F41枕头后唯一火未选回血，额外15未兑现；无改锻造整战胜果。')
update('silent-deck-burst-observation',['silent-0021','silent-0057'],case='WZL2AMEY85S7三毒雾仍余109死；P2M3DFJ4DEZ3 A10群蛇已取且F47升级却全局未打/未建能力，不把每牌6伤乘出牌数当实伤；女王末T1实际重建8敏及坚定不移，T5仍死余482，取得/升级与收益兑现分核。')
update('silent-frail-card-block',['silent-0013','silent-0069'],case='UZ1T7AH49WMB两防御各7与偏折6合20；P2M3DFJ4DEZ3 A10女王末T5八敏/脆弱97且首卡翻倍，闪躲+基础6实21=⌊(6+8)×2×0.75⌋，不能先截10再倍成20；消费后防御19→9，6血21挡对27需损6实死，至少差1血存活。此倍率组合仅本局核，不推广所有增益顺序。')
update('silent-footwork-block',['silent-0005'],case='M0GY0A4M2F7H两敏三挡20仍死；P2M3DFJ4DEZ3 A10女王末T1华彩步法+一次动作实建6敏，再由专长科学加2到8，防御13重放实26；T5脆弱/首卡翻倍后闪躲+实21仍不足6血顶27攻，能力不倒补旧挡。')
update('silent-noxious-fumes-growth',['silent-0011'],case='WZL2AMEY85S7三普通毒雾建2→4→6；P2M3DFJ4DEZ3 A10沙漏胜试实建2层毒雾，T7仍因26攻/四张9伤凋萎对28挡损34；女王末试未建毒雾，不把上一战2层继承或预支后续毒。')
update('silent-wither-end-turn-loss',['silent-0024'],case='TXZ6RVMQA09D毒杀仍持牌损7；P2M3DFJ4DEZ3 A10沙漏第二试T7三张9伤凋萎、26攻、首卡防御28挡，63→38损25；胜试四张9伤、同26攻28挡，53→19损34。多出持牌伤不由毒/敏捷代付，内部全序缺帧。')
update('silent-snakebite-retained-poison',['silent-0220'],case='W7BHM8U02RKG负2力仍施7毒；P2M3DFJ4DEZ3 A10女王末T3蛇咬+向聚合体毒2→12、132血即时不变；T5普通向女王加7、末410→403，聚合体10毒另结89→79。升级实见10毒，不能预支后轮结算或等同整战胜。')
update('silent-mad-science-custom-strangle',['silent-0103','silent-0136','silent-0138'],lesson='疯狂科学同ID按现场定制模板核算。机制：7支持局四模板：好奇减能力费A0/A10两局；基础8挡加敏抽3为A1/A8两局；攻击12附当轮紧勒6为A6一局；专长2力量2敏捷为A7/A10两局，不能把7局当每模板都核7局。搭配：力敏分别由后续攻击段/挡牌兑现，技能抽牌与能力成长分账。决定胜负的战斗：7支持/0反例，单牌整战因果未控（n=7）。典型案例：2PVLGRBGUX9S A7科学令1力→3、0敏→2；P2M3DFJ4DEZ3 A10女王末T1专长令1力→3、6敏→8，已有0挡不变、后重放防御26，仍T5败；不套攻击/抽牌/减费模板。')
update('silent-act-transition-missing-hp-heal',['silent-0243'],case='LY83ZMTFVKJH同族胜11/77跨幕回52到63；P2M3DFJ4DEZ3 A10灵魂异鱼胜36/70跨幕回⌊34×0.8⌋=27到63，沙虫胜8回⌊62×0.8⌋=49到57；沙漏胜19直接接女王19，无跨幕回复，小血瓶另补2，SL恢复21另账。')
update('silent-double-boss-resource-handoff',['silent-0228'],lesson='观察：A10首boss胜后直接接续实血药，能力换战重建。机制：11局F48出口HP与F49入房相同，全部后战败；遗物开场变化与可操作HP另核，连续boss非跨幕。搭配：回复/复活/SL恢复分账，不由全败拟固定终局权重或留药价。决定胜负的战斗：11支持/0反例，无保药/改线整战胜利对照（n=11）。典型案例：AD3QSC3P41JU女王胜15→实验体15入房/11可操作；P2M3DFJ4DEZ3沙漏77两药六试一赢，胜出19空药→女王入房19、小血瓶补21、SL首帧21，六试全败。p2796已备战双王，是资源接续支持，不称忘了第二场。')
update('silent-queen-poison-window-sl-observation',['silent-0079'],lesson='观察：女王重打核实际主轴/换线血价，死亡推演饱和不消除真实血价，无胜次不定固定目标或提前能力必胜。机制：实建毒和可活轮决定已结算量，抽弃后旧后缀不预支。搭配：敏捷/首卡翻倍/脆弱与真实血药合核，SL恢复不当新增资源。决定胜负的战斗：8场48试0赢、40次判死读档，各末次实死，后续抽牌/生成未全控（n=8）。典型案例：9YBKCNBFP0X5 A4同盘多损8多清9仍败；P2M3DFJ4DEZ3 A10六试末试T3弃中和导致原预计损3、实36攻对24挡损12；第5试T7后聚合体退场仍T11判死，末试T5六血21挡对27实死余482，无赢的那次，不定击杀序或归胜运气。')
update('silent-aeonglass-artifact-growth-sl',['silent-0079','silent-0228'],lesson='观察：沙漏制品、成长、持牌伤与实际启动窗口合核，首boss胜须交接血药。机制：现场力敏/首卡翻倍/凋萎数决定当轮损血，毒和能力不跨战预支。搭配：有限推演全死不作独立必死证据，同盘换线另记血价。决定胜负的战斗：19支持/0反例，全阶重打16场78试4赢，A10为10场54试2赢（n=19）。典型案例：HEMND3SMQYB8首试六轮胜25后女王六败；P2M3DFJ4DEZ3 A10前五试T11判死、末T10胜19空药。末T5换线比同底板T5多损16、多净清12，后序也变；T7四凋萎36+26攻−28挡=34损，不把末试胜全归一次改序或断言留药必胜。')
ident='silent-unmovable-first-card-block'
assert not any(e['id']==ident for e in E['entries'])
e=dict(id=ident,scope='card:UNMOVABLE',name='坚定不移',asc=[0,20],lesson='普通坚定不移建立后每轮首张卡牌格挡翻倍，既有挡不倒补。机制：本局1层，首卡额度每轮重置；8敏脆弱下闪躲+实⌊(6+8)×2×0.75⌋=21，消费后防御19→9，未核叠层/其他来源顺序。搭配：步法/专长科学的敏捷由后继挡牌兑现，待结下轮挡不预支。决定胜负的战斗：1支持/0反例、A10沙漏胜及女王败，单能力胜因未控（n=1）。典型案例：P2M3DFJ4DEZ3沙漏第二试T7新建后防御14→28，三凋萎27+26攻−28=25实损；女王末T1先重放防御26再建能力仍26，T2首斗篷28，T5闪躲实21并建下轮21，但6血仍死于27攻，未活到下轮。',evidence=[RUN],n_support=1,n_contradict=0,confidence='low',last_seen=day,status='active')
E['entries'].append(e);C.append(dict(id=ident,kind='added',before=None,after=e,new_runs=[RUN]));M[ident]=['silent-0321']
seq=int(B['version'].split('.')[-1])+1 if B['version'].startswith(day+'.') else 1
E['version']=day+'.'+str(seq)
E['_about']=f'静默经验只来自本角色实盘与复盘。第115次增量合并P2M3DFJ4DEZ3 A10；截至{A["cutoff"]}共{len(A["runs"])}完局。旧149局同口径逐行复算；核首卡翻倍与力敏/脆弱、持牌伤、蛇咬、双boss实血药接续及SL对照。没有留药/改线完整胜果，不拟新阈值或药价；提案交独立strategy-proposal，不改打法源码或其他角色。'
P.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(dict(entries=C),ensure_ascii=False,indent=2)+'\n');(O/'ledger-map.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n')
active=[e for e in E['entries'] if e['status']=='active']
summary=dict(old_version=B['version'],version=E['version'],added=1,updated=len(C)-1,retired=0,active_before=sum(e['status']=='active' for e in B['entries']),active=len(active),chars_before=sum(len(e['lesson']) for e in B['entries'] if e['status']=='active'),chars=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),asc={str(a):dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in active),chars=sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]})
assert summary['chars']<=60000
(O/'update-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False))
