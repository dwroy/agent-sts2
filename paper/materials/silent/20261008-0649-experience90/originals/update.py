import collections,copy,json
from pathlib import Path
O=Path(__file__).parent;PATH=O.parents[2]/'knowledge/characters/silent/experience.json';N='KFRDELW2TH2P'
before=json.load(open(O/'experience-before.json'));after=copy.deepcopy(before);E={e['id']:e for e in after['entries']};A=json.load(open(O/'audit.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};H=json.load(open(O/'historical-potions.json'))
text={
'silent-strength-weak-observation':'力量逐击影响攻击，敏捷逐张影响牌挡，增益与被动挡分源。机制：现场力量与虚弱/易伤逐击核，卡牌挡加敏后核脆弱；新增敏捷不倒补旧挡。搭配：多段攻击/多张挡牌重复兑现，毒与覆甲另算。决定胜负的战斗：{n}支持/0反例，整战单项胜因未控（n={n}）。典型案例：KFRDELW2TH2P A10恶魔T4后力量0→3，后段三击9×3→12×3多9威胁；T3中和使9×3→6×3、覆甲6仍损12。F28敏捷药2敏令两防御7+7和手上技法9合23、比基础多6，对25攻仍损2。',
'silent-deck-burst-observation':'观察：持有、计划与实建能力分账，费用、出牌额度及可活轮数共同限制兑现。机制：毒结算、逐牌挡与能力施放各按实际时点，未施放/未结算不预支。搭配：持续毒与当轮格挡合核，局部多伤不当整战胜因。决定胜负的战斗：{n}支持/0反例（n={n}）。典型案例：KFRDELW2TH2P A10终组26牌全未升级，有触媒/爆发但无计划的步法/尖啸；末T7三牌满懒惰后奇巧爆发未施放，12牌挡+2覆甲对36需损22、9血亡；43毒双结85后敌仍74。MTQ0EUBJ3R6T F20建毒雾/磨蚀仍支付19血。',
'silent-accelerant-triggers':'触媒增加毒结算次数，不倍增毒层；普通/升级实建1/2且不即时施毒。机制：k层至多k+1次，每结减毒1、零停止；普通p≥2为2p−1，升级p≥3为3p−3，剩血/限伤/换阶段另核。搭配：先实建毒与触媒并活到结算，未来毒不当已伤。决定胜负的战斗：{n}支持/0反例，单组件整战胜因未控（n={n}）。典型案例：KFRDELW2TH2P A10恶魔末T5普通建1，31毒结31+30=61、T6的36毒结71；末T7药后43毒结85、余41未再结，敌74未死。TXZ6RVMQA09D A10沙漏升级2层39毒结114；P74C04AEPL1F墨影滑溜下12毒两结只扣2、不能套23实际伤。',
'silent-knowledge-demon-healing-sl-observation':'观察：知识恶魔回血增加累计需伤，SL少挡换输出须同时核当轮血价，局部多伤不当整战胜因。机制：A6初379加三次27需460；A10已见T4回30加3力，后段三击增9，净扣已抵回血。搭配：毒/能力只计实际兑现，判死截断不补结算。决定胜负的战斗：{n}支持/0反例，真正SL四场16试2赢（n={n}）。典型案例：KFRDELW2TH2P A10六试0赢，首/第三试T6同15血、敌228、36毒、3覆甲；第二斗篷换毒药，牌挡12→6、净扣83→93、损6→12，后T7仍判死；末实际累计需429、扣355残74。UACFSW4VDDLD A6第二試T14扣460胜，出牌/抽牌亦变，非单项受控胜因。',
'silent-knowledge-demon-sloth-replay-observation':'观察：懒惰3名额按实际打出计，手动动作数不足以描述重放后的余额。机制：已见防御重放亦占名额；三次手动牌也会用满，剩能量/0费不能解除锁。搭配：逐实际牌核合法后续序列，未打出的奇巧/爆发和小刀不计收益。决定胜负的战斗：A10两场12试0赢（n={n}），只验证现场3名额及已见重放组合。典型案例：KV0JHNJCKXLS末T8防御7×2再打击满3，手动计2时中和尚1能仍锁；KFRDELW2TH2P六次T7手上技法/防御/带毒刺击满3，奇巧爆发剩1能仍锁，无额外重放；两斗篷生成的小刀亦未打。',
'silent-paels-flesh-third-turn-energy':'佩尔之肉在已见二幕战斗第三轮起轮初额外获得1能量，前两轮不预支。机制：就绪轮初T1/T2/T3实为3/3/4；SL多试按独立局去重。搭配：实际能量、牌费与出牌限额共同核，多1能不解除懒惰，也不提供格挡。决定胜负的战斗：{n}支持/0反例，独立遗物整战胜因未控（n={n}）。典型案例：KFRDELW2TH2P A10恶魔六试轮初3/3/4，末T7仍1能但三牌额度已满，爆发未施放、9血死亡；LRN0HPZ0FZS1 A0 F19轮初3/3/4/4。',
'silent-act-transition-missing-hp-heal':'已观察A9/A10跨幕回复为当时缺失HP的80%向下取整，不是固定满血。机制：同上限F17→18/F33→34按⌊(最大HP−当前HP)×0.8⌋；更低阶/其他先古未核。搭配：营火、开场遗物、复活及SL恢复分别计，不预支未来回复。决定胜负的战斗：{n}支持/0反例，资源公式不等单项整战胜因（n={n}）。典型案例：KFRDELW2TH2P A10族母后22/70→60/70、补⌊48×0.8⌋=38；六火126、小血瓶20与五次SL恢复145分账。MTQ0EUBJ3R6T A10为19→59补40。'
}
for eid,lesson in text.items():
 e=E[eid];assert N not in e['evidence'];e['evidence'].append(N);e['n_support']=len(e['evidence']);e['lesson']=lesson.format(n=e['n_support']);e['last_seen']='2026-10-08';e['confidence']='high' if e['n_support']>=5 and e['n_contradict']<=e['n_support']/3 else 'med' if e['n_support']>=2 else 'low'
for eid in ['silent-route-hp-observation','silent-rest-buffer-observation']:
 e=E[eid];e['evidence'].append(N);e['n_support']=len(e['evidence']);e['last_seen']='2026-10-08'
a10=sum(r['ascension']==10 for r in R.values());b=[r for r in A['bands'] if r['asc']==10 and r['act']==2 and r['type']=='Monster'];bands='、'.join(f"{r['band']}{r['n']}房{r['deaths']}死" for r in b)
E['silent-route-hp-observation']['lesson']=f'观察：按入房HP核下一战血价，未来营火和无精英路线不当已有缓冲。A10共{a10}局，二幕Monster：{bands}；各阶/幕/房型分列，非因果（n={len(R)}）。典型案例：KFRDELW2TH2P F29休44→65、F30异螨胜后27、F31胜后15，两赢战入房净耗50，小血瓶各2另列；F32休至36、恶魔补至38仍六试败，无替路线受控胜因。'
rest=next(r for r in json.load(open(O/'rest-summary.json')) if r['asc']==10)
E['silent-rest-buffer-observation']['lesson']=f"观察：只计已完成回复，后战胜负另核，不预支未到营火。A10 {a10}局{rest['rests']}火/{rest['heal']}回血实回{sum(rest['gains'])}，去重{rest['nexts']}后战{rest['deaths']}死（{100*rest['deaths']/rest['nexts']:.2f}%），活损中位{rest['median']}；A8七后战0死/A9十五后战1死（n={len(R)}）。典型案例：KFRDELW2TH2P六火各21共126，赢异螨/虱祖仍耗50净血，末火15→36，恶魔实死；幕间38/开场20/SL恢复145另计，没有锻造或改线实胜反事实。"
def add(eid,scope,name,ev,lesson,asc=[0,20]):
 assert eid not in E and not any(e['scope']==scope and e['status']=='active' for e in E.values());n=len(ev)
 e=dict(id=eid,scope=scope,name=name,asc=asc,lesson=lesson.format(n=n),evidence=ev,n_support=n,n_contradict=0,confidence='high' if n>=5 else 'med' if n>=2 else 'low',last_seen='2026-10-08',status='active');after['entries'].append(e);E[eid]=e
for potion,eid,name,lesson in [
 ('DEXTERITY_POTION','silent-dexterity-potion-card-block','敏捷药水','敏捷药水在已见饮用后增加2敏捷，不追补旧挡。机制：44局64饮均实建2敏，饮用当步原挡不变；后续每张挡牌加现场敏捷，脆弱/其他倍率另核。搭配：多张挡牌重复受益、换战不继承，不设留药或饮用门槛。决定胜负的战斗：{n}支持/0反例，整战时点胜因未控（n={n}）。典型案例：KFRDELW2TH2P A10 F28T2从0敏/0挡饮药后2敏/0挡，两防御各7、手上技法9合23抵25仍损2；Q6M2Y34MWKRE A10蛞蝓T3两防御14抵14零损。'),
 ('HEART_OF_IRON','silent-heart-of-iron-plating','铁心药水','铁心药水在已见饮用后建立7覆甲，不等即时或全战固定7挡。机制：16局26饮均覆甲增7、已有牌挡不变；已见敌行动前补现场覆甲，后轮按实际剩层，完整减层条件未隔离。搭配：牌挡/敏捷和覆甲分源，额外能量不替代挡；不设药水时点阈值。决定胜负的战斗：{n}支持/0反例，无未喝整战对照（n={n}）。典型案例：KFRDELW2TH2P A10恶魔六次T2建7、牌挡0，对18攻损11；末T6两斗篷12+覆甲3对21损6，T7仅2覆甲、12牌挡对36需损22而9血亡。'),
 ('POISON_POTION','silent-poison-potion-observed-application','毒药水','毒药水先施毒，饮用当步不扣敌本体HP。机制：29局118饮，无加量/阻挡观察105饮加6；头骨3局11饮加7，制品2局2饮阻毒并耗1层，条件分账，未见组合不外推。搭配：触媒增加结算次数，须活到实际结算；药水与限额牌数分开核，不定早喝/留药胜率。决定胜负的战斗：{n}支持/0反例，时点整战胜因未控（n={n}）。典型案例：KFRDELW2TH2P A10恶魔六次T7各加6，末37→43毒当步敌159不变，普通触媒两结85后敌74；前五次判死截断无毒结算帧。XTSV1U9JD34T沙漏制品1耗尽但未加毒。')]:
 ev=list(dict.fromkeys(r['run'] for r in H if r['potion']==potion));add(eid,'potion:'+potion,name,ev,lesson)
add('silent-hand-trick-sly-card-limit','card:HAND_TRICK','手上技法',[N],'观察：奇巧对象必须在剩余额度内实际可打才兑现，选择对象不当已施放收益。机制：本局手上技法实给7挡，但懒惰3名额下随后防御/带毒刺击用满，奇巧爆发剩1能仍锁；未建立爆发、无额外技能重放。搭配：能量、牌数及后续技能序列一起核；生成小刀亦需可打名额。决定胜负的战斗：A10恶魔一场六试0赢（n={n}），没有换对象/换顺序实胜对照。典型案例：KFRDELW2TH2P六次T7均奇巧给爆发未兑现，末手上技法7+防御5共12挡，覆甲2另算，对36攻击死亡；F28药后本牌9挡确实有效，不能否定整牌。',[10,20])
after['version']='2026-10-08.7';old={e['id']:e for e in before['entries']};changes=[]
for e in after['entries']:
 if old.get(e['id'])!=e:changes.append(dict(id=e['id'],before=old.get(e['id']),after=e,new_runs=[r for r in e['evidence'] if r not in (old.get(e['id']) or {}).get('evidence',[])]))
active=lambda x:[e for e in x['entries'] if e['status']=='active']
C=dict(version_before=before['version'],version_after=after['version'],added=[c['id'] for c in changes if not c['before']],updated=[c['id'] for c in changes if c['before']],retired=[],active_before=len(active(before)),active_after=len(active(after)),chars_before=sum(len(e['lesson']) for e in active(before)),chars_after=sum(len(e['lesson']) for e in active(after)),confidence=dict(collections.Counter(e['confidence'] for e in active(after))),by_asc={str(n):dict(entries=len([e for e in active(after) if e['asc'][0]<=n<=e['asc'][1]]),chars=sum(len(e['lesson']) for e in active(after) if e['asc'][0]<=n<=e['asc'][1])) for n in [8,9,10]},entries=changes)
assert C['chars_after']<=60000
for e in active(after):assert e['n_support']==len(set(e['evidence'])) and e['n_contradict']==len(set(e.get('contradicting',[])));assert all(r in R and R[r]['character'].lower()=='silent' for r in e['evidence']+e.get('contradicting',[]))
assert json.loads(PATH.read_text())==before
PATH.write_text(json.dumps(after,ensure_ascii=False,indent=2)+'\n');(O/'changes.json').write_text(json.dumps(C,ensure_ascii=False,indent=2)+'\n');print({k:v for k,v in C.items() if k!='entries'})
