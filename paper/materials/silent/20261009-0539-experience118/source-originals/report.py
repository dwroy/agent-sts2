import collections, json, statistics, subprocess
from pathlib import Path

O=Path(__file__).parent.resolve();W=O.parents[2]
A=json.load(open(O/'audit.json'));U=json.load(open(O/'update-summary.json'))
C=json.load(open(O/'changes.json'))['entries'];M=json.load(open(O/'ledger-map.json'))
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
H={x['id']:x for x in json.load(open(O/'historical-mechanism-summary.json'))}
S=json.load(open(O/'slice-summary.json'));E=json.load(open(W/'knowledge/characters/silent/experience.json'))
P=json.load(open(O/'proposal-ids.json'))
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
commit=(O/'source-commit.txt').read_text().strip() if (O/'source-commit.txt').exists() else '待提交'
heading=f'## {stamp[:10]} 静默猎手 第一百一十八次增量：1 局 A10（version {E["version"]}，分支 exp-silent，{commit[:8]}）'
lines=[heading,'','### 来源','',f'- 记录时间{stamp}。根notes/lessons.md:6881起的J8PHG72DGD90静默小节完整只读，无后续勘误；runs.jsonl:635确认SILENT/A10/F33败、20cec89a+dirty，完整dirty源码未知。唯一局报文件名run-1009-0417-J8PHG72DGD90.md据此取last_seen=2026-10-09。',
 '- README、最新STATE、decision-log末尾、学习协议/代码提案、账本README、首次构建与两份变更记录末两节的方法/格式已读。开工工作区干净，main无冲突快进e6d12c26→576414da。独立执行，无下级agent、不联网、不play、不改打法源码/其他角色。',
 f'- 全引擎静默学习观察截止{A["cutoff"]}，154完局、{len(A["fights"])}独立战斗房、{sum(x["death"] for x in A["fights"])}实死；分阶{dict(sorted(collections.Counter(r["ascension"] for r in R.values()).items()))}。除新局外153局仅入数字与历史机制核验；排缺character旧铁甲、其他角色、进行中及切点后局，不称纯Codex爬塔战绩。',
 '- 按run id rg抽818决策、33脑、9SL、5计划；states/reasoning按UTC决策窗2026-10-08T19:27:57.461Z—20:17:18.372Z二分字节seek流读，978状态均核run_id/character_id。脑全Codex，DeepSeek实际调用/窗内reasoning均0；ds_*只作兼容字段。原偏移、原行及脚本留scratch。',
 '- 口径沿第117节：同房首COMBAT入口HP−末次退出HP，含开场遗物/回复/自损，不等敌毛伤；SL同房计一场，判死截断不算实死或零损。走廊仅Monster，Unknown分列；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入口血关联下一更高层首战，排Ancient，多节点允许重复关联，回血后战另去重。',
 '- 旧153局重新运行原始子集分析；七数组、旧血档全部房/局/净损/实死、节点转移与回血/SL摘要逐行相等，无口径漂移。基线计数：'+json.dumps(json.load(open(O/'baseline-check.json')),ensure_ascii=False)+'。',
 '- 旧蜡烛漏证：原经验已写ZVYUL2YP3518 F42的1→6，旧原决策2026-10-06T15:11:33.284Z再核1→6、80血不变；F32另0→5/76血不变。新复盘“既有静默复盘未见可比1→6条件”与新账本0328首次观察判定不完整。本批并原蜡烛0185，0186仅经CLI追加更正claim及旧证，原首证/prior/历史不改；0328未单独并入、仍observed，不新建重复经验，也不修改只读复盘。',
 f'- 新增0、更新15（15加证据、0只改数字）、退役0；active191→191，正文51680→{U["after"]["chars"]}字。无预算触发合并/退役或低置信压缩；15条替换近例并删重复叙述，净少564字，before/changes保留旧全文及所有证据/反例。55000压缩线和60000测试预算不改。',
 '', '### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
    e=c['after'];d=dict(sorted(collections.Counter(R[r]['ascension'] for r in e['evidence']).items()))
    lines.append(f'| {e["id"]} | {e["n_support"]}支持/{e["n_contradict"]}反例，分阶{d}；账本{",".join(M[e["id"]])} | {e["lesson"]} |')
lines+=['| 药水资源链 | 8瓶新获＝F1两瓶+奖励6，买/弃/随机补均0；14饮，其中原毒瓶7饮、6次SL恢复 | 新获/实饮/生成/恢复分账；猎人首试毒未结就SL，不当已兑现。没有早饮/留药整场对照 |',
 '| SL血价对照 | F31两试一赢；恶魔六试0赢，第5/6试T12同3血207敌24毒，14/20挡、下轮1/3血204/213敌 | 明确代码删打击、Jev重问补偏折，省2血少9伤，两试均败；后续抽牌/牌序变化，不归单因/运气 |',
 '| 正充能添火是否首次 | ZVYUL2YP3518 A10 F42、J8PHG72DGD90 A10 F29同1→6，各自80/50血不变；2支持/0反例子集 | 旧局已观察，本次加证据；只输入1/零量有数据，其他充能及上限未知 |',
 '', '新局逐房资源链（入口→末退出；净损包括回复，非毛伤）：','','| 层/幕/房型 | 敌人 | 入口→出口/净损 | 实死 |','| --- | --- | --- | --- |']
for f in A['fights']:
    if f['run']=='J8PHG72DGD90':lines.append(f'| F{f["floor"]}/幕{f["act"]}/{f["type"]} | {",".join(f["enemies"])} | {f["hp"]}→{f["last_hp"]}/{f["loss"]} | {"是" if f["death"] else "否"} |')
lines+=['','分阶/幕/房型的全部非空血档；n为独立房、局数另列，存活损中位排实死：','','| 进阶/幕/房型/入口血档 | 房数/局数 | 实死/死亡率 | 存活净损中位 |','| --- | --- | --- | --- |']
for x in A['bands']:
    if x['n']:lines.append(f'| A{x["asc"]}/幕{x["act"]}/{x["type"]}/{x["band"]} | {x["n"]}/{x["runs"]} | {x["deaths"]}/{100*x["deaths"]/x["n"]:.2f}% | {x["median_win"]} |')
lines+=['','节点入口血档关联下一更高层首战；REST/SHOP/EVENT是节点类型，非一概回血，重复关联房数分列：','','| 进阶/幕/节点/入口血档 | 关联数/去重后战/局数 | 后战实死/比例 | 存活后战净损中位 |','| --- | --- | --- | --- |']
for x in A['transfers']:
    if x['n']:lines.append(f'| A{x["asc"]}/幕{x["act"]}/{x["screen"]}/{x["band"]} | {x["n"]}/{x["unique_fights"]}/{len({c["run"] for c in x["cases"]})} | {x["deaths"]}/{100*x["deaths"]/x["n"]:.2f}% | {x["median_win"]} |')
lines+=['','| 进阶 | 完局 | 独立火/回血动作 | 实回HP | 去重后战/实死/比例 | 存活后战净损中位 |','| --- | --- | --- | --- | --- | --- |']
for x in json.load(open(O/'rest-summary.json')):
    lines.append(f'| A{x["asc"]} | {x["runs"]} | {x["rests"]}/{x["heal"]} | {sum(x["gains"])} | {x["nexts"]}/{x["deaths"]}/{100*x["deaths"]/x["nexts"]:.2f}% | {x["median"]} |')
lines+=['','| 进阶 | 真正SL多试房 | 尝试结果行 | 赢次 |','| --- | --- | --- | --- |']
for x in json.load(open(O/'sl-summary.json')):lines.append(f'| A{x["asc"]} | {x["fights"]} | {x["attempts"]} | {x["wins"]} |')
lines+=['', '- 真正多试max(attempt)>1；尝试结果行不是独立局，won才计赢。新局13胜出窗口/6截断/1实死，14独立房；F17首试胜不是重打。F31首/二试T1实清42/31、后序/抽牌亦变，不把少11伤归成唯一胜因。恶魔前五截断不补死亡帧，末试实死。',
 '- 低血路线对照沿同角色旧观察：456MRNGCPD8E四回血/零精英与本局三回血/添火/零精英均二幕败；P2M3DFJ4DEZ3低血改线/华夫饼等跨局卡组/遗物/敌人不同。本局F29未执行回血、未走别路，无同条件整局反事实，不拟路线硬血线。进阶A10新增一局，A8/A9原房数据不变；低阶策略上限与所有条目asc保持，无新高阶反例退役。',
 '', '### 经验库自己带偏或写了没被执行的地方','',
 '- 实际DeepSeek调用0，无DeepSeek引用条目id的真实原话；不由死亡认定经验误导。大脑Codex原话d304589：“蜡烛补能支撑毒防，四火无精英保血强化。”实四火只有两回血；p2818要求升级萎靡/步法、p2819要求毒成长，实际普通步法/萎靡且未得毒雾/触媒，计划组件不计完成。',
 '- d305150原答含“打击 -> 知识恶魔, 防御, 后空翻”，代码SL覆盖后成防御/后空翻；d305152才是Jev原选“偏折”。同盘省2血少9伤属共同执行结果，不全归Jev，亦不由全败否定当前回血方案。',
 '- 复盘把正量添火记首次，与旧经验/原帧证据矛盾，已在本批记录更正并合并原条目；未证明大脑受这条错误首次标记影响。现牌面两刀均13不能当26可执行伤，正文保留首刀规则与额度检查。',
 '', '### 机制推理','', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
names={'silent-strength-weak-observation':'力量与敏捷','silent-deck-burst-observation':'组件兑现（观察）','silent-footwork-block':'灵动步法','silent-malaise-x-debuff':'萎靡与敌后续成长','silent-piercing-wail-temporary-strength':'尖啸多段减力','silent-knowledge-demon-healing-sl-observation':'恶魔回血与血价（含观察）','silent-hidden-daggers-discard-shivs':'隐秘匕首生成与额度','silent-phantom-blades-first-shiv':'幻影首刀与可执行窗口','silent-permafrost-first-power-block':'冰晶首次能力挡','silent-pumpkin-candle-charge-energy':'蜡烛充能与添火','silent-knowledge-demon-sloth-replay-observation':'懒惰牌数与药水','silent-poison-potion-observed-application':'毒药施毒与结算','silent-act-transition-missing-hp-heal':'跨幕缺血回复'}
mechanisms=[]
for c in C:
    e=c['after'];ident=e['id']
    if ident not in names:continue
    text=e['lesson'];case=text.split('典型案例：',1)[-1];inference=text.split('典型案例：',1)[0]
    evidence=f'{e["n_support"]}/{e["n_contradict"]}，支持分阶{H[ident]["by_asc"]}；适用{e["asc"]}；12位局号见experience/historical-mechanism-summary'
    lines.append(f'| {names[ident]} | {inference} | {evidence} | {case} | {ident} |')
    mechanisms.append(dict(name=names[ident],id=ident,n_support=e['n_support'],n_contradict=e['n_contradict'],case='J8PHG72DGD90',conclusion=inference))
lines+=['','- 全部静默历史811段主题复盘与原卡牌/药水动作、敌遭遇集合已重读/重算，history.py输出支持分阶/动作局/遭遇数；154局103441状态逐帧角色/局号核验foreign=0。动作出现集合只是机制检索，不当每一个子条件的独立证明。新局16项原帧核验通过；新支持仅对应实际建立与已观察条件，幻影本局只建层/保留未实刀，正量添火仅输入1子集两局。单卡/遗物整战胜因未隔离，纯相关性明确称观察。',
 '- 历史触发补核：步法1031动作/95实用局，净敏2/3/6/1为710/292/22/7，净1全带柔嫩1；幻影45动作/10实用局，净9/12为42/3，其中12未逐项隔离升级/其他组合，不把已核9层外推所有版本；萎靡176动作/22局、尖啸685/91、隐秘匕首37/12只作原帧检索，不扩支持分母。细项见historical-trigger-checks.json。',
 '- 恶魔末试T4/8/12净回血21/7/6，毒9/23/24按实际逐结减1回推每回30；第五试T12另见174→204中间帧。完整条件预算399+90=489、条件伤312余177，不当完整逐击毛伤。T13完整需损17，3血只实际扣3，至少差15血才存活；不能用死亡样本损27校核模拟赢样本中位22。',
 '', '### 新增','', '- 无；正充能添火并原蜡烛，跨卡牌的未兑现名额并隐秘匕首/恶魔懒惰，不把未使用的HAND_TRICK本局计成该卡新支持，0328仍observed。',
 '', '### 更新','']
for c in C:lines.append(f'- {c["id"]}：支持{c["before"]["n_support"]}→{c["after"]["n_support"]}，加J8PHG72DGD90；原asc/反例不变；账本{",".join(M[c["id"]])}。')
lines+=['', '### 退役','', '- 无；没有新反例多于支持、进阶反驳或本批修复纯机制漏算。没有预算触发合并或退役。',
 '', '### 和手写知识及代码冲突','', '- 其他8份silent JSON逐份读元数据/来源/切点和SHA（other-knowledge.json）。无手写攻略。room-costs旧93局MAP入房到下一MAP的血损，与本154局COMBAT入房到退出口径不同；monster-records旧尝试战不当2232独立房。outcome-stats分阶旧切点、fight-value/gates的64局780战估值与当前样本不可直接相减。double-boss F48/49事实沿已见四局及未校准值表，当前局未抵达；boss-trust按独立固定模型/时间切分校准，不由一局六败撤可信。数据口径不同不当冲突或重建授权，无需改手写知识。',
 '- 当前代码已有懒惰限额/幻影/生成路径；本局未定位新纯bug，额度与纸面伤、技能能力收益/遗物挡需保持分源。营火正量输入1事实参考旧文本未知部分交独立策略实现；出牌/药/SL/终局只有模型/实际一致性提案，不在经验任务改源码。',
 '- 三代码提案：'+','.join(P)+'；source_task=experience-update，target_task=strategy-proposal，15变更active全关联experience/本角色证据/账本；domains combat/potion/sl/terminal/structure。全部pending，不把经验数据上线当源码implemented；后续独立任务先查既有提案和真实live源码去重。',
 '', '### 代码问题（不给 DS）','', '- 新纯bug无；F9护栏符合现门槛，F33同盘SL更防御有真实少伤代价，两者是策略取舍。生成两刀已锁不能当新bug，也不能由角色内全败推演定所有合法线必死。',
 '- 完整dirty源码、替代全路线/早建能力/药时点/护栏阈值整场配对胜果、部分回血独立中间帧与完整逐击毛伤、silent旧boss时钟、最优方案最终完整执行率/Jev缓存和现金费用未记录。',
 '- 本任务核验初稿误取combat.cards_played_this_turn（真实在player）、随后expect=null未归一导致两次脚本异常；两版脚本与失败日志均留scratch，最终16项全过，原日志未改。这是分析脚本错误，非产品bug。',
 '', '### 测试','']
T=json.load(open(O/'test-results.json')) if (O/'test-results.json').exists() else None
lines.append(f'- 原bash agent/tools/test-sandbox.sh；TMPDIR本scratch、PATH本机node、SANDBOX_WORKERS=1，CHARACTER只给知识工具、测试不设；固定排除与测试数据/60000预算不改。'+(f'tsc={T["tsc"]}，vitest {T["files"]}文件/{T["cases"]}例/退出{T["vitest"]}，未重跑，经验SHA测试前后相同。' if T else '完整沙箱测试进行中。'))
lines+=['- JSON合法，15变更与其余条目逐项等价，角色/evidence/n/name/scope/asc、旧153局七数组/血档/转移/回血/SL与16原帧核验通过；check-experience missing=[]退出0；git diff --check0；gitleaks、ledger check结果以下最终回执为准。',
 '- 账本新增[]，提交后proposed '+','.join(dict.fromkeys(l for ls in M.values() for l in ls))+'，退役[]；不标accepted/shipped。0328重复观察保持observed；0186只追加事实更正，旧首证/prior/版本/原证据历史保持，源码三提案pending。']
if (O/'live-merge.json').exists():
    Z=json.load(open(O/'live-merge.json'));lines.append('- live锁内：'+Z['result']+'；合前'+str(Z.get('pre'))+'；刷新'+str(Z.get('refresh'))+'；实际合入'+str(Z.get('merged'))+'。')
    for conflict in Z.get('conflicts',[]):lines.append('- '+conflict)
    for conflict in Z.get('overlap_conflicts',[]):lines.append('- 刷新知识两边改动且原字节不同：'+conflict)
    if not Z.get('merged'):lines.append('- 未实际合入，不造eval版本或规则上线双通知；源经验/刷新/预检原件留存，由调用方/运维按完成事件兜底，不停对局。')
if (O/'ledger-final-check.rc').exists():
    lines.append('- 最终ledger.py check退出'+(O/'ledger-final-check.rc').read_text().strip()+'；源提交前gitleaks/JSON/diff检查退出0，记录草稿gitleaks0，最终追加记录另在complete.py先扫再写。实际数据shipped仅交运维根据实际合入登记。')
lines+=['', '### 切片大小','', '- 固定种子20260929，截止前SILENT最高两阶A9/A10，每阶每界面20状态×6界面，共240配对；manifest保留池/时间戳，不足才同阶同界面有放回。CHARACTER=silent调用官方knowledge-slice.ts，冻结common/silent其余数据，只换经验。',
 '', '| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for r in S['rows']:lines.append(f'| {r["sample"]} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["delta_median"]} |')
lines+=[f'- 整体中位{S["before_median"]}→{S["after_median"]}（{S["median_increase"]:+}字），配对差中位{S["paired_delta_median"]}；最大{S["before_max"]}→{S["after_max"]}，单片变化最少{S["min_increase"]}、最多+{S["max_increase"]}。',
 f'- active{U["after"]["active"]}，正文{U["after"]["chars"]}字，置信度{U["after"]["confidence"]}；A8 {U["after"]["applicable"]["8"]}；A9 {U["after"]["applicable"]["9"]}；A10 {U["after"]["applicable"]["10"]}。无预算压缩/合并/退役，不改预算；需要Roy定：无。', '', f'完整原始子集、偏移、复算与失败初稿、提案/CLI、切片和测试回执保存{O}。','']
section='\n'.join(lines)
(O/'changelog-heading.txt').write_text(heading+'\n')
(O/'changelog-section.md').write_text(section)
(O/'report.md').write_text('# 经验库更新报告\n\n'+section)
(O/'mechanisms.json').write_text(json.dumps(mechanisms,ensure_ascii=False,indent=2)+'\n')
print('报告',len(lines),'行',len(section),'字；',heading)
