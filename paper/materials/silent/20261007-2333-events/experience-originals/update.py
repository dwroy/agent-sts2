import collections,copy,json
from pathlib import Path
O=Path(__file__).parent;K=Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json')
X=json.load(open(O/'experience-before.json'));Y=copy.deepcopy(X);M={e['id']:e for e in Y['entries']};A=json.load(open(O/'audit.json'));R=json.load(open(O/'rest-summary.json'))[-1];T='TXZ6RVMQA09D';W='WQZVENQ7DTRP'
U={}
def add(eid,runs,conclusion,mechanism,pairing,case):
 n=len(set(M[eid]['evidence'])|set(runs));extra=''
 if eid in ['silent-aeonglass-artifact-growth-sl','silent-insatiable-dual-clock']:
  h=json.load(open(O/'historical-facts.json'))[eid];extra=f"真正重打{h['sl_fights']}场{h['sl_attempts']}试{h['sl_wins']}次赢；"
 U[eid]=(runs,f'{conclusion}。机制：{mechanism}。搭配：{pairing}。决定胜负的战斗：{n}支持局，{extra}局部机制收益与整战因果分账（n={n}）。典型案例：{case}')
add('silent-royal-poison-blood-vial-opening-net',[T],'王室猛毒开场净血价按实际遗物组合核，出牌前失血不能预支用药或能力补救','无小血瓶A10五场各净失4；同持小血瓶旧A10两场各净失2，组合中间帧不足，内部先后未知','茶/休息实际回血与开场扣血分账，连战须核下一战可操作入口',f'{T} F43/45/46/48/49出牌前70→66、52→48、62→58、60→56、4→0；F49实验体111血、22攻击未执行。VPW8YH7A4QFM小血瓶组合80→78、47→45；不拆未知回血顺序')
add('silent-footwork-block',[W],'步法普通/升级建2/3敏捷，逐张挡牌兑现、不追补已有挡','卡牌基础挡加当前敏捷再核脆弱，被动挡另算；多张步法已见叠加','多挡牌重复受益，能力须先实建',f'{W} A10沙虫六试T1两普通步法建2→4敏，防御5→9、生存者8→12、斗篷6→10；末T7防御加生存者21，比零敏13多8，仍对25实损4；T11只有9挡，不能把四敏当自动挡')
add('silent-strength-weak-observation',[T,W],'力量逐击影响攻击、敏捷逐张影响牌挡，临时增减与独立成长分账','按当前力量核每段攻击/虚弱，卡牌基础挡加敏捷再核脆弱；毒和遗物挡另算','多击/多张挡牌重复兑现，临时撤层不抵销永久成长',f'{W} 沙虫末T3尖啸临时0→−6力、虚弱23→18，22牌挡零损；T6力3中和后9×2无挡损18。{T} 沙漏未弱同招力9→15、35→41；药后临时玩家3力次轮消失，毒不因此增伤')
add('silent-deck-burst-observation',[T,W],'观察：持有、计划与本战已建能力分账，支付和生存窗口限制持续攻防兑现','轮初补毒、结束结算与逐牌挡分时点，换战清前场能力，未取得组件收益0','敏捷/余像/毒源先实建，连战按真实剩血和开场血价验收',f'{T} 沙漏已建5毒雾/2触媒后T8实结114，T10毒杀留4，下一战开场耗尽且能力清空；未取得计划步法/蜃景。{W} 两步法4敏确实增加牌挡，但触媒/余像/蜃景未取得，末敌余56，不能预支计划输出')
add('silent-noxious-fumes-growth',[T],'毒雾普通/升级建2/3层，后续玩家轮初补毒，建立不即时施毒且可叠加','无阻挡每轮补a；k触媒至多结k+1次、逐次毒减1，毒充足时净变a−(k+1)','毒源/触媒须实建并活到结算，制品/换战另核',f'{T} A10沙漏末T5雾总5，T8轮初30→35、迷雾再至39，结束39+38+37=114；T10补至43后潜在126只扣剩108。YF0LXT1QSTGG新阶段零毒时触媒无伤')
add('silent-accelerant-triggers',[T],'触媒增加毒结算次数、不倍增毒层，普通/升级建1/2且不自施毒','k层至多k+1次，每次毒减1且零停止；普通p≥2为2p−1、升级p≥3为3p−3，剩血/限伤/阶段另核','毒雾补量与额外消耗分账，无毒无收益',f'{T} A10沙漏末T8触媒+建2，39毒三结114使388→274；T9三结120加直伤46使274→108；T10潜在126按108血截断，玩家仍失7血。YF0LXT1QSTGG新阶段零毒建2无额外毒伤')
add('silent-afterimage-per-card-block',[T],'余像按建立后实际出牌次数补挡，能力自身不触发自己的首次挡','已见1层后续每牌+1，重放再触发，脆弱不折被动，牌挡/遗物挡分源','多牌提供重复挡，费用/时点与可活窗口共同核',f'{T} A10沙漏末T10起钗7，普通防御牌面5另余像1使7→13；未建敏捷，不把6都算敏捷牌挡。水盆末补4后两凋萎24减总17实损7，首战胜仍后场死')
add('silent-sai-start-block',[T],'钗的挡在回合开始建立，不能替代后续全部防御','已核起始7挡，卡牌挡/敏捷/余像分来源，不外推未见版本','为毒成长启动供底挡，来袭超过总挡仍花血',f'{T} A10沙漏末T10出牌前0→7，防御5与余像1再至13，水盆4另算，11血仍因状态净损7。ZVYUL2YP3518钗7加锚10只首轮起17，之后起7')
add('silent-ripple-basin-no-attack-block',[T],'波纹水盆在已见无攻击回合末补4挡，敏捷/脆弱不改这4','卡牌挡与条件被动挡分源，已建毒按真实结算兑现，未有内部结算全序帧','毒防可并行，但仍合核持牌状态与血池，不定弃攻规则',f'{T} A10沙漏末T10无攻击、13挡加水盆4，两张各12凋萎合24，11→4净损7并毒杀；不推凋萎/毒内部顺序。E6AVMMVCSRPC负2敏仍补4，牌挡1+4对18仍死')
add('silent-wither-end-turn-loss',[T],'凋萎末回合伤与攻击/格挡合核，毒斩杀仍可能留持牌失血','按现场3/6/9/12文本算，结算中间帧不足，不补造状态/攻击/毒内部全序','牌挡/遗物挡与持牌状态一起算，未派发结束不预支毒',f'{T} A10沙漏末T10敌108/毒43，潜在126按108截断毒杀，但两张12减牌挡13及水盆4仍11→4损7；41意图未当已攻击。K3676LU8B0UH毒杀9血敌、两张12使29→5')
add('silent-aeonglass-artifact-growth-sl',[T],'观察：沙漏制品、力量成长、凋萎和实际启毒一起核，首战胜仍须验续战入口','暴露已见清3制品，毒/弱从实际建立时点算，毒杀不免持牌伤','真实剩血/药水接续下一战，未校准模拟不作必死证据',f'{T} A10沙漏三试末胜，前T8/T10判死；末T2暴露去3制品后建弱，T6换冒泡+刺击为冒泡+羽化省3血少9伤，后轮也变；T10毒杀留4、F49开场死，不能单归换牌胜因。HSX4HYATB4E2六试0赢、末敌377')
add('silent-insatiable-dual-clock',[W],'沙虫沙坑与攻击分别核，延长沙坑不等挡攻击，未来能力/毒不预支','逃离已见加1，沙坑归零判死；毒按真实结算和剩血核，死亡帧未列内部先后','当前来袭、可活输出与沙坑窗口共同验收，SL同盘多伤须并记血价',f'{W} A10六试0赢；第2/3试T9同指纹，扣24/损13→扣39/损22，多15伤付9血；末T7防御换逃离同扣24却损0→4、沙坑4→5。末T11沙坑1、9血9挡对27，25毒使81→56后HP0；攻击/沙坑先致死未知。MCT1GPTL8D35赢次T9毒杀9血免22攻击，后抽/动作也变')
add('silent-well-laid-plans-retention',[W],'计划妥当让已见版本未打手牌跨轮保留，保留不等施放或新增手位','实建WELL_LAID_PLANS_POWER=1后跨轮不弃手牌；只核已见版本，不套其他游戏保留数量','保留等待毒/费用条件，也要并核生成小刀的实际空位',f'{W} A10沙虫第5试T8才建能力，T9—11轮初均10手；T11八手连喝三瓶狡诈只添2/0/0刀、打两刀12伤仍判死。1HC609GTLGN3 A0族母保留冒泡至目标有毒再施放并胜，单卡整战因果未控')
add('silent-infested-prism-tainted-skill-cost',[W],'感染棱柱技能的挡/毒收益须合算污染逐击血价，能力不加污染','火花N使每技能加N污染、当前每段攻击增对应值，下一玩家轮污染撤；A10已见T1—4火花3、T5—8为6、T9为9','技能增加毒或挡也增当前威胁，弱/力和段数逐项核，不一概禁技能',f'{W} A10 T1步法建2敏不添污染，两毒药使污染0→3→6、虚弱单击12→15→17；T3蛇咬/冒泡令三击6→9→12，26毒实扣26却零挡实损36，五轮80→16损64仍赢；T5火花3→6')
add('silent-piercing-wail-temporary-strength',[W],'尖啸临时降力按当前攻击段数兑现，不当恒定挡或永久降力','普通/升级减6/8，逐击加当前力量再核弱，下一轮临时恢复与成长分账','多击重复受益，仍需真实牌挡，不能预支到后轮',f'{W} A10沙虫末T3力0→−6、已有弱的23→18；生存者12+斗篷10=22零损，下轮负力消失。T6力3中和后9×2无挡仍损18，末T11力6弱后27，9挡不足')
add('silent-haze-group-poison-weak',[T,W],'迷雾群毒与当轮虚弱分别核，施放不即时扣本体','普通/升级4/6毒及1/2弱，结束毒结算后减1；弱不清敌持续成长，阻挡/附毒另核','群毒需活到结算，棱柱技能污染与减伤分账',f'{W} A10沙虫末T2迷雾+施6毒/2弱令9×2→6×2，零挡实损12；{T} 沙漏末T8补毒35、普通迷雾至39，触媒+三结114；持凋萎失血未获豁免。KEN58SH9SLZ6钙化虚弱后仪式仍成长')
add('silent-reptile-trinket-temporary-strength',[T],'观察：爬行动物饰品药水动作建立临时力量，次轮撤临时部分','已见单次+3、两药叠6，永久力另留；不外推全部药水或未见触发条件','当前多段攻击兑现临时力，毒雾/触媒不是力量攻击收益',f'{T} A10沙漏三试T3虚弱药各建临时3力，次轮撤去；末T8/9的114/120毒不是这3力收益。CSBR5CRDWQNB A2已有永久2时药后总5、次轮2；ZE8F192FKX24两药临时6次轮消失')
for eid in ['silent-route-hp-observation','silent-rest-buffer-observation']:
 if eid=='silent-route-hp-observation':
  rows=[r for r in A['bands'] if r['asc']==10 and r['act']==2 and r['type']=='Monster' and r['band'] in ['<25%','25–40%']];by={r['band']:r for r in rows}
  text=f"观察：按实际入血与下一战敌人核路线血价，未来营火/无精英不保证安全。A10共{R['runs']}局，二幕Monster<25%为{by['<25%']['n']}房{by['<25%']['deaths']}死、25–40%为{by['25–40%']['n']}房{by['25–40%']['deaths']}死；A8一局/A9三局另列。典型案例：{W} F25满血赢仍损64至16，餐券两次各15、两后火各24，沙虫仍仅56/80；{T} 首boss留4却次战开场死。MGA0CZDDKC0P休22→43后走廊损17活、D4LJ9QMGFB8Q事件13后走廊死，敌/牌/间隔不同，无改线因果（n=107）。"
 else:
  text=f"观察：只计实际完成回复，后战胜负另核、不预支未来营火。A10 {R['runs']}局{R['rests']}火/{R['heal']}次回血实回{sum(R['gains'])}，去重{R['nexts']}后战{R['deaths']}死（{R['deaths']/R['nexts']:.2%}）/活损中位{R['median']}；A8七后战0死/A9十五后战1死。典型案例：{W} 四回血93、餐券30、梨子10/幕间27各分账，SL恢复234不算回血；{T} 五回血102另事件休21、茶49，末42→60回血18后首boss胜留4、次战开场死，SL93另计；无另选锻造的整战对照（n=107）。"
 U[eid]=([T,W],text)
changes=[]
for eid,(runs,text) in U.items():
 e=M[eid];before=copy.deepcopy(e)
 for r in runs:
  assert r not in e['evidence'],(eid,r);e['evidence'].append(r)
 e['n_support']=len(e['evidence']);e['lesson']=text;e['last_seen']='2026-10-07';n=e['n_support'];c=e['n_contradict']
 e['confidence']='high' if n>=5 and c<=n/3 else 'med' if n>=2 else 'low'
 changes.append(dict(id=eid,before=before,after=copy.deepcopy(e)))
CH=json.load(open(O/'cunning-history.json'));support=CH['support'];assert set(support)<=set(CH['support']);assert not CH['unexplained']
new=dict(id='silent-cunning-potion-shiv-capacity',scope='potion:CUNNING_POTION',name='狡诈药水',asc=[0,20],lesson=f'狡诈药水已见有手位时生成3张升级小刀，容量不足只添实际空位。机制：9局42饮中2—7手37次各添3、8手2次各添2、10手3次添0，上限10仅限本药观测；满手仍耗瓶、HP/能量/敌血不变。搭配：计划妥当保留手牌后须核空位，先出刀再喝的完整胜线未实打，不定饮用门槛。决定胜负的战斗：9支持局/0反例（A7一/A9一/A10七），容量不足仅A10一局18饮中的末六饮（n=9）。典型案例：{W} A10沙虫第5试八手连喝添2/0/0，末试五手添3/2/0；分别实打2刀12伤、5刀30伤，均败。SADL3CGYTGSR A7 F8三手→六手、NB8KCF6HRGVF A10 F31五手→八手各添三刀，尚无穿插用药整战对照。',evidence=support,n_support=9,n_contradict=0,confidence='high',last_seen='2026-10-07',status='active')
Y['entries'].append(new);changes.append(dict(id=new['id'],before=None,after=new));Y['version']='2026-10-07.28';Y['_about']='静默经验仅来自本角色复盘与日志。第82次增量合并TXZ6RVMQA09D、WQZVENQ7DTRP（A10）及死亡先后勘误，截至2026-10-07T13:55:26.934Z共107完局；旧105局七数组、血档、源节点、回血及SL逐行复算一致。王室猛毒无小血瓶开场4血与旧组合2血分列；狡诈药水生成/满手耗瓶、保留容量、敏捷/毒与被动挡分别核实。同盘SL输出血价、前boss获胜与后boss入口分账，未观测结算全序保持未知。关联CLI账本和独立strategy-proposal，本任务未改策略源码。'
K.write_text(json.dumps(Y,ensure_ascii=False,indent=2)+'\n');C=dict(added=[new['id']],updated=list(U),retired=[],entries=changes)
for phase,x in [('before',X),('after',Y)]:
 es=[e for e in x['entries'] if e['status']=='active'];C[phase]=dict(version=x['version'],active=len(es),chars=sum(len(e['lesson']) for e in es),confidence=dict(collections.Counter(e['confidence'] for e in es)),asc={str(a):dict(entries=len(ss:=[e for e in es if e['asc'][0]<=a<=e['asc'][1]]),chars=sum(len(e['lesson']) for e in ss)) for a in [8,9,10]})
assert C['after']['chars']<=60000
(O/'changes.json').write_text(json.dumps(C,ensure_ascii=False,indent=2)+'\n');print(C['before']);print(C['after']);print('更新',len(U))
