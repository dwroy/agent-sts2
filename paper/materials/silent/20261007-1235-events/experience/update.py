import collections,json,re
from pathlib import Path
O=Path(__file__).parent;P=Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json')
B=json.load(open(O/'experience-before.json'));E=json.loads(json.dumps(B));by={x['id']:x for x in E['entries']};R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};N='MCT1GPTL8D35'
assert B['version']=='2026-10-07.16' and len(R)==89
assert all(x['identical'] for x in json.load(open(O/'baseline-check.json')).values())
lessons={
'silent-strength-weak-observation':'力量逐击增伤，敏捷逐挡牌增挡；虚弱逐击取整，临时减力不关闭后续独立成长。机制：段数放大力的增减，牌挡/被动挡分核；技能亦可能触发敌成长。搭配：现场力敏、段数、来袭与可活轮一起验收。决定胜负的战斗：85支持局，各子公式及整战胜因分账（n=85）。典型案例：MCT1GPTL8D35 A10沙虫T6敌3→−3力，同有弱的两击9→4、总18→8，T7恢复3力且攻25；史莱姆末T6敌3力四击8合32，8挡需损24、7血差17。TDLBRNA0R05B A10实验体萎靡+加减各3仍18力，弱34→25。',
'silent-afterimage-per-card-block':'余像建立后按实际出牌次数补挡，建立本身不触发自己的首次挡。机制：1层每次后续出牌加1，重放再触发，脆弱不折被动；卡牌/遗物挡另算。搭配：多牌兑现被动挡，未建立不预支，新战重建。决定胜负的战斗：19支持局、整战单项胜因未控（n=19）。典型案例：MCT1GPTL8D35 A10沙虫胜试T7四次出牌逐次0→1→2→3→4挡，对25攻击实损21，63血九轮损54余9胜；原试也建立余像却T7判死。YLYLZWHA0GKU F33 T8双防御10加五次被动5覆盖14，2血撑到T9毒杀。',
'silent-piercing-wail-temporary-strength':'尖啸临时减力须按当前攻击核，次轮撤回后重算。机制：普通/升级减6/8，逐击核力量、虚弱及技能污染；独立成长继续。搭配：多段放大当轮减伤，实际挡及后轮威胁另算。决定胜负的战斗：40支持局，当轮有效不保整战（n=40）。典型案例：MCT1GPTL8D35 A10沙虫两试T6均3→−3力且保留弱，两击9×2→4×2省10威胁；胜试余像另给1挡，T7恢复3力、25攻穿4挡损21。KQQELQSZ382Z A10族母T5双击20→8、8挡零损，T6恢复0力14攻穿9挡损5。',
'silent-poisoned-stab-components':'带毒刺击直伤与施毒分列，尚存毒不算已伤。机制：普通/升级基础攻击6/8、施毒3/4；力/弱/易伤改攻击，制品可阻毒，結算后减1，触媒与剩血截断另核。搭配：已建毒和被动挡分别验收，生存轮数限定兑现。决定胜负的战斗：23支持局，无单卡整战胜因（n=23）。典型案例：MCT1GPTL8D35 A10史莱姆首试T4毒刺184→178直6、毒11→14另3，不即时结算；末T6随后8毒仅80→72，未斩且玩家先死。沙虫胜试T9的19毒截扣剩9血、取消22攻击，混合来源不归单张毒刺。',
'silent-insatiable-dual-clock':'沙虫的沙坑与攻击分别核，延长沙坑不等挡攻击；未来能力/毒不预支。机制：沙坑归零判死、逃离实加1，毒按真实结算与剩血兑现，持续增益仅已建后贡献。搭配：当前来袭、血池与可活输出窗口共同验收。决定胜负的战斗：12支持局34试9赢，真正重打8场30试5赢，单组件胜因未控（n=12）。典型案例：MCT1GPTL8D35 A10两试63血、初28项抽序同但到手轮仅前10同；首试T7敌56、18血4挡对25差3而读档；胜试T7逃离两次加沙坑仍损21，T9以19毒杀9血、免22攻击，余9过。跟踪未建立，动作/后抽同变，不单归余像、尖啸或运气。HSX4HYATB4E2 A10胜试滚石实扣140、其他行动与毒192及开场9合341，非单组件对照。',
'silent-berserker-growth-sl-observation':'观察：狂战士同盘换成长须记当轮血价，无胜次对照不立必胜打法。机制：力量逐击、弱不清力；实建能力与后续收益分核，毒等结算。搭配：当前挡/血量、后轮需伤一起验收，同死率不抹血价。决定胜负的战斗：5支持局，A9一败/A10四局两过两死；真正重打2场8次0赢（n=5）。典型案例：MCT1GPTL8D35 A10四次34/75，首/第二T4完整同盘、4能量；防御换谋划专家后同扣52，挡8→0、损19→27多8血，五轮两线24/24死不代表等价；四次均T6截断或死，末8毒扣至72、7血8挡对32差17。LS8035TB32P3 A10同盘换毒多18伤付2血少2敏，四次0赢。',
'silent-lords-parasol-shop-acquisition':'领主阳伞遇商人自动取得库存，报价与未派发购买/移除计划不计支出。机制：实到商店后库存进入牌组/遗物，附魔与移除选择另核，金币按状态差计算。搭配：新增组件须实际施放建立，未来商店不能当已取得；库存变化不隔离单遗物收益。决定胜负的战斗：3支持局，替路线或无阳伞整战对照未控（n=3）。典型案例：MCT1GPTL8D35 A10 F37七牌/三遗物使牌30→37、移除精确切击后36，金币114不变，两条100金移除计划未派发；F42四败，F45商店未到。Z6CFLDR3N4SB A7 F36牌28→35→34、金157不变，F45牌37→44→43、金121不变。旧2SU6XN2AEJRD A6原句：',
'silent-deck-burst-observation':'观察：持有/计划与实际能力收益分账，开场资源不等持续攻防。机制：能力须实到、施放、建立、触发；生存窗口限定毒与防御兑现，新战重建、阶段另核。搭配：剩血、来袭、到手/出牌限制共同验收。决定胜负的战斗：84支持局，替构筑单卡胜因未控（n=84）。典型案例：MCT1GPTL8D35 A10末37牌，史莱姆四试建跟踪，仅第二建谋划专家且T4多付8血、未换来更多当轮伤，四试毒雾均未建；末六轮扣209仍缺72。沙虫胜试未建跟踪、九轮扣341余9，不以首轮71认单卡胜因。TDLBRNA0R05B A10女王已建5雾毒胜，下场未建雾、不预支旧层。',
'silent-route-hp-observation':'观察：无精英路线与未来营火不保证当前安全，改线优劣未受控。截至89静默局，A10 49局627战房49死；三幕Monster40–60%十二房十局3死=25%、活损中位17，≥60%四十五房十九局2死=4.44%、活损中位18；敌人/构筑混杂，不立血线因果。典型案例：MCT1GPTL8D35 A10三幕计划三火无精英，F35/38/39实损11/1/39，F40才回22至34，F42四败；F43/47火与F45店未到，F39投影29而实51不能外推下一战安全。',
'silent-rest-buffer-observation':'观察：回血增加实有缓冲，不保证后战过关，未执行锻造不作受控比较。A8一局9火8回血回111、后战7/0死；A9三局21火16回血回341、后战15/1死；A10 49局276火187回血/89非回血动作、实回4513，去重后战177/25死=14.12%、活损中位25。典型案例：MCT1GPTL8D35 A10四回血共85，F40 12→34后史莱姆四次34血进场仍败；F43/47未到。TDLBRNA0R05B A10末火43→64后女王66→2、下战4血，进战遗物回复另算（n=89）。'
}
changes=[]
for eid,lesson in lessons.items():
 e=by[eid];old=e['lesson'];drugs=[s for s in re.split(r'(?<=[。！？])',old) if '药' in s]
 e['lesson']=lesson+''.join(drugs)
 for s in drugs:assert s in e['lesson']
 assert N not in e['evidence'];e['evidence'].append(N);e['n_support']=len(e['evidence']);e['last_seen']='2026-10-07'
 e['confidence']='high' if e['n_support']>=5 and e['n_contradict']<=e['n_support']/3 else 'med' if e['n_support']>=2 else 'low'
 changes.append(dict(id=eid,runs=[N],n_before=e['n_support']-1,n_after=e['n_support'],chars_before=len(old),chars_after=len(e['lesson']),preserved_potion_sentences=drugs))
E['version']='2026-10-07.17';E['_about']='静默经验只来自本角色复盘与日志。第71次增量截至MCT1GPTL8D35结束2026-10-07T03:22:52.000Z，89完局；旧88局七数组/血档/源节点/回血/SL逐行复算一致。补尖啸临时减力、余像逐牌挡、毒兑现、SL同盘血价、阳伞实到取得及路线/休息/构筑观察。局部机制与整战因果分账，未建立能力/未来恢复不预支；无新用药规则。'
for e in E['entries']:
 assert e['n_support']==len(set(e['evidence']))==len(e['evidence']) and e['n_contradict']==len(e.get('contradicting',[]))
 for run in e['evidence']+e.get('contradicting',[]):assert re.fullmatch('[0-9A-Z]{12}',run) and R[run]['character'].lower()=='silent'
for e in B['entries']:
 if e['scope'].startswith('potion:') or e['scope']=='general:potion':assert e==by[e['id']]
active=[e for e in E['entries'] if e['status']=='active'];chars=sum(len(e['lesson']) for e in active);assert chars<=60000
C=dict(old_version=B['version'],version=E['version'],added=[],updated=list(lessons),retired=[],old_active=sum(e['status']=='active' for e in B['entries']),active=len(active),old_chars=sum(len(e['lesson']) for e in B['entries'] if e['status']=='active'),chars=chars,confidence=dict(collections.Counter(e['confidence'] for e in active)),applicable={str(a):dict(entries=len(z:=[e for e in active if e['asc'][0]<=a<=e['asc'][1]]),chars=sum(len(e['lesson']) for e in z)) for a in [8,9]},diff=changes)
P.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n');(O/'changes.json').write_text(json.dumps(C,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in C.items() if k!='diff'},ensure_ascii=False))
