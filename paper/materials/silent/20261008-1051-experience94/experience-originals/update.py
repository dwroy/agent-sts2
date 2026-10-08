import collections, copy, json
from pathlib import Path

O=Path(__file__).parent
N='K2JAGKVJAWZJ'
K=Path('knowledge/characters/silent/experience.json')
B=json.load(open(O/'experience-before.json')); E=copy.deepcopy(B)
A=json.load(open(O/'audit.json')); R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
I={e['id']:e for e in E['entries']}; changes=[]

def change(eid, text):
    e=I[eid]; old=copy.deepcopy(e)
    assert N not in e['evidence']
    e['evidence'].append(N); e['n_support']=len(e['evidence']); e['last_seen']='2026-10-08'
    e['lesson']=text.replace('{n}',str(e['n_support']))
    n=e['n_support']; c=e['n_contradict']
    e['confidence']='high' if n>=5 and c<=n/3 else 'med' if n>=2 else 'low'
    changes.append(dict(id=eid,before=old,after=copy.deepcopy(e),new_runs=[N]))

change('silent-strength-weak-observation','力量逐击影响攻击，敏捷逐张影响牌挡，被动收益分源。机制：现场力与弱/易伤逐击核，牌挡加敏后核脆弱，已有挡不倒补；换战重建。搭配：多击/多张挡重复兑现，毒与覆甲另算。决定胜负的战斗：{n}支持/0反例，单项整战胜因未控（n={n}）。典型案例：K2JAGKVJAWZJ A10三骑士T9连枷6力且虚弱显示12×2，加幽灵12共36攻；玩家2敏使生存者8→10、爆发重放合20，钨合金棍后仍需损14、13血死。')
change('silent-mirage-poison-card-block','蜃景由现场存活敌人毒总量兑现牌挡，零毒不能预支未来叠毒。机制：加现场敏捷再核脆弱，施放不耗毒、不追补之后新增毒；升级零毒亦实增0。搭配：施毒与格挡时序合核，毒雾持有不等已建立。决定胜负的战斗：{n}支持/0反例，单牌整战胜因未控（n={n}）。典型案例：K2JAGKVJAWZJ A10三骑士T1蜃景+耗1能、零毒零敏、16挡不变；T6普通版在抑制下8毒+2敏实加10挡，仍损26。LLYSRQQ35AVW A8两敌35毒脆弱得26挡，余像另1。')
change('silent-vambrace-opening-block','臂甲首张实际格挡翻倍，不能外推为每回合翻倍。机制：首张基础加敏后翻倍，脆弱/其他倍率另核，消费后回常态。搭配：逐牌核实际打出，被弃或未打不预支。决定胜负的战斗：{n}支持/0反例，遗物整战胜因未控（n={n}）。典型案例：K2JAGKVJAWZJ A10三骑士T1后空翻+8→16，随后蜃景+零毒仍加0，T2后空翻+8+2敏只加10；早段挡不能代表后段安全。7X0W3U8TVA2A首生存者8→16，后防御被弃不计5挡。')
change('silent-piercing-wail-temporary-strength','尖啸临时降力按攻击段数兑现，不当恒定挡或永久降力。机制：普通/升级减6/8，逐击核现场力/弱，次轮恢复与独立成长分账。搭配：多击重复受益，仍需真实牌挡；后轮重核。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：K2JAGKVJAWZJ A10三骑士T2升级将三敌0力变−8，前两敌20+17→4+9；T3普通减6，T5连枷已3力、T8为6力，T5/T6净损39/26。ZTRGYYMLR8SC同族尖啸33→11后次轮恢复。')
change('silent-burst-next-skills-replay','爆发本轮使普通下一张、升级下两张技能各额外打出一次，攻击不耗层、未用不跨轮。机制：符合技能消耗一层，每次重放各兑现牌效与实际被动；敏捷计入每次牌挡。搭配：能量、后续技能、实际弃牌和各增益同核，不把两层当同牌多重放两次。决定胜负的战斗：{n}支持/0反例，单组件胜因未控（n={n}）。典型案例：K2JAGKVJAWZJ A10三骑士T9爆发+建2层，2敏生存者两次10合20、余1层，13血仍死；ENKYQMS9W4ZD A6爆发2层与复制1层使单次12毒药瓶合三次36毒、余像另3。')
change('silent-three-knights-output-buffer-observation','观察：三骑士早段爆发与单轮减力不能代表后段减员和生存时钟。机制：逐敌核剩血、毒与攻击段，临时力量恢复后重核成长。搭配：已结算输出、实际能力、挡与资源链合核，不定固定击杀序。决定胜负的战斗：A5/A6/A7各1场、A10两场，共5场2胜3败；本条保留低阶适用，高阶仅背景（n={n}）。典型案例：K2JAGKVJAWZJ A10 F46为86/91入场，前四轮损2，T5/T6损39/26；T8末毒杀魔法，T9另两敌仍43/84、13血20挡实死。2PVLGRBGUX9S A7五轮扣276、净损29胜；敌与构筑不同，无换序受控勝局。')
change('silent-deck-burst-observation','观察：持有能力、计划与实际建立分账，费用和可活轮数限制兑现。机制：毒/轮初能力/新增挡按现场时点核，换战重建。搭配：已施毒与当轮生存同核，前段少伤不预支后段安全，未建立不加成长。决定胜负的战斗：{n}支持/0反例，构筑单因未控（n={n}）。典型案例：K2JAGKVJAWZJ A10终组34牌/16升级，三骑士未建立毒雾或融入暗影；T1蜃景+零毒加0，T6八毒加10挡仍损26，T9剩127敌血而死。前战实际建过能力不带入；无替击杀序/首轮换牌整战胜线。')
rest=next(r for r in json.load(open(O/'rest-summary.json')) if r['asc']==10)
change('silent-rest-buffer-observation',f'观察：只计已完成回复，后战胜负另核，不预支未来营火。A10 {rest["runs"]}局{rest["rests"]}火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{100*rest["deaths"]/rest["nexts"]:.2f}%），活损中位{rest["median"]}；各阶另列（n={{n}}）。典型案例：K2JAGKVJAWZJ F31胜损35，F32实回22后蟹第二试损34；F42/F44各回27、F43实扣10才86血进三骑士仍败。SL恢复52血不是回复，无锻造受控胜负。')
band=next(r for r in A['bands'] if (r['asc'],r['act'],r['type'],r['band'])==(10,3,'Elite','≥60%'))
change('silent-route-hp-observation',f'观察：赢战仍耗下一战生存量，高血不能保证精英通过。A10 84局三幕精英≥60%入血{band["n"]}房{band["deaths"]}死（{100*band["deaths"]/band["n"]:.2f}%），活损中位{band["median_win"]}；各阶/幕/房型/血档另列，非路线因果（n={{n}}）。典型案例：K2JAGKVJAWZJ 三幕三胜房实损24/8/11，到42血；两火各27、事件实扣10后86/91入强制三骑士仍敗；未来火堆不当当前血，无已走替线胜负。')
crab=json.load(open(O/'silent-kaiser-crab-facing-sl-summary.json'))
multi=crab['multi']; nf=len(crab['fights']); live=sum(not f['death'] for f in crab['fights'])
change('silent-kaiser-crab-facing-sl',f'观察：帝王蟹朝向、毒/能力与即时血价同核，固定击杀序胜因未控。机制：后方攻击、力量/虚弱依现场核，毒按实结，换战重建能力。搭配：输出与牌挡合核，有限全败不等即时血价相同。决定胜负的战斗：{{n}}局{nf}房{live}活{nf-live}死，真正重打{len(multi)}场{sum(len(v) for v in multi)}试{sum(x["result"]=="won" for v in multi for x in v)}赢（n={{n}}）。典型案例：K2JAGKVJAWZJ A10 F33两试62血、首29张抽序相同；T1施毒目标火箭→爪，后续减力/挡/目标也变；首试T10喝毒仍判死、第二试T11胜剩28且留原瓶。首轮目标与胜负不作单因，洗牌后未控；RC61MFQM63Y6六试0赢。')
change('silent-act-transition-missing-hp-heal','已观察A9/A10跨幕回复按当时缺失HP的80%向下取整，不是固定满血。机制：同上限F17→18/F33→34按⌊(最大HP−当前HP)×0.8⌋，低阶/其他先古未核；三幕连续boss无这次跨幕。搭配：营火、开场遗物、复活与SL恢复分账。决定胜负的战斗：{n}支持/0反例，资源公式不等胜因（n={n}）。典型案例：K2JAGKVJAWZJ A10瀑布巨兽后13/70→58补45，蟹后28/75→65补37；SL首试10→62的52血另算。PD9AYQVMLQW6首boss后10血原样进第二boss。')
change('silent-shadowmeld-new-block-double','融入暗影只翻本轮建立后新增挡，已有挡不补。机制：实建1层后牌基础加敏再乘2，建立本身不带挡、轮末撤；脆弱和其他来源另核。搭配：先付建立费，再兑现实际后续牌挡，未施放不翻倍。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：K2JAGKVJAWZJ A10蟹首试T10旧7挡施暗影仍7；第二试T3暗影后普通扫腿实挡28、零损，三骑士持有却未建立，不把蜃景10挡写成20。9Z9H2EXKLF3T沙漏2敏斗篷与士兵双倍率得32。')
potions=json.load(open(O/'historical-potions.json'))
def potion_count(p):
    rows=[r for r in potions if r['potion']==p]
    return len({r['run'] for r in rows}), len(rows)
nd,ad=potion_count('DEXTERITY_POTION')
change('silent-dexterity-potion-card-block',f'敏捷药水实饮建2敏捷，已有挡不倒补。机制：{nd}局{ad}饮均+2，随后每牌加现场敏捷再核脆弱；换战不继承。搭配：多挡牌重复收益，能力/被动挡分源，不定喝留阈值。决定胜负的战斗：{{n}}支持/0反例，时点整战因果未控（n={{n}}）。典型案例：K2JAGKVJAWZJ A10 F15药后2敏，防御给7而非5；本场仍净损17，药水敏捷不跨战带入。三骑士2敏来自实建步法，不是前战药。')
nh,ah=potion_count('HEART_OF_IRON')
change('silent-heart-of-iron-plating',f'铁心药水实饮建立7覆甲，不等即时或全战固定7挡。机制：{nh}局{ah}饮均覆甲+7、旧牌挡不变；后轮按实际剩层，完整减层条件未隔离。搭配：牌挡/敏捷与覆甲分源，不定喝留时点。决定胜负的战斗：{{n}}支持/0反例，无晚喝整战对照（n={{n}}）。典型案例：K2JAGKVJAWZJ A10 F27T2药前后均0挡而覆甲0→7，零净损胜；三骑士无该覆甲不补前战7。ZTRGYYMLR8SC同族T2建7、T9归零，六试仍败。')
np,ap=potion_count('POISON_POTION')
pr=[r for r in potions if r['potion']=='POISON_POTION']
delta=collections.Counter()
for r in pr:
    for b,z in zip(r['before']['enemies'],r['after']['enemies']):
        if b['index']==r['target']: delta[z['powers'].get('POISON_POWER',0)-b['powers'].get('POISON_POWER',0)]+=1
assert delta=={6:106,7:15,0:2},delta
change('silent-poison-potion-observed-application',f'毒药水先施毒，饮用当步不扣本体HP。机制：{np}局{ap}饮，无加量/阻挡106饮加6；头骨4局15饮加7，制品2局2饮阻毒且耗1层，未见组合不外推。搭配：活到实际毒结算，触媒须实建，不定早喝/留药阈值。决定胜负的战斗：{{n}}支持/0反例，时点整战胜因未控（n={{n}}）。典型案例：K2JAGKVJAWZJ A10蟹首试T10实饮加6毒仍判死；第二试保留原瓶胜，F45主动弃原瓶换液态记忆后末战仍敗，无已喝/未喝受控整战。GXNKW8X1XYJP三骑士头骨使加7、四试败。')

rod=dict(id='silent-tungsten-rod-hp-loss-observation',scope='relic:TUNGSTEN_ROD',name='钨合金棍',asc=[0,20],
         lesson='观察：钨合金棍持有场景的数值与每次穿挡HP损失减1一致，不能把总攻击只减1。机制：逐击先扣剩挡，正HP损失各少1，零损不产生回血；事件扣血另核，未隔离其他组合。搭配：格挡与多击分段算，完整需损和死亡实扣剩血分开。决定胜负的战斗：3支持/0反例，无移除遗物整战对照（n=3）。典型案例：K2JAGKVJAWZJ A10三骑士T6为26+12+11攻/20挡，三次穿挡各少1而损26；T9为36攻/20挡、两次穿挡需损14，13血死且严格差2。F43事件文案扣11、实69→59扣10。10GPK5XGHCK3 A3 F17T5九攻/五挡实损3；UJ0K3G10609Y A10 F33T7二十一攻/十二挡实损8。',
         evidence=['10GPK5XGHCK3','UJ0K3G10609Y',N],n_support=3,n_contradict=0,confidence='med',last_seen='2026-10-08',status='active')
E['entries'].append(rod); changes.append(dict(id=rod['id'],before=None,after=copy.deepcopy(rod),new_runs=rod['evidence']))
E['version']='2026-10-08.11'
E['_about']='静默经验只来自本角色实盘与复盘。第94次增量合并K2JAGKVJAWZJ A10，截至2026-10-08T01:17:20.209Z共124完局；旧123局七数组、血档、节点后战、回血及SL复算一致。蜃景零毒与有毒收益、临时减力/成长、重放及钨合金棍分源；蟹两试首29抽相同但后续行动同变，不定单动作胜因。经验/账本/代码提案关联独立strategy-proposal，本任务不改打法源码。'
def stats(x):
    active=[e for e in x['entries'] if e['status']=='active']
    return dict(active=len(active),chars=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),by_asc={str(a):dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in active),chars=sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]})
meta=dict(old_version=B['version'],version=E['version'],added=1,updated=len(changes)-1,retired=0,before=stats(B),after=stats(E),evidence=[dict(id=c['id'],evidence=c['after']['evidence'],contradicting=c['after'].get('contradicting',[]),by_asc=dict(collections.Counter(R[n]['ascension'] for n in c['after']['evidence']))) for c in changes])
assert meta['after']['chars']<=60000
K.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(dict(entries=changes),ensure_ascii=False,indent=2)+'\n')
(O/'update-summary.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in meta.items() if k!='evidence'},ensure_ascii=False))
