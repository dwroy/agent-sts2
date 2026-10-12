import collections,json,re
from pathlib import Path
O=Path(__file__).parent
P=Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json')
B=json.load(open(O/'experience-before.json'));E=json.loads(json.dumps(B));by={x['id']:x for x in E['entries']}
A=json.load(open(O/'audit.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
assert B['version']=='2026-10-07.15' and len(A['runs'])==88
assert all(x['identical'] for x in json.load(open(O/'baseline-check.json')).values())
Y='2Y27VAYZDA02';T='TDLBRNA0R05B'
lessons={
'silent-footwork-block':([Y,T],'步法普通/升级建2/3敏捷，逐挡牌兑现，不追补已有挡。机制：基础挡加现场敏捷，再逐牌核脆弱；被动挡另算。搭配：多张挡牌重复获益，能力须实际建立且换战重建。决定胜负的战斗：51支持局，局部收益不等整战胜因（n=51）。典型案例：TDLBRNA0R05B A10实验体末T1建3敏不追补原10挡；T2后空翻5+3、余像另1合9，萎靡再触发1合10，对25攻另有覆甲3仍需损12，4血不足。2Y27VAYZDA02 F14建2叠石头1至3，末战只有遗物1敏。'),
'silent-strength-weak-observation':([Y,T],'力量逐击增伤，敏捷逐挡牌增挡，虚弱逐击取整；当轮减伤不消除独立成长。机制：段数放大力量收益，卡牌挡与被动挡分核，技能亦可能触发敌激怒。搭配：现场力敏、段数、来袭与可活轮一起验收。决定胜负的战斗：84支持局，各子公式及整战胜因分账（n=84）。典型案例：2Y27VAYZDA02 A10三虫末T3—5甲虫力0/2/4、弱后滚动13/15/16；TDLBRNA0R05B A10实验体末T2敌18力，萎靡+加减各3仍18，虚弱34→25，13总挡仍需损12。YLYLZWHA0GKU A10卷轴2力使6×2→8×2，虚弱后6×2。'),
'silent-noxious-fumes-growth':([T],'毒雾普通/升级建2/3层，后续玩家轮初补毒，建立不即时施毒。机制：无其他施毒/阻挡、单结算时补a净增a−1；头骨、触媒、制品/无实体/阶段另核。搭配：实际建立和可活轮初一起算，新战清能力不预支旧层。决定胜负的战斗：42支持局，整战单卡胜因未控（n=42）。典型案例：TDLBRNA0R05B A10女王末T3建第二雾使3→5；T9聚合体37血被38毒杀、女王145经64毒到81，T10攻击扣16后68毒杀65血，2血过关；下一场实验体未建立毒雾，旧5层不保留。YLYLZWHA0GKU F45双雾各建3，实毒9+24，死亡各7未兑。'),
'silent-afterimage-per-card-block':([T],'余像建立后按实际出牌次数补挡，建立本身不触发自己的首次挡。机制：1层每次后续出牌加1，重放再触发，脆弱不折被动；卡牌/遗物挡另算。搭配：多牌兑现被动挡，未建立不预支，新战重建。决定胜负的战斗：18支持局、整战单项胜因未控（n=18）。典型案例：TDLBRNA0R05B A10女王末T3两牌被动仅2挡，对36攻击另覆甲9仍损25；实验体末T2后空翻牌挡8加余像1为9，萎靡再加1为10，4血仍不足。YLYLZWHA0GKU F33 T8双防御10+五次被动5覆盖14，2血撑至T9毒杀。'),
'silent-malaise-x-debuff':([T],'萎靡普通按X、升级按X+1减力并加虚弱，普通零X无自身减益、升级零X各1。机制：技能自身会触发敌激怒，须合核加减力；减力不关独立成长，敌阶段可清旧状态，自身不提供挡。搭配：逐击减力和虚弱、实际挡牌/余像分别核。决定胜负的战斗：15支持局，时点胜因未控（n=15）。典型案例：TDLBRNA0R05B A10实验体末T2后空翻使15→18力，X2萎靡+减3同时激怒加3，仍18力；3弱使34→25，余像另给1挡，不因力量未净降就说萎靡无效。QNTW139MGECA A10仪式兽X3减4→1、24→15，后段再成长。'),
'silent-gorget-plating':([T],'护喉甲开场覆甲不等于整场固定格挡。机制：实见开场PLATING_POWER=4、后段耗尽；与其他来源叠层，层数随战斗下降，完整减层条件未隔离。搭配：覆甲、敏捷/牌挡、被动挡分别记，用现场层数。决定胜负的战斗：6支持局，单遗物胜因未控（n=6）。典型案例：TDLBRNA0R05B A10实验体各试开场4，末T2只有3；后空翻/余像/萎靡合10挡，对25攻仍需12净损，4血死。女王末T3现场覆甲9、当前2挡，36攻击损25，次轮覆甲8，不预支每轮9。P5HT1272P5SB A10末战T5起覆甲0，不能再补开场4。'),
'silent-smooth-stone-opening-dexterity':([Y],'意外光滑的石头实见开场1敏捷，与步法后建敏捷叠加，收益由随后卡牌格挡兑现。机制：9支持局87个持有后战斗房首帧均1敏；普通防御5+1=6，脆弱逐牌折减、已有挡不补。搭配：多张挡牌重复兑现，能力敏捷/被动挡另算；换战重核。决定胜负的战斗：9支持局，未隔离遗物胜因（n=9）。典型案例：2Y27VAYZDA02 A10 F12起七房首帧1敏，三虫末T4两防御各6、斗篷匕首7合19，比基础多3，25攻仍损6。ZVYUL2YP3518 A10实验体步法+另加3至4敏，旧挡不补。'),
'silent-slumbering-beetle-wake-growth':([Y],'熟睡甲虫睡层消失后攻击并持续成长，失血唤醒当轮眩晕不等于后续停攻。机制：已见睡层3下降，A6/A7失血唤醒当轮眩晕，随后覆甲消失；滚动基础按进阶读{@7:DMG:SLUMBERING_BEETLE:ROLL_OUT_MOVE}/{@10:DMG:SLUMBERING_BEETLE:ROLL_OUT_MOVE}，再加现场力量/逐击核弱。搭配：实伤/毒影响醒来窗口，挡与减益分轮核，不定击杀序。决定胜负的战斗：12支持局12房9活3死；本批四次0赢（n=12）。典型案例：2Y27VAYZDA02 A10三虫末试睡3→1→消失、覆甲18消失；T3—5滚动18/20/22、弱后13/15/16，末1血5挡对16需11、差10；四次0赢。3KME36ADUE4U A7失血唤醒后T2攻16、T5力6攻22。'),
'silent-accelerant-triggers':([Y],'触媒增加毒结算次数，不乘毒层；普通/升级建1/2、可叠，自身不施毒。机制：k层至多k+1次，每次减1、零停止；k=1且p≥2合2p−1，k=2且p≥3合3p−3，剩血/阶段限制实伤。搭配：实际施毒、建立与生存窗口分核。决定胜负的战斗：30支持局，整战单卡胜因未控（n=30）。典型案例：2Y27VAYZDA02 A10 F21 T4建1层，7毒扣7+6=13、敌18→5，T5的5毒杀5血并取消26攻；末战未建，不沿用双触发。YLYLZWHA0GKU A10升级2层时3毒实际扣6、下轮补6，与复盘扣9分开。'),
'silent-beckon-held-end-turn-loss':([Y],'呼唤末回合持牌生命代价先于后来毒杀兑现，挡与敌死亡不抵销先行自损。机制：每张文本失去6生命，已核一/两/三张需6/12/18；打出离手，后抽须重核，不外推其他状态。搭配：毒可取消敌攻击，却不能抵销更早持牌损血；不规定固定出牌顺序。决定胜负的战斗：3支持局，无单牌整战对照（n=3）。典型案例：2Y27VAYZDA02 A10异鱼前三试T12敌24/25/21血且毒28/28/21，玩家3/5/3血持两/两/一张，需12/12/6，均结束前SL；末T13处理呼唤后11毒杀剩7血、保2血，抽序/后轮也变化。D4LJ9QMGFB8Q A10三张实损18后33毒收28血敌。'),
'silent-test-subject-phase-reset':([T],'实验体逐阶段重算敌状态/需伤，玩家能力可过阶段，新战重建。机制：第一阶段每技能加激怒层数力量，能力不加；换阶段清敌力/激怒/毒/减益，保留玩家能力，后阶段另核。搭配：技能加力和萎靡减力合算，实际挡/毒斩杀与生存窗口分核。决定胜负的战斗：11支持局46次4赢，真正重打10场45次3赢（n=11）。典型案例：TDLBRNA0R05B A10六次4血0赢，末T1五技能0→15力，T2后空翻→18、萎靡+加减各3仍18，弱后25对10挡+3覆甲需12、差8；末毒21扣敌50→29未斩。第五试T2清111，T3刷新212并清旧力/激怒/毒，未到第三阶段。JMH5C51RLN4E A10第5次13轮60→8胜，三阶段合636；同抽不等单变量胜因。'),
'silent-queen-poison-main-target':([T],'观察：女王先杀本体/聚合体均有赢例，无固定击杀序或提前能力必胜因果。机制：本体血按进阶读{@2:HP:QUEEN}/{@4:HP:QUEEN}/{@8:HP:QUEEN}，本体死可终战；99弱/脆/易伤改变攻防，爪牙死不关成长。搭配：只核已建能力/实际毒窗口，少挡换成长的当轮血价另算。决定胜负的战斗：11支持局、五首试赢；真正重打6场30次2赢（n=11）。典型案例：TDLBRNA0R05B A10四次66血，末T9以38毒杀37血爪、T10以68毒杀65血本体，剩2赢；第二/末次T3同盘，换毒雾后挡17→2、伤25→30、损10→25，两线五轮0/24死及低信度100%整场模拟不抹15血价，后轮亦变，不定转胜单因；下场仅4血六败。ZZMYZ5UBCG72 A2行动36+毒364杀本体、爪余87；LLYSRQQ35AVW A8先爪、毒胜余60。'),
'silent-poisoned-stab-components':([Y,T],'带毒刺击直伤与施毒分列，尚存毒不算已伤。机制：普通/升级基础攻击6/8、施毒3/4；力/弱/易伤改攻击，制品可阻毒，结算后减1，触媒与剩血截断另核。搭配：已建毒、冒泡、被动挡分别验收，生存轮数限定兑现。决定胜负的战斗：22支持局，无单卡整战胜因（n=22）。典型案例：2Y27VAYZDA02 A10异鱼末T13升级直8另加4毒，敌15→7、11毒结束；前三试末轮毒未兑，不算实伤。7ZUC4VPMDS41 A10普通直6另3毒，后3+2+1=6，死亡余毒不预支。'),
'silent-route-hp-observation':([Y,T],'观察：低血无精英路线或未来营火不保证当前安全，连续boss分别核入血；改线优劣未受控。截至88静默局，A10 48局610战房48死；二幕Monster<25%六场2死=33.33%、≥60%75场0死；三幕boss<25%三场全死，≥60%九场5死。典型案例：2Y27VAYZDA02 A10 F18投影F22进36、实际12，F24首火未到；TDLBRNA0R05B A10首boss投影38、次bossnull，后续行动改变后实66/4，中间无火，末试女王赢而实验体败。未知不当零损，未选替线不作因果。'),
'silent-rest-buffer-observation':([Y,T],'观察：回血增加实际缓冲，不保证boss过关或连续下一boss够血，未执行锻造不作受控比较。A8一局9火8回血回111、后战7/0死；A9三局21火16回血回341、后战15/1死；A10 48局269火183回血/86非回血动作、实回4428，去重后战173/24死=13.87%、活损中位25。典型案例：2Y27VAYZDA02 A10四回血实回84，异鱼48→2；TDLBRNA0R05B A10五回血实回102，末火43→64，女王实际66→2、下一战4血，进战遗物回复另算（n=88）。'),
'silent-deck-burst-observation':([Y,T],'观察：取得/计划组件与实际能力收益分账，生存窗口限定毒和防御兑现，开场资源不等持续每轮攻防。机制：能力须实到/施放/建立/触发，新战清空、阶段和持牌自损另核，未到成长/死亡余毒不预支。搭配：阶段后剩血、来袭、实际抽到/出牌限制一起验收。决定胜负的战斗：83支持局，替构筑单卡胜因未控（n=83）。典型案例：2Y27VAYZDA02 A10持群蛇却六个二幕尝试均未施，三虫末首轮7能量后T3/T4仅扣12/16，死余89；TDLBRNA0R05B A10女王建5毒雾、毒杀余2，换战重建余像/步法但未建雾，末实验体两轮仅扣73/102、4血死余29，不把旧5雾跨战计收益。')
}
changes=[]
for eid,(runs,lesson) in lessons.items():
 e=by[eid];old=e['lesson']
 drugs=[s for s in re.split(r'(?<=[。！？])',old) if '药' in s]
 if eid=='silent-accelerant-triggers' and drugs:lesson+='TU3XB4CAEDAW A10旧例：'
 e['lesson']=lesson+''.join(drugs)
 for s in drugs:assert s in e['lesson']
 for run in runs:
  assert run not in e['evidence'];e['evidence'].append(run)
 e['n_support']=len(e['evidence']);e['last_seen']='2026-10-07'
 e['confidence']='high' if e['n_support']>=5 and e['n_contradict']<=e['n_support']/3 else 'med' if e['n_support']>=2 else 'low'
 changes.append(dict(id=eid,runs=runs,n_before=len(next(x['evidence'] for x in B['entries'] if x['id']==eid)),n_after=e['n_support'],chars_before=len(old),chars_after=len(e['lesson']),preserved_potion_sentences=drugs))
E['version']='2026-10-07.16'
E['_about']='静默经验只来自本角色复盘与日志。第70次增量截至TDLBRNA0R05B结束2026-10-07T02:44:08.070Z，88完局；旧86局七数组/血档/源节点/回血/SL逐行复算一致。新增两局A10，核敏捷/被动挡/覆甲、毒与呼唤先行自损、激怒/萎靡及阶段/换战重建。SL局部血价与整战胜因分账，首COMBAT与遗物回复后操作入血分列；无新用药规则。'
for e in E['entries']:
 assert e['n_support']==len(set(e['evidence']))==len(e['evidence'])
 assert e['n_contradict']==len(e.get('contradicting',[]))
 for run in e['evidence']+e.get('contradicting',[]):assert re.fullmatch('[0-9A-Z]{12}',run) and R[run]['character'].lower()=='silent'
for e in B['entries']:
 if e['scope'].startswith('potion:') or e['scope']=='general:potion':assert e==by[e['id']]
active=[e for e in E['entries'] if e['status']=='active'];chars=sum(len(e['lesson']) for e in active);assert chars<=60000
C=dict(old_version=B['version'],version=E['version'],added=[],updated=list(lessons),retired=[],old_active=sum(e['status']=='active' for e in B['entries']),active=len(active),old_chars=sum(len(e['lesson']) for e in B['entries'] if e['status']=='active'),chars=chars,confidence=dict(collections.Counter(e['confidence'] for e in active)),applicable={str(a):dict(entries=len(z:=[e for e in active if e['asc'][0]<=a<=e['asc'][1]]),chars=sum(len(e['lesson']) for e in z)) for a in [8,9]},diff=changes)
P.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n');(O/'changes.json').write_text(json.dumps(C,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in C.items() if k!='diff'},ensure_ascii=False))
