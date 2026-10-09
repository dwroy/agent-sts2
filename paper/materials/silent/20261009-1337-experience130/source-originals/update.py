import collections,copy,json,subprocess
from pathlib import Path
O=Path(__file__).parent;N='RMNXHZKV716Y';P=O.parents[2]/'knowledge/characters/silent/experience.json'
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip();(O/'update-time.txt').write_text(stamp+'\n')
A=json.load(open(O/'audit.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
E=json.load(open(O/'experience-before.json'));C=[];M={}
def revise(ident,ledger,text):
    e=next(e for e in E['entries'] if e['id']==ident);old=copy.deepcopy(e);assert N not in e['evidence']
    e['evidence'].append(N);e['n_support']=len(set(e['evidence']));e['n_contradict']=len(set(e.get('contradicting',[])))
    e['confidence']='high' if (e['n_support']>=5 and e['n_contradict']<=e['n_support']/3) or (e['n_support']>=4 and e['n_contradict']==0 and ident=='silent-orichalcum-zero-block') else 'med' if e['n_support']>=2 else 'low'
    e['last_seen']='2026-10-09';e['lesson']=text.replace('【n】',str(e['n_support']))
    C.append(dict(id=ident,before=old,after=e));M[ident]=ledger
def replay(enemy,ident,asc=None):
    ids=next(e['evidence'] for e in E['entries'] if e['id']==ident)+[N]
    fs={(f['run'],f['floor']) for f in A['fights'] if f['run'] in ids and enemy in f['enemies'] and (asc is None or f['asc']==asc)}
    groups=collections.defaultdict(list)
    for x in A['attempts']:
        if (x['run'],x['floor']) in fs:groups[(x['run'],x['floor'])].append(x)
    multi=[v for v in groups.values() if max(x['attempt'] for x in v)>1]
    return len(multi),sum(len(v) for v in multi),sum(x['result']=='won' for v in multi for x in v)
nr=sum(r['ascension']==10 for r in R.values());low=next(x for x in A['bands'] if (x['asc'],x['act'],x['type'],x['band'])==(10,3,'Boss','<25%'))
rest=next(x for x in json.load(open(O/'rest-summary.json')) if x['asc']==10)
revise('silent-route-hp-observation',['silent-0019'],f'观察：赢战耗血药，问号另算，未来恢复不预支。A10 {nr}局三幕Boss入口<25%共{low["n"]}房/{low["runs"]}局、{low["deaths"]}死（{low["deaths"]/low["n"]:.2%}），活损中位{low["median_win"]}；分阶全表见报告（n=【n】）。典型案例：{N}三幕避精英仍Monster耗44、问号雕刻师赢耗52；末火回满100，沙漏再耗87，13血接女王六败。XZUJR08FW801问号两胜46→23→5；未走路线无实打，不立安全血线。')
revise('silent-rest-buffer-observation',['silent-0020'],f'观察：回血增即时缓冲，锻造不回血，到火遗物与休息分账。A10 {nr}局{rest["rests"]}独立火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{rest["deaths"]/rest["nexts"]:.2%}），活损中位{rest["median"]}（n=【n】）。典型案例：{N}九火六回血三锻造，羽毛到火另回，F47先50→68再休息到100/100；首boss胜13、后战败，无另一休息线实打。')
revise('silent-deck-burst-observation',['silent-0021','silent-0125'],'观察：拥有/计划能力、护栏题面和最终执行分核。机制：未施放或换战重置的能力不预支，抽弃重问/SL可截断候选；毒按实结。搭配：持续输出与当前挡/费用合核。决定胜负的战斗：【n】支持/0反例，整战单因未控（n=【n】）。典型案例：RMNXHZKV716Y四护栏题面省16/12/16/8不等实得52血，三条后续重问/重放；女王首试T2实省至2损但撤两能力，末试T4步法3→5敏却无挡牌，仍死。没有触媒，不把计划want当已获。')
revise('silent-strength-weak-observation',['silent-0012'],'力量逐击加伤、敏捷逐张加牌挡，倍率和临时层按现场核。机制：基础加属性后核弱/易伤，毒/被动挡另源；增益不倒补旧挡、不跨战继承。搭配：多击/多挡须实打，敌力成长另核。决定胜负的战斗：【n】支持/0反例，单公式整战因果未控（n=【n】）。典型案例：LYBHQ1X230ZB四段1力多4伤；RMNXHZKV716Y女王末T2科学建2力2敏仍0挡，T3扫腿弱使36→27、两挡实25+6；T4虚弱下两打击各6，步法新2敏未兑现当前挡。')
revise('silent-footwork-block',['silent-0005'],'步法普通/升级建2/3敏捷，后续挡牌加敏，已有挡不追补。机制：基础加现场敏后核倍率，被动挡另源，换战重建。搭配：重复挡收益须有牌/能量及存活窗口。决定胜负的战斗：【n】支持/0反例，单卡整战胜因未控（n=【n】）。典型案例：RZ6YAC7K89NM两防御7/7＋生存者10比基础多6；RMNXHZKV716Y沙漏末建5敏不带入女王，后者末T4步法3→5敏、已有0挡不变且无挡牌可兑现，1血仍死。')
revise('silent-noxious-fumes-growth',['silent-0011'],'毒雾普通/升级建2/3层，后续玩家轮初补毒，能力不即时施毒。机制：旧毒实结减1再加实建量，制品/阶段另核。搭配：直接施毒另账，须活到补毒和实结窗口。决定胜负的战斗：【n】支持/0反例，早建整战单因未控（n=【n】）。典型案例：XZUJR08FW801墨影轮初3/5/7直到19毒；RMNXHZKV716Y女王末T2建普通2层，聚合体/女王结后12/8、次轮13/9、再轮14/10；末毒各减1却两敌仍133/349，不当已经斩杀。')
revise('silent-frail-card-block',['silent-0069','silent-0012'],'脆弱逐张折减牌挡，被动挡另核。机制：基础加现场敏/牌增量再核倍率，已见×0.75并取整；首卡增益仅实际消费一次，未知组合不外推。搭配：逐牌挡与遗物末挡分账，初始全手预览不能相加。决定胜负的战斗：【n】支持/0反例，单项整战胜因未控（n=【n】）。典型案例：RMNXHZKV716Y女王末T3扫腿+现25、后空翻预览12，先扫腿消费佩尔后后空翻回6，实际25+6=31而非37；弱后三击27零损，次轮无牌挡仍死。')
revise('silent-orichalcum-zero-block',['silent-0047'],'奥利哈钢已见结束回合零挡补6，已有挡不另加6。机制：回合末触发与牌挡/敏捷分账，潜在6不保证免死。搭配：当前真挡、攻击与特殊状态伤合核。决定胜负的战斗：【n】支持/0反例，遗物单项整战胜因未控（n=【n】）。典型案例：R3AJCGQGGMR4巨斧已有10挡对16实损6；RMNXHZKV716Y女王末T2零挡对16实11→1，末T4对19、潜在6仍需13损而死；沙漏末持牌15伤被6抵后22→13，毒胜不等无损。')
revise('silent-wither-end-turn-loss',['silent-0024','silent-0059'],'凋萎持牌伤与攻击/挡合核，毒斩杀仍可留失血。机制：按现场3/6/9/12/15文本及末持牌数，弃去的不计；挡可吸收，缺帧全序不补。搭配：弃牌/实挡改变血价，未来毒不代付。决定胜负的战斗：【n】支持/0反例，保血替线整战未控（n=【n】）。典型案例：JBX9JLH46KVN沙漏末毒胜仍损9；RMNXHZKV716Y末T13敌32血62毒足够收尾，持牌15伤在胜前由6末挡抵后22→13；两判死窗口仅意图预算，不当实损。')
ae=replay('AEONGLASS','silent-aeonglass-artifact-growth-sl');ae10=replay('AEONGLASS','silent-aeonglass-artifact-growth-sl',10)
revise('silent-aeonglass-artifact-growth-sl',['silent-0025','silent-0024'],f'观察：沙漏制品、敌成长、凋萎与首boss交接资源合核。机制：制品逐次阻减益后才实建毒，玩家成长不取消敌力，持牌伤按现场。搭配：毒/挡/血价分账，有限全败模拟不独立定必死。决定胜负的战斗：【n】支持/0反例，全阶重打{ae[0]}场{ae[1]}试{ae[2]}赢，A10为{ae10[0]}场{ae10[1]}试{ae10[2]}赢（n=【n】）。典型案例：RMNXHZKV716Y三试同100血两药、前33抽同，第3试T13胜13空药；末T10敌15力弱后30攻、幽灵变1并零损，T13敌22力弱后36攻，凋萎15。牌序/药时点多处变，不作一项胜因。')
qu=replay('QUEEN','silent-queen-poison-main-target')
revise('silent-queen-poison-main-target',['silent-0069'],f'观察：女王两种击杀序均有赢例，不定固定顺序或提前能力必胜。机制：血按进阶{{@2:HP:QUEEN}}/{{@4:HP:QUEEN}}/{{@10:HP:QUEEN}}读，本体死可终战；三减益/魂缚与现场成长另核，爪退不关闭成长。搭配：实毒、防御和续战资源合核。决定胜负的战斗：【n】支持/0反例，真正重打{qu[0]}场{qu[1]}试{qu[2]}赢，替序胜因未控（n=【n】）。典型案例：ZZMYZ5UBCG72本体先死爪余87；RMNXHZKV716Y末T3起99虚弱/脆弱/易伤，缚魂3；T4仍98，女王/爪余349/133，未实击杀，不能把chosen_order当完成顺序。')
qw=replay('QUEEN','silent-queen-poison-window-sl-observation')
revise('silent-queen-poison-window-sl-observation',['silent-0069'],f'观察：女王重打核真实启动和血价，同抽前缀不等全程固定或一项胜因。机制：实建毒与存活轮限制结算，回放后未执行后缀不预支。搭配：牌挡/药/末挡及SL恢复分账。决定胜负的战斗：{qw[0]}场{qw[1]}试{qw[2]}赢，有限全败不证明所有打法必死（n=【n】）。典型案例：PBUBM0LRTEDD第三试T9胜26空药；RMNXHZKV716Y六试同13血石头、前20抽同，五试T3/4/4/2/4判死，末T4实死，前几轮牌序/能力/护栏/SL同时变；零赢，无实盘两目标击杀序对照。')
revise('silent-mad-science-custom-strangle',['silent-0136'],'疯狂科学同ID按现场定制模板核算。机制：【n】支持局四模板：减能力费、8挡抽3、攻击12紧勒6、专长2力2敏分别验，动态字段不能跨模板套用。搭配：力敏由后续攻击段/挡牌兑现，旧挡不追补。决定胜负的战斗：【n】支持/0反例，单牌整战因果未控（n=【n】）。典型案例：2PVLGRBGUX9S专长1→3力、0→2敏；RMNXHZKV716Y女王末T2专长0→2力、1→3敏，既有0挡不变；T3实际扫腿25+后空翻6，T4仍死，不假定科学当轮给8挡或抽3。')
revise('silent-paels-legion-card-block-double',['silent-0180'],'佩尔的士兵待触发时仅翻倍第一张实际牌挡，后续休眠。机制：牌基础加敏后按现场倍率核，首牌后其他预览回常态；已见休眠2回合，未知组合不外推。搭配：逐牌消费，与被动/轮初挡分源。决定胜负的战斗：【n】支持/0反例，单项整战因果未控（n=【n】）。典型案例：NEWRFAYKTQHR双防御实14+7；RMNXHZKV716Y女王末T3同有脆弱，扫腿25和后空翻初12，先打扫腿后后空翻实6，合31盖27攻击零损；预览37不能当实际挡。')
revise('silent-bronze-scales-per-hit-thorns',['silent-0129'],'铜质鳞片开战建3荆棘，敌每次实际攻击分别反伤，全挡亦触发。机制：单击3/三击9，敌限制/剩血另核，不并作毒或牌伤。搭配：挡保护玩家不取消反伤，未攻不预支。决定胜负的战斗：【n】支持/0反例，遗物整战胜因未控（n=【n】）。典型案例：R0HEV5E3QT6G三击全挡仍反9；RMNXHZKV716Y女王末T3聚合体全挡三击反9、毒13，女王毒9，两敌净清31；T4聚合体少17含14毒和3反伤，不能归17毒。')
revise('silent-eternal-feather-rest-arrival-heal',['silent-0142'],'永恒羽毛实际到营火才回血，与之后休息/锻造分账。机制：已见17–44张范围实回符合min(HP缺口,3×⌊牌组/5⌋)，未知范围不外推。搭配：已到火增加血池，未来火不预支，不据此加牌。决定胜负的战斗：【n】支持/0反例，构筑与回复混杂（n=【n】）。典型案例：E6DYYXRX7GVE七次实回121仍精英败；RMNXHZKV716Y九火到达回血与HEAL分开，F47先50→68、再休息到100/100；F24/28/40锻造不另回，后沙漏耗87、女王败。')
revise('silent-stone-humidifier-rest-growth',['silent-0204'],'石炉加湿器已见HEAL增5最大血并补当前血，锻造不触发，满旧上限也可增血。机制：基础回复和增量5合算按新上限截断，只有实际HEAL兑现。搭配：当前血/回复/上限增长与到火羽毛分账，不预支未来休息。决定胜负的战斗：【n】支持/0反例，遗物整战因果未控（n=【n】）。典型案例：UMVLWER4CD98十HEAL上限70→120；RMNXHZKV716Y九火六HEAL把70→100，三锻造不增，F47羽毛50→68/95后HEAL到100/100，首boss仍胜出13。')
revise('silent-double-boss-resource-handoff',['silent-0228'],'观察：A10首boss胜后直接接续实血药，能力换战重建。机制：支持局F48出口HP与F49入房同值；开场遗物产物另核，连战非跨幕。搭配：回复/复活/SL恢复分账，不由后战全败拟固定权重/药价。决定胜负的战斗：【n】支持/0反例，无保药/改线整战胜利对照（n=【n】）。典型案例：RMNXHZKV716Y末火100满血，沙漏三试一赢13空药；女王六试同13、新生石头0赢，科学/毒雾重建；p2884明确无恢复，是交接支持而非大脑忘第二战。')
revise('silent-ghost-in-a-jar-current-turn',['silent-0301'],'罐装幽灵只覆盖实建无实体当轮，不保证下一轮。机制：已饮建1无实体、已见攻击26/20/30降1，次轮撤；其他伤源和挡分核，未知叠层不外推。搭配：当轮实攻/既有挡/状态伤合核，不设固定喝留门槛。决定胜负的战斗：【n】支持/0反例，改喝药时点整战未控（n=【n】）。典型案例：456MRNGCPD8E饮后20→1，下一轮仍死；RMNXHZKV716Y沙漏末T10敌15力弱后30、饮幽灵变1且38→38，T11无实体撤、二连40；整战最终13胜，无不饮/早饮反事实毛损。')
revise('silent-petrified-toad-opening-rock',['silent-0327'],'石化蟾蜍已见新战空槽生成药水形状的石头，按战分账。机制：POTION_SHAPED_ROCK已见无挡/减伤时扣15，玩家HP不变；满槽/旧石未用未知。搭配：单体实伤不当奖励/买药/SL恢复，不推固定喝留价。决定胜负的战斗：【n】支持/0反例，遗物整战单因未控（n=【n】）。典型案例：456MRNGCPD8E四战各新石投15仍最后败；RMNXHZKV716Y首boss胜后空槽，女王新战槽0生石，末T1女王400→385、玩家13不变；后五次是恢复旧石，不算另获五石。')
revise('silent-act-transition-missing-hp-heal',['silent-0243'],'已见A9/A10跨幕按缺失HP的80%向下取整回血。机制：同上限⌊(maxHP−当前HP)×0.8⌋，低阶/其他先古未核，连续boss不当跨幕。搭配：到火、HEAL、事件与SL恢复分源，不预支。决定胜负的战斗：【n】支持/0反例，回复不保证后战（n=【n】）。典型案例：JBX9JLH46KVN两跨幕回34/56；RMNXHZKV716Y F17出16/85到F18实71回55，F33出31/90到F34实78回47；沙漏→女王同13/100不回，石头是新战产物。')
ids=next(e['evidence'] for e in E['entries'] if e['id']=='silent-poison-potion-observed-application')+[N];pots=[x for x in A['potions'] if x['run'] in ids and (x.get('potion') or {}).get('id')=='POISON_POTION']
revise('silent-poison-potion-observed-application',['silent-0278'],f'毒药先施毒，饮用当步不扣本体HP。机制：支持局{len(pots)}次成功飲用，常态加6、头骨加7、制品可阻毒，按实帧核；SL复用非新获。搭配：实结与存活窗口分核，不定早喝/留药门槛。决定胜负的战斗：【n】支持/0反例，单药整战未控（n=【n】）。典型案例：JBX9JLH46KVN剥制品后7→13毒而敌512血不变；RMNXHZKV716Y毒瓶F9得留到沙漏三试T1/3/1各成功饮，同瓶两次恢复不算新获；胜13空药后女王败，无保药整战胜果。')
E['version']='2026-10-09.19';E['_about']='静默经验只从本角色实盘/复盘学习。第130次增量核RMNXHZKV716Y，截止2026-10-09T04:32:36.657Z；机制与血量/SL/连战统计分母分开，支持数非逐公式单因实验。'
P.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n');(O/'changes.json').write_text(json.dumps(C,ensure_ascii=False,indent=2)+'\n');(O/'ledger-map.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n')
active=[e for e in E['entries'] if e['status']=='active'];oldactive=[e for e in json.load(open(O/'experience-before.json'))['entries'] if e['status']=='active']
U=dict(updated=len(C),added=0,retired=0,active_before=len(oldactive),active=len(active),chars_before=sum(len(e['lesson']) for e in oldactive),chars=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),applicable={str(a):dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in active),chars=sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]})
assert U['chars']<=60000
(O/'update-summary.json').write_text(json.dumps(U,ensure_ascii=False,indent=2)+'\n');print(U)
