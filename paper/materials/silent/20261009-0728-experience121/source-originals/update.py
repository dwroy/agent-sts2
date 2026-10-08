import collections, copy, json, subprocess
from pathlib import Path

O=Path(__file__).parent.resolve()
W=O.parents[2]
N='SV2GP9NX4HQD'
A=json.load(open(O/'audit.json'))
E=json.load(open(O/'experience-before.json'))
B=copy.deepcopy(E)
M={e['id']:e for e in E['entries']}
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
changes=[]
mapping={}
day=subprocess.check_output(['date','+%Y-%m-%d'],text=True).strip()
def update(ident,text,lids):
    e=M[ident];before=copy.deepcopy(e)
    assert N not in e['evidence']
    e['evidence'].append(N)
    e['n_support']=len(e['evidence'])
    e['n_contradict']=len(e.get('contradicting',[]))
    n,c=e['n_support'],e['n_contradict']
    e['confidence']='high' if n>=5 and c<=n/3 else 'med' if n>=2 else 'low'
    e['last_seen']=max(e['last_seen'],'2026-10-09')
    e['lesson']=text.replace('{n}',str(n))
    changes.append(dict(id=ident,before=before,after=copy.deepcopy(e)))
    mapping[ident]=lids
rest=json.load(open(O/'rest-summary.json'))[-1]
band=next(r for r in A['bands'] if (r['asc'],r['act'],r['type'],r['band'])==(10,3,'Elite','≥60%'))
update('silent-route-hp-observation',f'观察：赢战仍耗血药，问号另算，未来火不预支。A10 {rest["runs"]}局三幕Elite入口≥60%共{band["n"]}房/{band["runs"]}局、{band["deaths"]}死（{100*band["deaths"]/band["n"]:.2f}%），活损中位{band["median_win"]}；各阶/幕/房型见报告（n={{n}}）。典型案例：KSX97DF5H3NY未到下一火；SV2GP9NX4HQD F33赢仍74→9、F43赢74→24且耗精灵，F44/F47各回24后70血进沙漏仍六败。末败不证明前战留药或改线能赢，缺同条件路线对照。',['silent-0019'])
update('silent-rest-buffer-observation',f'观察：回血增加即时缓冲，锻造不回血，不能保证后战。A10 {rest["runs"]}局{rest["rests"]}独立火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{100*rest["deaths"]/rest["nexts"]:.2f}%），活损中位{rest["median"]}；各阶另列（n={{n}}）。典型案例：KSX97DF5H3NY回54后两强制战败；SV2GP9NX4HQD六次火各回24、六次锻造不回血，F43复活24另账，F47的46→70后首战血瓶至72仍六败。未到F49，不能用回血/模拟代填第二boss资源。',['silent-0020'])
update('silent-deck-burst-observation','观察：计划组件、实建能力、可支付后续与已结本体进度分核。机制：毒层不是即时伤，存活轮与费用约束兑现；护栏同轮重问不重复计价。搭配：持续输出与实挡共同验收，未得能力不预支。决定胜负的战斗：{n}支持/0反例，整战单因未控（n={n}）。典型案例：WZL2AMEY85S7三雾仍败；SV2GP9NX4HQD沙漏末试前三轮实扣139、十轮389，535血仍缺146，同期扣尽须53.5/轮仅事后预算；无毒雾/触媒/余像，T10羽化2费而仅余1不计现成输出。11条护栏替换只7轮，题面省血不当整战收益。',['silent-0021','silent-0125'])
update('silent-footwork-block','步法普通/升级建2/3敏捷，后续每张挡牌加敏，已有挡不追补。机制：基础挡加现场敏后核倍率/脆弱，被动挡另源。搭配：多挡重复收益，牌数/能量须可用，仍核敌成长及持牌伤。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：PBUBM0LRTEDD神化3敏/暗影后空翻22挡；SV2GP9NX4HQD A10沙漏末T2建3敏、防御与普通后空翻各8合16，比无敏多6；末T10生存者11+偏折+10=21仍不足30攻+12凋萎，1血死。',['silent-0005'])
update('silent-strength-weak-observation','力量逐击加伤、敏捷逐张加牌挡，临时层/弱/易伤按现场分核。机制：基础加属性后核倍率，毒/被动挡另源，临时减力不停止成长。搭配：多段/多挡重复收益与当前血价合核。决定胜负的战斗：{n}支持/0反例，整战单因未控（n={n}）。典型案例：LYBHQ1X230ZB四段1力多4伤；SV2GP9NX4HQD A10沙漏末T7力9有弱的EBB为26，T10力15同有弱为30；三敏两挡多6仍败，玩家无永久力，尖啸仅临时减力。不能把建立防御能力视作覆盖后段成长。',['silent-0012','silent-0025'])
update('silent-piercing-wail-temporary-strength','尖啸临时减力按攻击段兑现，次轮恢复须重核。机制：普通/升级减6/8，逐段核力与弱，制品可阻、攻击不降成负伤。搭配：多击减伤与实挡合核，不当永久停止成长。决定胜负的战斗：{n}支持/0反例，单牌整战胜因未控（n={n}）。典型案例：KAY522KT5NXR三击30→12；SV2GP9NX4HQD A10沙漏末T1实减6力使26→20，随后力恢复；末T7力9弱攻26、T10力15弱攻30，T10仍死。护栏首/三/四试T2换尖啸零损，未实打原线，不归整战胜因。',['silent-0046'])
update('silent-wither-end-turn-loss','凋萎持牌伤与攻击/挡合核，毒斩杀仍可留失血。机制：按现场3/6/9/12文本及末持牌数，弃去的不计，缺帧内部全序不补。搭配：弃牌与实挡改变血价，未结毒不代付。决定胜负的战斗：{n}支持/0反例（n={n}）。典型案例：TXZ6RVMQA09D毒杀仍损7；SV2GP9NX4HQD A10沙漏末T7两张9+26攻−8挡=36损，52→16；T10生存者弃一张12、仍一张12，30+12−21=21需损，1血死，结束毒32后敌仍146。不用SL理由简写省略持牌伤。',['silent-0024'])
groups=collections.defaultdict(list)
for x in A['attempts']:
    if any(f['run']==x['run'] and f['floor']==x['floor'] and 'AEONGLASS' in f['enemies'] for f in A['fights']):groups[(x['run'],x['floor'])].append(x)
multi=[v for v in groups.values() if max(x['attempt'] for x in v)>1]
def slstat(v):return (len(v),sum(len(x) for x in v),sum(a['result']=='won' for x in v for a in x))
allsl=slstat(multi)
a10sl=slstat([v for v in multi if R[v[0]['run']]['ascension']==10])
update('silent-aeonglass-artifact-growth-sl',f'观察：沙漏制品、成长、凋萎与输出截止合核，首boss胜仍须交接血药。机制：现场力敏与末持牌数决定血价，未结毒/未建能力不预支。搭配：同盘换线另记后序，有限推演全死不独立定必死。决定胜负的战斗：{{n}}支持/0反例，全阶重打{allsl[0]}场{allsl[1]}试{allsl[2]}赢，A10为{a10sl[0]}场{a10sl[1]}试{a10sl[2]}赢（n={{n}}）。典型案例：P2M3DFJ4DEZ3末试胜19空药；SV2GP9NX4HQD A10六试同前35抽序、五截断一实死0赢，末T10 1血21挡对30+12仍缺21存活血、毒结后敌146。第5试T8护栏实际损6而第6试损15，后序同变，不定药时点或一次换线胜因。',['silent-0025'])
update('silent-snakebite-retained-poison','蛇咬保留并施毒，不即时扣本体，施毒不吃负力量。机制：普通/升级实加7/10毒，普通基础2费；免费个例不外推，结毒减1、触媒/限伤另核。搭配：到手/支付/可活结算共同验收，不预支未来伤。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：W7BHM8U02RKG负2力仍施7；SV2GP9NX4HQD A10沙漏末T6蛇咬+实13→23毒、敌352血当步不变；同轮还有刺击/遗物/重问、实际净扣56，不能拿原线54与整轮56定同线误差，末T10仍败。',['silent-0220'])
update('silent-deadly-poison-application','致命毒药普通/升级施5/7毒，不即时扣血。机制：实结按当前毒再减1，制品/头骨/触媒/阶段另核，过量毒按剩血截断。搭配：补层与存活结算合核，不预支免攻。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：KSX97DF5H3NY毒10只计6剩血；SV2GP9NX4HQD A10沙漏末T2升级加7、472血不变，T8普通29→34毒、265血不变；T10末32毒结178→146、余31毒而玩家死，施毒成功不等已击杀。',['silent-0007'])
pp=[x for x in A['potions'] if x['run'] in set(M['silent-poison-potion-observed-application']['evidence']+[N]) and (x.get('potion') or {}).get('id')=='POISON_POTION']
counts=collections.Counter()
for x in pp:
    target=x['chosen']['target_index']
    before=next(e for e in x['before']['enemies'] if e['index']==target)
    after=next(e for e in x['after']['enemies'] if e['index']==target)
    delta=after['powers'].get('POISON_POWER',0)-before['powers'].get('POISON_POWER',0)
    counts[delta]+=1
assert set(counts)=={0,6,7},counts
update('silent-poison-potion-observed-application',f'毒药先施毒，饮用当步不扣本体HP。机制：{{n}}局{len(pp)}饮，常态{counts[6]}饮加6、头骨{counts[7]}饮加7、制品{counts[0]}饮阻毒耗1层；组合外不推，SL复用非新获。搭配：须活到实结，药与出牌名额/当前挡分核，不定喝留门槛。决定胜负的战斗：{{n}}支持/0反例，单药整战未控（n={{n}}）。典型案例：79UCJ0K6R9C1先死未结毒；SV2GP9NX4HQD A10沙漏原瓶六饮，首/三/四试T2各加6、其余T1三饮耗最后1制品未施毒，均败；技能药各选残影、牌序亦变，缺隔离药时点胜局，不定提前喝有效。',['silent-0278'])
update('silent-act-transition-missing-hp-heal','已见A9/A10跨幕按缺失HP的80%向下取整回复。机制：同上限⌊(maxHP−当前HP)×0.8⌋，低阶/其他先古未核，连续boss非跨幕。搭配：火/事件/药/复活和SL恢复分源，不预支未来血。决定胜负的战斗：{n}支持/0反例，回复不保证后战（n={n}）。典型案例：KSX97DF5H3NY 38/70跨幕回25；SV2GP9NX4HQD A10同族28/81→70实回42、蟹9/81→66回57，六火合144与精灵回24另账；沙漏五次SL恢复至72不当自然回血，F49未到。',['silent-0243'])
E['version']=day+'.10'
E['_about']=f'静默经验只从本角色实盘与复盘学习。第121次增量并SV2GP9NX4HQD A10，截至{A["cutoff"]}共{len(R)}完局；旧156局七数组/血档/节点/回血/SL同口径复算。补敏捷逐牌挡、临时减力与敌成长、凋萎持牌伤、直接施毒/毒药实结、赢战血药链与六试同首抽全败。护栏重问不重复记价，药时点与牌序混杂，不拟新阈值/药价或许诺翻盘；源码交独立strategy-proposal。'
for e in E['entries']:
    if e['status']!='active':continue
    assert e['n_support']==len(set(e['evidence']))
    assert e['n_contradict']==len(set(e.get('contradicting',[])))
    assert all(R[r]['character'].lower()=='silent' for r in e['evidence']+e.get('contradicting',[]))
    assert e['scope'].split(':')[0] in ['boss','elite','hallway','act','general','card','relic','potion','event']
    if e['scope'].split(':')[0] in ['card','relic','potion','event']:assert e.get('name')
def stats(e):
    a=[x for x in e['entries'] if x['status']=='active']
    return dict(active=len(a),chars=sum(len(x['lesson']) for x in a),confidence=dict(collections.Counter(x['confidence'] for x in a)),applicable={str(n):dict(entries=len(z:=[x for x in a if x['asc'][0]<=n<=x['asc'][1]]),chars=sum(len(x['lesson']) for x in z)) for n in [8,9,10]})
assert stats(E)['chars']<=60000
assert len(changes)==12
(W/'knowledge/characters/silent/experience.json').write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(dict(entries=changes),ensure_ascii=False,indent=2)+'\n')
(O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
(O/'update-summary.json').write_text(json.dumps(dict(added=0,updated=len(changes),retired=0,before=stats(B),after=stats(E),poison_drinks=dict(counts),aeon_sl=dict(all=allsl,a10=a10sl)),ensure_ascii=False,indent=2)+'\n')
print(json.dumps(json.load(open(O/'update-summary.json')),ensure_ascii=False))
