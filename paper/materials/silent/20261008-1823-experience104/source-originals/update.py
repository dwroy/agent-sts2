import collections, copy, json
from pathlib import Path
O=Path(__file__).parent
B=json.load((O/'experience-before.json').open()); E=copy.deepcopy(B)
I={e['id']:e for e in E['entries']};A=json.load((O/'audit.json').open())
R={r['run_id']:r for r in json.load((O/'run-metadata.json').open())}
N='SY0WMJNNVRLM';C=[];M={}
def change(eid,text,ledgers,runs=None,scope=None,name=None,asc=None):
    runs=runs or [N]; old=copy.deepcopy(I.get(eid));e=I.get(eid)
    if e is None:
        e=dict(id=eid,scope=scope,name=name,asc=asc or [0,20],lesson='',evidence=[],n_support=0,n_contradict=0,confidence='low',last_seen='2026-10-08',status='active')
        E['entries'].append(e);I[eid]=e
    for run in runs:
        assert run not in e['evidence'] and R[run]['character'].lower()=='silent'
        e['evidence'].append(run)
    e['n_support']=len(e['evidence']);e['last_seen']='2026-10-08'
    e['lesson']=text.replace('{n}',str(e['n_support']))
    n=e['n_support'];z=e['n_contradict'];e['confidence']='high' if n>=5 and z<=n/3 else 'med' if n>=2 else 'low'
    C.append(dict(id=eid,before=old,after=copy.deepcopy(e),new_runs=runs));M[eid]=ledgers
change('silent-fight-me-upgraded-dual-strength','与我一战！+实建双向力量，收益只从后续攻击兑现。机制：本局先攻击12，再给玩家4力量、该目标1力量；未验普通版/重放/叠层，换战不继承。搭配：多攻击段重复受益，目标增力也须计血价。决定胜负的战斗：A10两胜战实建、boss六试未建，单卡胜因未控（n={n}）。典型案例：SY0WMJNNVRLM F31T1后段48→36，后续突然一拳12、中和7各多4伤；F33末九轮扣162尚缺179，不能由持有力量牌推已启动或强制T3施放。',['silent-0302'],scope='card:FIGHT_ME',name='与我一战！')
change('silent-ghost-in-a-jar-current-turn','罐装幽灵只覆盖已建无实体的当轮，不保证下一轮安全。机制：五局20次实饮均建1无实体，已见攻击26→1；下一轮撤，即使本轮无攻击也到期，其他伤源/叠层未验。搭配：当轮来袭和现有挡共同核，不由boss药价0推任意时点有效。决定胜负的战斗：5支持/0反例，延后饮药整战未实打（n={n}）。典型案例：9YBKCNBFP0X5 A4实验体T1降26为1并保51血；SY0WMJNNVRLM A10沙虫六次T4无攻击时饮、T5无实体已撤，各实损24，不能称留药必胜。',['silent-0301'],runs=['9YBKCNBFP0X5','G403VCZ3BH1B','YLYLZWHA0GKU','XTSV1U9JD34T',N],scope='potion:GHOST_IN_A_JAR',name='罐装幽灵')
change('silent-footwork-block','步法普通/升级建立2/3敏捷，后续每张挡牌兑现，已有挡不补。机制：基础挡加现场敏捷后核脆弱及倍率，柔嫩等变化另核。搭配：多挡牌重复受益，未打挡牌无收益。决定胜负的战斗：{n}支持/0反例，单卡整战因果未控（n={n}）。典型案例：9R916WW0V65N六敏无挡牌死；SY0WMJNNVRLM A10沙虫末试T4建2敏、T6两防御各7共14，比基础10多4，仍对24损10。',['silent-0005'])
change('silent-strength-weak-observation','力量逐击加伤，敏捷逐张加牌挡，乘区与来源分账。机制：现场力/敏后核弱、脆弱，旧挡不倒补，临时量另核。搭配：多击/多挡重复受益，毒与被动挡另算。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：LYBHQ1X230ZB四攻击段1力共多4伤；SY0WMJNNVRLM A10沙虫无弱同双击，力3/6时12×2/15×2，多3力多6威胁；玩家胜战4力不继承boss。',['silent-0012','silent-0006'])
change('silent-accelerant-triggers','触媒增加毒结算次数，不倍增毒层，普通/升级建1/2且不即时施毒。机制：k层至多k＋1次，每结减1、零停止；普通p≥2为2p−1、升级p≥3为3p−3，限伤/阶段另核。搭配：先建毒并活到结算，换战重建。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：GXNKW8X1XYJP恶魔29毒三结84；SY0WMJNNVRLM A10沙虫末T5蛇咬7毒实结7＋6＝13，荆棘另6；T9毒6＋5＝11，结束仍缺179血。',['silent-0027'])
change('silent-burst-next-skills-replay','爆发本轮使普通下一张、升级下两张技能各额外打出一次，攻击不耗层、未用不跨轮。机制：每张符合技能耗一层，各次牌效/被动独立兑现，敏捷计入每次牌挡。搭配：施毒、能量和弃牌分账，两层不等同牌再打两次。决定胜负的战斗：{n}支持/0反例，单组件胜因未控（n={n}）。典型案例：AD3QSC3P41JU女王爆发重放尖啸减12力；SY0WMJNNVRLM A10沙虫首T5普通爆发重放蛇咬建14毒、触媒结27，末试单蛇咬7毒仅结13，两试结局均败，不当受控胜因。',['silent-0115'])
change('silent-bronze-scales-per-hit-thorns','铜质鳞片开战建3荆棘，敌每次实际攻击分别反伤，全挡亦触发。机制：单击3/三击9，敌限制和剩血另核，不并作毒或牌伤。搭配：挡保护玩家但不取消反伤，未发动攻击不预支。决定胜负的战斗：{n}支持/0反例，遗物整战胜因未控（n={n}）。典型案例：R0HEV5E3QT6G三击全挡仍反9；SY0WMJNNVRLM A10沙虫末T5毒13加双击反6共扣19，末T9毒11加反6共扣17仍死，死亡后未来反伤不预支。',['silent-0129'])
change('silent-permafrost-first-power-block','永冻冰晶每战首次能力实补7挡，属于当轮一次收益。机制：与能力所建敏捷/毒增益分账，遗物挡不加敏捷，未攻击轮挡不留后轮。搭配：核首次触发及真实来袭，未施放不预支。决定胜负的战斗：{n}支持/0反例，遗物胜因未控（n={n}）。典型案例：PJ2LL9KU7FHD族母能力7加双防御14抵21；SY0WMJNNVRLM A10沙虫六试T1触媒各补7，首后空翻+另由臂甲给16合23；末T4步法未重给7。',['silent-0173'])
change('silent-vambrace-opening-block','臂甲翻倍战内首张实际牌挡，不当每轮恒定翻倍。机制：首张基础加敏后翻倍，消费后其他来源另核，未知交互不外推。搭配：实际牌序、遗物一次挡与后续敏捷分源核。决定胜负的战斗：{n}支持/0反例，遗物胜因未控（n={n}）。典型案例：K2JAGKVJAWZJ首后空翻16、次轮只10；SY0WMJNNVRLM A10沙虫T1无敏首后空翻+8→16，冰晶另7；末T6两防御各7不再翻倍，仍损10。',['silent-0013'])
regen=[x for x in A['potions'] if (x.get('potion') or {}).get('id')=='REGEN_POTION']
extra=[r for r in R if r in {x['run'] for x in regen} and r not in I['silent-regen-potion-decay-heal']['evidence']]
change('silent-regen-potion-decay-heal','再生逐轮回复并受上限截断，不当即时15血。机制：18局25饮均增5层，完整层序5/4/3/2/1共15；短战/封顶按实回，先回后敌伤已核。搭配：牌挡与再生分源，净损不当敌总伤，不定留药门槛。决定胜负的战斗：{n}支持/0反例，单项胜因未控（n={n}）。典型案例：T0DGVABPV60U猫头鹰实回15、失血27净损12；SY0WMJNNVRLM A10盛碗虫64→70净增6，但T2净损2，中间回血/受击帧缺失，不据当轮再生4层认定实回4。',['silent-0259'],runs=extra)
change('silent-act-transition-missing-hp-heal','已见A9/A10跨幕按缺失HP的80%向下取整回复。机制：同上限⌊(最大HP−当前HP)×0.8⌋，低阶/其他先古未核，连续boss非跨幕。搭配：营火、事件、药水与SL恢复分账。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：AD3QSC3P41JU连boss无回复；SY0WMJNNVRLM A10墨影胜14/70、跨幕到58实回44，另六火154，七次SL恢复血药不算治疗。',['silent-0243'])
rest=json.load((O/'rest-summary.json').open())[-1]
band=next(r for r in A['bands'] if (r['asc'],r['act'],r['type'],r['band'])==(10,2,'Monster','<25%'))
change('silent-rest-buffer-observation',f'观察：实际回复与下一战分账，不预支未到营火。A10 {rest["runs"]}局{rest["rests"]}火/{rest["heal"]}回血实回{sum(rest["gains"])},去重{rest["nexts"]}后战{rest["deaths"]}死（{100*rest["deaths"]/rest["nexts"]:.2f}%），活损中位{rest["median"]}；各阶另列（n={{n}}）。典型案例：SY0WMJNNVRLM六火回154、无锻造；F23取得枕头后F25/27/32实回36/31/24，满70进boss仍败，不证明改锻造能赢。',['silent-0020'])
change('silent-route-hp-observation',f'观察：问号可战，胜当前战/避精英不保证后段血药。A10 {rest["runs"]}局二幕Monster以<25%入血{band["n"]}房/{band["runs"]}局、{band["deaths"]}死（{100*band["deaths"]/band["n"]:.2f}%），活损中位{band["median_win"]}；分阶/幕/房型/血档另列（n={{n}}）。典型案例：SY0WMJNNVRLM二幕58经两胜走廊−11/−30再问号异螨−14剩3；后段两火恢复至70，替路线未知。BJLTVSYXCSGS改问号后未到F43火。',['silent-0019'])
change('silent-deck-burst-observation','观察：取得能力、实际建立、后续兑现与整场结果逐段核，不由持有主轴或满血推输出闭环。机制：只计实建增益、已结毒与可活轮，换战重建。搭配：即时伤/持续输出与真实挡合核，抽牌后重问不等执行原方案。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：SY0WMJNNVRLM A10前战建4力，boss六试未建、末九轮扣162尚缺179；F9护栏题面省10血少12伤，抽牌重问实损2且扣12，原线未实打，不当受控省13血。',['silent-0021','silent-0125'])
change('silent-insatiable-dual-clock','沙虫沙坑与攻击分别核，延长不等挡攻击，未来毒不预支。机制：逃离已见加1，沙坑归零判死；毒按实结与剩血核。搭配：真实挡/血与可活输出共同验收，重问新增手牌须重核。决定胜负的战斗：{n}支持/0反例，历史重打13场52试7赢，本局六试0赢（n={n}）。典型案例：H1T1F8ML9FUE第二试延沙坑后毒胜；SY0WMJNNVRLM A10末试T3后空翻重抽补防御/中和延至T9，11血7挡对30完整损23、存活至少差13，沙坑仍2而敌余179，不称整场只差13血。',['silent-0018','silent-0079'])
change('silent-myte-toxic-block-sl-observation','观察：异螨同抽重打须合核持牌伤、攻击及下一轮存活敌，不定固定目标顺序。机制：毒素每张5伤与敌击共付挡/血，已结毒杀和施弱分源。搭配：即时血价与后轮需伤共同验收，全败模拟不证明换伤更安全。决定胜负的战斗：两场七试1赢，只有本局第三试胜（n={n}）。典型案例：MTQ0EUBJ3R6T末SL少10挡多6伤仍败；SY0WMJNNVRLM A10 F21第2/3试T4同9血/3能/五手、敌39/23且各5毒；胜试集中#1并毒退、弱化#2承6剩3后T5胜，第2试先杀#2当轮零损却T5判死；多目标共同变不归单张牌或运气。',['silent-0079'])
change('silent-haze-group-poison-weak','迷雾群毒与当轮虚弱分账，施放不即时扣本体。机制：普通/升级4/6毒及1/2弱，结束结毒再减1，制品逐项阻减益，弱不清成长。搭配：爆发增加次数，仍需活到结算。决定胜负的战斗：{n}支持/0反例，整战因果未控（n={n}）。典型案例：H1T1F8ML9FUE沙漏制品逐项阻毒/弱；SY0WMJNNVRLM A10异螨三试T1爆发复制迷雾各建8毒，药水减力另计；沙虫首T3迷雾/蜃景后实损19，施弱不保证少损。',['silent-0235'])
change('silent-snakebite-retained-poison','蛇咬保留并施毒，不即时扣本体，施毒不吃负力量。机制：普通/升级实加7/10毒，普通基础2费；免费个例来源不外推，结毒减1、触媒/限伤另核。搭配：到手/支付/可活结算共同验收，爆发复施另计。决定胜负的战斗：{n}支持/0反例，单卡胜因未控（n={n}）。典型案例：W7BHM8U02RKG负2力仍施7毒；SY0WMJNNVRLM A10沙虫首T5爆发蛇咬14毒结27，末单蛇咬7毒结13，两试均败，不能由单轮加倍推出整战胜。',['silent-0220'])
E['version']='2026-10-08.21'
E['_about']='静默经验只来自本角色实盘与复盘。第104次增量合并SY0WMJNNVRLM一局A10，按F31归零勘误；截至2026-10-08T09:05:54.173Z共136完局，旧135局七数组/血档/节点后战/休息/SL复算一致。新增跨色升级与我一战双向力量及罐装幽灵当轮覆盖，力敏/毒/重放/遗物分源，持有能力不当已建立。异螨同抽三试一赢、沙虫六试零赢，局部血价与整战因果分账；再生旧数字漂移据动作重算。相关经验/账本/代码提案关联独立strategy-proposal，不改打法源码或其他角色。'
def stats(x):
    a=[e for e in x['entries'] if e['status']=='active']
    return dict(active=len(a),chars=sum(len(e['lesson']) for e in a),confidence=dict(collections.Counter(e['confidence'] for e in a)),asc={k:dict(entries=sum(e['asc'][0]<=k<=e['asc'][1] for e in a),chars=sum(len(e['lesson']) for e in a if e['asc'][0]<=k<=e['asc'][1])) for k in [8,9,10]})
summary=dict(old_version=B['version'],version=E['version'],added=sum(c['before'] is None for c in C),updated=sum(c['before'] is not None for c in C),retired=0,before=stats(B),after=stats(E),evidence=[dict(id=c['id'],evidence=c['after']['evidence'],contradicting=c['after'].get('contradicting',[]),by_asc=dict(collections.Counter(R[r]['ascension'] for r in c['after']['evidence']))) for c in C])
assert summary['after']['chars']<=55000
Path('knowledge/characters/silent/experience.json').write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
for name,value in [('changes',dict(entries=C)),('update-summary',summary),('ledger-map',M)]: (O/(name+'.json')).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k!='evidence'},ensure_ascii=False))
