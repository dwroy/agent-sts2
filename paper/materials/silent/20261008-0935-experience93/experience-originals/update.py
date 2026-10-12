import collections,copy,json,statistics
from pathlib import Path
O=Path(__file__).parent;N='ZTRGYYMLR8SC';K=Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json')
B=json.load(open(O/'experience-before.json'));E=copy.deepcopy(B);A=json.load(open(O/'audit.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
index={e['id']:e for e in E['entries']};changes=[]
def change(eid,text):
 e=index[eid];b=copy.deepcopy(e);assert N not in e['evidence'];e['evidence'].append(N);e['n_support']=len(e['evidence']);e['last_seen']='2026-10-08';e['lesson']=text
 n=e['n_support'];c=e['n_contradict'];e['confidence']='high' if n>=5 and c<=n/3 or n>=4 and c==0 else 'med' if n>=2 else 'low'
 changes.append(dict(id=eid,before=b,after=copy.deepcopy(e),new_runs=[N]))
n=119
change('silent-strength-weak-observation',f'力量逐击影响攻击，敏捷逐张影响牌挡，增益与被动挡分源。机制：现场力与弱/易伤逐击核，牌挡加敏后核脆弱，不倒补旧挡；换战重建。搭配：多击/多张挡重复兑现，毒与覆甲另算。决定胜负的战斗：{n}支持/0反例，单项整战胜因未控（n={n}）。典型案例：ZTRGYYMLR8SC A10同族末T7神官3力为6×3=18，加弱信徒8合26，5牌挡+2覆甲后损19；F11/F14药水2力不带入boss。L2TSFU62Z57Z金刚杵1力使匕首雨+两段各7。')
change('silent-frail-card-block','脆弱逐牌缩减格挡，被动挡另核。机制：基础挡加敏捷/牌专属增量，再各乘0.75向下取整，不能合挡后折减、不能把已有挡倒补。搭配：多牌/重放逐次核，余像/覆甲/遗物挡分账。决定胜负的战斗：22支持/0反例，单项整战因果未控（n=22）。典型案例：ZTRGYYMLR8SC A10同族末T14零敏两防御各⌊5×0.75⌋=3，6挡对13攻需损7、4血死、严格存活差4血；铁心已耗尽。RC61MFQM63Y6蟹首/第三试2敏生存者⌊(8+2)×0.75⌋=7。')
change('silent-piercing-wail-temporary-strength','尖啸临时降力按攻击段数兑现，不当恒定挡或永久降力。机制：普通/升级减6/8，逐击核现场力/弱；次轮临时恢复与独立成长分账。搭配：多击重复受益，仍需真实牌挡，后轮不能沿用负力量。决定胜负的战斗：55支持/0反例，局部收益已核、单卡整战因果未控（n=55）。典型案例：ZTRGYYMLR8SC A10同族末T5三敌力6/3/3→0/−3/−3，11+5×2+12=33→5+0×2+6=11；4覆甲后实损7，T6力恢复6/3/3，T7仍损19且末败。7X0W3U8TVA2A千足虫普通尖啸28→6。')
heart=json.load(open(O/'historical-heart_of_iron.json'));hn=len({r['run'] for r in heart});ha=len(heart);assert hn==17 and all(r['delta']==7 and r['block_before']==r['block_after'] for r in heart)
change('silent-heart-of-iron-plating',f'铁心药水实饮建立7覆甲，不等即时或全战固定7挡。机制：{hn}局{ha}饮均覆甲增7、已有牌挡不变；已见敌行动前补现场覆甲，后轮按实际剩层，完整减层条件未隔离。搭配：牌挡/敏捷和覆甲分源，不设喝药/留药时点门槛。决定胜负的战斗：{hn}支持/0反例，无晚喝或未喝整战对照（n={hn}）。典型案例：ZTRGYYMLR8SC A10同族末T2建7、原7牌挡不变，18攻实损4；T3—8覆甲6/5/4/3/2/1、T9归零，末T14无覆甲、6挡对13攻杀4血；六试均已饮仍败。KFRDELW2TH2P恶魔末T7仅2覆甲、12牌挡对36败。')
change('silent-fan-of-knives-capacity','刀扇建立小刀群伤增益，实际生成数量须核手牌容量。机制：普通/升级牌文添4/5刀，打出先腾一格，上限10；FAN_OF_KNIVES_POWER=1后新刀也显示群伤，满手少刀不等能力未建立。搭配：力量逐刀、余像须实建才按牌次数补挡；换战重建。决定胜负的战斗：10支持/0反例，典型实伤仍为单敌，无多目标总伤或单卡胜因对照（n=10）。典型案例：ZTRGYYMLR8SC A10 F11能力药选择普通刀扇，8手打出后添3刀至10、建1层，2力量使小刀各6；赢战仍52→32损20，boss无刀扇增益。C48LLXBGKXQ9 10手普通只添1；2L1BNN9ZJEFU升级4手添5至8。')
rest=next(r for r in json.load(open(O/'rest-summary.json')) if r['asc']==10);median=rest['median'];rate=rest['deaths']/rest['nexts']*100
change('silent-rest-buffer-observation',f'观察：只计已完成回复，后战胜负另核，不预支未来营火。A10 {rest["runs"]}局{rest["rests"]}火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{rate:.2f}%），活损中位{median}；各阶另列（n=123）。典型案例：ZTRGYYMLR8SC F9/F13/F16各实回21，六场胜战仍耗51，56−51+63=68/70进同族六试败；没有回血对锻造受控胜负。')
band=next(r for r in A['bands'] if (r['asc'],r['act'],r['type'],r['band'])==(10,1,'Boss','≥60%'));rate=band['deaths']/band['n']*100
change('silent-route-hp-observation',f'观察：赢战也消耗下一场生存量，未来营火不当现有血。A10 83局一幕boss≥60%入血{band["n"]}房{band["deaths"]}死（{rate:.2f}%）、活损中位{band["median_win"]}；各进阶/幕/房型/血档另列，非路线因果（n=123）。典型案例：ZTRGYYMLR8SC F2/F3/F6胜共耗25，F11精英赢再耗20、F14胜耗6，三火63后68血进boss仍败；F1投影boss70，真实68，未走替线。')
change('silent-deck-burst-observation','观察：持有、计划与实建能力分账，费用、出牌额度和可活轮数共同限制兑现。机制：牌挡/毒/轮初能力按实际时点核，换战重新建立。搭配：当轮生存与持续输出合核，未取得或未建立不预支；护栏局部省血与少伤分账。决定胜负的战斗：118支持/0反例，构筑单因未控（n=118）。典型案例：ZTRGYYMLR8SC A10同族末22牌无能力/玩家力敏来源，首三轮净扣75、14轮扣266/324仍余58；F11刀扇及前战药水2力未带入，F7/F16计划步法/毒雾未取得。三次护栏候选共省10血/少24伤，原线整战未执行，不能累计成实得省血或胜因。PD9AYQVMLQW6首boss建触媒/雾，次boss未建，不能跨战继承。')
kinruns=index['silent-kin-poison-sl-observation']['evidence']+[N]
kg=collections.defaultdict(list)
for r in A['attempts']:
 if r['run'] in kinruns and any(f['run']==r['run'] and f['floor']==r['floor'] and 'KIN_PRIEST' in f['enemies'] for f in A['fights']):kg[(r['run'],r['floor'])].append(r)
kr=list(kg.values());multi=[r for r in kr if max(x['attempt'] for x in r)>1]
summary=dict(fights=len(kr),attempts=sum(len(r) for r in kr),wins=sum(x['result']=='won' for r in kr for x in r),multi_fights=len(multi),multi_attempts=sum(len(r) for r in multi),multi_wins=sum(x['result']=='won' for r in multi for x in r));(O/'kin-summary.json').write_text(json.dumps(dict(summary=summary,groups=list(kg.values())),ensure_ascii=False,indent=2)+'\n')
change('silent-kin-poison-sl-observation',f'观察：同族毒/能力须实建结算，候选focus非击杀，目标顺序胜因未控。机制：临时减力只降当轮多击，后轮成长另核。搭配：实际施毒/群伤、牌挡与血池合核，不定统一目标。决定胜负的战斗：{summary["fights"]}场{summary["attempts"]}试{summary["wins"]}赢，真正重打{summary["multi_fights"]}场{summary["multi_attempts"]}试{summary["multi_wins"]}赢；A0仅背景、策略仅A10（n=6）。典型案例：ZTRGYYMLR8SC A10六试68血/铁心+瓶装潜能均败，末T7/T9退两信徒，T7仍26攻损19，T14神官余58；首三轮扣75、14轮扣266/324。第2试换T1铁心/施毒目标并改洗牌时点，抽牌同变，不当单动作受控比较。S9UZAK0JP0C0 A10两试65血，赢次T4清信徒、T10胜余29，抽牌/防御/目标同变；Y6GM2CHWJBEY A0仅背景。')
ting=json.load(open(O/'historical-tingsha.json'));valid=[r for r in ting if r['delta']==3 and sum(b['hp']>a['hp'] or b['block']>a['block'] for b,a in zip(r['before'],r['after']))==1]
tr=list(dict.fromkeys(r['run'] for r in valid));assert N in tr
entry=dict(id='silent-tingsha-discard-damage',scope='relic:TINGSHA',name='铜钹',asc=[0,20],lesson=f'观察：铜钹的弃牌附加伤与原牌攻击分账。机制：{len(tr)}局{len(ting)}次无确认的单张弃牌，{len(valid)}次仅一敌HP/挡合计减3；另7次Vantom滑溜同现仅减1，未隔离其因果，不写普遍固定3。搭配：投掷匕首/生存者等完成弃牌才计该伤，未执行不预支；随机分布、多张弃牌和其他减伤未核。决定胜负的战斗：{len(tr)}支持/0反例，单遗物整战胜因未控（n={len(tr)}）。典型案例：ZTRGYYMLR8SC A10同族末T14投掷匕首原攻击后神官64，完成弃打击后64→61、额外3；后中和至58仍败，不能把3重复记入直伤。',evidence=tr,n_support=len(tr),n_contradict=0,confidence='high' if len(tr)>=5 else 'med' if len(tr)>=2 else 'low',last_seen=max('2026-10-'+r['ended'][8:10] for r in R.values() if r['run_id'] in tr),status='active')
E['entries'].append(entry);changes.append(dict(id=entry['id'],before=None,after=entry,new_runs=tr))
E['version']='2026-10-08.10';E['_about']='静默经验仅来自本角色复盘与实盘。第93次增量合并ZTRGYYMLR8SC A10，截至2026-10-08T00:21:56.238Z共123完局；旧122局七数组、血档、源节点转移、实回复及SL重算一致。群伤时点、临时减力/脆弱/覆甲及弃牌附伤分源；六试一实死、前五判死截断，不定目标或喝药新阈值。经验/账本/代码提案关联独立strategy-proposal，本任务不改打法源码。'
K.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(dict(entries=changes),ensure_ascii=False,indent=2)+'\n')
def stats(e):
 a=[r for r in e['entries'] if r['status']=='active'];return dict(active=len(a),chars=sum(len(r['lesson']) for r in a),confidence=dict(collections.Counter(r['confidence'] for r in a)),by_asc={str(n):dict(entries=len([r for r in a if r['asc'][0]<=n<=r['asc'][1]]),chars=sum(len(r['lesson']) for r in a if r['asc'][0]<=n<=r['asc'][1])) for n in [8,9,10]})
meta=dict(old_version=B['version'],version=E['version'],added=1,updated=9,retired=0,before=stats(B),after=stats(E),evidence=[dict(id=c['id'],evidence=c['after']['evidence'],contradicting=c['after'].get('contradicting',[]),asc=dict(collections.Counter(R[n]['ascension'] for n in c['after']['evidence']))) for c in changes])
assert meta['after']['chars']<=60000
(O/'update-summary.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in meta.items() if k!='evidence'},ensure_ascii=False))
