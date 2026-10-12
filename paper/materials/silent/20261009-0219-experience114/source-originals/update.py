import collections,copy,json,subprocess
from pathlib import Path
O=Path(__file__).parent
P=Path('knowledge/characters/silent/experience.json')
RUN='HEMND3SMQYB8'
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
update('silent-strength-weak-observation',['silent-0012'],case='LYBHQ1X230ZB四段1力多4伤；HEMND3SMQYB8 A10沙漏增强后4力，弱下同退潮19→22；女王末试步法2敏、药再加2，脆弱仍使扫腿11/斗篷7合18，10血实损9，力敏成长不代替生存窗口。')
b=next(b for b in A['bands'] if (b['asc'],b['act'],b['type'],b['band'])==(10,2,'Monster','≥60%'))
update('silent-route-hp-observation',['silent-0019'],lesson=f'观察：胜前战/避可选精英不保证续战血药，問号可战，未来营火不能预支。A10 {R["runs"]}局二幕Monster≥60%入血{b["n"]}房/{b["runs"]}局、{b["deaths"]}死（{b["deaths"]/b["n"]*100:.2f}%），活损中位{b["median_win"]}；分阶/幕/房型另列（n={len(A["runs"])}）。典型案例：HEMND3SMQYB8三幕零精英三火线，F47回满70，沙漏胜出25直接接女王六败；没有另一条路线的实打对照，不由跨局差异定改线必优。')
update('silent-rest-buffer-observation',['silent-0020'],lesson=f'观察：即时回复增加血缓冲，不保证下一战，未到营火不预支。A10 {R["runs"]}局{R["rests"]}独立火/{R["heal"]}回血实回{sum(R["gains"])}，去重{R["nexts"]}后战{R["deaths"]}死（{R["deaths"]/R["nexts"]*100:.2f}%），活损中位{R["median"]}；各阶另列（n={len(A["runs"])}）。典型案例：HEMND3SMQYB8六回血实回121、三锻造不回血；F30三虫损37至11，F32回21以32进沙虫胜15；F47只实回16封顶70，首boss后无回复节点，未有改锻造整战胜果。')
update('silent-deck-burst-observation',['silent-0021'],case='WZL2AMEY85S7三毒雾仍余109死；HEMND3SMQYB8 A10沙漏T1毒雾+/T2步法/T3触媒+实建，T4毒链清183，六轮胜25；女王需重新建立，末T3毒雾只到T4补毒，两敌末余501。取得、到手、实建和已结收益分核，不能预支后一战成长。')
update('silent-frail-card-block',['silent-0013'],case='UZ1T7AH49WMB两防御各7与偏折6合20；HEMND3SMQYB8 A10女王末T3有4敏/脆弱，扫腿⌊15×0.75⌋=11、斗篷⌊10×0.75⌋=7合18，防御替代6挡未打；T4已有1血11挡对19需损8实死，至少9血方能按原线活，不把扣剩1血当完整血价。')
update('silent-footwork-block',['silent-0005'],case='M0GY0A4M2F7H两敏三挡20仍死；HEMND3SMQYB8 A10沙漏T2普通步法建2敏、防御5→7；女王T1步法建2敏、遗物另7挡，两防御各7合21，药到T2再加2不倒补T1；T3有4敏且脆弱仍损9，没打出的防御不算挡。')
update('silent-noxious-fumes-growth',['silent-0011'],case='WZL2AMEY85S7三普通毒雾建2→4→6；HEMND3SMQYB8 A10女王末T3毒雾+建3不即时施毒，T4初两敌各3毒、轮末各结3，T3少防御仍付9血，末余501；沙漏的3层不跨战，未有提前施放转胜对照。')
update('silent-accelerant-triggers',['silent-0027'],case='CNKR125PFHJ5无实体下17毒普通两结仅2；HEMND3SMQYB8 A10沙漏T3触媒+建2，22毒三结22+21+20=63，次轮毒雾补3；T4爆发后28毒轮末三结81。女王末试未实建触媒，不预支组件或断言早建必胜。')
update('silent-outbreak-immediate-poison',['silent-0037'],case='LLYSRQQ35AVW A8触媒2下9+8+7=24、残6毒；HEMND3SMQYB8 A10沙漏T4已有22毒，普通爆发加9到31，触媒2使立即结31+30+29=90、残28毒，轮末再结81；该轮净清183另含直伤12，不全归爆发，下一战需重建。')
update('silent-mummified-hand-free-card',['silent-0067'],lesson='干瘪之手在施放能力后使随机手牌本回合免费，不能预先指定目标。机制：能力仍支付当前费，免费不追溯此前能耗，换轮重核。搭配：以实际免费牌接续减伤/抽弃，与永冻冰晶被动挡分源。决定胜负的战斗：3支持/0反例，单遗物整战胜因未控（n=3）。典型案例：ZZMYZ5UBCG72 A2触媒付2使尖啸1→0；HEMND3SMQYB8 A10沙漏T1毒雾+付费后尖啸1→0、零费实减6力，遗物另补7挡；女王免费不等同有毒/足够输出。')
update('silent-permafrost-first-power-block',['silent-0173'],case='PJ2LL9KU7FHD族母能力7加双防御14抵21；HEMND3SMQYB8 A10沙漏T1毒雾+首能力补7、T2步法不再补；女王换战T1步法再次补7，2敏只作用后两防御各7，总21挡，不能把首次7按每能力重复或加敏。')
update('silent-wither-end-turn-loss',['silent-0024'],case='TXZ6RVMQA09D毒杀仍持牌损7；HEMND3SMQYB8 A10沙漏T1持3伤牌、18挡覆盖15攻击与3凋萎零损；T4新牌已6伤，49血7挡对22攻击与持牌6，实损21至28。毒/敏捷不抵消持牌伤，缺独立帧不补内部全序。')
update('silent-piercing-wail-temporary-strength',['silent-0046'],case='KAY522KT5NXR三击30→12；HEMND3SMQYB8 A10沙漏T1尖啸实减6力，弱下19→15，18挡覆盖15攻击及3凋萎；后续增4力使弱下同退潮22，临时降力不当停止成长，未有早打整战对照。')
update('silent-lost-forgotten-possession',['silent-0183'],case='5PM6JAQG6FNQ两次抢夺力敏各−4，一步法仅敏−2；HEMND3SMQYB8 A10 F39力敏先各−2、后敏−4/−6，T4仅2挡对13攻实损11；再生回2使净损9，毒仍可结算。取得步法尚未建立，不给正敏或固定先杀序。')
update('silent-double-boss-resource-handoff',['silent-0228'],lesson='观察：A10首boss胜后直接接续实际血药，能力换战重建。机制：10局F48出口HP与F49入房相同，全部后战败；遗物开场失血与可操作HP另核，连续boss非跨幕。搭配：回复/复活/SL恢复分账，不由全败拟固定终局权重或留药价。决定胜负的战斗：10支持/0反例，无保药/改线完整胜利对照（n=10）。典型案例：AD3QSC3P41JU女王胜15→实验体15入房/11可操作六败；HEMND3SMQYB8沙漏70血缚魂+混沌→25血仅混沌，F49仍25且无回复/奖励补给，女王六敗；题面已提醒两战，不能当误认终战。')
update('silent-queen-poison-window-sl-observation',['silent-0079'],lesson='观察：女王重打须核主轴实际启动与换线血价，死亡推演饱和仍有血价；无胜次不定提前能力必胜。机制：毒雾建层后次轮补毒，实际挡/剩血限制结算窗口。搭配：敏捷、脆弱、抽弃后的真实牌序合核，SL恢复同瓶不算新资源。决定胜负的战斗：7场42试0赢，35次判死读档、各末次实死，后续抽/生成未全部受控（n=7）。典型案例：9YBKCNBFP0X5 A4 T7同盘换线多损8多清9仍败；HEMND3SMQYB8 A10六试25血混沌，前五T2判死；末T3两线24/24死，24挡损3未实打，18挡毒雾实损9至1，仅当轮清3，下轮补毒后T4实死余501。没有赢的那次或完整替代线，不归胜运气。')
update('silent-dexterity-potion-card-block',['silent-0276'],case='QHK1XQ928TTM族母饮后仍被吸取；HEMND3SMQYB8 A10女王末试T1步法2敏/两防御各7，敏捷药留到T2实建4敏、已有0挡不变，后防御9；T3脆弱下防御6/扫腿11/斗篷7分别核，不定更早喝能赢。')
regen=[p for p in A['potions'] if (p.get('potion') or {}).get('id')=='REGEN_POTION' and p['run'] in next(e for e in E['entries'] if e['id']=='silent-regen-potion-decay-heal')['evidence']+[RUN]]
update('silent-regen-potion-decay-heal',['silent-0259'],lesson=f'再生逐轮回复并受上限截断，不当即时15血。机制：20局{len(regen)}饮增5层，完整5/4/3/2/1共15；短战/封顶按实回，先回后敌伤已核。搭配：牌挡/敌伤/回血分源，净损不当敌毛伤，不定留药门槛。决定胜负的战斗：20支持/0反例，单药整战胜因未控（n=20）。典型案例：LY83ZMTFVKJH三轮仅回12；HEMND3SMQYB8 A10 F39T1饮、五轮实回15，敌攻实损21、39→33净损6；T4回2仍受伤11净损9，不能按净HP说挡住攻击。')
update('silent-act-transition-missing-hp-heal',['silent-0243'],case='LY83ZMTFVKJH同族胜11/77跨幕回52到63；HEMND3SMQYB8 A10墨影胜44/70→⌊26×0.8⌋回20到64、沙虫胜15→⌊55×0.8⌋回44到59；沙漏胜25直接接女王不跨幕。五次9→25恢复同药不计回复80或新药。')
update('silent-strangle-following-card-hp-loss',['silent-0261'],lesson='紧勒先攻击再建立当轮逐牌失血，技能也触发。机制：普通实见8攻/2失血；升级10攻/3失血只核A10本局，力量另修初攻，自身不额外触发，次轮撤；限无挡目标、未见叠层不外推。搭配：后续零费/弃牌技能按实际完成触发，毒另计。决定胜负的战斗：5支持/0反例，升级子集1局、提前施放胜因未控（n=5）。典型案例：LY83ZMTFVKJH普通后两牌各多2；HEMND3SMQYB8 A10沙漏T3紧勒+502→492，咕嘟/触媒各再扣3，三牌实净清79含毒63；升级数值不充当五局验证。')
update('silent-dark-shackles-temporary-strength',['silent-0241'],case='UACFSW4VDDLD普通0→−9、33→24、次轮恢复；HEMND3SMQYB8 A10女王末试T2镣铐令聚合体22→13攻击，9挡实损4；次轮恢复、女王强化后聚合体增1力，T4弱下19攻仍杀1血，不把临时−9当常驻停止成长。')
update('silent-aeonglass-artifact-growth-sl',['silent-0079','silent-0228'],case='H1T1F8ML9FUE A10六试0赢、末34血对30+6实死；HEMND3SMQYB8 A10首试70→25六轮胜，T3触媒三结63、T4爆发即发90加轮末81推进，仍有攻击/凋萎45净损；无回复直接接女王六败，不能凭首胜确定保药或另一首战线可通关。')
gamble_history=json.load(open(O/'gamble-history.json'))
gamble_runs=list(dict.fromkeys(a['run'] for a in gamble_history))
ident='silent-calculated-gamble-upgraded-hand-reset'
assert not any(e['id']==ident for e in E['entries'])
e=dict(id=ident,scope='card:CALCULATED_GAMBLE',name='计算下注',asc=[0,20],lesson='计算下注+保留、全弃后等量重抽并消耗，旧手牌后缀不再可用。机制：自身先离手，余牌全弃、抽数按余手牌计；未知抽牌不当确定后缀，限已见升级版。搭配：实际新手牌重核能量与挡伤，保留只允许延后施放，不保留弃牌后旧牌。决定胜负的战斗：6支持/0反例、32次全弃/消耗，保留跨轮只核本局，无改序整战胜果（n=6）。典型案例：R0HEV5E3QT6G A0 F25T3实3换3；HEMND3SMQYB8 A10 F48T2保留到T3实6换6、F49末T1实7换7，原计划扫腿/紧勒等不在新手，不能预支其挡伤。',evidence=gamble_runs,n_support=len(gamble_runs),n_contradict=0,confidence='high',last_seen=day,status='active')
E['entries'].append(e);C.append(dict(id=ident,kind='added',before=None,after=e,new_runs=e['evidence']));M[ident]=['silent-0318']
seq=int(B['version'].split('.')[-1])+1 if B['version'].startswith(day+'.') else 1
E['version']=day+'.'+str(seq)
E['_about']=f'静默经验只来自本角色实盘和复盘。第114次增量合并HEMND3SMQYB8 A10；截至{A["cutoff"]}共{len(A["runs"])}完局。旧148局按同口径复算；核双boss实际血药接续、毒/敏捷/免费与被动挡、升级全弃抽牌和饱和推演血价。无替代线整战胜果，不拟固定药价或SL规则；同步独立strategy-proposal，不改打法源码或其他角色。'
P.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(dict(entries=C),ensure_ascii=False,indent=2)+'\n');(O/'ledger-map.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n')
active=[e for e in E['entries'] if e['status']=='active']
summary=dict(old_version=B['version'],version=E['version'],added=1,updated=len(C)-1,retired=0,active_before=sum(e['status']=='active' for e in B['entries']),active=len(active),chars_before=sum(len(e['lesson']) for e in B['entries'] if e['status']=='active'),chars=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),asc={str(a):dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in active),chars=sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]},compressed=['silent-queen-poison-window-sl-observation'])
assert summary['chars']<=60000
(O/'update-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False))
