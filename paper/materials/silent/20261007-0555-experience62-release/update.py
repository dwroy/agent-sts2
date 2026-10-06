import collections, copy, json, re
from pathlib import Path

O=Path(__file__).parent
FILE=Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json')
RUN='QNTW139MGECA'
B=json.load(open(O/'experience-before.json'));N=copy.deepcopy(B)
A=json.load(open(O/'audit.json'));R=json.load(open(O/'rest-summary.json'))
TEXT={
'silent-footwork-block':'步法普通/升级建2/3敏捷，收益逐挡牌兑现，不追补已有挡。机制：基础挡加现场敏捷，再逐牌核脆弱；被动挡另算。搭配：多张挡牌重复获益，能力需先实际支付。决定胜负的战斗：{n}支持局，局部挡收益不等整战胜因（n={n}）。典型案例：QNTW139MGECA A10仪式兽T2先防御5、再步法2敏、后生存者10合15盖15；T8双防御各7盖14。棱柱非凡技艺1敏加步法2成3，T5三牌各8较基础多9挡，但污染后33攻击仍损9。',
'silent-strength-weak-observation':'力量逐击增伤、敏捷逐挡牌增挡，虚弱逐击取整；已施毒与被动分账。机制：1力六次攻击多6原始伤，敏捷不补旧挡，减力不关闭独立成长。搭配：多段/多张分别放大，敌挡与最终掉血另核。决定胜负的战斗：{n}支持局，各子公式及整战因果分账（n={n}）。典型案例：QNTW139MGECA A10棱柱T9六攻击合61、先扣22挡再扣39血，1力贡献6；3毒后仍余2，6血8挡对24需损16而死。',
'silent-prowess-strength-dexterity':'非凡技艺普通/升级建立1/2力量与敏捷，攻防收益在后续牌兑现。机制：力量逐击加伤、敏捷逐挡牌加挡，建立不追补旧挡。搭配：多攻击与多挡牌重复获益；不能把能力建立、余像、步法收益重复计。决定胜负的战斗：{n}支持局，没有隔离提前建立的整战胜因（n={n}）。典型案例：53FLQ68CETW0 A6非凡技艺+加2力2敏、建立时2挡来自余像，后步法到7敏，爆发重放防御各12。QNTW139MGECA A10棱柱T3非凡技艺建1力1敏且不加污染，步法另到3敏；T5三挡多9、T9六攻击多6原始伤，仍死且敌余2。',
'silent-piercing-wail-temporary-strength':'尖啸临时减力须按当前攻击核，次轮撤回后重算。机制：普通/升级减6/8，逐击核力量、虚弱及技能污染；独立成长继续。搭配：多段放大当轮减伤，实际挡及后续威胁另算。决定胜负的战斗：{n}支持局，当轮有效不保整战（n={n}）。典型案例：QNTW139MGECA A10棱柱T4力量−2→−8，尖啸和防御共6污染，8挡盖8攻击零损；T5力恢复−2、火花到6，不能沿用−8。',
'silent-malaise-x-debuff':'萎靡普通按X、升级按X+1减力并加虚弱，普通零X无自身减益、升级零X各1。机制：永久减力与临时尖啸撤回分账，敌阶段可清旧力量，独立成长继续；自身不提供格挡。搭配：减力逐击和虚弱共同核，还需实际挡与足量输出。决定胜负的战斗：{n}支持局，时点胜因未控（n={n}）。典型案例：QNTW139MGECA A10仪式兽T4普通X3使力4→1、24攻击→15并加3弱，零挡损15；T5跨160阈值清旧力，后段再有4/8。棱柱T1实际X2减2力、加2弱，末战仍死。',
'silent-ceremonial-beast-threshold-growth-sl':'仪式兽跨现场阈值清横冲直撞与第一段力量，后段仍攻击/再成长。机制：阈值按进阶读{@10:POWER:CEREMONIAL_BEAST:PLOW_POWER}，本体{@10:HP:CEREMONIAL_BEAST}、横冲基伤{@10:DMG:CEREMONIAL_BEAST:PLOW_MOVE}加现场力再核弱；已见低阶150、A9/A10为160，后段力可再增长。搭配：实际攻击/已结算毒推进阶段，减益和挡只覆盖当前窗口，清力非击杀。决定胜负的战斗：{n}支持局14房11活3死，真正重打仍4场20次1赢（n={n}）。典型案例：QNTW139MGECA A10 T5直伤179→149清横冲160及旧力、当轮眩晕；后段力4/8，T10/T11再损21/9，262血12轮净扣21.83/轮、73→17损56首试过关。KUZVERN40NGK同34血六次零赢、清阶段后仍死；未隔离单牌整战因果。',
'silent-eternal-feather-rest-arrival-heal':'永恒羽毛在实际到达营火时回血，与之后休息/锻造分账。机制：8局58次MAP→REST实回均符合min(HP缺口,3×⌊牌组/5⌋)，已见17–44张且受上限截断，无反例；未见范围不外推。搭配：已到火回复增加血池，未来火不预支，不据此为回血加牌。决定胜负的战斗：8支持局，构筑/敌人与回复混杂，无单遗物因果（n=8）。典型案例：QNTW139MGECA A10 F12/F16/F27到火分别回12/12/15合39，随后休息另21/23/23，F9休息21发生在取得羽毛之前；F27初22→羽毛37→休息60，下一棱柱60→0。旧7局55次及本局3次完整明细见第62节。',
'silent-infested-prism-tainted-skill-cost':'感染棱柱须合算技能挡收益与污染逐击血价，能力和技能分别核。机制：火花N令每技能加N污染，增加当前每段攻击、次玩家轮消失；能力不加污染，已见A10 T1—4为3/T5—8为6/T9为9。搭配：力量/弱/临时减力、实际挡与毒伤分账，技能不一概亏血。决定胜负的战斗：{n}支持局七活三死，真正重打一场四次零赢，整战胜因未控（n={n}）。典型案例：QNTW139MGECA A10 T3两能力建1力3敏不加污染；T5三技能各8挡、污染0→6→12→18、攻击15→21→27→33，末24挡损9，第三张相对两张仍省2；T9后空翻8挡却加9污染，6血对24需损16，敌余2而死。',
'silent-deck-burst-observation':'观察：取得、建立、触发、穿挡与足额输出分别核，单轮保血不定整战胜因。机制：能力须实际支付，未来群蛇/毒/敏捷不预支；爆发重放机会在未执行线不能当实际收益。搭配：费用、抽牌、启动及当前血价一起核。决定胜负的战斗：{n}支持局，缺单组件整战对照（n={n}）。典型案例：QNTW139MGECA A10五张营养汤0费打击与刀刃之舞支持频繁出牌，但群蛇全局0次施放；棱柱T5三挡线实损9，未选群蛇线题面损15、五轮8/8死，完整结果未知。T1护栏替线实扣17损13，预计比原线省3血多8伤，却撤爆发重放机会，原线整战未打。',
}
rr=R[10];fs=[f for f in A['fights'] if f['asc']==10]
band=next(r for r in A['bands'] if (r['asc'],r['act'],r['type'],r['band'])==(10,2,'Elite','≥60%'))
TEXT['silent-route-hp-observation']=(f'观察：首COMBAT→同房末结算净损，回复/实死分账，问号不算Monster，不定安全线。76静默局{len(A["fights"])}房{sum(f["death"] for f in A["fights"])}死；A8一局25/0死、A9三局48/2死、A10三十六局{len(fs)}/{sum(f["death"] for f in fs)}死，各血档见第62节。A10二幕≥60%精英{band["n"]}房{band["runs"]}局{band["deaths"]}死={100*band["deaths"]/band["n"]:.2f}%、活损中位{band["median_win"]}。典型案例：QNTW139MGECA A10 F7取消可选精英，一幕零精英仍boss损56；F18投影F27入55实22，问号战损36/事件失7未消失，羽毛和回血后60进强制棱柱仍死；未选路线未实打（n=76）。')
TEXT['silent-rest-buffer-observation']=(f'观察：已回复增加血池，未来火/模拟优势不预支。A8一局9火8回血7非回血动作回111、后战7/0死/中位10；A9三局21火16回血5非回血回341、后战15/1死/中位34；A10三十六局{rr["rests"]}火{rr["heal"]}回血{rr["smith"]}非回血回{sum(rr["gains"])}，去重后战{rr["nexts"]}/{rr["deaths"]}死={100*rr["deaths"]/rr["nexts"]:.2f}%、活损中位{rr["median"]}。典型案例：QNTW139MGECA A10四回血21/21/23/23合88，羽毛到火另39；F16回血50→73后boss损56存17，F27初22→羽毛37→回血60仍死棱柱，不能据败局认定未选锻造/路线更好（n=76）。')
changes=[]
for e in N['entries']:
    if e['id'] not in TEXT:continue
    old=copy.deepcopy(e)
    assert RUN not in e['evidence']
    e['evidence'].append(RUN);e['n_support']=len(e['evidence']);e['last_seen']='2026-10-07'
    e['confidence']='high' if e['n_support']>=5 and e['n_contradict']<=e['n_support']/3 else ('med' if e['n_support']>=2 else 'low')
    e['lesson']=TEXT[e['id']].replace('{n}',str(e['n_support']))
    for sentence in re.split(r'(?<=。)',old['lesson']):
        if re.search('药水|药瓶|喝药|留药|药栏|用药',sentence):e['lesson']+=' '+sentence
    changes.append(dict(id=e['id'],before_n=old['n_support'],after_n=e['n_support'],before_chars=len(old['lesson']),after_chars=len(e['lesson'])))
new=dict(id='silent-tunneler-burrow-block-stun',scope='hallway:TUNNELER',asc=[0,20],lesson='地道虫埋地盾归零可取消当前攻击，即使本体仍活或未掉血。机制：已见BURROWED_POWER在格挡归零时消失，BELOW_MOVE转STUNNED；基伤按{@9:DMG:TUNNELER:BELOW_MOVE}加现场力/弱核，不要求本体掉血。搭配：实际攻击削盾或移除格挡后归零才兑现取消，未穿盾不预支，毒与击杀另算，不设固定拿牌优先级。决定胜负的战斗：A0一局/A2一局/A9两局/A10三局七次非致死清盾均取消当轮攻击、零反例；均局部减伤，不定整战胜因（n=7）。典型案例：LRN0HPZ0FZS1 A0 F19 T3清7挡后31→29血、17攻取消；VPW8YH7A4QFM A10 F19 T5突然一拳使34血8挡→34血0挡，15攻取消。QNTW139MGECA A10 F22 T6猛扑/突然一拳清20挡，余24血、23攻取消、玩家29血不变。',evidence=['LRN0HPZ0FZS1','ZZMYZ5UBCG72','HMVJKM56S4Q8','F4QKG4J1AJJZ','PU80F84P6HPN','VPW8YH7A4QFM',RUN],n_support=7,n_contradict=0,confidence='high',last_seen='2026-10-07',status='active')
N['entries'].append(new);N['version']='2026-10-07.8'
N['_about']='静默猎手经验只来自本角色复盘与日志。第62次增量截至QNTW139MGECA结束2026-10-06T21:03:12.594Z，76完局；旧75局七数组及血档/节点/回血/SL逐行复算一致。净损按首COMBAT→同房末结算，回复/死亡/判死/SL分账；污染血价与敏捷格挡、临时减力与成长/阶段清力、羽毛到火与休息回血、实际建立能力与未执行线收益分别核。新增埋地清盾取消攻击的七局局部实证，不设整战胜因或新用药规则。'
FILE.write_text(json.dumps(N,ensure_ascii=False,indent=2)+'\n')
active=[e for e in N['entries'] if e['status']=='active'];old=[e for e in B['entries'] if e['status']=='active']
C=dict(old_version=B['version'],version=N['version'],added=[new['id']],updated=list(TEXT),retired=[],old_active=len(old),active=len(active),old_chars=sum(len(e['lesson']) for e in old),chars=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),rows=changes,applicable={str(a):dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in active),chars=sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]})
assert C['chars']<=60000
(O/'changes.json').write_text(json.dumps(C,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(C,ensure_ascii=False))
