import collections,copy,json
from pathlib import Path
O=Path(__file__).parent; K=Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json');X=json.load(open(O/'experience-before.json'));Y=copy.deepcopy(X);M={e['id']:e for e in Y['entries']};N='KEN58SH9SLZ6';S=json.load(open(O/'speed-history.json'))
texts={
'silent-footwork-block':'步法普通/升级建2/3敏捷，逐张挡牌兑现、不追补已有挡。机制：基础挡加当前敏捷再核脆弱，临时敏捷与被动挡另算。搭配：多挡牌/重放重复受益，能力本身无挡。决定胜负的战斗：62支持局，局部收益不等整战胜因（n=62）。典型案例：KEN58SH9SLZ6 A10异鱼末试T8未建步法，两防御各5；T9才建2敏，T10/12防御各7仍损14/13，T13无挡牌不能兑现。KV0JHNJCKXLS恶魔T8重放防御14比零敏10多4仍少2挡。',
'silent-strength-weak-observation':'力量逐击影响攻击、敏捷逐张影响卡牌挡，临时减益与独立成长分账。机制：当前力量逐段核虚弱，卡牌挡加敏捷再核脆弱；仪式增力未因虚弱停止，毒/遗物挡另算。搭配：多段攻击与多张挡牌重复收益，能力须实建。决定胜负的战斗：101支持局，各子公式分母不同（n=101）。典型案例：KEN58SH9SLZ6 A10 F5仪式2令T3/4/5力2/4/6、同招13/15/17；T4两敌各15对5挡损25。KV0JHNJCKXLS恶魔加3力使三击9×3→12×3多9。',
'silent-route-hp-observation':'观察：按实际入血与下一战敌人核路线血价，未来营火/无精英不保证安全。A10共65局，一幕Boss≥60%为47房9死；二幕Monster<25%为7房3死、25–40%为6房2死，A8一局/A9三局另列。典型案例：KEN58SH9SLZ6 F5赢损37至16后改无精英线，F11问号战再损6；两火补56、事件补16、潜水付7后75/86空药栏，异鱼六败。MGA0CZDDKC0P低血休22→43后走廊损17活、D4LJ9QMGFB8Q事件13后走廊死；敌/牌/间隔不同，改线因果未知（n=105）。',
'silent-rest-buffer-observation':'观察：只计实际完成回复，后战胜负另核、不预支未来营火。A10 65局354火/245次回血实回5826，去重227后战36死（15.86%）/活损中位24；A8七后战0死/A9十五后战1死。典型案例：KEN58SH9SLZ6两火加湿器各增5上限，26/76→53/81回27、46/81→75/86回29；后战蚌零损却耗两药、异鱼死，SL恢复348另计。YQL8RZ8BWN1E两回血共50仍巨兽死，缺另选锻造整战对照（n=105）。',
'silent-deck-burst-observation':'观察：持有、计划与本战已建能力分账，支付和生存窗口限制持续攻防兑现。机制：增益只在后续相关牌/结算兑现，无实体限制实伤、毒层不等已扣血。搭配：抽牌/防御/敏捷须实际取得和打出，不将能力分数预支为挡。决定胜负的战斗：100支持局，组件整战因果未控（n=100）。典型案例：KEN58SH9SLZ6 A10计划毒雾/毒药/触媒均未取得，21牌未升级；末试前四轮扣85、13轮扣186仍余35，步法T9才建，末6血0挡对9死亡。T2护栏省10血多4即时伤但取消4毒，原线长期代价未知；不断言补毒/早建/锻造必胜。',
'silent-poisoned-stab-components':'带毒刺击直伤与施毒分列，尚存毒不当已伤。机制：普通/升级基础攻击6/8、施毒3/4，力/弱/易伤改攻击，制品可阻毒；结算减1，触媒/无实体/剩血另核。搭配：实际施毒可供蜃景牌挡，生存轮数限制净输出。决定胜负的战斗：26支持局，无单卡整战胜因（n=26）。典型案例：KEN58SH9SLZ6 A10异鱼末T8直伤6、毒5→8结8合14，损2；T10无实体下6毒仅扣1仍降层。KV0JHNJCKXLS恶魔毒结15后回30，敌327→342，不当毒未生效。',
'silent-haze-group-poison-weak':'迷雾同时给存活敌人施毒/虚弱，施放与毒结算分开。机制：普通/升级牌面4/6毒及1/2弱，施放不直接扣本体；毒按现场层数结束结算再减1，阻挡/额外增毒另核。搭配：群毒与当轮弱分别核，虚弱不清敌仪式成长。决定胜负的战斗：11支持局，单牌整战胜因未控（n=11）。典型案例：KEN58SH9SLZ6 A10 F5 T2普通迷雾使钙化11→8但后轮仍加力；异鱼末T6给4毒/1弱，结4后留3，持呼唤仍失6。DUZUBAJ3A8GP F27升级毒2→8且HP仍101，结束扣8至93。',
'silent-ornamental-fan-attack-block':'精致折扇按本回合攻击牌次数补被动挡，与敏捷牌挡分源。机制：已见第三张攻击补4；A4脆弱下遗物4与余像1同次分别兑现，零X攻击仍计一牌。搭配：小刀提供攻击次数，余像组合仅A4一局验证，不把遗物挡再加敏捷。决定胜负的战斗：4支持局，无遗物整战胜因对照（n=4）。典型案例：KEN58SH9SLZ6 A10异鱼末T2第三攻击中和后0→4挡，T3第三攻击小刀后6→10，步法尚未建立，末仍败。9YBKCNBFP0X5 A4女王小刀18→23=余像1+折扇4。',
'silent-beckon-held-end-turn-loss':'呼唤末回合持牌生命代价先于后来毒杀兑现，挡与敌死亡不抵销先行自损。机制：每张失去6生命，已核一/两/三张需6/12/18；打出离手，后抽须重核。搭配：毒可取消敌攻击，不能抵销更早持牌失血，不规定固定出牌顺序。决定胜负的战斗：5支持局，无单牌整战对照（n=5）。典型案例：KEN58SH9SLZ6 A10异鱼末T6无敌攻击仍61→55失6；T10的15攻击减7挡加一呼唤6共损14，T12手空只20−7=13；T13清呼唤仍6血对9死。D4LJ9QMGFB8Q持三张先失18，再33毒收28血敌。',
'silent-fysh-resource-sl-observation':'观察：异鱼SL换线须并核实伤、持牌血价与能力建立，不定固定探索门槛。A10三场真正重打16试1赢：2Y27VAYZDA02第4次赢、751FN9QM9MHQ与KEN58SH9SLZ6各六败，相关尝试不当独立局。典型案例：KEN58SH9SLZ6第4/5试T10同指纹，匕首雨替呼唤只多2伤却多损6，B2 .385→.127；第4/末T5反向换突然一拳省2血，却延步法T5→T9，不能推出省血恒优。2Y27VAYZDA02赢试处理呼唤后毒杀保2血，后续抽牌/动作亦变，单步胜因与运气未隔离（n=3）。'
}
changes=[]
for ident,text in texts.items():
 e=M[ident]; before=copy.deepcopy(e);assert N not in e['evidence'];e['evidence'].append(N);e['n_support']=len(e['evidence']);e['lesson']=text;e['last_seen']='2026-10-07'
 e['confidence']='high' if (e['n_support']>=5 and e['n_contradict']<=e['n_support']/3) or (e['n_support']>=4 and e['n_contradict']==0 and ident=='silent-ornamental-fan-attack-block') else 'med' if e['n_support']>=2 else 'low'
 changes.append(dict(id=ident,before=before,after=copy.deepcopy(e)))
new=dict(id='silent-speed-potion-temporary-dexterity',scope='potion:SPEED_POTION',name='速度药水',asc=[0,20],lesson='速度药水当步加5临时敏捷，须在本轮格挡牌兑现。机制：32局38次实饮均敏捷及速度层+5；35次次轮敏捷净撤5，另3次有步法/口红/预判同时改变敏捷，速度层均消失。搭配：基础挡加现场敏捷后逐牌核脆弱，遗物挡与常驻敏捷分账，不定饮用/留药门槛。决定胜负的战斗：32支持局/0反例，无用药整战受控胜因（n=32）。典型案例：KEN58SH9SLZ6 A10 F5 T2斗篷6→11挡，对8+4只损1，T3敏捷消失；1LMBFGSMCWKU A4已有3敏且脆弱，喝后8敏使防御/残影各6→9、共多6而非10。',evidence=S['support'],n_support=len(S['support']),n_contradict=len(S['contradicting']),confidence='high',last_seen='2026-10-07',status='active')
assert new['n_support']==32 and new['n_contradict']==0
Y['entries'].append(new);changes.append(dict(id=new['id'],before=None,after=new));Y['version']='2026-10-07.27';Y['_about']='静默经验仅来自本角色复盘与日志。第81次增量合并KEN58SH9SLZ6（A10）及勘误，截至2026-10-07T12:23:25.134Z共105完局；旧104局七数组、血档、源节点、回血及SL重算一致。步法/速度临时敏捷、力量与仪式、折扇被动挡、迷雾与刺击毒、呼唤持牌血价分别核实；同盘SL输出/血价/能力时点分账。新增速度药水用32局38次已核实饮用，其他未执行分支不补因果。经验关联账本与独立strategy-proposal，未改策略源码。'
K.write_text(json.dumps(Y,ensure_ascii=False,indent=2)+'\n')
C=dict(added=[new['id']],updated=list(texts),retired=[],entries=changes)
for phase,x in [('before',X),('after',Y)]:
 active=[e for e in x['entries'] if e['status']=='active'];C[phase]=dict(version=x['version'],active=len(active),chars=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),asc={str(a):dict(entries=len(es:=[e for e in active if e['asc'][0]<=a<=e['asc'][1]]),chars=sum(len(e['lesson']) for e in es)) for a in [8,9,10]})
(O/'changes.json').write_text(json.dumps(C,ensure_ascii=False,indent=2)+'\n');print(C['before']);print(C['after'])
