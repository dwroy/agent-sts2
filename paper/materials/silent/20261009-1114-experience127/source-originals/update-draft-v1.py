import collections,copy,json
from pathlib import Path
O=Path(__file__).parent;N='E6DYYXRX7GVE'
A=json.load(open(O/'audit.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
E=json.load(open(O/'experience-before.json'));before=copy.deepcopy(E);changes=[];mapping={}
def revise(ident,ledger,text):
 e=next(e for e in E['entries'] if e['id']==ident)
 assert N not in e['evidence']
 e['evidence'].append(N);e['n_support']=len(e['evidence']);e['n_contradict']=len(e.get('contradicting',[]))
 e['confidence']='high' if e['n_support']>=5 and e['n_contradict']<=e['n_support']/3 else 'med' if e['n_support']>=2 else 'low'
 e['last_seen']='2026-10-09';e['lesson']=text.replace('【n】',str(e['n_support']))
 changes.append({'id':ident,'before':next(x for x in before['entries'] if x['id']==ident),'after':e});mapping[ident]=ledger
nr=sum(r['ascension']==10 for r in R.values());low=next(x for x in A['bands'] if (x['asc'],x['act'],x['type'],x['band'])==(10,1,'Monster','<25%'))
rest=next(x for x in json.load(open(O/'rest-summary.json')) if x['asc']==10)
revise('silent-route-hp-observation',['silent-0019'],f'观察：赢战仍耗血药，问号另算，未来恢复不预支。A10 {nr}局一幕Monster入口<25%共{low["n"]}房/{low["runs"]}局、{low["deaths"]}死（{low["deaths"]/low["n"]:.2%}），活损中位{low["median_win"]}；各阶/幕/房型见报告（n=【n】）。典型案例：{N} F34投影F42走廊100%，实50/68进、赢后30；F43羽毛21＋休息17回满，F45仍死。F28添营火改线旧路未走；NTMAU4XZ2NN2 F12回66后走廊损23、43血精英死。无受控改线胜果，不立安全血线。')
revise('silent-rest-buffer-observation',['silent-0020'],f'观察：回血增加即时缓冲，锻造不回血，到火遗物与休息分账。A10 {nr}局{rest["rests"]}独立火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{rest["deaths"]/rest["nexts"]:.2%}），活损中位{rest["median"]}；各阶另列（n=【n】）。典型案例：{N} F42战内50→18、胜后带骨肉回12至30，F43羽毛回21至51、休息另17至68，F45满血仍T6死。实际回38不证明休息选错；无锻造线实打。')
revise('silent-deck-burst-observation',['silent-0021','silent-0125','silent-0057'],'观察：计划能力、生成节点和后续生存分核。机制：未施放能力不预支，生成节点伤不等生成牌整轮伤，毒以实结计。搭配：持续输出/牌挡/费用合核，护栏省血和取消生成机会同题比较。决定胜负的战斗：【n】支持/0反例，整战单因未控（n=【n】）。典型案例：E6DYYXRX7GVE F33重打T2护栏隐秘匕首线改双防御，题面损13→3/伤20→12，实损3扣12，原线未实打；F45群蛇形态+/疯狂科学未打，双毒雾、五敏与四轮生成刀仍T6死，不能把计划四能成长当已建立。')
revise('silent-strength-weak-observation',['silent-0012','silent-0005'],'力量逐击加伤、敏捷逐张加牌挡，弱/易伤与临时层按现场核。机制：基础加属性后核倍率，毒/遗物挡另源；敌负力不关闭成长，属性不跨战继承。搭配：多击/多挡重复收益仍核当前血价。决定胜负的战斗：【n】支持/0反例，整战单因未控（n=【n】）。典型案例：LYBHQ1X230ZB四段1力多4伤；E6DYYXRX7GVE灵魂枢纽建3→5敏，冲刺13/防御10/扫腿+19挡；末T6五敏无挡牌兑现，减6力使21→17只省4，3血仍死，不能照搬另一敌的减力伤值。')
revise('silent-footwork-block',['silent-0005'],'步法普通/升级建2/3敏捷，后续每张挡牌加敏，已有挡不追补。机制：基础挡加现场敏后核倍率，被动挡另源，换战重建。搭配：多挡重复收益，能量/牌数与实际到手挡牌须可用。决定胜负的战斗：【n】支持/0反例，单卡整战胜因未控（n=【n】）。典型案例：RZ6YAC7K89NM两防御7/7＋生存者10比基础多6；E6DYYXRX7GVE灵魂枢纽T1升级建3、T2普通再加2至5，冲刺13/防御10/扫腿+19/生存者13；T3舵盘18另计，末T6五敏但0挡、3血对17死。')
revise('silent-noxious-fumes-growth',['silent-0011'],'毒雾普通/升级建2/3层，后续玩家轮初补毒，能力不即时施毒。机制：旧毒实结减1再加实建量，可叠加，制品/阶段另核。搭配：直接施毒/触媒另计，须活到实际结算。决定胜负的战斗：【n】支持/0反例，单卡整战胜因未控（n=【n】）。典型案例：WZL2AMEY85S7三雾建2→4→6仍败；E6DYYXRX7GVE灵魂枢纽T1/T4双升级雾建3→6，T2—T6轮初毒3/5/12/17/22，含致命毒药及末轮药瓶后实毒共70，末敌仍40；恶魔重打T14同轮雾补41→47毒、实收44血。')
revise('silent-piercing-wail-temporary-strength',['silent-0046'],'尖啸临时减力，减伤按目标现场招式/段数与弱核，次轮恢复重核。机制：普通/升级已见减6/8，制品可阻，攻击不降成负伤；减力不永久停止成长。搭配：与实挡共同验收，不当恒定防御。决定胜负的战斗：【n】支持/0反例，单牌整战胜因未控（n=【n】）。典型案例：KAY522KT5NXR三击30→12、次轮恢复；E6DYYXRX7GVE灵魂枢纽T6普通使−2→−8力，当前21→17只减4，3血0挡仍死；本场死亡后没有到期恢复帧，不补造恢复值。')
revise('silent-malaise-x-debuff',['silent-0046'],'萎靡普通按X、升级按X+1减力并加虚弱，遗物倍率另核。机制：无放大普通零X无自身减益、升级零X各1；不安油灯普通X1曾建−2力/2弱，减力不关闭后续成长。搭配：与逐击伤/弱/实际挡共同验收，本牌不给挡。决定胜负的战斗：【n】支持/0反例，单卡整战因果未控（n=【n】）。典型案例：J8PHG72DGD90恶魔减3后T5/9/13仍成长至0/3/6；E6DYYXRX7GVE灵魂枢纽T4普通X2使0→−2力、34→32攻，10挡仍损22；该招每点减力收益按实盘，不套固定减伤。')
revise('silent-eternal-feather-rest-arrival-heal',['silent-0142'],'永恒羽毛实际到营火才回血，与之后休息/锻造分账。机制：已见17–44张范围实回符合min(HP缺口,3×⌊牌组/5⌋)，未知范围不外推。搭配：已到火增加血池，未来火不预支，不据此为回血加牌。决定胜负的战斗：【n】支持/0反例，构筑与回复混杂（n=【n】）。典型案例：R3AJCGQGGMR4七次到火实回123；E6DYYXRX7GVE八次到火15/18/18/18/10/21/21/21共142，五次锻造未另回血，F43羽毛30→51与HEAL51→68分开；满血仍灵魂枢纽死，不能预支未来火。')
regen=[x for x in A['potions'] if (x.get('potion') or {}).get('id')=='REGEN_POTION' and x['run'] in next(e['evidence'] for e in E['entries'] if e['id']=='silent-regen-potion-decay-heal')+[N]]
revise('silent-regen-potion-decay-heal',['silent-0259'],f'再生逐轮回复并受上限截断，不当即时15血。机制：{len({x["run"] for x in regen})}局{len(regen)}饮增5层，完整5/4/3/2/1共15；短战/封顶按实回，先回后敌伤已核。搭配：敌毛伤/回复/净损分账，不定留药门槛。决定胜负的战斗：【n】支持/0反例，单药整战未控（n=【n】）。典型案例：LY83ZMTFVKJH三轮仅回12；E6DYYXRX7GVE F12四轮回5＋4＋3＋2=14，实承伤14、进出同9血，不能把净零说全程无伤；末精英喝的是毒药。')
pot=[x for x in A['potions'] if (x.get('potion') or {}).get('id')=='POISON_POTION' and x['run'] in next(e['evidence'] for e in E['entries'] if e['id']=='silent-poison-potion-observed-application')+[N]]
delta=collections.Counter(sum(e['powers'].get('POISON_POWER',0) for e in x['after']['enemies'])-sum(e['powers'].get('POISON_POWER',0) for e in x['before']['enemies']) for x in pot)
revise('silent-poison-potion-observed-application',['silent-0278'],f'毒药先施毒，饮用当步不扣本体HP。机制：{len({x["run"] for x in pot})}局{len(pot)}饮，常态{delta[6]}饮加6、头骨{delta[7]}饮加7、制品{delta[0]}饮阻毒耗1层；组合外不推，SL复用非新获。搭配：须活到实结，药与牌数/当前挡分核，不定早喝/留药门槛。决定胜负的战斗：【n】支持/0反例，单药整战未控（n=【n】）。典型案例：E6DYYXRX7GVE恶魔首试T11毒28→34/135血不变、判死未结算；恢复同瓶后灵魂枢纽T6毒22→28/68血不变，实结到40，3血对17仍死；末剩27毒不重复扣。')
def sl_numbers(ident):
 ev=next(e['evidence'] for e in E['entries'] if e['id']==ident)+[N];groups=collections.defaultdict(list)
 for x in A['attempts']:
  if x['run'] in ev and next((f for f in A['fights'] if f['run']==x['run'] and f['floor']==x['floor']),{}).get('enemies')==['KNOWLEDGE_DEMON']:groups[(x['run'],x['floor'])].append(x)
 multi=[xs for xs in groups.values() if max(x['attempt'] for x in xs)>1]
 return len(multi),sum(len(xs) for xs in multi),sum(x['result']=='won' for xs in multi for x in xs)
g,a,w=sl_numbers('silent-knowledge-demon-healing-sl-observation')
revise('silent-knowledge-demon-healing-sl-observation',['silent-0102','silent-0125'],f'观察：恶魔回血增加累计需伤，同盘省血与少伤共同验收，局部存活不等过关。机制：A6初379三回27需460；A10血{{@10:HP:KNOWLEDGE_DEMON}}、思考实回30/增3力，混合毒后净增不当毒失效。搭配：实毒/伤/挡与可活轮合核。决定胜负的战斗：【n】支持/0反例，真正SL{g}场{a}试{w}赢（n=【n】）。典型案例：J8PHG72DGD90六次27血败；E6DYYXRX7GVE两试同70血毒瓶，首T11判死未结34毒，重打T14雾补41→47收44血、3血赢；护栏T2省10血少节点8伤、其他回合亦变，未控单因。')
g,a,w=sl_numbers('silent-knowledge-demon-sloth-replay-observation')
revise('silent-knowledge-demon-sloth-replay-observation',['silent-0247'],f'观察：懒惰3名额按实际牌计，重放/生成与药分核。机制：防御重放亦占名额；三牌用满后0费/剩能量不解锁，饮毒药不增加牌计数。搭配：生成刀只计可执行后缀，不以能量替代额度。决定胜负的战斗：【n】支持/0反例，重打{g}场{a}试{w}赢，无名额顺序单因对照（n=【n】）。典型案例：KV0JHNJCKXLS防御重放加打击占3；E6DYYXRX7GVE恶魔首T11已有3牌，剩1能量的扫腿+不可打、毒瓶加到34仍判死；重打T14未出牌直接结47毒收44血，牌数/能量/实际毒杀分别核。')
revise('silent-captains-wheel-third-turn',['silent-0031'],'舵盘提供第三回合18格挡，不能外推成每回合底挡。机制：已见第三回合开始18，后续轮不继续补；与敏捷增加的牌挡分源。搭配：前两轮/后段另需防御，未活到第三轮不预支。决定胜负的战斗：【n】支持/0反例，无遗物单因胜果（n=【n】）。典型案例：1HC609GTLGN3胧光怪T3挡18实损0、T4仍损20；E6DYYXRX7GVE灵魂枢纽T3轮初18＋扫腿+在五敏下19=37，对14零损；T6轮初0、末3血对17死，不沿用T3底挡。')
revise('silent-deadly-poison-application',['silent-0007'],'致命毒药普通/升级施5/7毒，不即时扣血。机制：实结按当前毒再减1，制品/头骨/触媒/阶段另核，过量毒按剩血截断。搭配：与毒雾累积/当前生存合核，不预支后续毒杀。决定胜负的战斗：【n】支持/0反例，单卡整战胜因未控（n=【n】）。典型案例：NTMAU4XZ2NN2刺击与毒杀后仍有幸存虫攻击；E6DYYXRX7GVE灵魂枢纽T3普通使5→10毒、180血当步不变，结束170→160实结10毒；末轮药后虽结28仍余40血，不能把施毒量当即时伤。')
inf=[x for x in A['cards'] if x['card']=='INFINITE_BLADES']
ev=list(dict.fromkeys(x['run'] for x in inf));assert N in ev
n=len(ev);e={'id':'silent-infinite-blades-start-turn-shiv','scope':'card:INFINITE_BLADES','name':'无尽刀刃','asc':[0,20],'lesson':f'无尽刀刃建立后在后续玩家轮初生成小刀，建立当步不等即时刀伤。机制：{n}局{len(inf)}次实打，已见建1层；生成刀实际打出的直伤再按力量/弱核，未见叠层边界不外推。搭配：与可用牌数/能量/实际格挡合核，不将未来生成当已输出。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：{ev[0]}首次建立记录见报告；E6DYYXRX7GVE灵魂枢纽T2建1、T3—T6轮初各添一刀，实伤4/3/3/4共14，含两轮虚弱，末仍40血、玩家死；群蛇形态+未打不计配合。','evidence':ev,'n_support':n,'n_contradict':0,'confidence':'high' if n>=5 else 'med' if n>=2 else 'low','last_seen':'2026-10-09','status':'active'}
E['entries'].append(e);changes.append({'id':e['id'],'before':None,'after':e});mapping[e['id']]=[]
E['version']='2026-10-09.16';E['_about']=f'静默经验只从本角色实盘与复盘学习。第127次增量并{N}一局A10，截至{A["cutoff"]}共{len(R)}完局；旧163局按首末HP/节点/回血/SL同口径全量复算。补步法逐牌挡、毒雾与药水实结、无尽刀刃生成、减力现场值、舵盘和羽毛/再生分源；恶魔SL重打赢不归于单护栏，满血精英仍死不证明休息选错。相关源码交独立strategy-proposal，缺受控早喝/留药/改线胜果不拟新阈值。'
for e in E['entries']:
 assert e['n_support']==len(set(e['evidence']))
 assert all(r in R and R[r]['character'].lower()=='silent' for r in e['evidence']+e.get('contradicting',[]))
active=[e for e in E['entries'] if e['status']=='active'];assert sum(len(e['lesson']) for e in active)<=60000
(O.parents[2]/'knowledge/characters/silent/experience.json').write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2)+'\n');(O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
summary={'added':1,'updated':len(changes)-1,'retired':0,'active':len(active),'chars':sum(len(e['lesson']) for e in active),'confidence':dict(collections.Counter(e['confidence'] for e in active)),'applicable':{a:{'entries':len(es:=[e for e in active if e['asc'][0]<=a<=e['asc'][1]]),'chars':sum(len(e['lesson']) for e in es)} for a in [8,9,10]}}
(O/'update-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(summary)
