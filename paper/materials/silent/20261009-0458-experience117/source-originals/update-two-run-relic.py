import collections,copy,json,re
from pathlib import Path
O=Path(__file__).parent
F=Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json')
E=json.load(open(O/'experience-before.json')); B=copy.deepcopy(E)
A=json.load(open(O/'audit.json')); R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
FU='FU8ZUQHBHNV9'; NEW='456MRNGCPD8E'; M={e['id']:e for e in E['entries']}; changes=[]; mapping={}
def update(ident,runs,text,lids):
 e=M[ident]; before=copy.deepcopy(e)
 for run in runs:
  assert run in R and R[run]['character'].lower()=='silent'
  if run not in e['evidence']:e['evidence'].append(run)
 e['n_support']=len(e['evidence']);e['n_contradict']=len(e.get('contradicting',[]))
 n=e['n_support'];c=e['n_contradict']
 e['confidence']='high' if n>=5 and c<=n/3 or n>=4 and c==0 else 'med' if n>=2 else 'low'
 e['last_seen']='2026-10-09'; e['lesson']=text.replace('{n}',str(n))
 assert e!=before
 changes.append(dict(id=ident,before=before,after=copy.deepcopy(e)))
 mapping[ident]=lids
rest=next(r for r in json.load(open(O/'rest-summary.json')) if r['asc']==10)
band=next(r for r in A['bands'] if (r['asc'],r['act'],r['type'],r['band'])==(10,2,'Monster','≥60%'))
update('silent-strength-weak-observation',[FU,NEW], '力量逐击加伤、敏捷逐张加牌挡，弱/易伤与临时减力另核。机制：基础加现场属性再核倍率；活力不当力量，旧挡不追补，毒另账。搭配：多击/多挡重复收益，不以成长替代可活轮。决定胜负的战斗：{n}支持/0反例，整战单因未控（n={n}）。典型案例：LYBHQ1X230ZB四段1力多4伤；456MRNGCPD8E A10虱虫两成长力7/14使猛扑23/30，双毒雾4与4敏仍实损23/17、胜仅24血；FU8ZUQHBHNV9骇鳗6活力加18基伤，易伤后36、虚弱后27，20血0挡死。',['silent-0012'])
update('silent-route-hp-observation',[FU,NEW],f'观察：赢战/避精英不保证续战血药，问号可战，未到营火不预支。A10 {rest["runs"]}局二幕Monster≥60%入口{band["n"]}房/{band["runs"]}局、{band["deaths"]}死（{100*band["deaths"]/band["n"]:.2f}%），活损中位{band["median_win"]}；分阶/幕/房型另列（n={{n}}）。典型案例：456MRNGCPD8E无精英路线F28回64，赢虱虫64→24、猎人24→4后F31死，F32火未到；FU8ZUQHBHNV9 F7回70/76仍死于强制精英，不能当时虚构绕路。另一条路未实打，不定改线必优。',['silent-0019'])
update('silent-rest-buffer-observation',[FU,NEW],f'观察：即时回复增加缓冲，不保证后战，未来火不预支。A10 {rest["runs"]}局{rest["rests"]}独立火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{100*rest["deaths"]/rest["nexts"]:.2f}%），活损中位{rest["median"]}；各阶另列（n={{n}}）。典型案例：FU8ZUQHBHNV9 F7实48→70、精英损70死；456MRNGCPD8E四次各回21、餐券两次各15及跨幕44另账，F28实43→64但三走廊连续耗64至0，F32未到。没有回血/锻造或另一线路整局对照。',['silent-0020'])
update('silent-deck-burst-observation',[FU,NEW],'观察：持有/计划组件、实建能力、已结收益与胜败分核。机制：仅实建力敏/毒与可活轮算兑现，换战重建、没取得的牌不算输出。搭配：实际费用、后继挡牌、成长敌与续场资源合核。决定胜负的战斗：{n}支持/0反例，整战单因未控（n={n}）。典型案例：WZL2AMEY85S7三雾仍余109死；FU8ZUQHBHNV9计划毒雾/毒药/触媒均未得、步法末战T7才建；456MRNGCPD8E双雾及4敏胜虱虫仍耗40，触媒+F30奖励才得、F31甲虫10毒三结27后仍19，不能倒算前战组件或预支下一轮。',['silent-0021'])
update('silent-footwork-block',[FU,NEW],'步法普通/升级建2/3敏捷，收益在后续每张挡牌兑现。机制：基础挡加现场敏再核脆弱/倍率，旧挡不补，柔嫩/吸取另核。搭配：多挡重复受益，无挡牌时能力不自动补挡。决定胜负的战斗：{n}支持/0反例，整战单卡胜因未控（n={n}）。典型案例：FU8ZUQHBHNV9 A10骇鳗T7建2敏、两防御各7合14，36攻仍损22，T9无挡死；456MRNGCPD8E F31两防御14，T4暗影后各14合28全挡，T6倍率撤只14仍被甲虫16攻杀2血。',['silent-0005'])
update('silent-noxious-fumes-growth',[NEW],'毒雾普通/升级建2/3层、后续玩家轮初补毒，能力不即时施毒。机制：已结毒逐次减1后按实建量补，可叠加，制品/阶段另核。搭配：活到补毒与结算，触媒次数和存活敌血分账。决定胜负的战斗：{n}支持/0反例，整战单卡胜因未控（n={n}）。典型案例：WZL2AMEY85S7三雾建2→4→6仍败；456MRNGCPD8E A10 F29两普通雾建4，T7敌33毒结束31血、胜仅24；F31 T3建2/T5再到4，T6甲虫10毒三结27仍余19、玩家死，未来补毒未发生。',['silent-0011'])
update('silent-piercing-wail-temporary-strength',[FU,NEW],'尖啸临时减力按攻击段兑现，次轮恢复须重核。机制：普通/升级减6/8，逐段核净力与弱，制品可阻、攻击不降成负伤。搭配：多击减伤和实挡共同验收，不当永久停止成长。决定胜负的战斗：{n}支持/0反例，整战单牌胜因未控（n={n}）。典型案例：KAY522KT5NXR三击30→12；FU8ZUQHBHNV9 A10骇鳗T4力0→−6、4×3→0×3零损，T5恢复且活力撞击24；456MRNGCPD8E巨兽T3力−6使11→5，次轮负力消失，本体结束后自爆仍须实挡/弱化。',['silent-0046'])
update('silent-terror-eel-vigor-vulnerable',[FU],'骇鳗过阈值取消当轮攻击，后段仍须付活力/易伤血价。机制：撞击基础按进阶读{@10:DMG:TERROR_EEL:CRASH_MOVE}；先加现场活力再核弱/易伤；A0/A1惊叫70、A10为75，恐吓已见99易伤。搭配：眩晕不清未耗活力，实挡/输出和剩余可活轮合核。决定胜负的战斗：{n}支持/0反例、无真正重打；不定提前能力或留药整战必优（n={n}）。典型案例：Q6M2Y34MWKRE T7 36攻损31仍赢后场败；FU8ZUQHBHNV9 A10 T5敌86→69眩晕，T7(18+6)×1.5=36对14挡失22；T9中和至27，20血0挡死、敌18；退出易伤清除后的18攻不用来替代结算前27。',['silent-0050'])
update('silent-shadowmeld-new-block-double',[NEW],'融入暗影只翻本轮建立后新增挡，旧挡不追补。机制：建1层后基础加敏再核×2与脆弱，技能本身不加挡、轮末撤，其他来源另核。搭配：实际支付后打挡牌，轮初已有挡与待结下轮挡分开。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：K2JAGKVJAWZJ旧7挡不变；456MRNGCPD8E A10 F31T4两敏双防御(5+2)×2各14合28，挡住丝10+甲虫18；T6倍数撤只14挡对16仍死。F29T6四敏/脆弱下一防御实⌊(5+4)×2×0.75⌋=13，对30损17。',['silent-0077'])
update('silent-accelerant-triggers',[NEW],'触媒增加毒结算次数，不倍增毒层；普通/升级建1/2且不即时施毒。机制：k层至多k+1次，各结减1、零停止；普通p≥2为2p−1，升级p≥3为3p−3，限伤/剩HP/阶段另核。搭配：先实建毒并活到结算，退场剩血截断不当理论毛伤。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：HEMND3SMQYB8升级22毒三结63；456MRNGCPD8E A10 F31T2建2，T5甲虫9毒扣9+8+7=24、丝2毒扣3；T6甲虫10毒扣27至19，丝4毒理论9只需扣剩7退场、甲虫16攻仍杀2血14挡玩家。',['silent-0027'])
update('silent-slumbering-beetle-wake-growth',[NEW],'熟睡甲虫醒后滚动持续加力；同伴毒死不保证其停攻。机制：睡层下降、醒后覆甲消失，基础滚动按{@7:DMG:SLUMBERING_BEETLE:ROLL_OUT_MOVE}/{@10:DMG:SLUMBERING_BEETLE:ROLL_OUT_MOVE}加力核弱。搭配：各敌毒杀/剩血与各自攻击分核，不定固定杀序或由单条死线判整战必死。决定胜负的战斗：{n}支持/0反例，同伴先毒死后仍攻击仅两局验证（n={n}）。典型案例：3KME36ADUE4U A7 F27第三试T4丝先死、甲虫15攻对4血7挡致死；456MRNGCPD8E A10 F31自然睡3/2/1后T4醒，力0/2/4、攻18/20/22，T6弱后16；丝7血4毒退场，甲虫46血10毒结后19且仍攻击，2血14挡实死、未重载。',['silent-0128','silent-0326'])
update('silent-hunter-tender-card-attributes',[NEW],'猎人杀手柔嫩逐牌削当前力敏，按出牌前属性算效果。机制：TENDER1在牌效果后力敏各−1、次玩家轮恢复，柔嫩留；药不触发，跨轮挡按建立时算。搭配：多挡次序、实际减敏和当前意图合核，不由首战胜推续场安全。决定胜负的战斗：{n}支持/0反例，整场换序未控（n={n}）。典型案例：61E2QS63Y9WU负敏翻滚仅5/5；456MRNGCPD8E A10 F30T2第二步法净2→3敏，防御实8后减至2、毒药再至1，次轮恢复4；T6带入7挡加防御9共16对24失8，整战24→4虽胜却下一战死。',['silent-0232'])
update('silent-louse-progenitor-strength-growth',[NEW],'虱虫成长加力与挡逐轮核，临时弱/减力不停止成长。机制：A0/2/6/7已见每次+5力，A8加{@8:GAIN:LOUSE_PROGENITOR:CURL_AND_GROW_MOVE:STRENGTH_POWER}，A10加{@10:GAIN:LOUSE_PROGENITOR:CURL_AND_GROW_MOVE:STRENGTH_POWER}并建{@10:BLOCK:LOUSE_PROGENITOR:CURL_AND_GROW_MOVE}挡；本体HP/挡另账。搭配：毒进度、实际敏捷/脆弱挡与来袭合核，不以能力数量抵销血价。决定胜负的战斗：{n}支持/0反例，提前击杀整战未控（n={n}）。典型案例：LY83ZMTFVKJH A10四成长力7/14/21/28、弱后33仍死；456MRNGCPD8E F29力7/14使猛扑23/30，T3零挡损23、T6四敏暗影脆弱实13挡仍损17；双雾4配33毒T7杀31血敌，64→24勝出，后战按24接续。',['silent-0316'])
update('silent-ghost-in-a-jar-current-turn',[NEW],'罐装幽灵只覆盖实建无实体当轮，不保证下一轮。机制：已饮建1无实体，已见攻击26/20降1，次轮撤；无攻击轮也到期，其他伤源/叠层未验。搭配：当轮实际攻击与已有挡合核，不设固定喝留门槛。决定胜负的战斗：{n}支持/0反例，改喝药时点整战未控（n={n}）。典型案例：SY0WMJNNVRLM六试T4无攻饮、T5各损24；456MRNGCPD8E A10 F2得幽灵留至F31T5，3血0挡饮使甲虫20→1、损1剩2；T6无实体撤，虽丝被毒杀、双防御14仍不足甲虫16，实死；前场饮或延后本可赢未记录。',['silent-0301'])
update('silent-dexterity-potion-card-block',[NEW],'敏捷药实饮建2敏捷，已有挡不补。机制：后续牌挡加敏再核脆弱/倍率、换战撤，步法/柔嫩/遗物另分源。搭配：多挡重复受益，不设喝留门槛。决定胜负的战斗：{n}支持/0反例，单药整战胜因未控（n={n}）。典型案例：QHK1XQ928TTM族母饮后仍被吸取；456MRNGCPD8E A10 F22花50金买、F23T1实饮+2敏且原0挡不变，胜40→36，离场药空；后场新建步法力敏不沿用此瓶，F29双步法4敏与F31步法2敏另账。',['silent-0276'])
update('silent-act-transition-missing-hp-heal',[NEW],'已见A9/A10跨幕按缺失HP的80%向下取整回复。机制：同上限⌊(maxHP−当前HP)×0.8⌋，低阶/其他先古未核，连续boss非跨幕。搭配：营火/事件/药/奖励与SL恢复各分源，不预支后幕血。决定胜负的战斗：{n}支持/0反例，回复不保证后战（n={n}）。典型案例：LY83ZMTFVKJH同族胜11/77跨幕回52到63；456MRNGCPD8E A10 F17巨兽胜14/70，F18实回⌊56×0.8⌋=44到58；四营火各21、两餐券各15另账，终战未跨幕不加回复。PBUBM0LRTEDD女王26接实验体26无跨幕回血。',['silent-0243'])
update('silent-giant-explosion-window',[NEW],'巨兽本体结束后仍有自爆，击杀时点与当轮HP/实挡合核。机制：A10已见蒸汽T2=20后每轮+3，本体结束下一轮自爆；血按{@10:HP:WATERFALL_GIANT}读，999999999残壳不当新需伤。搭配：毒结束本体后仍需实挡/虚弱，吸取回血与净进度另账、打残壳不消爆。决定胜负的战斗：{n}支持/0反例，提前击杀整战单因未控（n={n}）。典型案例：G8NHLL09DLBX爆56弱42、损33剩1；456MRNGCPD8E A10 F17T8以30毒结束28血本体，T9突然一拳把自爆38→28、两敏双防御14，实损14剩14；整战59→14净损45、跨幕回复另记。',['silent-0017'])
update('silent-frail-card-block',[NEW],'脆弱逐张折减卡牌格挡，被动挡另核。机制：基础加现场敏/牌增量再核倍率，已见×0.75最终向下取整，旧挡不倒补。搭配：多挡逐张、暗影/首卡倍率和遗物分账，不推广未见增益顺序。决定胜负的战斗：{n}支持/0反例，单项整战胜因未控（n={n}）。典型案例：P2M3DFJ4DEZ3八敏首卡翻倍闪躲+实⌊(6+8)×2×0.75⌋=21，6血仍死；456MRNGCPD8E A10 F29T6四敏/脆弱/暗影后防御实⌊(5+4)×2×0.75⌋=13挡对30失17，初12挡预测到末重算13，不能把1挡差直接判新bug。',['silent-0013'])
relic=dict(id='silent-petrified-toad-opening-rock',scope='relic:PETRIFIED_TOAD',name='石化蟾蜍',asc=[0,20],lesson='石化蟾蜍已见新战开场在空槽补药水形状的石头，按战分账。机制：空槽生成POTION_SHAPED_ROCK、实际投石对目标扣15且玩家HP不变；满槽/旧石未用及其他修正未知。搭配：投石供本战单体进度，生成不算奖励/买药或SL恢复，不推永不缺药与固定喝留价。决定胜负的战斗：2支持/0反例，遗物整战单因未控（n=2）。典型案例：ZZMYZ5UBCG72 A2 F17T1槽0得石、T3族母201→186且玩家52不变；456MRNGCPD8E A10 F27/29/30/31空槽1各新石并各投15，F27异螨实34→19，F31丝44→29仍甲虫余19致死。',evidence=['ZZMYZ5UBCG72',NEW],n_support=2,n_contradict=0,confidence='med',last_seen='2026-10-09',status='active')
E['entries'].append(relic);changes.append(dict(id=relic['id'],before=None,after=relic));mapping[relic['id']]=['silent-0327']
E['version']='2026-10-09.6'
E['_about']='静默经验只来自本角色实盘与复盘。第117次增量合并FU8ZUQHBHNV9、456MRNGCPD8E A10；截至'+A['cutoff']+'共153完局。旧151局同口径逐行复算；核赢战耗血、敏捷/脆弱/暗影/毒/成长、甲虫同伴先毒死仍攻击与蟾蜍开场石。未选路线/留药/替代牌序整战缺对照，不拟血线/药价/SL新门槛；相关代码提案交独立strategy-proposal，不改打法源码或其他角色。'
def summary(e):
 active=[x for x in e['entries'] if x['status']=='active']
 return dict(version=e['version'],active=len(active),chars=sum(len(x['lesson']) for x in active),confidence=dict(collections.Counter(x['confidence'] for x in active)),applicable={str(a):dict(entries=len(v:=[x for x in active if x['asc'][0]<=a<=x['asc'][1]]),chars=sum(len(x['lesson']) for x in v)) for a in [8,9,10]})
assert summary(E)['chars']<55000
for e in E['entries']:
 assert len(e['evidence'])==len(set(e['evidence']))==e['n_support']
 assert all(R[r]['character'].lower()=='silent' for r in e['evidence'])
 assert e['n_contradict']==len(e.get('contradicting',[]))
F.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(dict(entries=changes),ensure_ascii=False,indent=2)+'\n')
(O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
result=dict(before=summary(B),after=summary(E),added=1,updated=len(changes)-1,retired=0,evidence_updates=len(changes)-1,numbers_only=0)
(O/'update-summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
