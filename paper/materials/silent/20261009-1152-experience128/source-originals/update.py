import collections,copy,json,hashlib
from pathlib import Path
O=Path(__file__).parent;N='XZUJR08FW801';P=O.parents[2]/'knowledge/characters/silent/experience.json'
A=json.load(open(O/'audit.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
E=json.load(open(O/'experience-before.json'));before=copy.deepcopy(E);changes=[];mapping={}
def revise(ident,ledger,text):
 e=next(e for e in E['entries'] if e['id']==ident)
 assert N not in e['evidence']
 old=copy.deepcopy(e);e['evidence'].append(N);e['n_support']=len(e['evidence']);e['n_contradict']=len(e.get('contradicting',[]))
 e['confidence']='high' if e['n_support']>=5 and e['n_contradict']<=e['n_support']/3 else 'med' if e['n_support']>=2 else 'low'
 e['last_seen']='2026-10-09';e['lesson']=text.replace('【n】',str(e['n_support']))
 changes.append({'id':ident,'before':old,'after':e});mapping[ident]=ledger
nr=sum(r['ascension']==10 for r in R.values());low=next(x for x in A['bands'] if (x['asc'],x['act'],x['type'],x['band'])==(10,2,'Monster','<25%'))
rest=next(x for x in json.load(open(O/'rest-summary.json')) if x['asc']==10)
revise('silent-route-hp-observation',['silent-0019'],f'观察：赢战耗血药，问号另算，未来恢复不预支。A10 {nr}局二幕Monster入口<25%共{low["n"]}房/{low["runs"]}局、{low["deaths"]}死（{low["deaths"]/low["n"]:.2%}），活损中位{low["median_win"]}；分阶全表见报告（n=【n】）。典型案例：{N} 无精英线F25/F27问号赢战46→23→5，F29四试败；原投影三房入口均56，实46/23/5，事件另付11血。未走路线与休息替锻造无实打，不立安全血线。')
revise('silent-rest-buffer-observation',['silent-0020'],f'观察：回血增即时缓冲，锻造不回血，到火遗物与休息分账。A10 {nr}局{rest["rests"]}独立火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{rest["deaths"]/rest["nexts"]:.2%}），活损中位{rest["median"]}（n=【n】）。典型案例：{N} F13/F16各回21、转幕另49；F24以46/70锻造暗影+，理由留末火回血，F25/F27赢出23/5而未到末火。E6DYYXRX7GVE满血精英仍败；无另一休息线整战对照，不称锻造必错。')
revise('silent-deck-burst-observation',['silent-0021'],'观察：计划能力、候选后缀和实际生存分核。机制：未施放/失去的能力不预支，生成节点伤不等整轮伤，毒以实结计。搭配：持续输出与真实牌挡/费用合核。决定胜负的战斗：【n】支持/0反例，整战单因未控（n=【n】）。典型案例：XZUJR08FW801 F19草蜢带升级毒雾离场、另补普通；F29计划步法未得，无玩家力敏，隐秘匕首+弃牌后重问，原暗影/防御/饮药后缀未执行；末建毒雾2无下一轮，5血两防御10＋覆甲3对20死，不称原64%线实打后败。')
revise('silent-strength-weak-observation',['silent-0012'],'力量逐击加伤、敏捷逐张加牌挡，倍率和临时层按现场核。机制：基础加属性后核弱/易伤，毒/被动挡另源；负力不关后续成长，属性不跨战继承。搭配：多击/多挡须实际施放兑现。决定胜负的战斗：【n】支持/0反例，单公式整战因果未控（n=【n】）。典型案例：LYBHQ1X230ZB四段1力多4伤；XZUJR08FW801 F23曾1力，末段无玩家力敏，F25甲虫力2→4，同招20、弱后16；镣铐暂使2→−7，弱后15→8，次轮恢复并增至4，当前减伤不当永久止成长。')
revise('silent-noxious-fumes-growth',['silent-0011'],'毒雾普通/升级建2/3层，后续玩家轮初补毒，能力不即时施毒。机制：旧毒实结减1再加实建量，制品/阶段另核。搭配：直接施毒另账，须活到补毒和实结窗口。决定胜负的战斗：【n】支持/0反例，早建整战单因未控（n=【n】）。典型案例：XZUJR08FW801墨影T1建3，T2—T10轮初毒3/5/7/9/11/13/15/17/19，前三轮滑溜另限实伤，T10敌18毒19结束；F29末T2建2但立即死亡，只结已有6毒，新增后轮毒兑现0。')
revise('silent-gorget-plating',['silent-0016'],'护喉甲开场覆甲不等整战固定挡。机制：已见开场4，按当前剩层预算结束挡；完整减层条件未隔离。搭配：覆甲、牌挡与翻挡分源，不沿用开场层。决定胜负的战斗：【n】支持/0反例，整战单项因果未控（n=【n】）。典型案例：NTMAU4XZ2NN2寄生虫T1—T4为4/3/2/1；XZUJR08FW801 F25 T2—T4为3/2/1、T5零；F29末T2两防御10＋当前覆甲3对20需损7，5血实死截断损5，存活至少差3；独立结束挡帧缺失，不冒报实收7。')
revise('silent-shadowmeld-new-block-double',['silent-0077'],'融入暗影只翻本轮建立后新增挡，旧挡不追补。机制：建1层后基础加敏再核翻倍/脆弱，技能本身不加挡、轮末撤；其他挡源另核。搭配：实际支付并打挡牌，候选未打不计。决定胜负的战斗：【n】支持/0反例，整战单卡因果未控（n=【n】）。典型案例：K2JAGKVJAWZJ旧7挡不变；XZUJR08FW801 F25T4暗影+建1，后空翻/防御各基础5实10共20，F27T3防御亦10；F29候选暗影后缀因弃牌重问未打，末T2两防御仍各5，不预支翻倍挡。')
revise('silent-slumbering-beetle-wake-growth',['silent-0128'],'熟睡甲虫醒后持续增力，同伴退场不保证停攻。机制：睡层下降、醒后覆甲消失，滚动按进阶基础{@7:DMG:SLUMBERING_BEETLE:ROLL_OUT_MOVE}/{@10:DMG:SLUMBERING_BEETLE:ROLL_OUT_MOVE}加现场力核弱。搭配：各敌剩血/毒杀与实际挡分核，不定固定杀序。决定胜负的战斗：【n】支持/0反例，整战单因未控（n=【n】）。典型案例：XZUJR08FW801 F25睡3→2→1，T3串刺扣43并眩晕，T4醒后18攻，T5力2/20攻、T6力4且弱为16；镣铐只当轮省血，战胜仍46→23。')
revise('silent-bowlbug-rock-full-block-stun',['silent-0196'],'盛碗虫（石）失衡时，自身攻击全挡后下轮眩晕，即使其他敌仍使玩家失血。机制：仅核失衡1、实际结束且石虫存活的完整挡窗口；零攻/毒杀不外推。搭配：现场弱/减力与挡核覆盖，其他敌另计。决定胜负的战斗：【n】支持/0反例，局部机制不等整战必胜（n=【n】）。典型案例：LRN0HPZ0FZS1挡13盖石11、另敌仍损5；XZUJR08FW801 F25T2挡石后仍受丝虫1伤、T3石眩晕；T4完整挡石仍受甲虫伤、T5石再眩晕，整战46→23。')
shackles=[x for x in A['cards'] if x['card']=='DARK_SHACKLES'];se=next(e['evidence'] for e in E['entries'] if e['id']=='silent-dark-shackles-temporary-strength')+[N]
shackles=[x for x in shackles if x['run'] in se]
revise('silent-dark-shackles-temporary-strength',['silent-0241'],f'黑暗镣铐临时减目标力量，次轮恢复、持续成长另算。机制：普通/升级实减9/15，逐击核弱与当轮伤；技能激怒另加力。搭配：实际牌挡合验，不补后轮永久生存。决定胜负的战斗：【n】支持/0反例、{len(shackles)}次完成施放，单卡整战因果未控（n=【n】）。典型案例：XZUJR08FW801墨影T9力4→−5、12攻→3，5挡零损，T10恢复4/22攻但毒收18血；F25甲虫T5力2→−7、弱后15→8，5挡实损3，T6恢复并成长4。')
revise('silent-act-transition-missing-hp-heal',['silent-0243'],'已见A9/A10跨幕按缺失HP的80%向下取整回血。机制：同上限⌊(maxHP−当前HP)×0.8⌋，低阶/其他先古未核，连续boss不当跨幕。搭配：营火/事件/药与SL恢复分源，未来血不预支。决定胜负的战斗：【n】支持/0反例，回复不保证后战（n=【n】）。典型案例：SV2GP9NX4HQD A10 28/81→70回42；XZUJR08FW801 F17赢出8/70、F18至57实回49=⌊62×0.8⌋，两火另42、事件付11、赢房耗131；F29三次SL均恢复5血同两药，不算自然回复。')
revise('silent-obscura-summon-growth',['silent-0039'],'胧光怪活体召唤新增攻击者，主怪中毒不等幻象停攻。机制：按实体召唤/复活/退场和当前力核，初始血不作后段总需伤；航行成长只限已见局。搭配：两敌来袭、实结毒与血挡合核，不定固定目标序。决定胜负的战斗：【n】支持/0反例，另一目标序未实控（n=【n】）。典型案例：XZUJR08FW801 A10 F29四次同5血双药0赢，T1生21血幻象；末T2中和令幻象17→12攻、原怪8，总20对10挡＋3覆甲死；结6毒后原怪67/幻象15，不把新增血池或尚存5毒当已伤。')
revise('silent-vantom-slippery-growth',['silent-0224','silent-0227'],'墨影有滑溜时，已观察攻击和毒单次扣血限1并消费滑溜，施毒层不等实伤。机制：按实际命中/毒结算减层，毒结后减1；准备后力量继续成长，更高触媒叠层未验。搭配：多段耗层、真实毒伤与牌挡合验，临时减力不关闭成长。决定胜负的战斗：【n】支持/0反例，滑溜与成长主题不等逐公式独立样本（n=【n】）。典型案例：M0GY0A4M2F7H反弹四击各1、滑溜9→5；XZUJR08FW801墨影183血/9滑溜至T3耗完，前三轮净清3/3/8，T5/T9力2/4；T9镣铐零损，T10敌18毒19结束，52→8胜。')
revise('silent-mr-struggles-turn-start-damage',['silent-0162'],'抱抱先生轮初自动伤与牌、毒、荆棘分账。机制：现场文本按当前回合数群伤、按余血截断，死亡后窗口不预支；同窗缺帧不强拆。搭配：当前活敌与触发窗口合核。决定胜负的战斗：【n】支持/0反例，移除遗物整战未知（n=【n】）。典型案例：Z91JN3S3PQX2沙虫T10—13实扣10/11/12/13；XZUJR08FW801 F29四次T1结束生成21血幻象，T2轮初两敌各再扣2、幻象19；末T2中和再4至15，毒只给原怪结6，不把轮初群伤当牌伤或预支T3伤。')
revise('silent-deadly-poison-application',['silent-0007'],'致命毒药普通/升级施5/7毒，不即时扣血。机制：当前毒实结再减1，制品/头骨/触媒/阶段另核，过量毒按剩血截断。搭配：毒雾与当前存活合核，候选牌未打不计。决定胜负的战斗：【n】支持/0反例，单卡整战胜因未控（n=【n】）。典型案例：XZUJR08FW801 F29第2/4试T1普通施5、末T2实结已有6使原怪73→67、剩5不重复扣；第3试SL实际省去毒牌，不能沿用上一试7毒；末两敌仍活、玩家死，无早施毒整战胜果。')
def add(ident,scope,name,asc,text,ledger):
 assert not any(e['id']==ident for e in E['entries'])
 e={'id':ident,'scope':scope,'name':name,'asc':asc,'lesson':text,'evidence':[N],'n_support':1,'n_contradict':0,'confidence':'low','last_seen':'2026-10-09','status':'active'}
 E['entries'].append(e);changes.append({'id':ident,'before':None,'after':e});mapping[ident]=ledger
add('silent-foul-potion-slot-replacement-observation','potion:FOUL_POTION','污浊药水',[10,20],'观察：低血满槽换药须分账失去的资源与实际兑现，不以新增瓶数当续命量。机制：本局污浊描述含玩家/敌人同伤、数值占位；未实饮，12自伤模型参数不当实测。搭配：真实挡/目标/原药机会须核，无整场对照不定禁用或早喝。决定胜负的战斗：1支持/0反例（n=1）。典型案例：XZUJR08FW801 F28以5/70丢毒药/无色换两污浊，文本三瓶实入两槽；F29四试0赢，两瓶均未喝原封留栏，不能宣称留旧药或早喝必胜。',['silent-0335'])
add('silent-weak-potion-hatching-window-observation','potion:WEAK_POTION','虚弱药水',[0,20],'观察：本次给卵施虚弱未保留到幼虫攻击窗口，不预支后段减伤。机制：连续同槽同ID同血过渡帧中孵化与虚弱消失；缺永久实体GUID，不推广其他转换/减益。搭配：核实际攻击者和有效层数，不规定固定药水目标。决定胜负的战斗：1支持/0反例，母体目标未有受控实打（n=1）。典型案例：XZUJR08FW801 A10 F27T2结实卵17/19血、孵化1施虚弱3；同轮幼虫过渡帧17/19已无两层，T3三幼虫20/23、无弱各5攻，战胜仍23→5。',['silent-0336'])
E['version']='2026-10-09.17';E['_about']=f'静默经验只从本角色实盘/复盘学习。第128次增量并{N}一局A10，截至{A["cutoff"]}共{len(R)}完局；旧164局同口径全量复算。补中途赢战血药链、毒雾/减力/暗影/覆甲/敌成长及孵化虚弱窗口，换药数量不当实际收益；相关源码交独立strategy-proposal，不拟无受控证据的喝药/SL/路线阈值。'
for e in E['entries']:
 assert e['n_support']==len(set(e['evidence']))
 assert all(r in R and R[r]['character'].lower()=='silent' for r in e['evidence']+e.get('contradicting',[]))
active=[e for e in E['entries'] if e['status']=='active'];assert sum(len(e['lesson']) for e in active)<=60000
P.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2)+'\n');(O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
summary={'added':2,'updated':len(changes)-2,'retired':0,'active_before':194,'chars_before':51982,'active':len(active),'chars':sum(len(e['lesson']) for e in active),'confidence':dict(collections.Counter(e['confidence'] for e in active)),'applicable':{a:{'entries':len(es:=[e for e in active if e['asc'][0]<=a<=e['asc'][1]]),'chars':sum(len(e['lesson']) for e in es)} for a in [8,9,10]}}
(O/'update-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(summary)
