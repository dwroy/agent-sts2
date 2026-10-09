import collections,copy,json
from pathlib import Path
O=Path(__file__).parent;N='JBX9JLH46KVN';P=O.parents[2]/'knowledge/characters/silent/experience.json'
A=json.load(open(O/'audit.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
E=json.load(open(O/'experience-before.json'));before=copy.deepcopy(E);changes=[];mapping={}
def revise(ident,ledger,text):
 e=next(e for e in E['entries'] if e['id']==ident);old=copy.deepcopy(e)
 assert N not in e['evidence']
 e['evidence'].append(N);e['n_support']=len(set(e['evidence']));e['n_contradict']=len(set(e.get('contradicting',[])))
 e['confidence']='high' if e['n_support']>=5 and e['n_contradict']<=e['n_support']/3 else 'med' if e['n_support']>=2 else 'low'
 e['last_seen']='2026-10-09';e['lesson']=text.replace('【n】',str(e['n_support']))
 changes.append({'id':ident,'before':old,'after':e});mapping[ident]=ledger
nr=sum(r['ascension']==10 for r in R.values());low=next(x for x in A['bands'] if (x['asc'],x['act'],x['type'],x['band'])==(10,3,'Boss','<25%'))
rest=next(x for x in json.load(open(O/'rest-summary.json')) if x['asc']==10)
revise('silent-route-hp-observation',['silent-0019'],f'观察：赢战耗血药，问号另算，未来恢复不预支。A10 {nr}局三幕Boss入口<25%共{low["n"]}房/{low["runs"]}局、{low["deaths"]}死（{low["deaths"]/low["n"]:.2%}），活损中位{low["median_win"]}；分阶全表见报告（n=【n】）。典型案例：{N}三幕避精英仍七房耗84，末火回满78，首boss再耗70、8血接第二boss六败。XZUJR08FW801问号赢战46→23→5；未走路线无实打，不立安全血线。')
revise('silent-rest-buffer-observation',['silent-0020'],f'观察：回血增即时缓冲，锻造不回血，到火遗物与休息分账。A10 {nr}局{rest["rests"]}独立火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{rest["deaths"]/rest["nexts"]:.2%}），活损中位{rest["median"]}（n=【n】）。典型案例：{N}六次休息实回166、五锻造不回；F47枕头休息42→78，F48胜8血、F49败，无休息替线整战对照。')
revise('silent-deck-burst-observation',['silent-0021'],'观察：拥有能力、实际建立与后继生存分核。机制：未施放或换战重置的能力不预支，生成/施毒不等已伤，毒按实结。搭配：持续输出与真实挡/费用合核。决定胜负的战斗：【n】支持/0反例，整战单因未控（n=【n】）。典型案例：JBX9JLH46KVN末F48建6敏/触媒2，毒雾+在牌组却该试未打；T8清177仍损28，胜出8血。F49重新建3敏/触媒2但无毒，不能预支前战成长，末17挡对25死。')
revise('silent-strength-weak-observation',['silent-0012'],'力量逐击加伤、敏捷逐张加牌挡，倍率和临时层按现场核。机制：基础加属性后核弱/易伤，毒/被动挡另源；增益不倒补旧挡、不跨战继承。搭配：多击/多挡须实际施放兑现，敌成长另核。决定胜负的战斗：【n】支持/0反例，单公式整战因果未控（n=【n】）。典型案例：LYBHQ1X230ZB四段1力多4伤；JBX9JLH46KVN沙漏6敏使防御/后空翻各11挡，玩家2力未取消敌9力；实验体饮药3→5敏不补旧8挡，后翻滚9使共17，对25仍死。')
revise('silent-footwork-block',['silent-0005'],'步法普通/升级建2/3敏捷，后续每张挡牌加敏，已有挡不追补。机制：基础挡加现场敏后核倍率，被动挡另源，换战重建。搭配：多挡重复收益，须有牌/能量与当前存活窗口。决定胜负的战斗：【n】支持/0反例，单卡整战胜因未控（n=【n】）。典型案例：RZ6YAC7K89NM两防御7/7＋生存者10比基础多6；JBX9JLH46KVN沙漏两步法+建6敏，防御11/翻滚10；实验体重建3敏、饮药后5，旧后空翻8不追补，翻滚9仍不足25攻击。')
revise('silent-accelerant-triggers',['silent-0027'],'触媒增加毒结算次数，不倍增毒层；普通/升级建1/2且不即时施毒。机制：k层至多k+1次，各结减1、零停止；升级p≥3为3p−3，限伤/剩HP/阶段另核。搭配：先实建毒并活到结算，退场截断不当理论毛伤。决定胜负的战斗：【n】支持/0反例，单卡整战胜因未控（n=【n】）。典型案例：JBX9JLH46KVN沙漏末T6/T7各23毒三结66、残20；T9的26+25+24=75预算可收62敌血却仍损9凋萎。实验体T2建2无毒，额外触发无对象。')
revise('silent-outbreak-immediate-poison',['silent-0037'],'毒性爆发加毒后立即结算，逐敌核毒与实扣。机制：普通/升级加9/12，已有毒一并实结减1；触媒、制品/限伤与剩血另核。搭配：实毒/触媒放大即时伤，轮末毒另账、不代付当前HP。决定胜负的战斗：【n】支持/0反例，单牌整战胜因未控（n=【n】）。典型案例：HEMND3SMQYB8沙漏22毒加9后触媒2立即结90、残28；JBX9JLH46KVN末T8原20毒加12到32、立即结32+31+30=93，后轮末29+28+27=84、合177，但玩家45→17；无防守替线整战胜果。')
TS=[x for x in A['attempts'] if x['run'] in next(e['evidence'] for e in E['entries'] if e['id']=='silent-test-subject-phase-reset')+[N] and x['floor']>=17]
def replay(enemy,ids,asc=None):
 fs={(f['run'],f['floor']) for f in A['fights'] if f['run'] in ids and enemy in f['enemies'] and (asc is None or f['asc']==asc)}
 groups=collections.defaultdict(list)
 for x in A['attempts']:
  if (x['run'],x['floor']) in fs:groups[(x['run'],x['floor'])].append(x)
 multi=[v for v in groups.values() if max(x['attempt'] for x in v)>1]
 return len(multi),sum(len(v) for v in multi),sum(x['result']=='won' for v in multi for x in v)
ts=replay('TEST_SUBJECT',next(e['evidence'] for e in E['entries'] if e['id']=='silent-test-subject-phase-reset')+[N])
revise('silent-test-subject-phase-reset',['silent-0028'],f'实验体按现场激怒计技能成本，能力/药水与换阶段分核。机制：首阶段每技能加激怒层数力量，0费亦加；能力/药不加，历史换阶段清敌力/激怒/毒、留玩家能力，本局未跨阶段。搭配：实际挡/弱/毒与血价合核，不一律禁技能。决定胜负的战斗：【n】支持/0反例，真正重打{ts[0]}场{ts[1]}试{ts[2]}赢（n=【n】）。典型案例：JBX9JLH46KVN六试同8血空药、前16抽相同0赢；末T1四技能各加3至12力，含0费炼制；T2后空翻/翻滚再至18，触媒/药不加，8血17挡对25死、首阶段余86，后阶段未知。')
revise('silent-wither-end-turn-loss',['silent-0024','silent-0059'],'凋萎持牌伤与攻击/挡合核，毒斩杀仍可留失血。机制：按现场3/6/9/12文本和末持牌数，弃去的不计；挡能吸收本局持牌伤，缺帧内部全序不补。搭配：弃牌/实挡改变血价，未结毒不代付。决定胜负的战斗：【n】支持/0反例，保血替线整战未控（n=【n】）。典型案例：JBX9JLH46KVN沙漏末T5翻滚10＋防御11对24攻和6凋萎，54→45损9；T6前轮10挡盖6凋萎、无攻击零损；T9工具弃一张后仍9凋萎，毒胜17→8，无攻击不等无损。')
aeids=next(e['evidence'] for e in E['entries'] if e['id']=='silent-aeonglass-artifact-growth-sl')+[N];ae=replay('AEONGLASS',aeids);ae10=replay('AEONGLASS',aeids,10)
revise('silent-aeonglass-artifact-growth-sl',['silent-0025','silent-0024'],f'观察：沙漏制品、敌成长、凋萎与首boss交接资源合核。机制：制品逐次阻减益后才实建毒，玩家成长不取消敌力，末持牌伤仍核。搭配：毒/挡/血价分账，有限模拟全死不独立定必死。决定胜负的战斗：【n】支持/0反例，全阶重打{ae[0]}场{ae[1]}试{ae[2]}赢，A10为{ae10[0]}场{ae10[1]}试{ae10[2]}赢（n=【n】）。典型案例：JBX9JLH46KVN五试同78血毒/火药、前32抽相同，第5试T9胜8空药；刺击/迷雾依次耗3制品再建毒，敌T4力4/T7力9；T8清177仍损28、末凋萎再损9。后序/产药同变，不能把一次换线当胜因。')
revise('silent-mirage-poison-card-block',['silent-0010'],'蜃景按施放时活敌毒总量给牌挡，后来施毒不追补。机制：加现场敏后核脆弱/暗影倍率，施放不耗毒、重放逐次核。搭配：实毒和敏捷形成挡，须活到施放窗口。决定胜负的战斗：【n】支持/0反例，单卡整战未控（n=【n】）。典型案例：NEWRFAYKTQHR先毒11挡、倒序4；JBX9JLH46KVN沙漏末T7现20毒/6敏，蜃景实0→26挡，盖26攻零损，T8仍损28、胜出8血，不以局部全挡当连战必胜。')
revise('silent-act-transition-missing-hp-heal',['silent-0243'],'已见A9/A10跨幕按缺失HP的80%向下取整回血。机制：同上限⌊(maxHP−当前HP)×0.8⌋，低阶/其他先古未核，连续boss不当跨幕。搭配：营火/事件/药与SL恢复分源，未来血不预支。决定胜负的战斗：【n】支持/0反例，回复不保证后战（n=【n】）。典型案例：JBX9JLH46KVN F17出37/80到F18实71回34，F33出9/80到F34实65回56；六火另回166，F48→F49则同8/78空药、不回不继承能力。')
pe=next(e['evidence'] for e in E['entries'] if e['id']=='silent-poison-potion-observed-application')+[N]
pots=[x for x in A['potions'] if x['run'] in pe and (x.get('potion') or {}).get('id')=='POISON_POTION']
revise('silent-poison-potion-observed-application',['silent-0278'],f'毒药先施毒，饮用当步不扣本体HP。机制：支持局内{len(pots)}次完成饮用，常态加6、头骨加7、制品可阻毒耗层，具体组合按实帧；SL复用非新获。搭配：须活到结算，药/牌挡/当前HP分核，不定早喝/留药门槛。决定胜负的战斗：【n】支持/0反例，单药整战未控（n=【n】）。典型案例：JBX9JLH46KVN沙漏末T3剥制品后毒药使7→13毒、敌512血不变；同毒瓶跨五次SL复用，首boss胜出8空药，未有留药后第二boss胜果。')
revise('silent-double-boss-resource-handoff',['silent-0228'],'观察：A10首boss胜后直接接续实血药，能力换战重建。机制：支持局F48出口HP与F49入房相同，后战全败；遗物开场变化与可操作HP另核，连续boss非跨幕。搭配：回复/复活/SL恢复分账，不由全败拟固定终局权重/药价。决定胜负的战斗：【n】支持/0反例，无保药/改线整战胜利对照（n=【n】）。典型案例：JBX9JLH46KVN末火回满78，F48五试一赢出8空药，F49六试同8空药0赢；p2875明确无恢复、重建能力，是交接支持而非大脑忘第二战。')
acids=next(e['evidence'] for e in E['entries'] if e['id']=='silent-alchemize-potion-resource-observation')+[N];ac=[x for x in A['cards'] if x['run'] in acids and x['card']=='ALCHEMIZE']
revise('silent-alchemize-potion-resource-observation',['silent-0294'],f'炼制实打补药，未饮产物不等本轮生存收益。机制：支持局{len(ac)}次完成施放；本局16次中14次空槽添一瓶、2次满槽未增/未换，当步HP不变；0费仍是技能，激怒另加敌力。搭配：真实产物实饮/后续挡兑现，能力增益不倒补旧挡。决定胜负的战斗：【n】支持/0反例，补药单因胜负未控（n=【n】）。典型案例：JBX9JLH46KVN十四次补药，末实验体T1炼制+使敌9→12力、弱后23→25攻，敏捷药留至T2才3→5敏；旧后空翻8不追补，翻滚9后仍死。缺不炼制/早饮整战对照，不定禁用或药价。')
revise('silent-dodge-and-roll-delayed-block',['silent-0331'],'闪躲翻滚当轮挡与已建下轮挡分开算，未活到下轮不能预支。机制：敏捷参与施放时牌挡、已见下轮存BLOCK_NEXT_TURN_POWER数额；其他倍率另核，不把两轮合当前挡。搭配：当轮其他挡覆盖眼前攻，延后份只在后轮兑现。决定胜负的战斗：【n】支持/0反例，单牌整战胜因未控（n=【n】）。典型案例：JBX9JLH46KVN沙漏6敏翻滚实10并建未来10，T6轮初10挡盖6凋萎；实验体末T2药后5敏翻滚9、未来9，已有8合17对25需损8、8血死，不能算26当前挡。')
revise('silent-scroll-paper-cuts-unblocked',['silent-0221'],'咬人卷轴纸伤难愈2按未完全挡住的攻击次数降生命上限。机制：每次漏伤降2上限，全挡一击不降，多段按漏伤击数核；仅验证2层。搭配：逐击挡、当前血和上限分账，不把上限减少再加作HP净损。决定胜负的战斗：【n】支持/0反例，无替打法整战胜果（n=【n】）。典型案例：YLYLZWHA0GKU五漏击70→60；JBX9JLH46KVN F36三卷轴，T1挡22对两攻击共24，一次漏伤使max80→78、HP39→37；随后全退场无再降，同ID永久身份未记录。')
E['version']='2026-10-09.18';E['_about']=f'静默经验只从本角色实盘/复盘学习。第129次增量并{N}一局A10，截至{A["cutoff"]}共{len(R)}完局；旧165局同口径全量复算。补敏捷/触媒/毒爆/凋萎、实验体技能加力与炼制/延后挡时点、连续boss实血药交接；纯搜索bug沿独立提案，不拟无受控证据的药价、路线/SL/终局阈值。'
for e in E['entries']:
 assert e['n_support']==len(set(e['evidence']))
 assert all(r in R and R[r]['character'].lower()=='silent' for r in e['evidence']+e.get('contradicting',[]))
active=[e for e in E['entries'] if e['status']=='active'];assert sum(len(e['lesson']) for e in active)<=60000
P.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2)+'\n');(O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
summary={'added':0,'updated':len(changes),'retired':0,'active_before':sum(e['status']=='active' for e in before['entries']),'active':len(active),'chars_before':sum(len(e['lesson']) for e in before['entries'] if e['status']=='active'),'chars':sum(len(e['lesson']) for e in active),'confidence':dict(collections.Counter(e['confidence'] for e in active)),'applicable':{str(a):{'entries':sum(e['asc'][0]<=a<=e['asc'][1] for e in active),'chars':sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])} for a in [8,9,10]},'alchemize_completed':len(ac),'poison_completed':len(pots),'ts_replays':ts,'aeon_replays':ae,'aeon_a10_replays':ae10}
(O/'update-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(summary)
