import collections
import copy
import json
from pathlib import Path

O = Path(__file__).parent
K = O.parents[2] / 'knowledge/characters/silent/experience.json'
B = json.load(open(O/'experience-before.json'))
A = json.load(open(O/'audit.json'))
M = {r['run_id']: r for r in json.load(open(O/'run-metadata.json'))}
R7 = '7X0W3U8TVA2A'
RM = 'MTQ0EUBJ3R6T'
after = copy.deepcopy(B)
spec = {}

def put(eid, lids, runs, conclusion, mechanism, pairing, case):
    spec[eid] = dict(ledger=lids, runs=runs, conclusion=conclusion,
                     mechanism=mechanism, pairing=pairing, case=case)

put('silent-footwork-block', ['silent-0005'], [R7],
    '步法普通/升级建2/3敏捷，逐张挡牌兑现、不追补已有挡',
    '牌基础挡加现场敏捷再核脆弱；被动挡、臂甲等倍率分源',
    '多张挡牌重复受益，持有能力不等于本战已建立',
    f'{R7} A10千足虫T2步法+建3敏时旧7挡仍7；T11斗篷9+防御8=17，比基础6+5多6，仍对19攻损2至1。9Z9H2EXKLF3T T8斗篷与暗影/士兵合(6+2)×2×2=32，仍触发复活')
put('silent-strength-weak-observation', ['silent-0006'], [R7,RM],
    '力量逐击影响攻击，敏捷逐张影响牌挡；临时增减与遗物倍率分源',
    '现场力量与弱/易伤共同决定每击，牌挡加敏后核脆弱；施放增益不倒补已有挡，毒/反伤另计',
    '多击/多挡牌重复兑现，敌成长和实际攻击者另核',
    f'{R7}千足虫T2尖啸把三段28意图降至6，中段X1萎靡再降至0×2；T6后段4力双10=20，前中先攻19仍支付。{RM} F23T3速度5敏使两防御10+10及妙计9=29；少一防御仅19挡，毒素10+攻击17使损8')
put('silent-deck-burst-observation', ['silent-0021'], [R7,RM],
    '观察：持有、计划与本战实建能力分账，支付和生存窗口限制持续攻防兑现',
    '毒雾轮初补毒、末回合毒伤与逐牌格挡分时点；未取得或死亡前未触发组件不预支',
    '构筑/路线按已到节点与实际剩血验收，局部多伤或省血不当整战胜因',
    f'{R7}终组28牌却无计划中的毒雾/触媒，普通萎靡未升级；千足虫实际本体扣278、接续回175后仍残47。{RM} F20T3实建磨蚀/毒雾，旧0挡仍0而42→23；F11护栏候选省8且多2即时伤，却未施原迷雾4毒，原线长期胜负未知')
put('silent-noxious-fumes-growth', ['silent-0011'], [RM],
    '毒雾普通/升级建2/3层，后续玩家轮初补毒，建立不即时施毒且可叠加',
    '无阻挡每轮补a；k触媒至多结k+1次且逐次减毒1，毒充足时净变a−(k+1)，额外施毒/制品分账',
    '毒源和触媒先实建且活到结算；换战不继承',
    f'{RM} A10仪式兽T4建2雾、T7首帧18毒；F23前三试T4建2、末试未建，不能把同构筑当同能力。9Z9H2EXKLF3T沙漏T2/T4两雾+共6，普通触媒下39+38=77毒仍未杀112血敌')
put('silent-vambrace-opening-block', ['silent-0013'], [R7],
    '臂甲首张实际格挡翻倍，不能外推为每回合翻倍',
    '已见首张基础加敏后翻倍，脆弱与其他遗物倍率另核；消费后回常态',
    '逐牌核实际打出，后继牌被弃时不能预支其挡',
    f'{R7} A10千足虫T1生存者8实翻16，随后唯一防御被强制弃、未兑现5挡，22攻使67→61；局部首张增益不是21挡。P74C04AEPL1F臂甲/士兵同触发防御5→20，后轮生存者仅士兵8→16')
put('silent-abrasive-thorns-dexterity', ['silent-0044'], [RM],
    '磨蚀的敏捷与逐击荆棘分别兑现，生成能力不等于实建',
    '普通/升级实建1敏捷及4/6荆棘；已见弃普通亦建1/4且不付出牌费。敌实际每击反伤，全挡亦触发，无实体/剩血截断另核',
    '敏捷由后续挡牌兑现，反伤不能提前取消已发动攻击',
    f'{RM} A10 F13能力药选择并施放磨蚀建1敏/4荆棘；F20T3再建同量，旧0挡仍0、19攻使42→23，毒/反伤分算。1913SE84AXQF千足虫弃磨蚀后两防御多2挡、反12仍损5')
put('silent-piercing-wail-temporary-strength', ['silent-0046'], [R7,RM],
    '尖啸临时降力按攻击段数兑现，不当恒定挡或永久降力',
    '普通/升级减6/8，逐击核现场力/弱；次轮临时恢复与独立成长分账',
    '多击重复受益，仍需真实牌挡，后轮不能沿用负力量',
    f'{R7} A10千足虫T2普通尖啸使9+6×2+7=28变3+1×2+1=6；T4再用后前中毒杀，只支付后段5。{RM}异螨四试均T1尖啸，末试到T5敌仍3力/1弱、咬13，不能沿用T1临时减力')
put('silent-malaise-x-debuff', ['silent-0053'], [R7],
    '萎靡普通按X、升级按X+1减力并加虚弱，遗物倍率另核',
    '无放大时普通零X无自身减益、升级零X各1；不安油灯首次普通X1实建−2力/2弱。敌技能成长及阶段清状态另核',
    '逐击减力、弱和实际格挡分核，萎靡自身不给挡',
    f'{R7} A10千足虫T2尖啸后中段−4，普通X1使−5并加1弱、1×2变0×2；T3尖啸恢复后该段仍1力。NHA2KW0RB7VP蟹同−2力/2弱下斗篷14挡损1、回响8挡损7，减益不替代6挡')
put('silent-decimillipede-reattach-poison', ['silent-0064'], [R7],
    '千足虫重接增加需伤，复活毒与旧力量不沿用死前值',
    '初始血池加已发生重接才是截至当前需扣总血；净扣含回血抵销，不等于实际伤害。复活量按进阶/现场核，不预加未来重接',
    '暂死段仍属本战资源，按当前毒与攻击重算，不设固定击杀顺序',
    f'{R7} A10 F31初150、七次重接各25加175，实扣278后敌残47、67→0；T6前中各25且0毒/0力。G33HU22H2543 A10初148、六次各25、实扣298八轮胜83→46；真正重打一场四试0赢，未控顺序胜因')
put('silent-anticipate-temporary-dexterity', ['silent-0080'], [R7,RM],
    '预判普通/升级只本轮建2/4敏捷，须后续挡牌兑现，不追补旧挡',
    '敏捷与临时标记同量，次轮撤回；逐牌加敏后核脆弱，被动挡另计',
    '与步法常驻敏捷分账，多挡牌重复收益，无挡牌不预支',
    f'{R7} A10千足虫T6敏3→5，斗篷实11比原9多2，T7回3。{RM} F23T2两敏使防御7+生存者10=17，比基础5+8多4，次轮临时敏消失')
put('silent-snecko-skull-poison-application', ['silent-0087'], [R7],
    '异蛇头骨使已见毒雾/直接毒牌每次施毒额外加1，能力层数不增加',
    '升级雾3补4，普通/升级毒药5/7补6/8，普通药瓶9补10；施毒当步不扣本体HP，阻挡分支不外推',
    '持续/直接施毒与触媒次数分核，防御支持后续结算；药水基础与遗物贡献未隔离不分推',
    f'{R7} A10 F31普通毒药5实加6、带毒刺击3加4，T13蛇咬7实加8；毒药水零毒→7但本体不变，该药基础与遗物单独贡献未分离。9TG1RP5LFAAK毒药0→8、药瓶8→18，敌46血不变')
put('silent-paels-flesh-third-turn-energy', ['silent-0189'], [RM],
    '佩尔之肉从第三轮轮初额外获得1能量，前两轮不预支',
    '已观察二幕就绪轮初T1/T2/T3为3/3/4；SL重复窗口不是独立证据局',
    '按实际触发轮与费用核预算，额外能量不免技能血价',
    f'{RM} A10 F20及F23四试轮初T1/T2为3、T3起4；F23每试T1药水耗尽能量后0→2另计，四试仍败。LRN0HPZ0FZS1 A0 F19已见3/3/4/4')
put('silent-ceremonial-beast-threshold-growth-sl', ['silent-0133'], [RM],
    '仪式兽跨现场阈值清横冲直撞与第一段力量，后段仍攻击并再成长',
    '阈值按进阶{@10:POWER:CEREMONIAL_BEAST:PLOW_POWER}、血量{@10:HP:CEREMONIAL_BEAST}；低阶150/A9-A10实160，横冲基伤{@10:DMG:CEREMONIAL_BEAST:PLOW_MOVE}另核力/弱。缺中间帧不推内部瞬间',
    '实伤和已结毒推进阶段，当前格挡/减益与昏眩单牌限制分核',
    f'{RM} A10 F17T6末168血/17毒/8力/PLOW160，T7首帧151血且清增力与力量、改兽吼；11轮净损48胜19血，无本场重打。NHA2KW0RB7VP T4攻击165→159跨160、九轮胜80→40')
put('silent-toxic-paid-exhaust-end-turn-loss', ['silent-0214'], [RM],
    '毒素可付1能量离手，留手末回合每张5伤，格挡可抵；毒杀不免已发生持牌伤',
    '已见消耗，两张需10挡；玩家先死时后续敌毒未结算，不外推其他状态牌',
    '将持牌伤、实际敌攻击与格挡一起核，未知抽牌/替线完整胜负保留未知',
    f'{RM} A10 F23四试T3均两张毒素合10及4+13攻击，前三29挡零损；末19挡实损8到2。TKXQ6L4N9A6U F22T6两张留手、7血0挡先归零，敌6/1血与11/14毒未变')
put('silent-ceremonial-beast-ringing-one-card', ['silent-0222'], [RM],
    '已观察1层昏眩窗口打一张牌后阻止后续牌，余能不等于还能出牌',
    '旧A0/A10首牌后其他手牌blocked_by_hook，生成小刀亦受限；只验证1层',
    '按现场可打牌数核攻防，药水与出牌计数分开，不外推更高层数',
    f'{RM} A10仪式兽T8 RINGING1只实打防御，下一轮继续并最终赢。7ZUC4VPMDS41末T14防御后8血5挡、余2能但四牌blocked，对25攻死亡，随后药水另计')
put('silent-speed-potion-temporary-dexterity', ['silent-0253'], [RM],
    '速度药水当步加5临时敏捷，须在本轮后续格挡牌兑现',
    '全史逐饮核敏捷/速度项+5，次轮撤回；其他敏捷来源变化分账，旧挡不倒补',
    '逐牌加现场敏捷后核脆弱，常驻敏与遗物挡另计；无留药或时点门槛',
    f'{RM} A10 F23四试T3饮速度5敏，前三防御10+妙计9+防御10=29，末少防御仅19，持牌10+攻击17损8；临时增益本身不是5挡。Q6M2Y34MWKRE骇鳗T1药后防御10，T2敏/速度项消失')
put('silent-haze-group-poison-weak', ['silent-0235'], [RM],
    '迷雾群毒与当轮虚弱分别核，施放不即时扣本体',
    '普通/升级4/6毒及1/2弱，结束毒结算后减1；弱不清敌成长，制品/附毒另核',
    '群毒需活到结算，毒素持牌伤和实际攻击/挡合核',
    f'{RM} A10 F23T3四试迷雾+均给两敌6毒，弱后实际4+13攻；29挡覆盖两毒素10和17攻，末19挡不足。F11护栏没施普通迷雾4毒，原线长期胜负未知。WQZVENQ7DTRP沙虫迷雾+使9×2→6×2，零挡仍损12')
put('silent-act-transition-missing-hp-heal', ['silent-0243'], [R7,RM],
    '已观察A9/A10跨幕回复为当时缺失HP的80%向下取整，不是固定满血',
    '同最大HP的F17→18/F33→34转换按⌊(最大HP−当前HP)×0.8⌋；更低阶/其他先古交互未核',
    '与营火、开场遗物、复活及SL恢复分账，不预支未来回复',
    f'{R7} A10 F17→18为28/70→61/70，补⌊42×0.8⌋=33。{RM}为19/70→59/70，补⌊51×0.8⌋=40；小血瓶开场2另算，末战SL恢复1→10三次共27不是幕间回复')

changes = []
for e in after['entries']:
    if e['id'] not in spec and e['id'] not in ['silent-route-hp-observation','silent-rest-buffer-observation']:
        continue
    old = copy.deepcopy(e)
    s = spec.get(e['id'])
    runs = s['runs'] if s else [R7, RM]
    for run in runs:
        assert M[run]['character'].lower() == 'silent'
        assert run not in e['evidence']
        e['evidence'].append(run)
    n = e['n_support'] = len(e['evidence'])
    e['last_seen'] = '2026-10-08'
    e['confidence'] = 'high' if (n >= 5 and e['n_contradict'] <= n/3) or (n >= 4 and e['n_contradict']==0 and s) else 'med' if n>=2 else 'low'
    if s:
        e['lesson'] = f"{s['conclusion']}。机制：{s['mechanism']}。搭配：{s['pairing']}。决定胜负的战斗：{n}支持局/{e['n_contradict']}反例，局部机制收益已核，单卡整战因果未控（n={n}）。典型案例：{s['case']}。"
    elif e['id']=='silent-route-hp-observation':
        rows=[r for r in A['bands'] if r['asc']==10 and r['act']==2 and r['type']=='Monster']
        nums='、'.join(f"{r['band']}{r['n']}房{r['deaths']}死" for r in rows if r['n'])
        e['lesson']=f'观察：按入房HP核下一战血价，未来营火和无精英路线不当已有缓冲。A10共78局，二幕Monster：{nums}；各阶/幕/房型分列，非因果（n={n}）。典型案例：{RM} F19入59胜46、F20入46胜8，开场各补2另列；F23入8补10四试0赢、F24火未到。{R7} F28休51→70后F30胜耗3，67血进精英仍败。'
    else:
        r=json.load(open(O/'rest-summary.json'))[-1]
        e['lesson']=f"观察：只计已完成回复，后战胜负另核，不预支未到营火。A10 {r['runs']}局{r['rests']}火/{r['heal']}回血实回{sum(r['gains'])}，去重{r['nexts']}后战{r['deaths']}死（{r['deaths']/r['nexts']*100:.2f}%），活损中位{r['median']}；A8七后战0死/A9十五后战1死（n={n}）。典型案例：{R7}三次休息补61/幕间33，无SL；{RM}两次休息补57/幕间40/开场14/SL恢复27分账，赢走廊耗血后未到首火，无锻造/改线受控胜因。"
    changes.append(dict(id=e['id'],before=old,after=copy.deepcopy(e),new_runs=runs))

new=dict(id='silent-myte-toxic-block-sl-observation',scope='hallway:MYTE',asc=[10,20],
         lesson=f'观察：异螨同抽重打的持牌伤与攻击必须合核，全败模拟不证明少挡换伤更安全。机制：{RM}四试T3同10血、敌61/65与41/64；两毒素各5伤加实际4+13攻击共需27挡。搭配：速度药5敏由挡牌兑现，Jev原选与SL代码覆盖分账。决定胜负的战斗：一场四试0赢，前三T3迷雾+/速度/两防御/妙计29挡零损、净扣13；末SL加打击且删防御为19挡损8、净扣19，未杀且T5实死，前三T6判死中断不算三次实死（n=1）。典型案例：{RM} A10 F23末T5毒杀#2却#1仍29血，2血0挡对13攻击归零，预计剩HP−11吻合；原线/提前磨蚀整战能否赢未知，不禁止全部探索。',
         evidence=[RM],n_support=1,n_contradict=0,confidence='low',last_seen='2026-10-08',status='active')
after['entries'].append(new)
changes.append(dict(id=new['id'],before=None,after=copy.deepcopy(new),new_runs=[RM]))
mapping={eid:s['ledger'] for eid,s in spec.items()}
mapping.update({'silent-route-hp-observation':['silent-0019'], 'silent-rest-buffer-observation':['silent-0020'],new['id']:['silent-0079']})
after['version']='2026-10-08.6'
after['_about']=f'静默经验仅来自本角色复盘与实盘。第89次增量合并{R7}/{RM} A10，截至{A["cutoff"]}共{len(M)}完局；旧116局七数组、血档、节点转移、实回复及SL重新复算一致。毒、持牌伤、力量/敏捷、接续与回复来源分账；新经验及改动经CLI关联账本/独立strategy-proposal，不改打法源码。'
active=[e for e in after['entries'] if e['status']=='active']
result=dict(added=[new['id']],updated=[c['id'] for c in changes if c['before']],retired=[],entries=changes,
            active_before=sum(e['status']=='active' for e in B['entries']),active_after=len(active),
            chars_before=sum(len(e['lesson']) for e in B['entries'] if e['status']=='active'),chars_after=sum(len(e['lesson']) for e in active),
            confidence=dict(collections.Counter(e['confidence'] for e in active)),
            applicable={str(a):dict(entries=len(es),chars=sum(len(e['lesson']) for e in es)) for a in [8,9,10] for es in [[e for e in active if e['asc'][0]<=a<=e['asc'][1]]]})
assert result['chars_after']<=60000
for e in active:
    assert e['n_support']==len(set(e['evidence']))
    assert all(M[r]['character'].lower()=='silent' for r in e['evidence'])
K.write_text(json.dumps(after,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
(O/'spec.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2)+'\n')
print({k:v for k,v in result.items() if k!='entries'})
