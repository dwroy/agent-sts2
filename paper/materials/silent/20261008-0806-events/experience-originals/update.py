import collections,copy,json
from pathlib import Path
O=Path(__file__).parent;P=O.parents[2]/'knowledge/characters/silent/experience.json';N='GXNKW8X1XYJP'
B=json.load(open(O/'experience-before.json'));Z=copy.deepcopy(B);E={e['id']:e for e in Z['entries']}
A=json.load(open(O/'audit.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
texts={
'silent-footwork-block':'步法普通/升级建2/3敏捷，逐张挡牌兑现、不追补已有挡。机制：牌基础挡加现场敏捷后核脆弱，被动挡另计。搭配：多张挡牌重复受益，新增敏捷只作用之后的牌。决定胜负的战斗：{n}支持/0反例，单卡整战因果未控（n={n}）。典型案例：GXNKW8X1XYJP A10三骑士第2/末试T1步法建2敏后彩虹相关再加1敏/1力；生存者先得10挡，随后两防御各8，不倒补生存者。末T3两防御16比基础多6，仍13血+25总挡对40败。',
'silent-gorget-plating':'护喉甲开场覆甲不等于整场固定格挡。机制：实见开场4、后段减少或耗尽；完整减层条件未隔离。搭配：覆甲、敏捷卡牌挡及其他被动挡分源，用现场层数。决定胜负的战斗：{n}支持/0反例，单遗物整战胜因未控（n={n}）。典型案例：GXNKW8X1XYJP A10三骑士四试覆甲T1/T2/T3为4/3/2，末T3翻滚带7、两防御16共23，覆甲另2，40攻需损15而只有13血；不把开场4沿用到末轮。',
'silent-strength-weak-observation':'力量逐击影响攻击，敏捷逐张影响牌挡，增益与被动挡分源。机制：现场力量及弱/易伤逐击核，牌挡加敏后核脆弱，新增敏捷不倒补旧挡。搭配：多击/多张挡重复兑现，毒与覆甲另算。决定胜负的战斗：{n}支持/0反例，单项整战胜因未控（n={n}）。典型案例：GXNKW8X1XYJP A10三骑士末T3为1力/3敏，小刀各5伤、两防御各8；带7挡与2覆甲后仍13血对40攻败。KFRDELW2TH2P恶魔加3力后三击9×3→12×3，不能只多算3。',
'silent-deck-burst-observation':'观察：持有、计划与实建能力分账，费用、额度和可活轮数共同限制兑现。机制：毒/牌挡按实际时点结算，未施放能力不预支。搭配：持续毒与当轮格挡共同核，局部收益不当整战胜因。决定胜负的战斗：{n}支持/0反例（n={n}）。典型案例：GXNKW8X1XYJP A10恶魔已建两雾/触媒+，T5毒29三结84、T6毒31三结90，七轮仅损3胜；三骑士末T3触媒未建、抑制后三刀实15伤，不能预支第四刀或额外毒触发，四试0赢。',
'silent-noxious-fumes-growth':'毒雾普通/升级建2/3层，后续玩家轮初补毒，建立不即时施毒且可叠加。机制：无阻挡每轮补a；触媒k层至多结k+1次且逐次减1，毒充足时净变a−(k+1)，头骨/制品另核。搭配：毒源和触媒先实建且活到结算，换战不继承。决定胜负的战斗：{n}支持/0反例，单组件胜因未控（n={n}）。典型案例：GXNKW8X1XYJP A10恶魔T1两普通雾建4、头骨轮初补5，触媒+三结后29→26；三骑士末试T2才建2、后轮每敌补3，末毒17/3/3仍未杀敌。',
'silent-accelerant-triggers':'触媒增加毒结算次数，不倍增毒层；普通/升级实建1/2且不即时施毒。机制：k层至多k+1次，每结减1、零停止；普通p≥2为2p−1、升级p≥3为3p−3，限伤/换阶段另核。搭配：先实建毒与触媒并活到结算，不预支手里能力。决定胜负的战斗：{n}支持/0反例，单组件整战胜因未控（n={n}）。典型案例：GXNKW8X1XYJP A10恶魔T3触媒+建2，T5的29毒结29+28+27=84；T6的31毒结90，另轮初遗物7使107→10，七轮损3胜；末三骑士触媒未建，抑制后文本额外2→1不能当已生效。',
'silent-snecko-skull-poison-application':'异蛇头骨使已见毒雾/直接毒牌每次施毒额外加1，能力层数不增加。机制：普通/升级雾2/3补3/4，两雾合4补5；普通/升级毒药5/7补6/8，普通药瓶9补10；施毒与扣血分账。搭配：持续/直接施毒和触媒次数分别核，药水基础与遗物单独贡献未隔离不分推。决定胜负的战斗：{n}支持/0反例，遗物独立胜因未控（n={n}）。典型案例：GXNKW8X1XYJP A10恶魔两雾4轮初补5后胜；三骑士末T3毒药水10→17毒而敌56血不变，末17/3/3毒仍三敌在场。',
'silent-lagavulin-siphon-poison-sl':'族母吸取压缩直接伤/牌挡，已建毒按现场层数结算。机制：已见每次玩家力敏各−2、敌力+2；技能毒不随负力量减层，实际毒不预支。搭配：到手能力、可活轮数和来袭共同核，重打动作/抽牌改变另列。决定胜负的战斗：{n}支持/0反例，单项胜因未控（n={n}）。典型案例：GXNKW8X1XYJP A10 F17首试T9判死、重打九轮36→2胜；末轮力−2/敏0仍30毒收30血敌。缚魂由T4改T1、触媒由T2改T5且防御/抽牌亦变，不能归单一启动时点。',
'silent-act-transition-missing-hp-heal':'已观察A9/A10跨幕回复为当时缺失HP的80%向下取整，不是固定满血。机制：同上限F17→18/F33→34按⌊(最大HP−当前HP)×0.8⌋，低阶/其他先古未核。搭配：营火、开场遗物、果实、复活及SL恢复分账。决定胜负的战斗：{n}支持/0反例，资源公式不等单项胜因（n={n}）。典型案例：GXNKW8X1XYJP A10族母后2/70→56/70补54，恶魔后54→66补12；先古果实再66→97、上限70→101另列，五次休息114不混幕间回血。',
}
for eid,text in texts.items():
    e=E[eid];assert N not in e['evidence'];e['evidence'].append(N);e['n_support']=len(e['evidence']);e['lesson']=text.format(n=e['n_support']);e['last_seen']='2026-10-08'
for eid in ['silent-route-hp-observation','silent-rest-buffer-observation','silent-poison-potion-observed-application']:
    e=E[eid];assert N not in e['evidence'];e['evidence'].append(N);e['n_support']=len(e['evidence']);e['last_seen']='2026-10-08'
a10=sum(r['ascension']==10 for r in R.values());bands='、'.join(f"{b['band']}{b['n']}房{b['deaths']}死" for b in A['bands'] if b['asc']==10 and b['act']==3 and b['type']=='Monster')
E['silent-route-hp-observation']['lesson']=f'观察：赢战也会耗掉下一场的生存量，未来营火不当现有血。A10共{a10}局，三幕Monster：{bands}；各阶/幕/房型分列，非因果（n={len(R)}）。典型案例：GXNKW8X1XYJP F35/38/40赢战97→84→66→41净耗56；F42回至71，F44胜后5，F45补至7仍四试败。换早精英时投影54/p75为43，实入5；另一条路线及提前用药整战结果未知。'
t=next(r for r in json.load(open(O/'rest-summary.json')) if r['asc']==10)
E['silent-rest-buffer-observation']['lesson']=f"观察：只计已完成回复，后战胜负另核，不预支未到营火。A10 {a10}局{t['rests']}火/{t['heal']}回血实回{sum(t['gains'])}，去重{t['nexts']}后战{t['deaths']}死（{100*t['deaths']/t['nexts']:.2f}%），活损中位{t['median']}；各进阶分列（n={len(R)}）。典型案例：GXNKW8X1XYJP五次休息共114，F42的30回复使41→71，但F44赢战净耗66后仅5；末回血与更早路线皆无胜负反事实，不据此定回血或改线错误。"
H=json.load(open(O/'historical-potions.json'));pp=[r for r in H if r['potion']=='POISON_POTION'];delta=collections.Counter()
for r in pp:
    for b,z in zip(r['before']['enemies'],r['after']['enemies']):
        if b['index']==r['target']:delta[z['powers'].get('POISON_POWER',0)-b['powers'].get('POISON_POWER',0)]+=1
skullruns=len({r['run'] for r in pp if any(x['relic_id']=='SNECKO_SKULL' for x in r['before']['relics'])})
E['silent-poison-potion-observed-application']['lesson']=f"毒药水先施毒，饮用当步不扣本体HP。机制：{len({r['run'] for r in pp})}局{len(pp)}饮，无加量/阻挡{delta[6]}饮加6；头骨{skullruns}局{delta[7]}饮加7，制品2局{delta[0]}饮阻毒并耗1层，未见组合不外推。搭配：触媒须实际建立且活到结算，不定早喝/留药阈值。决定胜负的战斗：30支持/0反例，时点整战胜因未控（n=30）。典型案例：GXNKW8X1XYJP A10三骑士末T3连枷10→17毒、56血当步不变，未建触媒且玩家实死；四试均已饮，不能写留药致末战败。KFRDELW2TH2P末43毒普通触媒两结85仍余74。"
dh=json.load(open(O/'dampen-history.json'));dev=[r['run'] for r in dh]
def add(eid,scope,asc,ev,text):
    assert eid not in E;n=len(ev)
    e=dict(id=eid,scope=scope,asc=asc,lesson=text.format(n=n),evidence=ev,n_support=n,n_contradict=0,confidence='high' if n>=5 else 'med' if n>=2 else 'low',last_seen='2026-10-08',status='active');Z['entries'].append(e);E[eid]=e
add('silent-dampen-battle-upgrade-observation','general:deck',[0,20],dev,'观察：魔法骑士抑制后的战内牌版本与场外升级牌组分开，输出按现场普通文本核。机制：DAMPEN_POWER1时已见升级牌显示普通版，run.deck仍升级，出口升级文本恢复；未核已建能力或所有牌。搭配：小刀张数、毒触发次数及弱/毒剂量分别看实际版本。决定胜负的战斗：{n}支持/0反例，降级独立胜因未控（n={n}）。典型案例：GXNKW8X1XYJP A10 F45T3刀刃4→3刀且实生三刀；触媒额外2→1、毒性爆发12→9毒、一拳10伤/2弱→8伤/1弱仅文本差，降级后三牌未施放。ZE8F192FKX24 A5 F42T4已按普通药瓶/蜃景读盘。')
add('silent-three-knights-revival-blood-price','elite:FLAIL_KNIGHT',[10,20],[N],'观察：近全败模拟的样本排名仍须核复活后的血价，局部多保血不等整战能赢。机制：复活后可操作HP、带入挡、当轮覆甲与仍在场敌攻击分账，未建触媒不追加毒触发。搭配：毒输出与本轮生存共同核，不由有限样本判必死或固定保血。决定胜负的战斗：A10一场四试0赢、同手T2两线对照（n={n}）。典型案例：GXNKW8X1XYJP第2/末试T2同2血/3敏/1力/3覆甲，双毒与翻滚线死亡22/24对23/24；T3实3血/0带挡/敌218对13血/7带挡/敌226，多保10血少扣8。末13+23挡+2覆甲对40实死，三敌仍38/76/67，无胜线对照。')
Z['version']='2026-10-08.8'
for e in Z['entries']:
    if e['status']!='active':continue
    assert e['n_support']==len(set(e['evidence'])) and e['n_contradict']==len(set(e.get('contradicting',[])))
old={e['id']:e for e in B['entries']};changes=[]
for e in Z['entries']:
    b=old.get(e['id'])
    if e!=b:changes.append(dict(id=e['id'],before=b,after=e,new_runs=[r for r in e['evidence'] if not b or r not in b['evidence']]))
chars=lambda x:sum(len(e['lesson']) for e in x['entries'] if e['status']=='active')
assert chars(Z)<=60000
C=dict(old_version=B['version'],version=Z['version'],added=[c['id'] for c in changes if not c['before']],updated=[c['id'] for c in changes if c['before']],retired=[],active_before=sum(e['status']=='active' for e in B['entries']),active_after=sum(e['status']=='active' for e in Z['entries']),chars_before=chars(B),chars_after=chars(Z),entries=changes)
P.write_text(json.dumps(Z,ensure_ascii=False,indent=2)+'\n');(O/'changes.json').write_text(json.dumps(C,ensure_ascii=False,indent=2)+'\n');print({k:v for k,v in C.items() if k!='entries'})
