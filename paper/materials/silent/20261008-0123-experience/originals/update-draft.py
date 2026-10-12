import collections, copy, json
from pathlib import Path

O=Path(__file__).parent
K=O.parents[2]/'knowledge/characters/silent/experience.json'
X=json.load(open(O/'experience-before.json')); Y=copy.deepcopy(X)
M={e['id']:e for e in Y['entries']}; A=json.load(open(O/'audit.json'))
N='NHA2KW0RB7VP'; U={}
def change(eid, conclusion, mechanism, pairing, case, observation='局部机制收益与整战因果分账'):
    n=len(set(M[eid]['evidence']+[N]))
    U[eid]=f'{conclusion}。机制：{mechanism}。搭配：{pairing}。决定胜负的战斗：{n}支持局，{observation}（n={n}）。典型案例：{case}'

change('silent-footwork-block','步法普通/升级建2/3敏捷，逐张挡牌兑现、不追补已有挡',
       '卡牌基础挡加当前敏捷再核脆弱，被动挡另算；多张步法已见叠加',
       '多挡牌重复受益，能力须先实建',
       f'{N} A10 F19 T1步法建2敏，防御5→7挡；F30 T6已有8挡时建2敏，旧挡仍8。boss六试未打步法，不能预支；WQZVENQ7DTRP沙虫四敏使防御/生存者各多4挡，仍败')
change('silent-strength-weak-observation','力量逐击影响攻击、敏捷逐张影响牌挡，遗物放大与临时增减分源',
       '按现场力量核弱/易伤，卡牌挡加敏捷再核脆弱；后方攻击须核实际意图，不能对已取整值任意再取整；毒/遗物挡另算',
       '多击/多挡牌重复兑现，建立增益不倒补已有挡',
       f'{N} A10蟹T1油灯使X1萎靡实际−2力/2弱，T2同−2力/1弱的爪转向1→2攻；末T4火箭3力背向57→正向38，转向降19却仍致死。Q6M2Y34MWKRE敏捷药2使两防御7+7')
change('silent-deck-burst-observation','观察：持有、计划与本战已建能力分账，支付和生存窗口限制持续攻防兑现',
       '轮初补毒、结束毒伤与逐牌挡分时点；未取得组件及死亡前未触发的能力不预支',
       '敏捷/毒源先实建，连战按实际剩血验收',
       f'{N} A10终局32牌、4打击5防御、仅毒药/残影永久升级；触媒未取得，蟹六试步法未施放、毒雾T4才建，无T5补毒。末轮两毒药结12、敌仍317血；1913SE84AXQF千足虫末轮雾3同未触发')
change('silent-noxious-fumes-growth','毒雾普通/升级建2/3层，后续玩家轮初补毒，建立不即时施毒且可叠加',
       '无阻挡每轮补a；k触媒至多结k+1次、逐次毒减1，毒充足时净变a−(k+1)',
       '毒源/触媒须实建并活到结算，制品/换战另核',
       f'{N} A10仪式兽T5建2雾不改变当下18毒，T6轮初毒27含新增毒药；蟹六试T4建2雾均无下一玩家轮，末12毒伤来自两毒药。TXZ6RVMQA09D触媒+下39毒三结114')
change('silent-kaiser-crab-facing-sl','观察：帝王蟹朝向/减益/增伤/即时血价同核，固定击杀顺序胜因未控',
       '后方攻击、力量与虚弱依现场意图核；同招−2力/1弱时正面1、转向2，不把显示1再乘1.5取整成1；毒按实际结算',
       '输出/牌挡分账，模拟全死不等即时血价相同，未建能力不预支',
       f'{N} A10 T1同30血同首手换斗篷为回响，末挡14→8、损1→7、净扣8→24，多16伤多损6；两线T4均未击杀，末16血/6挡对38需损32、差17血。9TG1RP5LFAAK先火箭胜，LLYSRQQ35AVW先爪也胜',
       '16房8活8死，真正重打8场44试1赢；本局6试0赢，同首手后的选线也变，不认单因或运气')
change('silent-ceremonial-beast-threshold-growth-sl','仪式兽跨现场阈值清横冲直撞与第一段力量，后段仍攻击并再成长',
       '阈值按进阶读{@10:POWER:CEREMONIAL_BEAST:PLOW_POWER}，血量{@10:HP:CEREMONIAL_BEAST}；低阶150、A9/A10实见160，横冲基伤{@10:DMG:CEREMONIAL_BEAST:PLOW_MOVE}另核现场力/弱',
       '实伤与已结毒推进阶段，挡/减益覆盖当前窗口；昏眩单牌限制另核',
       f'{N} A10 T3末毒使190→165，T4攻击165→159跨160阈值停攻；T5轮初141，九轮262敌血扣完，80→40胜。1913SE84AXQF压到156也清力/眩晕',
       '17房13活4死，真正重打5场26试1赢；本局首试赢无重打，未控单卡胜因')
change('silent-precise-cut-hand-count-observation','观察：普通精确切击伤害随实际手牌变化，抽牌与牌离手方向相反',
       '牌文每张手牌少2，现场力量/虚弱与手数合核；无修正七/六/五手本次牌面1/3/5，旧五/六手实5/3及±2力量分支分账，不推升级或通用截断',
       '按实际出牌时手数核，敌挡先抵扣，旧读数不当固定输出',
       f'{N} A10仪式兽T1两牌离手使1→3→5，切击实扣5；原四攻估27实31的4差可独立核，另加毒药10不归本牌。JQPT83P8KDSZ五→六手5→3、离手后3→5',
       '修正后整战反事实未打')
change('silent-paels-flesh-third-turn-energy','佩尔之肉从第三轮轮初额外获得1能量，前两轮不预支',
       '旧七局33个就绪窗口加本局11窗口均T1/T2/T3为3/3/4；六个独立二幕房，蟹SL五个重复窗口不当独立局',
       '费用与已建立/实际触发分账，额外预算须核技能副作用和可活轮',
       f'{N} A10蟹末T4起始4能支付延伸/残影+/两毒药/毒雾，仍仅6挡死；LRN0HPZ0FZS1 A0 F19已见3/3/4/4，学习前兑现；额外能量不免攻击或技能血价',
       '八局44个局部窗口，遗物整战胜因未受控')
change('silent-frail-card-block','脆弱逐牌缩减格挡，被动挡另核',
       '基础挡加敏捷/牌专属增量，再各乘0.75向下取整，不能合挡后折减、不能把已有挡倒补',
       '多牌/重放逐次核，余像/覆甲/遗物挡分账',
       f'{N} A10蟹六试T4零敏残影+基础8、现场6=⌊8×0.75⌋，末16血对38完整需损32；延伸、毒药、毒雾不额外给挡。XP2SL33HT0D9四敏脆弱偏折/防御各6',
       '单项整战因果未控')
change('silent-malaise-x-debuff','萎靡普通按X、升级按X+1减力并加虚弱，遗物倍率另核',
       '无额外放大时普通零X无自身减益、升级零X各1；不安油灯本局首次普通X1实建−2力/2弱。技能触发敌激怒、阶段清状态和后续独立成长另核',
       '逐击减力、虚弱与实际挡分开，萎靡自身不提供挡',
       f'{N} A10蟹六试T1同−2力/2弱、合15攻，斗篷线14挡损1、回响线8挡损7；虚弱/转向不能替代这6挡。TDLBRNA0R05B X2升级减3又激怒加3，力量净不变而3弱仍有效')
change('silent-mr-struggles-turn-start-damage','抱抱先生轮初自动伤与卡牌、毒、荆棘伤分账',
       '现场文本轮初向全体造成当前回合数伤害；首轮各1、T4各4，过量按剩血截断，不预支死亡后的轮初',
       '逐轮活敌与实际触发窗口核对，开场多遗物同时变化未有中间帧时不强拆',
       f'{N} A10蟹首试T1最后小刀后总血404，T2轮初两侧各扣2到400，故首轮净扣8含自动4；开场428→408含拉炮和抱抱先生，分项帧缺失。JLN5SK17W4FQ末T4无毒火箭171→167',
       '五局局部支持，移除遗物的胜负对照未打')
R=json.load(open(O/'rest-summary.json'))[-1]
bands=[b for b in A['bands'] if b['asc']==10 and b['act']==2 and b['type']=='Monster']
low=next(b for b in bands if b['band']=='<25%'); mid=next(b for b in bands if b['band']=='25–40%')
U['silent-route-hp-observation']=f"观察：按实际入血与下一战敌人核连续血价，未来营火/无精英不保证安全。A10 {R['runs']}局，二幕Monster<25% {low['n']}房{low['deaths']}死、25–40% {mid['n']}房{mid['deaths']}死；A8一局/A9三局另列。典型案例：{N} 二幕0精英、三回血火均兑现，猎人杀手45→18、双异螨40→4，末火回28进蟹仍败；MGA0CZDDKC0P低血休22→43后走廊活与D4LJ9QMGFB8Q事件13后走廊死，敌/牌/间隔不同，无改线因果（n=110）。"
U['silent-rest-buffer-observation']=f"观察：只计实际完成回复，后战胜负另核、不预支未来营火。A10 {R['runs']}局{R['rests']}火/{R['heal']}次回血实回{sum(R['gains'])}，去重{R['nexts']}后战{R['deaths']}死（{R['deaths']/R['nexts']:.2%}）/活损中位{R['median']:g}；A8七后战0死/A9十五后战1死。典型案例：{N} 五次营火各回24共120，二幕三火72全部兑现仍28/80入蟹，小血瓶另补2；SL恢复47不算回血，无锻造/留药/改线实打胜局对照（n=110）。"

changes=[]
for eid,text in U.items():
    e=M[eid]; before=copy.deepcopy(e)
    e['evidence']=list(dict.fromkeys(e['evidence']+[N]));e['n_support']=len(e['evidence'])
    e['lesson']=text;e['last_seen']='2026-10-07'
    n=e['n_support'];c=e['n_contradict'];e['confidence']='high' if n>=5 and c<=n/3 else 'med' if n>=2 else 'low'
    changes.append(dict(id=eid,before=before,after=copy.deepcopy(e)))
H=json.load(open(O/'lamp-history.json'))
assert H['support']==['K3676LU8B0UH','SADL3CGYTGSR',N] and len(H['cases'])==17 and not H['unresolved']
e=dict(id='silent-unsettling-lamp-first-debuff',scope='relic:UNSETTLING_LAMP',name='不安油灯',asc=[0,20],
       lesson=f'不安油灯使已见每战首次负面牌的毒或萎靡减益翻倍，不当持续翻倍。机制：三局17个直接窗口，毒牌5→10、7→14、带毒刺击4→8，普通萎靡X1的減力/虚弱各1→2；只核这些牌，其他状态/零X/叠层未验证。搭配：首次负面牌与目标、制品、实际X核对，倍毒仍待结束结算，不当即时伤害或额外挡。决定胜负的战斗：3支持/0反例，五持有局中两局未核这些子公式；无移除遗物整战对照（n=3）。典型案例：K3676LU8B0UH A1 F30 T2带毒刺击4→8；SADL3CGYTGSR A7 F45毒药5→10；{N} A10仪式兽首毒5→10，蟹六試X1萎靡−2力/2弱，T1仍按14/8挡损1/7。',
       evidence=H['support'],n_support=3,n_contradict=0,confidence='med',last_seen='2026-10-07',status='active')
assert e['id'] not in M
Y['entries'].append(e);changes.append(dict(id=e['id'],before=None,after=copy.deepcopy(e)))
Y['version']='2026-10-08.1'
Y['_about']='静默经验仅来自本角色复盘与日志。第84次增量合并NHA2KW0RB7VP（A10）及勘误，截至2026-10-07T15:19:58.532Z共110完局；旧109局七数组、血档、节点转移、回血与SL逐行复算一致。新增不安油灯首次负面放大，朝向取整现场并入帝王蟹；实际增能/敏捷/毒雾与兑现窗口、正常回复与SL恢复分账。CLI账本及独立strategy-proposal关联，本任务未改策略源码。'
C=dict(added=[e['id']],updated=list(U),retired=[],entries=changes)
for phase,x in [('before',X),('after',Y)]:
    es=[e for e in x['entries'] if e['status']=='active']
    C[phase]=dict(version=x['version'],active=len(es),chars=sum(len(e['lesson']) for e in es),confidence=dict(collections.Counter(e['confidence'] for e in es)),asc={str(a):dict(entries=len(ss:=[e for e in es if e['asc'][0]<=a<=e['asc'][1]]),chars=sum(len(e['lesson']) for e in ss)) for a in [8,9,10]})
assert C['after']['chars']<=60000
K.write_text(json.dumps(Y,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(C,ensure_ascii=False,indent=2)+'\n')
print(C['before']);print(C['after'])
