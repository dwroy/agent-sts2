import collections, copy, json
from pathlib import Path

O = Path(__file__).parent
P = O.parents[2] / 'knowledge/characters/silent/experience.json'
B = json.load(open(O / 'experience-before.json'))
Z = copy.deepcopy(B)
E = {e['id']: e for e in Z['entries']}
A = json.load(open(O / 'audit.json'))
R = {r['run_id']: r for r in json.load(open(O / 'run-metadata.json'))}
PD, L2 = 'PD9AYQVMLQW6', 'L2TSFU62Z57Z'

def confidence(n, c=0):
    return 'high' if (n >= 5 and c <= n / 3) or (n >= 4 and c == 0) else 'med' if n >= 2 else 'low'

def change(eid, runs, text):
    e = E[eid]
    for run in runs:
        assert R[run]['character'].lower() == 'silent'
        if run not in e['evidence']:
            e['evidence'].append(run)
    e['n_support'] = len(set(e['evidence']))
    e['confidence'] = confidence(e['n_support'], e['n_contradict'])
    e['lesson'] = text.replace('NN', str(e['n_support']))
    e['last_seen'] = '2026-10-08'

texts = {
'silent-footwork-block': '步法普通/升级建2/3敏捷，逐张挡牌兑现、不追补已有挡。机制：牌基础挡加现场敏捷后核脆弱，被动挡另计。搭配：多张挡牌重复受益，新增敏捷只作用之后的牌。决定胜负的战斗：NN支持/0反例，单卡整战因果未控（n=NN）。典型案例：PD9AYQVMLQW6 A10沙漏末T2/3各建2敏，T10防御9、生存者12比基础合多8，余像另3、带挡8合32；24持牌伤加23攻击仍缺15，3血死亡。',
'silent-gorget-plating': '护喉甲开场覆甲不等于整场固定格挡。机制：实见开场4、后段减少或耗尽，完整减层条件未隔离。搭配：覆甲、敏捷牌挡与余像分源，使用现场层数。决定胜负的战斗：NN支持/0反例，独立胜因未控（n=NN）。典型案例：PD9AYQVMLQW6 A10雕刻师T4有1覆甲，沙漏末T10已0覆甲；32总挡对47完整威胁需损15，不再预支开场4。',
'silent-strength-weak-observation': '力量逐击影响攻击，敏捷逐张影响牌挡，增益与被动挡分源。机制：现场力与弱/易伤逐击核，牌挡加敏后核脆弱，不倒补旧挡。搭配：多击/多张挡重复兑现，毒与覆甲另算。决定胜负的战斗：NN支持/0反例，单项整战胜因未控（n=NN）。典型案例：L2TSFU62Z57Z A10金刚杵1力使匕首雨+两段各7合14；2敏药使斗篷6→8、防御5→7。PD9AYQVMLQW6沙漏4敏令两挡牌多8，仍3血对47威胁/32挡死。',
'silent-deck-burst-observation': '观察：持有、计划与实建能力分账，费用、出牌额度和可活轮数共同限制兑现。机制：牌挡/毒/轮初能力按实际时点核，换战重新建立。搭配：当轮生存与持续输出合核，未建立不预支。决定胜负的战斗：NN支持/0反例，构筑单因未控（n=NN）。典型案例：PD9AYQVMLQW6首boss建触媒2/毒雾3、胜后10血；末沙漏两项未建、敌余244。L2TSFU62Z57Z终组21张无能力/毒源，末试8轮仅扣149/262，阈值清8力后仍败。',
'silent-noxious-fumes-growth': '毒雾普通/升级建2/3层，后续玩家轮初补毒，建立不即时施毒且可叠加。机制：无阻挡每轮补a，触媒k层至多结k+1次且逐次减1；头骨/制品另核。搭配：先实建毒源并活到结算，换战不继承。决定胜负的战斗：NN支持/0反例，单组件胜因未控（n=NN）。典型案例：PD9AYQVMLQW6 A10女王T3毒雾+建3、T10胜；末沙漏未建雾，不能把前战每轮补3搬来。GXNKW8X1XYJP恶魔两普通雾4与头骨轮初补5另分源。',
'silent-accelerant-triggers': '触媒增加毒结算次数，不倍增毒层，普通/升级实建1/2且不即时施毒。机制：k层至多k+1次，每结减1、零停止；普通p≥2为2p−1、升级p≥3为3p−3，限伤/阶段另核。搭配：先实建毒与触媒并活到结算，换战重建。决定胜负的战斗：NN支持/0反例，单组件整战胜因未控（n=NN）。典型案例：GXNKW8X1XYJP A10恶魔29毒三结84。PD9AYQVMLQW6女王T5建触媒+2后胜，末沙漏未建触媒、T10只实际结6毒，敌250→244。',
'silent-afterimage-per-card-block': '余像按建立后实际出牌次数补挡，能力自身不触发自己的首次挡。机制：已见1层后续每牌+1，重放再触发，脆弱不折被动；牌挡/遗物挡分源。搭配：多牌兑现重复挡，费用与出牌限额共同核。决定胜负的战斗：NN支持/0反例，整战单因未控（n=NN）。典型案例：PD9AYQVMLQW6 A10沙漏末T10防御给9牌挡+1余像，打击再1，生存者12牌挡并完成弃牌后再1；带8合32，对24持牌伤+23攻击仍3血死。',
'silent-vajra-opening-strength': '金刚杵在已见战斗开场提供1力量，按实际攻击段数增伤，不提供格挡。机制：无其他修正时每段基础伤加1；族母每次削2，无实体可压每击为1。搭配：多段重复受益，毒/被动伤与牌挡另核。决定胜负的战斗：NN支持/0反例，遗物整战胜因未控（n=NN）。典型案例：L2TSFU62Z57Z A10仪式兽末试打击7、精密瞄准16、匕首雨+两段各7合14、中和4，均每段多1；8轮仅扣149、余113仍死。UACFSW4VDDLD A6无实体两刀各1，不把力直接换作最终伤。',
'silent-wither-end-turn-loss': '凋萎末回合伤与攻击/格挡合核，毒斩杀仍可能留持牌失血。机制：按现场3/6/9/12文本及最终持牌数算，不补造缺帧内部全序。搭配：强制弃牌改变实际持牌伤，卡牌/被动挡分源，未结束不预支毒。决定胜负的战斗：NN支持/0反例（n=NN）。典型案例：PD9AYQVMLQW6 A10沙漏末T9两张9伤在21挡下不损；T10防御添第三张12、生存者弃一张，实两张24先付32挡，再23攻需损15、3血死。TXZ6RVMQA09D毒杀仍持牌损7。',
'silent-rolling-boulder-start-growth': '滚石收益由实建立后的轮初次数兑现，早启动优势仍是观察。机制：普通/升级建5/10，后轮先按当前层群伤再加5；k次理论(5或10)k＋5k(k−1)/2，敌挡/余血/无实体限制实扣，力量加成未核。搭配：格挡维持成长窗口，未活到不预支。决定胜负的战斗：NN支持/0反例，单因未控（n=NN）。典型案例：PD9AYQVMLQW6 A10沙漏末T9敌308、滚石45及7毒使下一轮256；T10显示50层但玩家死亡，未再触发，不能拿50减余244。ZE8F192FKX24 A5末轮滚石实扣50后毒胜。',
'silent-devoted-sculptor-ritual-growth': '雕刻师仪式持续加力，减力/虚弱不关闭成长。机制：仪式按现场及进阶占位符{@10:GAIN:DEVOTED_SCULPTOR:FORBIDDEN_INCANTATION_MOVE:RITUAL_POWER}核；猛烈攻击基础{@10:DMG:DEVOTED_SCULPTOR:SAVAGE_MOVE}加现场力再核弱，已见每轮+9。搭配：实际输出、格挡与保护期限合核。决定胜负的战斗：NN支持/0反例，单项胜因未控（n=NN）。典型案例：PD9AYQVMLQW6 A10 F35 T3—6力6/15/24/33，弱后攻击15/22/29/36；T7尖啸42→36仍38攻对27挡损11，次轮恢复长51力/49攻；T8已有毒结束战斗，57→10净耗47。',
'silent-ceremonial-beast-threshold-growth-sl': '仪式兽跨现场阈值清横冲直撞与第一段力量，后段仍攻击。机制：阈值{@10:POWER:CEREMONIAL_BEAST:PLOW_POWER}、血量{@10:HP:CEREMONIAL_BEAST}按进阶；低阶150/A9—A10实160，横冲基伤{@10:DMG:CEREMONIAL_BEAST:PLOW_MOVE}另核力/弱。搭配：实际伤/已结毒推进阶段，眩晕和昏眩单牌限制分核。决定胜负的战斗：NN支持/0反例，全阶重打6场32试1赢、A10四场24试0赢，转阶段不保证整战胜（n=NN）。典型案例：L2TSFU62Z57Z A10第2试T5中和164→160清6力并眩晕；末T6一拳168→159清8力取消28攻，仍T8受17攻死亡、敌余113。',
'silent-ceremonial-beast-ringing-one-card': '已观察1层昏眩窗口打一张牌后阻止后续牌，余能不等于还能出牌。机制：首牌后其他手牌blocked_by_hook，生成小刀亦受限，只验证1层。搭配：现场可打牌数与当轮攻防合核，药水另计，不外推更高层。决定胜负的战斗：NN支持/0反例，胜败皆有而替首牌未控（n=NN）。典型案例：L2TSFU62Z57Z A10末T8 RINGING1，精密瞄准扣16后余1能、四牌均被钩阻止；无防御/药，17血0挡对17攻死。MTQ0EUBJ3R6T T8只打防御后继续并最终胜。',
'silent-speed-potion-temporary-dexterity': '速度药水当步加5临时敏捷，须在本轮后续格挡牌兑现。机制：逐饮核敏捷/速度项+5、次轮撤回，其他来源变化分账，旧挡不倒补。搭配：每张牌加现场敏捷后核脆弱，常驻敏与被动挡另计，不定留药/时点门槛。决定胜负的战斗：NN支持/0反例，单药整战因果未控（n=NN）。典型案例：L2TSFU62Z57Z A10 F6T2药后5敏/0挡，后防御实给10覆盖9攻、零损胜，下一轮两增益消失。MTQ0EUBJ3R6T四试T3三挡牌29，末少一防御仅19。',
'silent-act-transition-missing-hp-heal': '已观察A9/A10跨幕回复为当时缺失HP的80%向下取整，不是固定满血。机制：同上限F17→18/F33→34按⌊(最大HP−当前HP)×0.8⌋，低阶/其他先古未核；三幕两boss之间无这次跨幕。搭配：营火/开场遗物/复活/SL恢复分账。决定胜负的战斗：NN支持/0反例，资源公式不等胜因（n=NN）。典型案例：PD9AYQVMLQW6 A10异鱼后15/70→59补44，恶魔后5→57补52；首boss58→10后原样10血进第二boss，无治疗。',
}
for eid, text in texts.items():
    runs = [L2] if eid in ['silent-vajra-opening-strength','silent-ceremonial-beast-threshold-growth-sl','silent-ceremonial-beast-ringing-one-card','silent-speed-potion-temporary-dexterity'] else [PD]
    if eid in ['silent-strength-weak-observation','silent-deck-burst-observation']:
        runs = [PD, L2]
    change(eid, runs, text)

asc10 = sum(r['ascension'] == 10 for r in R.values())
bands = '、'.join(f"{b['band']}{b['n']}房{b['deaths']}死" for b in A['bands'] if (b['asc'], b['act'], b['type']) == (10,3,'Monster'))
change('silent-route-hp-observation', [PD,L2], f'观察：赢战也消耗下一场生存量，未来营火不当现有血。A10 {asc10}局三幕Monster：{bands}；各阶/幕/房型另列，非因果（n=NN）。典型案例：PD9AYQVMLQW6 F35赢战57→10，F37喝两药仍10，F39到9，三次火各21后F48入58、胜仅10。L2TSFU62Z57Z F8避一精英但后续精英仍强制；F13火入23而原投影42，替路线未实打。')
t = next(r for r in json.load(open(O/'rest-summary.json')) if r['asc']==10)
change('silent-rest-buffer-observation',[PD,L2],f"观察：只计已完成回复，后战胜负另核，不预支未来营火。A10 {asc10}局{t['rests']}火/{t['heal']}回血实回{sum(t['gains'])}，去重{t['nexts']}后战{t['deaths']}死（{100*t['deaths']/t['nexts']:.2f}%），活损中位{t['median']}；各阶另列（n=NN）。典型案例：PD9AYQVMLQW6六火126仍首boss耗48；L2TSFU62Z57Z两火42、事件回20，boss入65仍六试败；无回血对锻造受控胜负。")
H = json.load(open(O/'historical-potions.json'))
dh = [r for r in H if r['potion']=='DEXTERITY_POTION']
assert all(r['after']['powers'].get('DEXTERITY_POWER',0)-r['before']['powers'].get('DEXTERITY_POWER',0)==2 for r in dh)
change('silent-dexterity-potion-card-block',[PD,L2],f'敏捷药水在已见饮用后增加2敏捷，不追补旧挡。机制：{len(set(r["run"] for r in dh))}局{len(dh)}饮均+2，后续逐牌加现场敏捷后核脆弱。搭配：多张挡牌重复受益，换战不继承，不定喝/留门槛。决定胜负的战斗：NN支持/0反例，时点整战胜因未控（n=NN）。典型案例：L2TSFU62Z57Z A10多尼斯异鸟药后斗篷6→8、生存者8→10、防御5→7；T1仍14攻减8挡损6、T3为21减7损14。PD9AYQVMLQW6三场饮敏捷药均独立核，不算额外HP。')

change('silent-aeonglass-artifact-growth-sl',[PD], '观察：沙漏制品、力量、持牌伤与真实启毒窗口合核，首boss勝须交接续战资源。机制：毒/弱从实际建立算，凋萎按末持牌数，能力换战重建。搭配：同样本接续真实血药，有限推演全死不作SL必死证据。决定胜负的战斗：NN支持/0反例，全阶真正重打14场66试3赢，A10为8场42试1赢（n=NN）。典型案例：PD9AYQVMLQW6 A10女王58→10胜后原样空槽进沙漏，六试0赢，前五判死截断、末T10实死；32挡对24持牌伤+23攻需损15而仅3血、敌余244。F48五轮所选0/6死且0/6赢并非全死，F49首题8/8死仍实际到T10，重问已变线。')
change('silent-queen-poison-main-target',[PD], '观察：女王先杀本体/聚合体均有赢例，无固定击杀序或提前能力必胜因果。机制：本体血按进阶{@2:HP:QUEEN}/{@4:HP:QUEEN}/{@8:HP:QUEEN}读，本体死可终战；弱/脆/易伤改变攻防，爪牙死不关闭成长。搭配：已建毒/余像/敏捷及真实续战血药一起核。决定胜负的战斗：NN支持/0反例，真正重打8场42试2赢，本局首试胜，替代顺序胜因未控（n=NN）。典型案例：PD9AYQVMLQW6 A10 F48滚石/余像后建雾与触媒，T7聚合体退出、T10女王退出，58→10净耗48；T6爪16×3对18挡实耗30，下场空药10血六败。ZZMYZ5UBCG72 A2本体先死而爪余87，不外推固定顺序。')

bronze = [r for r in H if r['potion']=='LIQUID_BRONZE']
assert bronze and all(r['after']['powers'].get('THORNS_POWER',0)-r['before']['powers'].get('THORNS_POWER',0)==3 for r in bronze)
ev = sorted(set(r['run'] for r in bronze),key=lambda n:R[n]['ended'])
eid = 'silent-liquid-bronze-per-hit-thorns'
assert eid not in E
n = len(ev)
e = dict(id=eid,scope='potion:LIQUID_BRONZE',name='流动铜液',asc=[0,20],lesson=f'流动铜液已见饮用建立3荆棘，敌每次实际攻击分别反伤，全挡也触发。机制：{n}局{len(bronze)}饮均荆棘+3、药当步不直接扣本体HP；单击3/三击9，限伤与剩血另核。搭配：卡牌挡保护玩家，不取消已见反伤；无留药/时点门槛。决定胜负的战斗：{n}支持/0反例，独立胜因未控（n={n}）。典型案例：L2TSFU62Z57Z A10 F14T1单击反3，T2三击被10挡全挡仍反9，T3再反3合15；胜战44→24净耗20，药水未保证省尽血。',evidence=ev,n_support=n,n_contradict=0,confidence=confidence(n),last_seen='2026-10-08',status='active')
Z['entries'].append(e)
E[eid]=e
Z['version']='2026-10-08.9'
Z['_about']=f'静默经验仅来自本角色复盘与实盘。第92次增量合并{PD}/{L2} A10，截至{A["cutoff"]}共{len(R)}完局；旧120局七数组、血档、源节点转移、实回复及SL重新复算。持牌伤、牌挡/被动挡、力量/敏捷与跨战资源分账；经验及代码提案关联账本/独立strategy-proposal，不改打法源码。'
old={e['id']:e for e in B['entries']}
changes=[]
for e in Z['entries']:
    if e != old.get(e['id']):
        b=old.get(e['id'])
        changes.append(dict(id=e['id'],before=b,after=e,new_runs=[r for r in e['evidence'] if not b or r not in b['evidence']]))
active=lambda f:[e for e in f['entries'] if e['status']=='active']
chars=lambda f:sum(len(e['lesson']) for e in active(f))
assert chars(Z)<=60000
for e in active(Z):
    assert e['n_support']==len(set(e['evidence']))
    assert e['n_contradict']==len(set(e.get('contradicting',[])))
    assert all(R[r]['character'].lower()=='silent' for r in e['evidence']+e.get('contradicting',[]))
    assert all(len(r)==12 for r in e['evidence'])
C=dict(old_version=B['version'],version=Z['version'],added=[c['id'] for c in changes if not c['before']],updated=[c['id'] for c in changes if c['before']],retired=[],active_before=len(active(B)),active_after=len(active(Z)),chars_before=chars(B),chars_after=chars(Z),confidence=dict(collections.Counter(e['confidence'] for e in active(Z))),applicable={str(a):dict(entries=len([e for e in active(Z) if e['asc'][0]<=a<=e['asc'][1]]),chars=sum(len(e['lesson']) for e in active(Z) if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]},entries=changes)
P.write_text(json.dumps(Z,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(C,ensure_ascii=False,indent=2)+'\n')
print({k:v for k,v in C.items() if k!='entries'})
