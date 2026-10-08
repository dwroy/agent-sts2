import collections,json,re
from pathlib import Path
O=Path(__file__).parent;P=Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json');N='7ZUC4VPMDS41'
B=json.load(open(O/'experience-before.json'));E=json.loads(json.dumps(B));by={x['id']:x for x in E['entries']};A=json.load(open(O/'audit.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
assert json.load(open(O/'baseline-check.json')) and B['version']=='2026-10-07.14'
lessons={
'silent-strength-weak-observation':'力量逐击增伤，敏捷逐挡牌增挡，虚弱逐击取整；当轮减伤不消除独立成长。机制：段数放大力量收益，卡牌挡与被动挡分核。搭配：实际力/敏、段数、来袭与可活轮一起验收。决定胜负的战斗：82支持局，各子公式及整战胜因分账（n=82）。典型案例：7ZUC4VPMDS41 A10仪式兽T6清8力后，后段T9/T12碾碎再建4/8，T14跺地17+8=25；T9虚弱使19→14，11挡仍损3。YLYLZWHA0GKU A10卷轴2力使6×2→8×2，虚弱后6×2。',
'silent-poisoned-stab-components':'带毒刺击的直伤与施毒分列，尚存毒不算已伤。机制：普通/升级基础攻击6/8、施毒3/4；力/弱/易伤改攻击，制品可阻毒，结算后毒减1，触媒与剩血截断另核。搭配：已有毒、冒泡、被动挡分别验收，能活的轮数限定毒兑现。决定胜负的战斗：20支持局，无单卡整战胜因（n=20）。典型案例：7ZUC4VPMDS41 A10末T9刺击132→126直6、另建3毒，T9—11结算3+2+1=6；T13再建3，整战已结算毒17，死亡帧余7未兑。6EV5V6PJJS9D A6升级重放直16，首击清制品后只建4毒。',
'silent-ceremonial-beast-threshold-growth-sl':'仪式兽跨现场阈值清横冲直撞与第一段力量，后段仍攻击并再成长。机制：阈值按进阶读{@10:POWER:CEREMONIAL_BEAST:PLOW_POWER}，本体{@10:HP:CEREMONIAL_BEAST}；已见低阶150、A9/A10为160，横冲基础{@10:DMG:CEREMONIAL_BEAST:PLOW_MOVE}另加现场力/核弱。搭配：实际攻击和已结算毒推进阶段，挡/减益覆盖当前窗口；昏眩单牌限制另核。决定胜负的战斗：15局15房11活4死，真正重打5场26次1赢（n=15）。典型案例：7ZUC4VPMDS41 A10六次70/70进场0赢，末T6冲刺10+打击6使172→156清8力并眩晕，取消28攻；仍须打156血，T7—14仅扣106，后段力回8、T14死余50。首/第3次T4同60血/敌218血/3能量/同手，SL删防御后均扣20，却5挡损13→0挡损18，多付5血；两线校准0.003不抹当轮代价，后续动作也变，未控整战胜因。QNTW139MGECA A10 T5跨160、12轮扣262、73→17首试胜；无新赢次或运气归因。',
'silent-route-hp-observation':'观察：进场高血或无精英路线不保证boss可过，改线优劣未受控。截至86静默局，A10 46局578战房46实死；一幕boss≥60%进场33场6死=18.18%、活损中位43，40–60%五场3死；一幕Monster≥60%180场1死、Unknown≥60%29场0死，房型分账。典型案例：7ZUC4VPMDS41 A10 F6改无精英线、F8事件49→70，boss实到70仍六败；F6投影69与实70含后续事件回血，未走旧线无因果。',
'silent-rest-buffer-observation':'观察：回血增加实际缓冲，仍不保证boss过关；未执行锻造不作受控比较。A8一局9火8回血回111、后战7/0死；A9三局21火16回血回341、后战15/1死；A10 46局254火174回血/80非回血动作、实回4242，去重后战165/24死=14.55%、活损中位25。典型案例：7ZUC4VPMDS41 A10 F16题面回21、52→70实回18，投影70兑现、六次均满血进boss却败；F8事件实回21另记，不当营火或SL回血（n=86）。',
'silent-deck-burst-observation':'观察：开场资源与跨阶段不等持续每轮攻防，生存窗口限定实际输出。机制：能力须实到/施放/建立/触发，未取得成长和死亡余毒不预支。搭配：阶段后剩血、来袭、实际抽到与出牌限制一起验收。决定胜负的战斗：81支持局，替构筑单卡胜因未控（n=81）。典型案例：7ZUC4VPMDS41 A10末24张全未升级、无玩家正力/敏或能力建立；T1五能量扣30，T6跨160后仍需156，T7—14扣106、余50，T12扣0、T14昏眩仅一牌5挡。计划的步法/毒雾未取得。YLYLZWHA0GKU F45四张持有核心未施、三轮扣102/140余38。'
}
changed=[]
for eid,lesson in lessons.items():
 e=by[eid];old=e['lesson']
 # Preserve every original potion-containing sentence verbatim.
 drugs=[s for s in re.split(r'(?<=[。！？])',old) if '药' in s]
 e['lesson']=lesson+''.join(drugs);assert all(s in e['lesson'] for s in drugs)
 assert N not in e['evidence'];e['evidence'].append(N);e['n_support']=len(e['evidence']);e['last_seen']='2026-10-07'
 changed.append(eid)
new=dict(id='silent-ceremonial-beast-ringing-one-card',scope='boss:CEREMONIAL_BEAST',asc=[0,20],lesson='已观察1层昏眩窗口打一张牌后阻止后续牌，余能与生成小刀不等于还能出牌。机制：首牌后其余手牌显示blocked_by_hook；只验证1层窗口，不外推其他层数。搭配：按本轮实际可打牌数核输出/格挡，不把能量余额算后续收益。决定胜负的战斗：A0/A10两支持局、0反例，未控首选另一牌的整战胜负（n=2）。典型案例：LRN0HPZ0FZS1 A0首试T8防御给5挡后其余牌blocked，T11斗篷与匕首+给6挡、生成小刀也blocked；7ZUC4VPMDS41 A10末T14防御后8血5挡、仍余2能量而四牌blocked，对25攻完整需损20、差12血。随后药水动作确已执行，仅作为与出牌计数分账的本局事实。',evidence=['LRN0HPZ0FZS1',N],n_support=2,n_contradict=0,confidence='med',last_seen='2026-10-07',status='active')
assert new['id'] not in by;E['entries'].append(new);E['version']='2026-10-07.15'
for e in E['entries']:
 assert e['n_support']==len(set(e['evidence']))==len(e['evidence'])
 for r in e['evidence']+e.get('contradicting',[]):assert re.fullmatch('[0-9A-Z]{12}',r) and R[r]['character'].lower()=='silent'
 assert e['n_contradict']==len(e.get('contradicting',[]))
for e in B['entries']:
 if e['scope'].startswith('potion:') or e['scope']=='general:potion':assert e==by[e['id']]
active=[e for e in E['entries'] if e['status']=='active'];assert sum(len(e['lesson']) for e in active)<=60000
C=dict(old_version=B['version'],version=E['version'],added=[new['id']],updated=changed,retired=[],old_active=sum(e['status']=='active' for e in B['entries']),active=len(active),old_chars=sum(len(e['lesson']) for e in B['entries'] if e['status']=='active'),chars=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),applicable={str(a):dict(entries=len(z:=[e for e in active if e['asc'][0]<=a<=e['asc'][1]]),chars=sum(len(e['lesson']) for e in z)) for a in [8,9]},diff=[dict(id=eid,n_before=next(e['n_support'] for e in B['entries'] if e['id']==eid),n_after=by[eid]['n_support'],chars_before=len(next(e['lesson'] for e in B['entries'] if e['id']==eid)),chars_after=len(by[eid]['lesson'])) for eid in changed])
P.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n');(O/'changes.json').write_text(json.dumps(C,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(C,ensure_ascii=False))
