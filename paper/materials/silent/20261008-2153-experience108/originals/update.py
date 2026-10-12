import collections
import hashlib
import json
from pathlib import Path

O=Path(__file__).parent
P=Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json')
B=json.load((O/'experience-before.json').open())
E=json.loads(json.dumps(B,ensure_ascii=False))
RUN='PF90JTU0UZ5M'
changes=[]
def update(ident, lesson=None, case=None):
    e=next(e for e in E['entries'] if e['id']==ident)
    before=json.loads(json.dumps(e,ensure_ascii=False))
    assert RUN not in e['evidence']
    e['evidence'].append(RUN)
    old=e['n_support'];e['n_support']=len(e['evidence'])
    n=e['n_support'];z=e['n_contradict']
    e['confidence']='high' if n>=5 and z<=n/3 else 'med' if n>=2 else 'low'
    e['last_seen']='2026-10-08'
    if lesson:e['lesson']=lesson
    else:
        e['lesson']=e['lesson'].replace(str(old)+'支持',str(n)+'支持').replace('（n='+str(old)+'）','（n='+str(n)+'）')
        if case:e['lesson']=e['lesson'].split('典型案例：')[0]+'典型案例：'+case
    changes.append(dict(id=ident,kind='updated',before=before,after=e))

update('silent-footwork-block',case='PF90JTU0UZ5M A10巨兽T3/T4两步法共4敏，T10三防御各9合27，比零敏多12，自爆30仍损3；异螨末T2补敏不追补旧27挡，T3多6挡仍败。')
update('silent-strength-weak-observation',case='LYBHQ1X230ZB四段1力多4伤；PF90JTU0UZ5M A10巨兽41蒸汽、虚弱下自爆30，四敏三挡27实损3；异螨18攻施弱到13，合19攻加10持牌伤仍超27挡。')
update('silent-giant-explosion-window',case='G8NHLL09DLBX自爆56弱成42、损33剩1；PF90JTU0UZ5M A10 T9本体剩7由突然一拳结束、占位不当新血量，T10虚弱下爆30，三防御27使49→46，整战59→46净损13。')
R=json.load((O/'rest-summary.json').open())[-1]
route='观察：胜前战/避可选精英不保证后段血药，问号可战，未来营火不能预支。A10 102局二幕Monster<25%入血12房/11局、7死（58.33%），活损中位6；分阶/幕/房型/血档另列（n=142）。典型案例：PF90JTU0UZ5M二幕65血经F19/20/21三胜损18/26/18到3，F21是问号战，F22败；F23商店及F27/29/32火均未到，无同资源替线整场因果对照。'
update('silent-route-hp-observation',lesson=route)
update('silent-rest-buffer-observation',lesson=f'观察：即时回复增加血缓冲，未到营火不预支，不等后战保证。A10 102局{R["rests"]}独立火/{R["heal"]}回血实回{sum(R["gains"])}，去重{R["nexts"]}后战{R["deaths"]}死（{R["deaths"]/R["nexts"]*100:.2f}%），活损中位{R["median"]}；各阶另列（n=142）。典型案例：PF90JTU0UZ5M F8/12/16各回21，53/22/59实到下战；F9胜仍损52，二幕未来三火未到即死。没有改锻造或路线的整场对照。')
update('silent-deck-burst-observation',case='UZ1T7AH49WMB末轮建毒雾/触媒即死；PF90JTU0UZ5M A10两步法多挡不等输出闭环，F9四敌118血到T6才首退、实损52；末异螨T2补敏、T3三挡27，仍对19攻＋10毒素死，谋划专家计划未实建。')
update('silent-deadly-poison-application',case='D4LJ9QMGFB8Q毒受限伤留2；PF90JTU0UZ5M A10异螨第3/4试同T1底板，重放致命毒药替防御整轮扣26→31、HP3→1而原线零损；实结多5不当即时免攻，后继不同且无整战胜对照。')
update('silent-bouncing-flask-poison',case='G8NHLL09DLBX母体随机毒未终结；PF90JTU0UZ5M A10巨兽T1普通药瓶实加9毒、250血当步不变，普通触媒后结9＋8=17，中和3另计，本体轮末230；多敌分配未定不套单敌结果。')
update('silent-noxious-fumes-growth',case='UZ1T7AH49WMB末轮建3即死无后轮收益；PF90JTU0UZ5M A10 F21两试能力药各选毒雾、实建2层，下一T2四敌各2毒，重试胜21→3；同瓶SL恢复不算两瓶新药，毒雾未加入牌组。')
update('silent-accelerant-triggers',case='CNKR125PFHJ5无实体下17毒普通两结仅扣2；PF90JTU0UZ5M A10巨兽T1普通触媒建1，药瓶9毒两结9＋8=17、毒余7，中和直3分账，250→230；末异螨没建触媒不预支双结。')
update('silent-pumpkin-candle-charge-energy',case='ZVYUL2YP3518 A10添火0→5/1→6且不回血；PF90JTU0UZ5M A10初5，F19/20/21胜后4/3/2，末F22T3仍4能；重打恢复不重计独立战耗，未到三火续火，能量不代替血挡。')
update('silent-gardener-skittish-shield',case='R0HEV5E3QT6G A0中和+扣6后补6挡；PF90JTU0UZ5M A10 F9非致死打击28→22后胆小补7挡，翻越撑击对已有7挡一体不扣HP；四敏已建仍T6才首退、T2/T4各损18，整战53→1，无替目标受控胜因。')
update('silent-toxic-paid-exhaust-end-turn-loss',case='TKXQ6L4N9A6U两留手毒素、7血0挡先死毒未结；PF90JTU0UZ5M A10异螨末T3两毒素10加敌攻19，共需29，1血27挡需损2仍死；敌25→16已结9毒，共帧内部先后未知，代码已计持牌伤。')
update('silent-myte-toxic-block-sl-observation',lesson='观察：异螨同抽重打合核持牌伤、攻击和后轮存活敌，不定杀序。机制：每毒素5伤与敌击共付挡/血，已结毒杀和施弱分源。搭配：当轮血价与后轮需伤合核，全败模拟不抹血价。决定胜负的战斗：3场11试1赢，无统一改线胜因（n=3）。典型案例：SY0WMJNNVRLM第3试集#1毒退/弱#2、剩3后胜，多目标同变；PF90JTU0UZ5M第3/4试同T1底板锚线替防御多5实结毒、实损0→2，末T2又补步法，T3一血27挡对19＋10仍死，前三试截断不当实际死。')
update('silent-poison-potion-observed-application',lesson='毒药先加毒，饮用当步不扣本体HP。机制：36局144饮，常态127饮加6、头骨15饮加7、制品2饮阻毒耗1层；组合外不推。搭配：须活到实结，持牌伤/自损先核，不定喝留门槛。决定胜负的战斗：36支持/0反例，单药整战未控（n=36）。典型案例：79UCJ0K6R9C1先自死未结毒；PF90JTU0UZ5M A10同瓶五饮均加6、饮用不扣HP，末异螨3→9毒、25血不变，结束扣9至16仍死；五饮含SL撤回，不是五瓶新奖励。')
F=json.load((O/'fortifier-history.json').open())
support=list(dict.fromkeys(p['run'] for p in F if p['before']>0))
n=len(support)
e=dict(id='silent-fortifier-existing-block-triple',scope='potion:FORTIFIER',name='固化药水',asc=[0,20],lesson=f'固化把饮用时已持有的格挡变为三倍，不预支后轮格挡。机制：{n}局{len(F)}饮已见B→3B，当步增2B；敏捷在此前牌挡形成时另算，未饮或已过轮不保留潜在收益。搭配：真实已有挡与当前攻击合核，不由药名规定先喝或留药。决定胜负的战斗：{n}支持/0反例，独立单药整战胜因未控（n={n}）。典型案例：BJLTVSYXCSGS A10墨影末T3已有11→33、多22挡覆盖弱后22攻；PF90JTU0UZ5M F4T1/F17T2均5→15、多10，巨兽T10另获27挡，不把早轮15沿用。',evidence=support,n_support=n,n_contradict=0,confidence='high',last_seen='2026-10-08',status='active')
E['entries'].append(e);changes.append(dict(id=e['id'],kind='added',before=None,after=e))
E['version']='2026-10-08.25'
E['_about']='静默经验只来自本角色实盘与复盘。第108次增量合并PF90JTU0UZ5M A10；截至2026-10-08T12:06:47.125Z共142完局，旧141局七数组/血档/节点后战/休息/SL按原口径复算。异螨同盘重放多5结毒也实付2血，末27挡不足19攻加10毒素；未来营火不可预支。固化16局23饮三倍已有挡、毒药36局144饮按条件分账。相关经验/账本与代码提案交独立strategy-proposal，不改打法源码/其他角色。'
P.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(dict(entries=changes),ensure_ascii=False,indent=2)+'\n')
active=[e for e in E['entries'] if e['status']=='active']
summary=dict(old_version=B['version'],version=E['version'],added=1,updated=len(changes)-1,retired=0,active_before=sum(e['status']=='active' for e in B['entries']),active=len(active),chars_before=sum(len(e['lesson']) for e in B['entries'] if e['status']=='active'),chars=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),asc={str(a):dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in active),chars=sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]})
assert summary['chars']<=60000
(O/'update-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
other=[]
for p in sorted(P.parent.glob('*.json')):
    if p==P:continue
    v=json.load(p.open());other.append(dict(file=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),fields=list(v)[:8],note='核对生成模型/统计/证据用途与本局已观察范围；未见需修改的手写知识，生成切点不同不当机制反例。'))
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False))
