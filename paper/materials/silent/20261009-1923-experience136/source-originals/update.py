import collections
import json
from pathlib import Path

O=Path(__file__).parent.resolve()
E=json.load(open(O/'experience-before.json'))
A=json.load(open(O/'audit.json'))
N='R6WDLYS19ZTY'
C=[]
M={}

def revise(ident,ledger,text,asc=None):
    e=next(x for x in E['entries'] if x['id']==ident)
    b=json.loads(json.dumps(e))
    assert N not in e['evidence']
    e['evidence'].append(N)
    e['n_support']=len(set(e['evidence']))
    e['last_seen']='2026-10-09'
    n=e['n_support']
    e['confidence']='high' if n>=5 and e['n_contradict']<=n/3 else 'med' if n>=2 else 'low'
    e['lesson']=text.replace('【n】',str(n))
    if asc is not None:e['asc']=asc
    C.append(dict(id=ident,before=b,after=e))
    M[ident]=ledger

def mechanism(ident,ledger,conclusion,formula,pair,case,limit='单项整战胜因未控',asc=None):
    revise(ident,ledger,f'{conclusion}。机制：{formula}。搭配：{pair}。决定胜负的战斗：【n】支持/0反例，{limit}（n=【n】）。典型案例：{case}',asc)

def sl_counts(enemy,evidence):
    g=collections.defaultdict(list)
    for x in A['attempts']:
        if x['run'] in evidence and any(e['id'] in ({'CRUSHER','ROCKET'} if enemy=='KAISER_CRAB' else {enemy}) for e in x['terminal']['enemies']):g[(x['run'],x['floor'])].append(x)
    m=[v for v in g.values() if max(x['attempt'] for x in v)>1]
    return f'{len(m)}场{sum(len(v) for v in m)}试{sum(x["result"]=="won" for v in m for x in v)}赢'

r=next(x for x in json.load(open(O/'rest-summary.json')) if x['asc']==10)
b=next(x for x in A['bands'] if (x['asc'],x['act'],x['type'],x['band'])==(10,3,'Elite','≥60%'))
revise('silent-route-hp-observation',['silent-0019'],f'观察：赢战仍耗血药，未来营火不预支，问号另算。A10 {r["runs"]}局三幕精英入口≥60%共{b["n"]}房/{b["runs"]}局、{b["deaths"]}死（{100*b["deaths"]/b["n"]:.2f}%），活损中位{b["median_win"]}（n=【n】）。典型案例：R6WDLYS19ZTY棱柱胜耗58、卷轴胜耗29且上限减8，两店各回15后57/62进三骑士仍死；F40之后无岔路。不同路线未配对，不立安全血线。')
revise('silent-rest-buffer-observation',['silent-0020'],f'观察：HEAL增加即时缓冲，锻造不回血，到火遗物另账。A10 {r["runs"]}局{r["rests"]}独立火/{r["heal"]}HEAL实回{sum(r["gains"])}，去重{r["nexts"]}后战{r["deaths"]}死（{100*r["deaths"]/r["nexts"]:.2f}%），活损中位{r["median"]}（n=【n】）。典型案例：R6WDLYS19ZTY五HEAL各21共105、三锻造不回；F40 57/62锻造迷雾，回血最多补5，而终轮至少差7存活血。没有另一升级/回血整战胜局，不能据差额判原选择错。')
mechanism('silent-deck-burst-observation',['silent-0021','silent-0125'],'观察：能力实际建立、未来收益与即时血价分别验收','未施放不生效，未结毒不代付当前血价，随机能力与饰品分源','输出、过牌与实际挡共同兑现','R6WDLYS19ZTY F30护栏两替换题面合省26血/少41伤，实战66→8胜；F42建5敏及神气10，末仍36血10挡对剩52攻死。原线整战反事实未控')
mechanism('silent-strength-weak-observation',['silent-0012'],'力量逐击加伤、敏捷逐挡牌加挡，临时层撤后重核','基础加属性后核现场弱/脆弱/易伤，毒与被动挡另源','多击/多挡实际施放才获益，敌增力另账','R6WDLYS19ZTY F42T2饰品临时3力使匕首12→15、毒刺6→9，次轮撤；T4两挡因5敏比基础多10仍损2。LYBHQ1X230ZB四段1力多4伤','单公式整战因果未控')
mechanism('silent-footwork-block',['silent-0005'],'步法普通/升级建2/3敏捷，后续挡牌逐张兑现','旧挡不追补；事件改版与敌抑制分开，换战重建','多挡牌须有能量和生存窗口，临时速度另核','R6WDLYS19ZTY F42T1升级步法建3、T3第二张普通建2至5；普通防御10+战内普通偏折9+带入7=26，对43损17。第二步法F39已普通，非抑制令其少1敏')
mechanism('silent-speed-potion-temporary-dexterity',['silent-0253'],'速度药实加5临时敏捷，次轮撤回','逐饮加5；后续牌挡加敏，旧挡不追补，独立属性变化另账','与步法、多挡牌逐张核，不拟喝留门槛','R6WDLYS19ZTY F42T1步法3→速度8、生存者16+锚10共26挡对24零损，T2敏回3；后续T5仍死，无留药能赢对照')
mechanism('silent-reptile-trinket-temporary-strength',['silent-0330'],'饰品饮药建立本轮临时3力量，药水自身另源','已见单药+3、两药叠6，次轮撤临时层，永久力保留','当轮多段重复受益，毒/抽牌伤不加力量','R6WDLYS19ZTY F42T2技能药后力3，升级匕首12→15、毒刺6→9，T3力归零；随机免费迷雾另核。0DJ6GFZZ0TG9肌肉5加饰品3为8')
mechanism('silent-dampen-battle-upgrade-observation',['silent-0280'],'观察：抑制后战内牌版本与永久牌组升级分开','DAMPEN_POWER1时已见升级牌显示普通效果，不能归因永久牌早先改版','小刀数、毒与虚弱按现场版本核，已建能力另核','R6WDLYS19ZTY F42T5永久升级刀刃实生普通三刀；F40升级迷雾T4实4毒/1弱；偏折战内普通，5敏给9挡。第二步法F39已普通，不能归抑制')
mechanism('silent-haze-group-poison-weak',['silent-0235'],'迷雾群毒与虚弱分账，施放不即时扣本体','普通/升级已见4/6毒及1/2弱，制品与头骨按现场；弱退后重读攻击','群毒、当轮减攻和实际挡同核','R6WDLYS19ZTY F42T4抑制后普通迷雾4毒/1弱配25挡，对27损2；T5连枷虚弱消失显示13×2=26，不能沿用前轮15。64R0P0MTZWAX恶魔弱退后45攻仍死')
mechanism('silent-bronze-scales-per-hit-thorns',['silent-0129'],'铜质鳞片实建3荆棘，实际攻击逐击反伤，全挡也触发','单击3/三击9，毒和荆棘分源，未发生后续段不预支','实际挡保护玩家，反伤不代付当前血价','R6WDLYS19ZTY F42末幽灵49扣5毒及三击9荆棘至35，魔法69扣5毒和一击3至61；玩家仍死。XW8B5CHJ814J女王末致死首击只反3')
mechanism('silent-scroll-paper-cuts-unblocked',['silent-0221'],'卷轴纸伤难愈2按未完全挡住的攻击次数降最大HP','每漏击减2，全挡不减；上限下降与净HP损分账，只验2层','逐击挡、当前HP和上限共同验收','R6WDLYS19ZTY F35T1上限70→68、T2再→64→62，合减8；净HP56→27耗29，T3毒清场零损。833ZM0MJGWHC五漏击上限87→77')
mechanism('silent-serpent-form-per-card-damage',['silent-0132'],'群蛇形态已建后实际出牌向随机一敌补4/6伤','能力伤、牌效果、挡与本体分源，不固定随机目标，未来触发不预支','多牌/能量与抽牌须实际可付，仍核生存挡','R6WDLYS19ZTY F35T2能力药生成群蛇形态建4，T3出刀序列额外随机4伤参与清场，未控单项胜因；0DJ6GFZZ0TG9打自爆残壳4伤不取消爆炸')
for ident,ledger,enemy,conclusion,formula,pair,case in [
 ('silent-giant-explosion-window',['silent-0160'],'WATERFALL_GIANT','巨兽本体结束后仍须承受自爆，占位血不算新需伤','A10蒸汽已见T2=20后每轮+3，本体结束下一轮爆；本体HP读{@10:HP:WATERFALL_GIANT}，弱与实挡另核','提前结束本体、保留血挡及弱共同验收','R6WDLYS19ZTY F17前两次T13均21血15挡对50判死；第三次T10弱后30、8挡实34→12损22胜。T5多存8血少进度6，后抽序亦变，不归单因'),
 ('silent-kaiser-crab-facing-sl',['silent-0161'],'KAISER_CRAB','观察：帝王蟹朝向、毒杀与剩余部件血价同核，不定固定杀序','后方/力弱按现场，单侧退场后实见99挡及增力，不把一侧死亡当胜','毒与实挡、后轮存活共同验收，伴死增力不混其他来源','R6WDLYS19ZTY F33四试一赢，末T9毒杀火箭后仍1血，T10碾碎爪15血99挡12力26攻，被17毒清场；力12来源未拆，毒绕挡不代表高力安全')]:
    ev=next(x for x in E['entries'] if x['id']==ident)['evidence']+[N]
    mechanism(ident,ledger,conclusion,formula,pair,case,'真正重打'+sl_counts(enemy,ev)+'，替序整战单因未控')
mechanism('silent-infested-prism-tainted-skill-cost',['silent-0168','silent-0125'],'棱柱技能收益须合算污染逐击血价，能力不加污染','活力火花N使每技能加N污染、当前每段增对应值，次轮撤；A10已见T1—4=3、T5—8=6、T9=9','毒/挡/弱与攻击段同核，不一概禁技能','R6WDLYS19ZTY F30T1护栏题面省8血少19伤、T7省18少22，未施放毒亦少；实际66→8胜损58，不把合26预测省血当实救血或原线必败')
mechanism('silent-three-knights-output-buffer-observation',['silent-0106'],'观察：三骑士近满血和开场临时敏捷不能保证后段减员','逐敌核实血、毒杀后实际攻击，弱/暂力恢复后重读','能力、输出、实挡和入口资源同核，不定固定击杀序','R6WDLYS19ZTY A10 57/62两药入口、首轮零损；T5毒杀连枷后剩52攻，对36血10挡需42、至少差7血，实际只损36。F40回血最多补5，另一升级/目标能赢未控；A5/A7胜例仅背景','A10本主题三场皆败；低阶胜例不当高阶安全线',asc=[10,20])
mechanism('silent-act-transition-missing-hp-heal',['silent-0243'],'已见A9/A10跨幕按缺失HP的80%向下取整回血','同上限⌊(maxHP−当前HP)×0.8⌋，连续boss不回血，低阶范围未核','营火、遗物、事件、复活及SL恢复分源，未来HP不预支','R6WDLYS19ZTY巨兽12/70→58回46、蟹1/70→56回55；五次SL恢复入口53/44且力量药复原，非额外回血/新获药。XW8B5CHJ814J连续boss7血交接回0','回复不保证后战')
e=dict(id='silent-panache-fifth-card-group-damage',scope='card:PANACHE',name='神气制胜',asc=[0,20],lesson='观察：神气制胜10在已核的第五张配对额外对每敌10群伤，总出牌计数不独立保证触发。机制：逐敌先消挡再扣本体，与牌自身伤分源；建立当轮、自动出牌/计数偏移、限伤、升级/叠层/重放/第十张未核。搭配：多牌与能量须实际兑现。决定胜负的战斗：3支持/0确证反例，整战单因未控（n=3）。典型案例：R6WDLYS19ZTY A10 F42T5切割6另群伤10，三敌实血21/耗挡9仍死；G403VCZ3BH1B A9蟹T4全扫8另各10；2SU6XN2AEJRD A6枢纽T6第5张防御亦扣10。',evidence=['2SU6XN2AEJRD','G403VCZ3BH1B',N],n_support=3,n_contradict=0,confidence='med',last_seen='2026-10-09',status='active')
assert not any(x['scope']=='card:PANACHE' for x in E['entries'])
E['entries'].append(e)
C.append(dict(id=e['id'],before=None,after=e))
M[e['id']]=['silent-0343']
E['version']='2026-10-09.25'
E['_about']='静默经验只从本角色实盘/复盘学习。第136次增量核R6WDLYS19ZTY并按两处勘误；全引擎学习观察截至'+A['cutoff']+'；主题支持局、公式动作、血档/节点/SL分母分开，未配对观察不当整战因果。'
(O.parents[2]/'knowledge/characters/silent/experience.json').write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
for name,data in [('changes',C),('ledger-map',M)]:
    (O/(name+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')

def sizes(e):
    a=[x for x in e['entries'] if x['status']=='active']
    return dict(active=len(a),chars=sum(len(x['lesson']) for x in a),confidence=dict(collections.Counter(x['confidence'] for x in a)),by_asc={str(i):dict(entries=len(v),chars=sum(len(x['lesson']) for x in v)) for i in [8,9,10] if (v:=[x for x in a if x['asc'][0]<=i<=x['asc'][1]])})

summary=dict(old_version='2026-10-09.24',version=E['version'],added=1,updated=len(C)-1,evidence=len(C)-1,numbers=0,retired=0,before=sizes(json.load(open(O/'experience-before.json'))),after=sizes(E))
assert summary['after']['chars']<=60000
(O/'update-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False))
