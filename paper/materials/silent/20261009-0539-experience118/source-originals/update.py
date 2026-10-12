import collections, copy, json, subprocess
from pathlib import Path

O = Path(__file__).parent
W = O.parents[2]
E = json.load(open(O/'experience-before.json'))
B = copy.deepcopy(E)
A = json.load(open(O/'audit.json'))
R = {r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
N = 'J8PHG72DGD90'
M = {e['id']:e for e in E['entries']}
changes = []
mapping = {}
day = subprocess.check_output(['date','+%Y-%m-%d'],text=True).strip()

def update(ident, text, lids):
    e = M[ident]; before = copy.deepcopy(e)
    assert N not in e['evidence']
    e['evidence'].append(N)
    e['n_support'] = len(e['evidence'])
    e['n_contradict'] = len(e.get('contradicting',[]))
    n = e['n_support']; c = e['n_contradict']
    e['confidence'] = 'high' if n >= 5 and c <= n/3 or n >= 4 and c == 0 else 'med' if n >= 2 else 'low'
    e['last_seen'] = max(e['last_seen'],day)
    e['lesson'] = text.replace('{n}',str(n))
    changes.append(dict(id=ident,before=before,after=copy.deepcopy(e)))
    mapping[ident] = lids

rest = next(r for r in json.load(open(O/'rest-summary.json')) if r['asc']==10)
band = next(r for r in A['bands'] if (r['asc'],r['act'],r['type'],r['band'])==(10,2,'Monster','≥60%'))
update('silent-route-hp-observation',f'观察：赢战/避精英不保证续战血药，问号可战，未来火不预支。A10 {rest["runs"]}局二幕Monster≥60%入口{band["n"]}房/{band["runs"]}局、{band["deaths"]}死（{100*band["deaths"]/band["n"]:.2f}%），活损中位{band["median_win"]}；分阶/幕/房型另列（n={{n}}）。典型案例：456MRNGCPD8E F28回64后走廊连耗至0；J8PHG72DGD90四火零精英实为锻造/回血/添火/回血，F30胜50→13、F31重打胜5、末火回27仍败。添火后投影boss50实27，前提与赢战耗血另核；未走路线无实盘，不定改线必优。',['silent-0019'])
update('silent-rest-buffer-observation',f'观察：回血增加当前缓冲，锻造/添火不当回复，不保证后战。A10 {rest["runs"]}局{rest["rests"]}独立火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{100*rest["deaths"]/rest["nexts"]:.2f}%），活损中位{rest["median"]}；各阶另列（n={{n}}）。典型案例：456MRNGCPD8E四回血仍未到末火；J8PHG72DGD90七火三回血各22合66、三锻造一添火，F32实5→27后恶魔六试败。SL恢复130与跨幕46另账，没有添火换回血整场对照。',['silent-0020'])
update('silent-deck-burst-observation','观察：计划/持有组件、实建能力、可执行后续与已结收益分核。机制：实际费用、牌数限制及可活轮决定兑现，没取得的牌不算输出。搭配：能力与后继挡/伤及当前血价合算，护栏候选不当已执行。决定胜负的战斗：{n}支持/0反例，整战单因未控（n={n}）。典型案例：WZL2AMEY85S7三雾仍余109死；J8PHG72DGD90未得计划毒雾/触媒，恶魔末T13生成两刀受3牌限额零伤；F9护栏计划省10血少9伤，替线实际零损9伤，原线未实打，不报整战净赚。',['silent-0021','silent-0125'])
update('silent-strength-weak-observation','力量逐击加伤，敏捷逐张加牌挡，虚弱与临时减力分核。机制：基础加现场属性后核倍率，毒/被动挡另账，减力不停止敌成长。搭配：多击/多挡重复收益，实际血挡与回本窗口一起核。决定胜负的战斗：{n}支持/0反例，整战单因未控（n={n}）。典型案例：LYBHQ1X230ZB四段1力多4伤；J8PHG72DGD90恶魔T11减6力令三击36→18、14挡实损4；T12两敏三挡20比基础14多6，T13仅7挡仍对24死。',['silent-0012'])
update('silent-footwork-block','步法普通/升级建2/3敏捷，后续每张挡牌兑现，已有挡不追补。机制：基础挡加现场敏后核倍率/脆弱，遗物挡另算。搭配：多挡重复收益，能量与牌数名额都须实际可用。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：PBUBM0LRTEDD神化后3敏/暗影后空翻22挡；J8PHG72DGD90恶魔末T2步法建2敏、首能力冰晶7挡分源，T12防御7+后空翻7+偏折6合20零损，T13单防御7仍被24攻杀3血。',['silent-0005'])
update('silent-malaise-x-debuff','萎靡普通按X、升级按X+1减力并加虚弱，遗物倍率另核。机制：无放大普通零X无自身减益、升级零X各1；不安油灯普通X1曾建−2力/2弱，减力不关闭后续成长。搭配：逐击减力、弱与实际挡共同验收，本牌不给挡。决定胜负的战斗：{n}支持/0反例，单卡整战因果未控（n={n}）。典型案例：7X0W3U8TVA2A千足虫普通X1额外减1；J8PHG72DGD90恶魔末T4花3使0→−3力/3弱，13→7对后空翻7零损，后T5/9/13力0/3/6，不把减3当停止成长。',['silent-0053'])
update('silent-piercing-wail-temporary-strength','尖啸临时减力按攻击段兑现，次轮恢复须重核。机制：普通/升级减6/8，逐段核力与弱，制品可阻、攻击不降成负伤。搭配：多击减伤与实挡共同验收，不当永久停止成长。决定胜负的战斗：{n}支持/0反例，单牌整战胜因未控（n={n}）。典型案例：KAY522KT5NXR三击30→12；J8PHG72DGD90恶魔末T11力3→−3使12×3变6×3，合减18、14挡损4；T12力恢复3，T13后增至6、24攻仍杀3血7挡。',['silent-0046'])
update('silent-knowledge-demon-healing-sl-observation','观察：恶魔回血增加累计需伤，同盘省血与少伤共同验收，局部存活不等过关。机制：A6初379三回27需460；A10按{@10:HP:KNOWLEDGE_DEMON}及思考实回30/增3力核预算，毒结后净增长不当毒失效。搭配：实毒/伤/挡与可活轮合核。决定胜负的战斗：{n}支持/0反例，真正SL五场22试2赢（n={n}）。典型案例：UACFSW4VDDLD A6第二试胜；J8PHG72DGD90六次27血败，末T4/8/12三回共90使预算489、条件扣312余177；第5/6试T12同3血207敌24毒，去打击加偏折使挡14→20、省2血少9伤，T13敌204→213，两线均败，非省血必优。',['silent-0102','silent-0079'])
update('silent-hidden-daggers-discard-shivs','普通隐秘匕首0费弃二生成两张0费小刀，不能当抽二或保证两刀可打。机制：本体离手后弃原牌再生成，已有五手→四手/能量不变；每刀仍须名额与实际修正。搭配：弃牌收益、幻影首刀与懒惰剩额度合核；升级/缺牌未验。决定胜负的战斗：{n}支持/0反例，整战单因未控（n={n}）。典型案例：10GPK5XGHCK3弃生存者/连续反弹；J8PHG72DGD90恶魔末T13防御/蛇咬后本体占第三名额，两刀虽均显示13仍blocked_by_hook、零实傷，不预支26或认少打本体必胜。',['silent-0154','silent-0274'])
update('silent-phantom-blades-first-shiv','幻影之刃已见9层只增当轮第一张小刀9伤并使小刀保留，文本不等实伤。机制：无防挡/限伤时首刀基础加力再加9、同轮次刀恢复基础；无实体曾各实1，升级/叠加未验。搭配：生成/保留刀提供后轮首刀，实建能力与可打额度合核。决定胜负的战斗：{n}支持/0反例，本局只核建立/保留与锁牌，整战单因未控（n={n}）。典型案例：10GPK5XGHCK3首刀13次刀4；J8PHG72DGD90恶魔末T3建9，T13两刀各文本13却懒惰用满、均未打，不能算26已兑现或两刀都享首刀增益。',['silent-0101'])
update('silent-permafrost-first-power-block','永冻冰晶每战首次能力实补7挡，与能力增益分账。机制：遗物挡不加敏捷，后续能力不重复触发，非攻击轮收益不预支后轮。搭配：首次触发、现场来袭与后续挡牌合核。决定胜负的战斗：{n}支持/0反例，单遗物整战胜因未控（n={n}）。典型案例：PJ2LL9KU7FHD首能力7加双防御14抵21；J8PHG72DGD90恶魔末T2步法同时建2敏与7遗物挡，中和+使18→13仍失6，T3幻影不再补7，不把步法本身算7挡。',['silent-0173'])
update('silent-pumpkin-candle-charge-energy','蜡烛正充能已见轮初基础3+1=4，添火与回血分核。机制：初5、战后扣1；实添火已核0→5及1→6且HP不变，不推其他输入/上限。衰朽或其他能量修正另核，SL恢复不重复扣战耗。搭配：额外能量仍受牌数与血挡窗口限制，不定营火优先级。决定胜负的战斗：{n}支持/0反例，输入1添火两局，单遗物胜因未控（n={n}）。典型案例：ZVYUL2YP3518 A10 F42早已1→6/80血不变；J8PHG72DGD90 F29同1→6/50血不变，后两胜6→5→4、boss六试均4入，T10衰朽后3能不当熄灭，六败不定添火错误。',['silent-0185','silent-0186'])
update('silent-knowledge-demon-sloth-replay-observation','观察：懒惰3名额按实际牌计，重放/生成后续与药分核。机制：已见防御重放亦占名额；三次手动牌用满后0费/剩能量不解除锁，毒药饮用已见不增加牌计数。搭配：奇巧/生成刀只计实际可执行后缀，不以能量替代额度。决定胜负的战斗：A10三场18试0赢（n={n}），无改序实胜对照。典型案例：KV0JHNJCKXLS防御重放加打击占3；J8PHG72DGD90末T13防御/蛇咬/隐秘匕首用满，两13伤刀锁住零伤，仍饮毒30→36且牌计数不变，实结36后敌177仍杀3血7挡玩家。',['silent-0247','silent-0274'])
ps = [p for p in A['potions'] if (p.get('potion') or {}).get('id')=='POISON_POTION']
def poison_delta(p):
    target = p['chosen']['target_index']
    a = next(e for e in p['before']['enemies'] if e['index']==target)
    b = next(e for e in p['after']['enemies'] if e['index']==target and e['id']==a['id'])
    return b['powers'].get('POISON_POWER',0)-a['powers'].get('POISON_POWER',0)
counts = collections.Counter(poison_delta(p) for p in ps)
assert counts == {6:135,7:15,0:2}, counts
update('silent-poison-potion-observed-application',f'毒药先加毒，饮用当步不扣本体HP。机制：{len(set(p["run"] for p in ps))}局{len(ps)}饮，常态135饮加6、头骨15饮加7、制品2饮阻毒耗1层；组合外不推，SL复用不算新获。搭配：须活到实结，牌数限额与当前挡/截止另核，不定喝留门槛。决定胜负的战斗：{{n}}支持/0反例，单药整战未控（n={{n}}）。典型案例：79UCJ0K6R9C1先自死未结毒；J8PHG72DGD90原瓶经SL复用七饮，猎人首试饮后未结算就读档；恶魔末T13三牌满额仍饮30→36/HP不变，实結36至177、玩家死，没有提前饮的整场胜果。',['silent-0278'])
update('silent-act-transition-missing-hp-heal','已见A9/A10跨幕按缺失HP的80%向下取整回复。机制：同上限⌊(maxHP−当前HP)×0.8⌋，低阶/其他先古未核，连续boss非跨幕。搭配：营火/事件/奖励/药与SL恢复分源，不预支未来血量。决定胜负的战斗：{n}支持/0反例，回复不保证后战（n={n}）。典型案例：LY83ZMTFVKJH同族11/77回52到63；J8PHG72DGD90同族16/74跨幕实回⌊58×0.8⌋=46到62，三营火66/再生3/草莓7/事件9另账，六次SL恢复130不是回血。',['silent-0243'])

E['version'] = day+'.7'
E['_about'] = f'静默经验只由本角色实盘/复盘学习。第118次增量并J8PHG72DGD90 A10，截至{A["cutoff"]}共154完局；旧153局七数组及全部血档/节点/回血/SL同口径复算。核蜡烛正量添火旧证、力敏/减力/回血、限额与生成刀/药、同盘省血少伤和赢战资源链。无替代路线/药时点/整场受控胜因，不拟统一门槛；源码交独立strategy-proposal，其他角色不变。'
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
assert stats(E)['chars'] <= 60000
(W/'knowledge/characters/silent/experience.json').write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(dict(entries=changes),ensure_ascii=False,indent=2)+'\n')
(O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
(O/'update-summary.json').write_text(json.dumps(dict(before=stats(B),after=stats(E),added=0,updated=len(changes),retired=0),ensure_ascii=False,indent=2)+'\n')
print(json.dumps(json.load(open(O/'update-summary.json')),ensure_ascii=False))
