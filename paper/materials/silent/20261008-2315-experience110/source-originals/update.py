import collections,copy,hashlib,json
from pathlib import Path
O=Path(__file__).parent;P=Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json')
B=json.load(open(O/'experience-before.json'));E=copy.deepcopy(B);A=json.load(open(O/'audit.json'));R=json.load(open(O/'rest-summary.json'))[-1];H=json.load(open(O/'stock-history.json'));RUN='R3AJCGQGGMR4';C=[];M={}
def update(ident,ledger,case=None,lesson=None):
 e=next(e for e in E['entries'] if e['id']==ident);old=copy.deepcopy(e);assert RUN not in e['evidence'];e['evidence'].append(RUN);n=e['n_support']=len(e['evidence']);z=e['n_contradict'];e['confidence']='high' if n>=5 and z<=n/3 else 'med' if n>=2 else 'low';e['last_seen']='2026-10-08'
 e['lesson']=lesson or e['lesson'].replace(str(old['n_support'])+'支持',str(n)+'支持').replace('（n='+str(old['n_support'])+'）','（n='+str(n)+'）')
 if case:e['lesson']=e['lesson'].split('典型案例：')[0]+'典型案例：'+case
 C.append(dict(id=ident,kind='updated',before=old,after=e,new_runs=[RUN]));M[ident]=ledger
update('silent-footwork-block',['silent-0005'],case='PF90JTU0UZ5M A10四敏三挡27仍受自爆30；R3AJCGQGGMR4 A10巨斧T7石头1敏加普通步法2至3，脆弱下两防御各4→6共12，多4挡仍不足26，9血死；余像没打不预支逐牌挡。')
update('silent-frail-card-block',['silent-0005'],case='UZ1T7AH49WMB两防御各7与偏折6合20；R3AJCGQGGMR4 A10巨斧T7一敏防御⌊6×0.75⌋=4，步法后3敏各⌊8×0.75⌋=6，两张12；对26完整需损14，9血只扣9而死、存活至少差6。')
update('silent-strength-weak-observation',['silent-0012'],case='LYBHQ1X230ZB四段1力多4伤；R3AJCGQGGMR4 A10巨斧T3尖啸使4→−2力、同招22→16，10挡实损6，T4恢复4力；T7新台8力攻26、12挡仍死，临时控制不当永久减力。')
route_band=next(b for b in A['bands'] if (b['asc'],b['act'],b['type'],b['band'])==(10,2,'Monster','<25%'))
update('silent-route-hp-observation',['silent-0019'],lesson=f'观察：胜前战/避可选精英不保证后段血药，问号可战，未来营火不能预支。A10 105局二幕Monster<25%入血{route_band["n"]}房/{route_band["runs"]}局、{route_band["deaths"]}死（{route_band["deaths"]/route_band["n"]*100:.2f}%），活损中位{route_band["median_win"]}；分阶/幕/房型另列（n=145）。典型案例：R3AJCGQGGMR4三幕无精英，F37/39两胜52→32→8，两药已饮；F43又胜51→6，F44回复后52进巨斧仍死。未走路线及未到F48/F49没有实盘对照，不立改线因果。')
update('silent-rest-buffer-observation',['silent-0020'],lesson=f'观察：即时回复增加血缓冲，不等后战保证，未来营火不预支。A10 105局{R["rests"]}独立火/{R["heal"]}回血实回{sum(R["gains"])}，去重{R["nexts"]}后战{R["deaths"]}死（{R["deaths"]/R["nexts"]*100:.2f}%），活损中位{R["median"]}；各阶另列（n=145）。典型案例：R3AJCGQGGMR4七次到火羽毛123、五次HEAL104分账，两锻造不回血；F40下一火前投影35/p75 23，实6，F44羽毛6→30再回血至52兑现，后巨斧死；无改锻造整场对照。')
update('silent-deck-burst-observation',['silent-0021'],case='WZL2AMEY85S7三毒雾建层后仍余109死；R3AJCGQGGMR4 A10沙虫第2试T7打击12后敌69/毒36、触媒额外1及逃离延长后3血胜；巨斧第三台旧27毒已清，5毒三结只12、敌87，步法末建而余像全场未打，持有组件不当启动。')
update('silent-noxious-fumes-growth',['silent-0011'],case='WZL2AMEY85S7三普通毒雾实建2→4→6；R3AJCGQGGMR4 A10巨斧T1升级毒雾建3、T4普通再加2合5，库存恢复清旧毒，T7只补新5毒；不能继承第二台27毒或预支没打的余像。')
update('silent-accelerant-triggers',['silent-0027'],case='CNKR125PFHJ5无实体下17毒普通两结仅2；R3AJCGQGGMR4 A10沙虫第2试T7敌69/毒36、普通触媒额外1，逃离延长后毒收尾3血胜；巨斧T6两普通触媒共2额外，恢复清旧27毒，T7新5毒只结5＋4＋3=12，敌87仍死。')
update('silent-piercing-wail-temporary-strength',['silent-0046'],case='KAY522KT5NXR实验体三击30→12；R3AJCGQGGMR4 A10巨斧T3普通尖啸敌4→−2力、22→16攻，冲刺+10挡后49→43实损6，T4力回4；第三台T7又8力26攻，不预支旧减力。')
update('silent-envenom-unblocked-attack-poison',['silent-0084'],case='0NZXA12NLDMH升级涂毒双段匕首雨两侧各加4毒；R3AJCGQGGMR4 A10巨斧T2普通涂毒建1，随后零费打击11伤并加1毒，恢复清旧毒；沙虫第2试T7打击12后毒35→36，供触媒毒收尾，直伤与施毒分账。')
update('silent-eternal-feather-rest-arrival-heal',['silent-0142'],case='LYBHQ1X230ZB F28牌25到火27→42、锻造无休息回血；R3AJCGQGGMR4 A10七次到火羽毛12/12/18/18/18/21/24共123，F44实6→30后HEAL30→52另22；获得回复不抹去F43胜战45净耗，不由此加牌或预支未来火。')
update('silent-smooth-stone-opening-dexterity',['silent-0158'],lesson='意外光滑的石头实见开场1敏捷，与步法叠加，收益由随后牌挡兑现。机制：11支持局99个持有后独立战斗房首帧均1敏，SL同房不重计；脆弱/吸取与旧挡另核。搭配：多挡重复兑现，不能沿用吸取前属性。决定胜负的战斗：11支持/0反例，遗物独立胜因未控（n=11）。典型案例：2H311EAD34GD族母后期吸取至−1敏；R3AJCGQGGMR4 A10 F29获得后八房首帧1敏，巨斧T7步法叠至3、脆弱下两挡12仍死，开场增益不当全战保命。')
update('silent-orichalcum-zero-block',['silent-0047'],case='CNKR125PFHJ5棱柱零挡对20实损14；R3AJCGQGGMR4 A10巨斧T3已有10挡对16实损6、不额补6，T4零挡30攻由奥利哈钢6抵后损24，T5弱后16攻零挡实损10；首试沙虫T6潜在6挡仍不够15血承受24。')
update('silent-reptile-trinket-temporary-strength',['silent-0063'],case='CSBR5CRDWQNB永久2力药后总5、次轮2；R3AJCGQGGMR4 A10沙虫首试T6/重试T4同瓶狡诈经恢复再饮，各生小刀并建临时3力，时点与后序同时变、不能据转胜定早喝；毒层/触媒毒伤不归这3力。')
# The multi-attempt counts cover every observed Silent Insatiable room, independent of support-entry filtering.
G=collections.defaultdict(list)
for x in A['attempts']:
 f=next((f for f in A['fights'] if f['run']==x['run'] and f['floor']==x['floor']),None)
 if f and 'THE_INSATIABLE' in f['enemies']:G[(x['run'],x['floor'])].append(x)
multi=[v for v in G.values() if max(x['attempt'] for x in v)>1];wins=sum(x['result']=='won' for v in multi for x in v)
update('silent-insatiable-dual-clock',['silent-0018','silent-0117'],lesson=f'沙虫沙坑与攻击分别核，延长不等挡攻击，未来毒不预支。机制：逃离已见加1，沙坑归零判死，实结毒与敌剩血另核。搭配：弃牌须核已选可支付逃离及剩余截止、血挡，不能只保留牌不核费用/确定终结。决定胜负的战斗：21支持/0反例，真正重打{len(multi)}场{sum(len(v) for v in multi)}试{wins}赢（n=21）。典型案例：R3AJCGQGGMR4 A10首试T5弃掉计划逃离，T6敌94/毒35且15血潜在6挡不足24而读档；第2试T7延长1→2后毒收尾3血胜，药时点/后序同变，非单保逃离必胜；T3撤投掷匕首少10伤仍损25。')
update('silent-kin-poison-sl-observation',['silent-0009','silent-0012'],lesson='观察：同族毒/能力须实建结算，固定杀序胜因未控。机制：临时减力仅降当轮，后轮仪式成长另核。搭配：实毒/群伤、牌挡与血池合核。决定胜负的战斗：9场33试5赢，真正重打仍6场30试2赢；A0仅背景、策略只A10（支持9局/A10八局，n=8）。典型案例：S9UZAK0JP0C0换目标/挡/抽牌后重试胜；R3AJCGQGGMR4 A10 F17首试9轮胜，324本体预算/9=36实盘均值、62→8净耗54；信徒T5/T6退、T9神官收尾，无替杀序整战对照，不把胜场当零耗。')
update('silent-act-transition-missing-hp-heal',['silent-0243'],case='CNKR125PFHJ5异鱼胜33/70回29到62；R3AJCGQGGMR4 A10同族胜8/77后实回55到63，沙虫胜3/77后实回⌊74×0.8⌋=59到62，上限不变；羽毛、HEAL及SL15→61恢复另账，不预支未到F48/F49资源。')
complete=[h for h in H if set(h['stages'])=={'0','1','2'} and len(h['stages']['2'])==1 and all(v>h['stages']['2'][0] for k in ['1','0'] for v in h['stages'][k])]
evidence=[h['run'] for h in complete];assert RUN in evidence and 'LRN0HPZ0FZS1' in evidence;n=len(evidence)
e=dict(id='silent-axebot-stock-phase-budget',scope='hallway:AXEBOT',asc=[0,20],lesson=f'巨斧库存归零恢复不等战斗结束，后体血上限按实况重核，不能固定当前maxHP乘库存。机制：13局均见库存2→1→无且后体上限增大；本局恢复当步清旧毒，历史跨轮补毒帧不反推内部时点；分布/倍率未知。搭配：新体重建毒/减益、再核新力量与牌挡，触媒未结收益不继承旧毒。决定胜负的战斗：完整三阶段支持{n}/反例0、跨阶段预算而非替打法胜因（n={n}）。典型案例：LRN0HPZ0FZS1 A0 F38三台77→88→98、T7胜；R3AJCGQGGMR4 A10 F45三台77→90→99需266、实清179余87，旧27毒清后5毒三结12，9血12挡对26死；库存耗尽仍需清末台。',evidence=evidence,n_support=n,n_contradict=0,confidence='high' if n>=5 else 'med' if n>=2 else 'low',last_seen='2026-10-08',status='active')
E['entries'].append(e);C.append(dict(id=e['id'],kind='added',before=None,after=e,new_runs=evidence));M[e['id']]=['silent-0312']
E['version']='2026-10-08.27';E['_about']='静默经验只来自本角色实盘与复盘。第110次增量合并R3AJCGQGGMR4 A10及两条来源/时间勘误；截至2026-10-08T14:04:10.328Z共145完局。旧144局七数组/血档/节点后战/休息/SL按原口径复算；库存三阶段血上限与毒清除、临时力敏/脆弱牌挡、真实胜战血药和未来恢复分账。SL两试同盘局部取舍不当单动作转胜。相关经验/账本同步独立strategy-proposal，不改打法源码或其他角色。'
P.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n');(O/'changes.json').write_text(json.dumps(dict(entries=C),ensure_ascii=False,indent=2)+'\n');(O/'ledger-map.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n')
active=[e for e in E['entries'] if e['status']=='active'];summary=dict(old_version=B['version'],version=E['version'],added=1,updated=len(C)-1,retired=0,active_before=sum(e['status']=='active' for e in B['entries']),active=len(active),chars_before=sum(len(e['lesson']) for e in B['entries'] if e['status']=='active'),chars=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),asc={str(a):dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in active),chars=sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]})
assert summary['chars']<55000;(O/'update-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
other=[]
for p in sorted(P.parent.glob('*')):
 if p==P or not p.is_file():continue
 d=json.load(open(p)) if p.suffix=='.json' else {};other.append(dict(file=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),fields=list(d)[:12],note='生成统计/模型/证据不同切点不当机制反例；本局未到终局双boss，不用缺资源的数据改模型。无需要修改的手写知识。'))
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n');print(json.dumps(summary,ensure_ascii=False))
