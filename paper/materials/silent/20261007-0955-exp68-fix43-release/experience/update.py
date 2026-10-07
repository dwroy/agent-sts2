import collections,copy,json,re
from pathlib import Path
O=Path(__file__).parent;P=Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json');N='YLYLZWHA0GKU'
B=json.load(open(O/'experience-before.json'));A=json.load(open(O/'audit.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};rests=json.load(open(O/'rest-summary.json'))[-1];E=copy.deepcopy(B);by={e['id']:e for e in E['entries']};old={e['id']:e for e in B['entries']};texts={}
texts['silent-strength-weak-observation']='力量逐击增伤，敏捷逐挡牌增挡，虚弱逐击取整；独立成长不因当轮减伤停止。机制：攻击段数放大力量收益，被动挡与卡牌挡分核。搭配：实际力量/敏捷、段数和可活轮一起验收。决定胜负的战斗：{n}支持局，子公式与整战因果分账（n={n}）。典型案例：YLYLZWHA0GKU A10 F45卷轴2力使双击6×2→8×2、多4威胁；突然一拳虚弱使其中一只8×2→6×2，三敌仍40攻击，10挡后损30；T3的48攻击穿14挡、11血差23。KQQELQSZ382Z A10吸取后力/敏−4，防御1、偏折0，蛇咬施7毒另算。'
texts['silent-noxious-fumes-growth']='毒雾普通/升级建2/3层，后续玩家轮初补毒，建立不即时施毒。机制：无其他施毒/阻挡、单结算时补a净增a−1；头骨实见a=s+1而能力仍s；触媒每次减1，制品/无实体/阶段另核。搭配：实际建立及能活到的轮初一起算，未到不预支。决定胜负的战斗：{n}支持局，整战胜因未控（n={n}）。典型案例：YLYLZWHA0GKU A10 F45 T1/T2各建3至6，T2三敌各结算3共9，第二张到T3轮初才补6、旧2毒成8，结算24；累计33，死亡余各7不计实伤。F33双蟹毒雾6到T9才清428血，70→2。'
texts['silent-accelerant-triggers']='触媒增加毒结算次数，不乘毒层；普通/升级建1/2、可叠，自身不施毒。机制：k层至多k+1次，每次减1、零停止；k=1且p≥2合2p−1，k=2且p≥3合3p−3，剩血/阶段限制实伤。搭配：实际施毒、建立与生存窗口分核。决定胜负的战斗：{n}支持局，整战单卡胜因未控（n={n}）。典型案例：YLYLZWHA0GKU A10 F17普通建1；F39升级建2，T2敌3毒无额外施毒即扣3+2+1=6，下一轮补6至6毒，与复盘的“扣9/余3”分开；F33与F45全战未施，不能计已持有触媒的倍毒。ZZMYZ5UBCG72 A2三层15/21毒实扣54/78。'
texts['silent-afterimage-per-card-block']='余像建立后按实际出牌次数补挡，建立本身不触发自己的首次挡。机制：1层每次后续出牌加1，重放再触发，脆弱下被动仍1；卡牌/遗物挡另算。搭配：多牌兑现被动挡，未建立不预支。决定胜负的战斗：{n}支持局、整战单项胜因未控（n={n}）。典型案例：YLYLZWHA0GKU A10 F33 T4才建1，T8脆弱已消失、双防御各5加五次余像共15挡覆盖14，2血活到T9毒杀；F45持有却未施，不能计末14挡外的未来收益。LRN0HPZ0FZS1 A0翻越撑击重放补2，挡13→15。'
texts['silent-anticipate-temporary-dexterity']='预判普通/升级只本轮建2/4敏捷，须由后续挡牌兑现。机制：敏捷与临时标记同量，不追补已有挡，次轮撤回；逐牌加敏后核脆弱，被动挡另算。搭配：常驻敏捷/余像与临时敏分账，未打挡牌不产生这部分收益。决定胜负的战斗：{n}支持局，顺序整战胜因未控（n={n}）。典型案例：YLYLZWHA0GKU A10 F45 T2建2使生存者8→10挡，三敌40攻击仍损30；T3两临时增益消失、防御5加触不可及+9共14，对48攻、11血仍死。DPYF2BAA3DKT A10预判多2牌挡仍损21，下一轮消失。'
texts['silent-piercing-wail-temporary-strength']='尖啸临时减力须按当前攻击核，次轮撤回后重算。机制：普通/升级减6/8，逐击核力量、虚弱及技能污染；独立成长继续。搭配：多段放大当轮减伤，实际挡及后轮威胁另算。决定胜负的战斗：{n}支持局，当轮有效不保整战（n={n}）。典型案例：YLYLZWHA0GKU A10 F33 T1双蟹各0→−6力，T2恢复0力、15挡仍损11；不归减力单因，毒雾/余像尚待建立。KQQELQSZ382Z A10族母T5的20双击→8、8挡零损，T6恢复0力14攻穿9挡损5。'
f=[x for x in A['fights'] if x['asc']==10];band=next(x for x in A['bands'] if (x['asc'],x['act'],x['type'],x['band'])==(10,3,'Monster','40–60%'))
texts['silent-route-hp-observation']=f'观察：无精英和一血标记的收益只归实际覆盖的战，不作安全保证。首COMBAT→同房末结算净损、死亡单列，Monster/Unknown分开；{len(A["runs"])}静默局{len(A["fights"])}房{sum(x["death"] for x in A["fights"])}死。A8一局25/0死、A9三局48/2死；A10 {sum(r["ascension"]==10 for r in R.values())}局{len(f)}房{sum(x["death"] for x in f)}死，三幕Monster 40–60%进场{band["n"]}房{band["deaths"]}死={band["deaths"]/band["n"]:.2%}。典型案例：YLYLZWHA0GKU A10大衣后F35/F38一血敌零损，F39法官损39、F44损12，F45普通卷轴41/70入场死；无替线实战，不判改线因果（n={{n}}）。'
texts['silent-rest-buffer-observation']=f'观察：未来营火回血不能当当前血池，锻造与回血的替线优劣未受控。A8一局9火8回血回111、后战7/0死；A9三局21火16回血回341、后战15/1死；A10 {rests["runs"]}局{rests["rests"]}火{rests["heal"]}回血/{rests["smith"]}非回血动作、实回{sum(rests["gains"])}，去重后战{rests["nexts"]}/{rests["deaths"]}死={rests["deaths"]/rests["nexts"]:.2%}、活损中位{rests["median"]}。典型案例：YLYLZWHA0GKU A10四火实回110，F40枕头回血17→53；F43升级非凡技艺后53，F44损12、F45死，投影boss70依赖未抵达F47回血，不算已回（n={{n}}）。'
texts['silent-deck-burst-observation']='观察：持有毒与防御组件不等建立，生存窗口限定实际输出。机制：毒雾轮初施毒、触媒额外结算、余像逐牌挡分别验收，未施能力和死亡余毒不计收益。搭配：实际到手/施放/结算与敌血量、来袭和可活轮一起核。决定胜负的战斗：{n}支持局，替构筑单卡胜因未控（n={n}）。典型案例：YLYLZWHA0GKU A10 F33双毒雾6、余像T4建立，70→2撑到T9清428；F45持触媒+、余像、谋划专家、非凡技艺+但未施，仅毒雾6建立，三轮实扣40+23+39=102、140仍缺38，死亡余各7毒不预支。'
for eid,lesson in texts.items():
 e=by[eid];assert N not in e['evidence'];e['evidence'].append(N);e['n_support']=len(e['evidence']);e['last_seen']='2026-10-07';e['lesson']=lesson.replace('{n}',str(e['n_support']))
 for sentence in re.split('(?<=。)',old[eid]['lesson']):
  if '药' in sentence and sentence not in e['lesson']:e['lesson']+=' '+sentence
 e['confidence']='high' if e['n_support']>=5 and e['n_contradict']<=e['n_support']/3 else 'med' if e['n_support']>=2 else 'low'
new=dict(id='silent-scroll-paper-cuts-unblocked',scope='hallway:SCROLL_OF_BITING',asc=[0,20],lesson='咬人卷轴纸伤难愈2按未完全挡住的攻击次数降生命上限，不能只看当轮掉血。机制：实见每次漏伤降2上限、完全挡住的一击不降，多段按漏伤击数分算；仅验证2层，不外推其他层数。搭配：实际挡、每击伤害与当前/最大生命一起验收，未来毒不抵当前攻击。决定胜负的战斗：3支持局，无替打法胜线（n=3）。典型案例：K3676LU8B0UH A1 F35 T1的14挡对10+5×2，两个漏伤、上限77→73；9YBKCNBFP0X5 A4 F40 T1零挡遭10单击再5×2，上限77→75→71；YLYLZWHA0GKU A10 F45 T2三敌六击五漏、70→60，T3的14挡对8×2仅漏一击降60→58，随后16单击致死、上限56。',evidence=['K3676LU8B0UH','9YBKCNBFP0X5',N],n_support=3,n_contradict=0,confidence='med',last_seen='2026-10-07',status='active')
assert new['id'] not in by;E['entries'].append(new);E['version']='2026-10-07.14';E['_about']=f'静默经验只来自本角色复盘与日志。第68次增量截至{N}结束{A["cutoff"]}，85完局；旧84局七数组/血档/源节点/回血/SL逐行复算一致。纸伤难愈2按漏伤次数降上限；毒雾/触媒/余像/临时敏捷、逐击力量与建立时点复核。未来营火、一血标记、未施能力与死亡余毒分别计；无新SL对照或用药规则，模型bug分账。'
for e in E['entries']:
 assert e['n_support']==len(e['evidence']),e['id'];assert all(r in R and R[r]['character'].lower()=='silent' and len(r)==12 for r in e['evidence'])
 assert e['n_contradict']==len(e.get('contradicting',[])),e['id']
for e in B['entries']:
 if e['scope'].startswith('potion:') or e['scope']=='general:potion':assert e==by[e['id']]
for eid in texts:
 for sentence in re.split('(?<=。)',old[eid]['lesson']):
  if '药' in sentence:assert sentence in by[eid]['lesson'],(eid,sentence)
active=[e for e in E['entries'] if e['status']=='active'];assert sum(len(e['lesson']) for e in active)<=60000
C=dict(old_version=B['version'],version=E['version'],added=[new['id']],updated=list(texts),retired=[],old_active=sum(e['status']=='active' for e in B['entries']),active=len(active),old_chars=sum(len(e['lesson']) for e in B['entries'] if e['status']=='active'),chars=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),applicable={str(a):dict(entries=len([e for e in active if e['asc'][0]<=a<=e['asc'][1]]),chars=sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9]},details=[dict(id=eid,n_before=old[eid]['n_support'],n_after=by[eid]['n_support'],chars_before=len(old[eid]['lesson']),chars_after=len(by[eid]['lesson'])) for eid in texts])
(O/'changes.json').write_text(json.dumps(C,ensure_ascii=False,indent=2)+'\n');P.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n');print(json.dumps(C,ensure_ascii=False))
