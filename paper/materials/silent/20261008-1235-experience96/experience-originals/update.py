import collections, copy, json, re
from pathlib import Path

O=Path(__file__).parent; K=Path('knowledge/characters/silent/experience.json')
B=json.load(open(O/'experience-before.json')); E=copy.deepcopy(B)
I={e['id']:e for e in E['entries']}; changes=[]; N='9R916WW0V65N'
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
A=json.load(open(O/'audit.json'))
def confidence(n,c):
    return 'high' if (n>=5 and c<=n/3) else 'med' if n>=2 else 'low'
def change(eid,case,whole=None):
    e=I[eid]; old=copy.deepcopy(e); assert N not in e['evidence'];e['evidence'].append(N)
    e['n_support']=len(e['evidence']);e['last_seen']='2026-10-08';n=e['n_support']
    text=whole if whole is not None else e['lesson']+' 本批案例：'+N+' A10 '+case
    text=re.sub(r'\d+支持/0反例',str(n)+'支持/0反例',text)
    text=re.sub(r'\d+支持局',str(n)+'支持局',text)
    text=re.sub(r'n=\d+',f'n={n}',text)
    e['lesson']=text;e['confidence']=confidence(n,e['n_contradict'])
    changes.append(dict(id=eid,before=old,after=copy.deepcopy(e),new_runs=[N]))

change('silent-strength-weak-observation','女王末T1中和令火炬32→24；苦无1敏与步法2敏叠为3，后空翻8、生存者11、冰晶7分源合26，零损。末T2六敏却零挡，12血对16实死。')
change('silent-footwork-block','女王末T1步法使苦无已有1敏→3，后空翻8与生存者11；T2两步法共4敏加苦无累计2到6，缺合法挡牌仍0挡死亡。前五试同3敏的防御8、重放16另列，非末试出牌。')
change('silent-kunai-attack-count-dexterity','女王末T1第3攻击0→1敏，步法再到3；后空翻8及生存者11分别受益。末T2第3小刀5→6敏，旧0挡不补，12血对16死；前五试防御8/重放16另列。')
change('silent-frail-card-block','女王第2试T3六敏、99脆弱时斗篷+与闪躲分别⌊(6+6)×0.75⌋=9、⌊(4+6)×0.75⌋=7，合16；5血对36仍不足。后来第3攻击新增敏不倒补16挡。')
change('silent-afterimage-per-card-block','实验体末T1建立余像1，随后逐牌补挡；女王六试未建立余像，不能继承前战层数。末T2零挡的死亡不以牌组拥有余像补挡。')
change('silent-rolling-boulder-start-growth','实验体末T1滚石+建10，T2—5轮初显示15/20/25/30，后段到75；T15敌余24随后胜，独立末击来源未记录，不把75层当75实扣。女王未重新建立。')
change('silent-accuracy-shiv-scaling','女王末T2精准建4、无玩家力量，三小刀各8共24，比基础三刀12多12；撕咬10另计，敌仍207+361=568，不能把刀伤当整场斩杀。')
change('silent-permafrost-first-power-block','女王末T1首次步法另触发7挡，与3敏所给后空翻8/生存者11合26，盖虚弱火炬24；第二轮不重复补7，上一轮挡不能预支。')

def attempt_counts(enemy):
    eid='silent-test-subject-phase-reset' if enemy=='TEST_SUBJECT' else 'silent-queen-poison-main-target'
    supported=set(I[eid]['evidence'])|{N}
    ff=[f for f in A['fights'] if enemy in f['enemies'] and f['run'] in supported]
    at=[t for t in A['attempts'] if any(f['run']==t['run'] and f['floor']==t['floor'] for f in ff)]
    groups=collections.defaultdict(list)
    for t in at:groups[t['run'],t['floor']].append(t)
    multi=[ts for ts in groups.values() if max(t['attempt'] for t in ts)>1]
    return len(ff),len(at),sum(t['result']=='won' for t in at),len(multi),sum(len(ts) for ts in multi),sum(t['result']=='won' for ts in multi for t in ts)
test=attempt_counts('TEST_SUBJECT'); queen=attempt_counts('QUEEN')
change('silent-test-subject-phase-reset','末试第一阶段T2步法不增敌力；生存者加3力、弱化攻击12→14，再防御加3力、14→16。三阶段上限111/212/313合636；末15轮25→12胜、四药用尽。三试仅末试实赢，前两判死出口未录，抽弃与出牌同变，未隔离转胜原因。')
e=I['silent-test-subject-phase-reset'];e['lesson']=re.sub(r'\d+支持局\d+试\d+赢，真正重打\d+场\d+试\d+赢',f'{e["n_support"]}支持局{test[1]}试{test[2]}赢，真正重打{test[3]}场{test[4]}试{test[5]}赢',e['lesson']); changes[-1]['after']=copy.deepcopy(e)
change('silent-queen-poison-main-target','F49六试12/74空药入场、均未杀敌，仅末试实死。末T1扣28、T2扣34、敌余568，魂缚只阻部分牌；T3的99弱/易伤/脆弱须按现场核。原题杀序不等实际集火，无换序完整胜线。')
e=I['silent-queen-poison-main-target'];e['lesson']=re.sub(r'真正重打\d+场\d+试\d+赢，本局首试胜',f'真正重打{queen[3]}场{queen[4]}试{queen[5]}赢，历史有首试胜',e['lesson']);changes[-1]['after']=copy.deepcopy(e)
change('silent-queen-poison-window-sl-observation','六试0赢，前五判死截断、末T2实死；末T1因SL改双防御为后空翻/生存者，实际26挡，不能把原题24挡当同线误差。末T2魂缚/抽弃/重问后转精准三刀撕咬，原题14挡未执行；没有赢的那次或整场换序对照。')
e=I['silent-queen-poison-window-sl-observation'];e['lesson']=e['lesson'].replace('5场30次零赢，各五次读档','6场36次零赢，各五次读档');changes[-1]['after']=copy.deepcopy(e)

P=json.load(open(O/'historical-potions.json'))
def pc(p):
    pp=[r for r in P if r['potion']==p];return len({r['run'] for r in pp}),len(pp)
nd,ad=pc('DEXTERITY_POTION');nr,ar=pc('REGEN_POTION')
change('silent-dexterity-potion-card-block','实验体三试均T2建2敏捷，女王入口撤回；SL恢复原瓶不是新获药，无留药胜率对照。')
e=I['silent-dexterity-potion-card-block'];e['lesson']=re.sub(r'\d+局\d+饮均\+2',f'{nd}局{ad}饮均+2',e['lesson']);changes[-1]['after']=copy.deepcopy(e)
change('silent-regen-potion-decay-heal','实验体三试均T1建立5层，末试5/4/3/2/1实回15、可核失血28，25→12净损13；女王直接12血空药进入，不以净损13称敌伤13。')
e=I['silent-regen-potion-decay-heal'];e['lesson']=re.sub(r'\d+局\d+饮建立5层',f'{nr}局{ar}饮建立5层',e['lesson']);changes[-1]['after']=copy.deepcopy(e)
change('silent-act-transition-missing-hp-heal','异鱼后42/76→69补27、沙虫后40/76→68补28，均⌊缺失HP×0.8⌋；F48实验体12/74→F49仍12/74，没有跨幕回血，七次SL恢复另列。')
rest=next(r for r in json.load(open(O/'rest-summary.json')) if r['asc']==10)
change('silent-rest-buffer-observation','',f'观察：只计已完成回复，后战结果另核。A10 {rest["runs"]}局{rest["rests"]}火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{100*rest["deaths"]/rest["nexts"]:.2f}%），活损中位{rest["median"]}；各阶另列（n=127）。典型案例：{N}六次营火各22，F44由1回23、巨斧赢损20后F47由3回25；实验体胜后12血直接进女王并死，没有锻造/休息受控胜负，SL恢复不算回血。')
band=next(r for r in A['bands'] if (r['asc'],r['act'],r['type'],r['band'])==(10,3,'Monster','25–40%'))
change('silent-route-hp-observation','',f'观察：赢战耗下一战缓冲，改线收益须实打核验。A10 {rest["runs"]}局三幕Monster以25–40%入血{band["n"]}房/{band["runs"]}局，{band["deaths"]}死（{100*band["deaths"]/band["n"]:.2f}%），活损中位{band["median_win"]}；各阶/幕/房型/血档另列，非路线因果（n=127）。典型案例：{N} F42机甲赢损31后F43组装师赢损36到1；F44回23后巨斧赢损20到3。F38改线投影精英68、实68，未走后置线未知，不以低血到下火证明路线更好。')
change('silent-deck-burst-observation','实验体末15轮胜，但四药全用、净损13；女王未重建余像/滚石/刀扇/磨蚀，末T2仍缺568输出。F46/47仅56/40模拟样本、不足300，缺选项数字不填0胜率，不能承诺多4血就胜。')

def add(eid,scope,name,runs,asc,text):
    assert eid not in I
    e=dict(id=eid,scope=scope)
    if name:e['name']=name
    n=len(runs);e.update(asc=asc,lesson=text,evidence=runs,n_support=n,n_contradict=0,confidence=confidence(n,0),last_seen='2026-10-08',status='active')
    E['entries'].append(e);changes.append(dict(id=eid,before=None,after=copy.deepcopy(e),new_runs=runs))
tr=json.load(open(O/'trance-hands.json'));truns=list(dict.fromkeys(r['run'] for r in tr))
tc=collections.Counter(r['net_added'] for r in tr)
add('silent-battle-trance-draw-lock','card:BATTLE_TRANCE','战斗专注',truns,[0,20],f'普通专注先处理牌文抽3，再封锁本轮后继抽牌，其他合法牌效分算。机制：{len(truns)}局{len(tr)}次建禁抽1，{tc[3]}次净添3；{tc[4]}次同窗见凋萎净添4、{tc[1]}次满10手牌只补1，净增不全当抽牌。下一轮撤封锁，升级/重放未核。搭配：抽牌时序与棋子加抽同核，其他取牌方式不外推，不定唯一最优序。决定胜负的战斗：{len(truns)}支持/0反例，无修正牌序整场胜线（n={len(truns)}）。典型案例：LRN0HPZ0FZS1 A0 F35T2专注后匕首抽1落空；{N} A10女王第2试T2添三牌后步法建2敏却无棋子加抽，长线未完整执行、实扣4损7，T3禁抽消失。')
H=json.load(open(O/'double-boss-handoffs.json'));hruns=[h['run'] for h in H]
add('silent-double-boss-resource-handoff','general:plan',None,hruns,[10,20],f'观察：A10首Boss获胜后直接接续实际血药，前战能力不等第二战已有增益。机制：8局F48出口HP与F49入口相同，全部后战败；未观察中间回血，不由全败拟合终局权重。搭配：净损、再生、复活出口与SL恢复分账，按两战真实样本核验，不定留药门槛。决定胜负的战斗：8支持/0反例，无保药/改线的完整胜利对照（n=8）。典型案例：{N}实验体第三试25血四药→12血空槽，15回复与28失血分列，女王六试0赢、末12血0挡对16死且余568；PD9AYQVMLQW6女王58→10后空药进沙漏六败。')

E['version']='2026-10-08.13'
E['_about']='静默经验只来自本角色实盘与复盘。第96次增量合并9R916WW0V65N A10，截至2026-10-08T03:17:44.522Z共127完局；旧126局七数组、血档、节点后战、回血及SL逐行复算一致。专注先抽后禁抽、苦无新增敏捷、能力/再生与连续Boss资源接续分源；未知留药/路线/终局反事实不推胜因。经验/账本/代码提案关联独立strategy-proposal，本任务不改打法源码。'
def stats(x):
    active=[e for e in x['entries'] if e['status']=='active']
    return dict(active=len(active),chars=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),by_asc={str(a):dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in active),chars=sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]})
summary=dict(old_version=B['version'],version=E['version'],added=sum(c['before'] is None for c in changes),updated=sum(c['before'] is not None for c in changes),retired=0,before=stats(B),after=stats(E),evidence=[dict(id=c['id'],evidence=c['after']['evidence'],contradicting=c['after'].get('contradicting',[]),by_asc=dict(collections.Counter(R[r]['ascension'] for r in c['after']['evidence']))) for c in changes])
assert summary['after']['chars']<=60000
K.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(dict(entries=changes),ensure_ascii=False,indent=2)+'\n')
(O/'update-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k!='evidence'},ensure_ascii=False))
