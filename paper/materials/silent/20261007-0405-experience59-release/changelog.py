import collections
import hashlib
import json
import subprocess
from pathlib import Path

O=Path(__file__).parent
ROOT=O.parents[2]
DEST=ROOT/'paper/materials/experience-changelog-silent.md'
C=json.load(open(O/'changes.json'))
A=json.load(open(O/'audit.json'))
L=json.load(open(O/'ledger-result.json'))
M=json.load(open(O/'live-merge.json'))
S=json.load(open(O/'slice-summary.json'))
F=json.load(open(O/'mechanism-facts.json'))
RS=json.load(open(O/'rest-summary.json'))
SL=json.load(open(O/'sl-summary.json'))
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
title=(O/'changelog-title.txt').read_text().strip()
assert M['test_rc']==0 and M['merged']
assert ('## '+title) not in DEST.read_text()
def pct(n,d):return f'{100*n/d:.2f}%' if d else '无样本'
out=['## '+title,'','### 来源','',
f'- 记录时间{stamp}。只读notes/lessons.md:5220的UMVLWER4CD98及03:31:15勘误；路线理由采用“五营火发挥加湿器收益，三精英获取成长，战前回血充足。”，不是“五星火”。runs.character=SILENT/A10/F48败，未跳过；唯一run-1007-0308局报，last_seen=2026-10-07。加湿器再流式核对更早71局原始状态：无持有可比记录，首证本局、prior=unknown保持。',
'- 开工exp-silent干净，git merge --no-edit main无冲突；已读README/最新STATE/decision-log末尾/学习协议、铁甲首次构建及末两节方法、静默第57/58节。独立执行、无下级agent，单进程nice19抽数，不跑boss模拟池。',
'- 截止本局结束2026-10-06T19:08:26.667Z，72静默完局，A0—A10各7/3/2/1/4/1/11/7/1/3/32局。旧1119房61实死＋新19房1实死＝1138房62实死；A10三十二局424房32死。MCCK2602T1SR仅进数字；无character旧局/进行中/后续局不计，其他角色知识未引用。',
'- 按12位run id rg分流1165 decisions/50实际Codex请求/9 run-plans/9 SL行；states按时间seek后流式抽1202本局静默帧，首/末记录字节8019934033/8068626103，启动菜单3帧排除，同窗DeepSeek0。旧ds_*仅兼容字段，不声称復原ebd920b4+dirty完整源码。原始片段、提取脚本及全部数字留learner/runs/20261007-034303-experience-update。',
'- 口径沿第58节：战内净损=首COMBAT帧HP−同房最终尝试末结算HP，实死单列、回复负值保留；Monster走廊与Unknown问号分开，血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按源入血关联下一更高层第一战，Ancient排除、多源可指同战；回血后战按run/floor去重，TD1重启仍一房；SL读档恢复不算回血，未派发结束不补未来毒伤。',
'- 先重新分析旧71局原始日志，再加局。七数组逐行、血档/源节点/回血/SL全部一致，没有口径差异；完整历史静默复盘232段再核。fights1119→1138、nexts1051→1073、rests501→512、cards25557→26168、ends7037→7198、attempts433→442、growth2347→2347。',
f'- 开工129 active/50536字<55000，无需强制压缩；只以新典型案例替换同主题重复叙述，完整旧文本存experience-before.json。增1改11（全部补证、只数字0）退0，active130/{C["chars"]}字，高62中39低29，60000测试预算不改。',
'- potion:*与general:potion逐对象不变；其他旧含“药”分句逐字保留，新支持只非药水部分，无新增/加强喝药规则。机制[0,20]、统计/策略维持原[8,20]，未得到高阶反例推翻低阶公式。真实机制与代码缺口分账，不因公式被模型实现就退役事实。',
'','### 对照数据检查的主题','',
'| 主题 | 数据 | 结论 |','| --- | --- | --- |',
'| 角色/旧基线 | 72静默局；旧七数组/血档/节点/回血/SL一致，新19房1死 | 只静默，房/尝试与实死/判死分账 |',
'| 步法/敏捷 | 末试3＋2＋2=7敏；T11防御+8＋7=15，音叉另7合22 | 逐牌兑现，不把被动7算敏捷收益或自动有挡 |',
'| 力量/弱化 | 燃烧T3建2力，打击6→8/刺击+8→10；敌末15力、有4弱仍20×2 | 力逐击/弱逐击取整；被挡吸收的攻击不算扣实体血 |',
'| 毒雾实际启动 | 首试T2/T3建3＋2，判死前已扣317；末未建，11轮扣222余313 | 持有两张不等补毒，差95缺受控启毒胜局，不能定单牌因果 |',
'| 尖啸/制品 | 棱柱实建−6力与临时撤回层，沙漏制品/后续成长逐帧核 | 临时减力/消制品不是关闭成长或已施毒；子公式支持不代表每局都独立验证 |',
'| 音叉 | 末T11防御+技能计数9→10，被动+7，挡0→22 | 牌面15与遗物7独立；未来未触发不能预支 |',
'| 凋萎/死亡截断 | 末8血22挡，40攻击＋12持牌伤需30，超出22；实际归零8，敌余313 | 实损截断不替代完整所需损30；首五未结束轮不补毒 |',
'| 棱柱护栏/重问 | 初短段损0，后加防御/毒药令玩家污染3→6→9、三击6→12→18，5挡实损13/扣17 | 整轮结果不能沿用初段零损；五轮77→36损41胜，原线完整实打未知 |',
'| 巨斧/复活 | F39护栏即时27血保持，但毒雾至T5；36→37净损−1含尾巴触发 | 净回复不等无伤或保住复活，原线五轮估47.5/54.8非实打 |',
'| 加湿器 | 十回血共321/上限+50，F16基础25＋5、F47基础34＋5，F9锻造不变 | 当前血/上限增长单列，仅已测非满血窗口；不定路线优先级 |',
'| 路线/休息 | F44预测下火入37/boss76，实际31/70；回血后去重战128/18死、活损中位25.5 | 预测抵达与过boss不同，无未选锻造/路线的受控胜负 |',
'| SL对照条件 | 新沙漏六试0赢，原始首末抽序42/46项不同、clean12/19、升级/到手轮/探索也变 | 不称同抽整场单变量实验；首试VANTOM/蟹/巨斧赢不增真正重打分母 |',
'| 模拟/时钟 | F16 1000样本/原胜率1/校准0.9879/赢损49/T11，实损56/T9；F32/F47样本24/136无结果数 | 低于300门槛的无结果不算胜率0；无silent逐轮时钟校准不反推需估伤 |',
'| 最优线/药水事实 | 原选185/200=92.50%、沙漏85/97=87.63%；独立取12瓶/显式用22次 | SL/护栏/重问后完整原线执行率未知，药水只事实、不补条目证据 |',
'',
'死亡率分母为战斗房，局数另列；活场净损中位排除实际死亡并保留负回复。A0—A9所有血档/节点格与第58节一致，完整数字及局号在audit.json；A10全部非空格如下：','',
'| 幕 | 房型 | 血档 | 房/局 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for r in A['bands']:
    if r['asc']==10 and r['n']:out.append(f'| {r["act"]} | {r["type"]} | {r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{pct(r["deaths"],r["n"])} | {r["median_win"]} |')
out += ['','REST/SHOP/EVENT按源入血关联下一更高层第一战，多源可指同战；不把节点关联死亡率写成选择因果效果：','',
'| 幕 | 源界面 | 血档 | 节点/不同战 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for r in A['transfers']:
    if r['asc']==10 and r['n']:out.append(f'| {r["act"]} | {r["screen"]} | {r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{pct(r["deaths"],r["n"])} | {r["median_win"]} |')
out += ['','| 进阶 | 局 | 房/死 | 火/回血/非回血动作 | 回血合计 | 回血后战/死/活损中位 | 真正重打场/试/赢 |','| --- | --- | --- | --- | --- | --- | --- |']
for r,sl in zip(RS,SL):
    ff=[x for x in A['fights'] if x['asc']==r['asc']]
    out.append(f'| A{r["asc"]} | {r["runs"]} | {len(ff)}/{sum(x["death"] for x in ff)} | {r["rests"]}/{r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{r["median"]} | {sl["fights"]}/{sl["attempts"]}/{sl["wins"]} |')
out += ['','- 历史真正重打66场299次20赢，A10为33场158次8赢。沙漏12局50试3赢，真正重打10场48次2赢、A10四场24次0赢。新六次均70/120、前五在T10/8/10/11/11判死后读档，末T11实死；完整draws/explore/终帧和实际行动留sl-comparison.json，不把组件差异或前五未结束的毒算作受控胜因。',
'- 低血不同节点只观察：MGA0CZDDKC0P A10 REST22→43后Monster损17活，4D4J8USKCPAV REST1→22后损1活；D4LJ9QMGFB8Q EVENT13、BVF22RSFVBS9 EVENT21后走廊死。新UMVL的低血营火及事件回血都确实增加血池，但敌/构筑/遗物/回复与药水事实混杂，没有可判优节点的因果对照。',
'','### 经验库自己带偏或写了没被执行的地方','',
'- 50次实际大脑请求全部Codex、同窗DeepSeek0，没有直接引用经验id却反向执行的原话，不把本版倒算成这局已生效。F1原话“五营火发挥加湿器收益，三精英获取成长，战前回血充足。”；回复/上限确实兑现，沙漏六败，未到第二boss；F44投影能到boss76/120，实际70/120，预测抵达不保证通关。',
'- 沙漏末试T7原话“plan 1 (带毒刺击+ -> 永世沙漏, 毒雾, 防御+, 残影, 打击 -> 永世沙漏) is as good or better on every axis, playing it with confidence 0.32”随后“SL explore: replaying attempt 4\'s 带毒刺击+ -> 永世沙漏, 防御+, 残影, 打击 -> 永世沙漏 instead of …”。毒雾曾进低信心支配替换方案，后被SL前缀重放撤掉；不能写Jev从未看到启毒方案。该行为只补实际启动观察，没有受控启毒胜局，不添repeat或确定bug。',
'- 棱柱护栏原短段“hp -0”没有成为整轮结果，重问补防御和施毒后结束题已报损13且实损13；Jev信心0.12与后问0.76是两题。巨斧护栏即时零损兑现但启毒延后，保血与启动窗口一起验收。',
'','### 机制推理','',
'| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
mechanisms=[
('步法逐牌敏捷','基础挡加常驻敏；多挡牌重复获益，音叉独立，存活仍须盖攻击与状态伤','silent-footwork-block','UMVLWER4CD98 A10末T11的8＋7=15、遗物7合22，对52来袭8血差22'),
('力量/虚弱','力量逐击、弱化逐击取整；攻击先被敌挡吸收，实体扣血与施毒另算','silent-strength-weak-observation','UMVLWER4CD98 A10燃烧T3建2力，打击6→8/刺击8→10；敌15力弱化后仍20×2'),
('毒雾轮初成长','建立不即时施毒，存活到未来轮初才补；未建不预支，多组件变动只观察','silent-noxious-fumes-growth','UMVLWER4CD98 A10首试T2/T3建5并已扣317；末未建11轮222、仍缺313'),
('尖啸临时减力','普通/升级减6/8逐击降当轮威胁，临时撤回、成长/污染另核','silent-piercing-wail-temporary-strength','UMVLWER4CD98 A10棱柱T3−6力后追加两技能使污染至9、三击18、5挡损13'),
('音叉独立触发挡','已见技能计数9→10补7，不是敏捷或攻击段数，不预支未触发轮','silent-tuning-fork-skill-block','UMVLWER4CD98 A10末T11防御+牌面15、音叉7，挡0→22仍死'),
('凋萎与结束预算','攻击＋持牌文本状态伤−挡与当前血比较，实际归零是截断','silent-wither-end-turn-loss','UMVLWER4CD98 A10末T11的40＋12−22=30，8血差22、毒结算后敌313'),
('棱柱技能污染','每技能加火花N污染、逐击血价上升；短段护栏与整轮重问不同','silent-infested-prism-tainted-skill-cost','UMVLWER4CD98 A10 F27 T3污染3→6→9、三击6→12→18、5挡损13，五轮胜'),
('加湿器休息增长','已测回血增量=题面基础回复＋5、上限＋5，锻造不触发；满血截断未验','silent-stone-humidifier-rest-growth','UMVLWER4CD98 A10 F16基础25＋5到81/90；F47的34＋5到70/120；F9不变'),
('启动/保血兑现观察','实际启动与存活窗口共同限制输出，护栏短段省血不等整战代价','silent-deck-burst-observation','UMVLWER4CD98 A10两毒雾三步法持有，首末启毒/抽序/探索变动；棱柱重问失去零损窗口'),
('沙漏重打/成长观察','制品、增长、毒启动、敏捷/遗物挡与凋萎共同核，不由多次失败定单牌错误','silent-aeonglass-artifact-growth-sl','UMVLWER4CD98 A10六次70/120均败，末8血22挡需30、敌313，原始首末抽序不同'),
]
facts={r['id']:r for r in F}
for name,reason,id,case in mechanisms:
    r=facts[id];asc='、'.join(f'A{a}:{n}局' for a,n in sorted(r['asc_counts'].items(),key=lambda x:int(x[0])))
    out.append(f'| {name} | {reason} | {r["n_support"]}/{r["n_contradict"]}；{asc} | {case} | {id} |')
out += ['','- 完整12位支持/反例名单在experience.json及mechanism-facts.json；步法/毒雾/尖啸所有支持局都有实际施放，典型帧逐项断言通过。综合n不表示每个子公式在每局独立验证，败局但公式成立不当机制反例；无法隔离整战胜因的写观察。加湿器本局十个窗口仍是一局支持，药水只事实、无用药规则。',
'','### 新增','',
'- silent-stone-humidifier-rest-growth：relic:STONE_HUMIDIFIER/石炉加湿器/[0,20]/low，一局支持零反例；实际回血的上限/当前血增长、锻造不触发，满血与未知选项不外推。链接已有复盘账本silent-0204，不重复add；首证本局/A10/prior=unknown保持。',
'','### 更新','',
'| 条目 | 支持局数 | 字符改前→后 | 变化 |','| --- | --- | --- | --- |']
for r in C['details']:out.append(f'| {r["id"]} | {r["old_n"]}→{r["new_n"]} | {r["old_chars"]}→{r["new_chars"]} | 补本局非药水支持、替换重复案例/更新同口径数字 |')
out += ['','- 全部11更新都加证据，只改数字0，单独压缩/合并0；音叉旧句n=5与字段6不一致，本次随支持到7同步为7，不另计数字更新。完整旧例归档，旧药水分句逐字保持；新增机制一条与路线/休息汇总各自口径分账。',
'','### 退役','','- 无。没有反例多于支持，也没有需要保留给DS的纯代码缺口条目；不以退役腾位。',
'','### 和手写知识及代码冲突','',
'- 静默其他六份boss-damage/monster-records/room-costs/outcome-stats/fight-value/fight-value-gates均生成数据，无手写攻略需改或删，不新建。逐文件hash/字段在other-knowledge.json；monster-records生成截至HUV、1120窗口/A10 406，比该切点1119房/405多1，原因仍为TD1 F17重启恢复同房二次开窗；不是新增独立房或数据无效。room-costs截止旧71局、MAP→下一MAP，和本节净损口径分开；outcome-stats A10旧31局同它的生成切点，新局未自动刷入不当矛盾。',
'- fight-value/gates保留既有两局223行/40战模型，门控仅题面校准，不能由本局新观察删除旧数据或写为无效。common现场沙漏HP535与意图/制品逐帧核。源码未改；沙漏T7候选/SL覆盖、棱柱重问后损13按真实行为记观察，不擅改手写模型。铁甲和其他角色经验/行为保持等价，知识生成器不改、不重建。',
'','### 代码问题（不给 DS）','',
'- 本次无新确定纯bug。末沙漏T8初题预计29损、打两牌新增9凋萎后重问38、实损38；T11初least-loss余−34与重读后−22相差12，后者与8−30及死亡一致，分项原因未核定不添确定bug。巨斧复活内部逐击、蟹双退场内部顺序未知，不补造。',
'- 临时机制断言初稿误把TAINTED_POWER从敌增益读取，真实污染在玩家powers；改读实际字段后3→6→9与6→12→18及实损13断言通过。该失败属离线抽取初稿，非生产代码或测试失败；任务转录及更正脚本保留。',
'- 未记录：护栏原线/替构筑/路线/锻造的受控整场代价、重问/SL之后完整原线执行率、复活内部逐击、第二boss实到/实打、时钟逐轮需估/可活轮/实际估值比、Jev缓存命中；不补造。',
'','### 测试','',
f'- 源固定沙箱tsc{M["source_tests"]["tsc"]}/vitest{M["source_tests"]["vitest"]}、{M["source_tests"]["files"]}文件/{M["source_tests"]["cases"]}用例；合后tsc{M["live_tests"]["tsc"]}/vitest{M["live_tests"]["vitest"]}、{M["live_tests"]["files"]}文件/{M["live_tests"]["cases"]}用例。'+('合后首轮失败后重跑通过，原日志保留。' if M.get('test_first_rc') else '源与合后首轮通过，无失败/超时重跑。')+'固定数据/nice19/固定排除名单保持，完整外部套件交调度器。',
'- JSON合法、角色/12位局号/n/范围/字数/旧基线/逐帧机制/原药水分句及git diff --check/gitleaks通过。源'+M['source_commit']+'仅改静默experience.json；英文提交写版本/增1改11退0，带Co-Authored-By。',
'- 仅learner/ledger.py/by=learner:experience-update将'+','.join(L['proposed'])+'改proposed，覆盖12经验条目。账本新增/退役无、check0；首证/prior/claim/旧version/repeat保持，不写accepted/shipped。加湿器0204已由复盘登记；其他复盘条目未纳入则保持。主目录本节/账本只追加不提交。',
'','### 切片大小','',
'- 种子20260929，截至本局最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP共240配对；过滤state.run.character_id=SILENT。官方knowledge-slice.ts/CHARACTER=silent/setExperienceForTests，只改experience，其余知识/结果表固定；原始状态来自时间seek片段，sample-manifest/每片原输出留存，不冒充V4完整前缀。',
'','| 进阶/界面 | 改前中位/最大（字） | 改后中位/最大（字） | 配对增量中位 |','| --- | --- | --- | --- |']
for r in S['rows']:out.append(f'| {r["sample"].removeprefix("sample-")} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["median_delta"]} |')
out += ['',f'- 240配对增量中位{S["median_delta"]}，单片最大增量{S["max_delta"]}；总体中位{S["before_median"]}→{S["after_median"]}，最大{S["before_max"]}→{S["after_max"]}字。active129→130、50536→{C["chars"]}字，高62中39低29；'+ '、'.join(f'A{a} {r["entries"]}条{r["chars"]}字' for a,r in C['applicable'].items())+'。需要Dai定：无。','',
f'本节收尾：源{M["source_commit"]}，实际live合入{M["merged"]}，上线登记{M["release_commit"]}/eval {M["eval_version"]}；刷新提交{M.get("refresh_commit")}、合前{M["base"]}，不同知识blob冲突0，其他知识逐blob保持。无源码/生成器/手写知识/其他角色或新用药规则改动，不重建；主目录本节/账本只追加不提交。运维交接learner/runs/20261007-034303-experience-update/handoff-ops.md，调用器experience-done通知运维核实际发布后CLI登记13项shipped，完整外部交调度器；不停对局、不运行play、不推送。','']
section='\n'.join(out)
(O/'changelog-section.md').write_text(section)
with (O/'gitleaks-changelog-section.log').open('w') as h:
    subprocess.run(['nice','-n','19',str(Path.home()/'.local/bin/gitleaks'),'dir','--redact','--no-banner',str(O/'changelog-section.md')],stdout=h,stderr=subprocess.STDOUT,check=True)
before=DEST.read_bytes()
(O/'changelog-before.json').write_text(json.dumps(dict(bytes=len(before),sha256=hashlib.sha256(before).hexdigest()))+'\n')
with DEST.open('ab') as h:h.write(('\n'+section).encode())
assert DEST.read_bytes()[:len(before)]==before
print(title, '已追加，旧内容逐字保持')
