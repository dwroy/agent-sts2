import collections, hashlib, json, statistics, subprocess
from pathlib import Path

O = Path(__file__).parent.resolve()
W = O.parents[2]
A = json.load(open(O/'audit.json'))
U = json.load(open(O/'update-summary.json'))
C = json.load(open(O/'changes.json'))['entries']
H = {r['id']:r for r in json.load(open(O/'historical-mechanism-summary.json'))}
R = json.load(open(O/'run-metadata.json'))
F = json.load(open(O/'mechanisms.json'))
P = json.load(open(O/'proposal-ids.json'))
M = json.load(open(O/'ledger-map.json'))
T = json.load(open(O/'test-results.json'))
L = json.load(open(O/'ledger-results.json'))
Z = json.load(open(O/'live-merge.json'))
source = (O/'source-commit.txt').read_text().strip()
heading = f'## 2026-10-09 静默猎手 第一百一十九次增量：1 局 A10（version 2026-10-09.8，分支 exp-silent，{source[:8]}）'
stamp = subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
lines = [heading,'','### 来源','',
    f'- 记录时间{stamp}。只读根notes/lessons.md:6980的0DJ6GFZZ0TG9静默小节与05:28:52勘误；群蛇防御残壳HP使用999999988→999999984，不用原错误对。runs.jsonl确认SILENT/A10/F33败、3cadc990+dirty；唯一局报run-1009-0448-0DJ6GFZZ0TG9.md，last_seen=2026-10-09。',
    '- 开工exp-silent干净，git merge --no-edit main完成574338ae，无冲突。README、最新STATE、decision-log末尾、学习协议/代码提案、首次构建及最近两次增量/账本方法已读。独立完成，不派agent、无联网/play/模拟池，不改打法源码/其他角色。',
    f'- 全引擎静默学习观察截至{A["cutoff"]}，{len(R)}完局/{len(A["fights"])}独立战斗房/{sum(f["death"] for f in A["fights"])}实死；分阶{dict(sorted(collections.Counter(r["ascension"] for r in R).items()))}。除新局外154局只进数字与历史核验；排缺character旧铁甲、其他角色/进行中/切点后局，不称纯Codex爬塔成绩。',
    '- 按局号rg抽401决策、34脑、2SL、4计划；states/reasoning按2026-10-08T20:23:04.821Z—20:48:22.147Z二分字节seek流读，414状态核run_id/character_id。脑全部Codex、真实DeepSeek与窗内reasoning均0，ds_*兼容字段不当真实DeepSeek意见；偏移和原行留scratch。',
    '- 口径沿前批：同房首COMBAT入口HP−末次退出HP，含遗物/回复/自损，不等敌毛伤；SL同房一场，判死截断非实死/零损。走廊仅Monster，Unknown另算；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入口血关联下一更高层首战，排Ancient，多个节点可重复关联，回血后战另去重。',
    '- 旧154局原始只读子集逐局重新运行analyze/audit；七数组、旧血档的房/局/损/死、节点转移/回血/SL逐行相等，无基线漂移。'+json.dumps(json.load(open(O/'baseline-check.json')),ensure_ascii=False),
    f'- 新增1、更新11（11加证据、0只改数字）、退役0；active191→192，正文51116→51373字，置信度{U["after"]["confidence"]}。无预算合并/退役/压缩，低于55000压缩线及60000预算；替换近例的旧全文/证据/反例保存在before/changes。',
    '', '### 对照数据检查的主题','', '| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
    e = c['after']
    lines += [f'| {e["id"]} | {e["n_support"]}支持/{e["n_contradict"]}反例；分阶{H[e["id"]]["by_asc"]}；账本{",".join(M[e["id"]])} | {e["lesson"]} |']
lines += ['','新局逐房血药资源链，入口→奖励取药前离场；净HP变化包含整战已见消耗，非敌毛伤。F14首帧只有佣兵，后续出现的地精不拆额外房。完整药栏来源见根复盘与本任务原帧。','', '| 层/幕/房型 | 敌人首帧 | HP入口→出口/净损 | 实死 |','| --- | --- | --- | --- |']
for f in A['fights']:
    if f['run']=='0DJ6GFZZ0TG9':lines += [f'| F{f["floor"]}/幕{f["act"]}/{f["type"]} | {",".join(f["enemies"])} | {f["hp"]}→{f["last_hp"]}/{f["loss"]} | {"是" if f["death"] else "否"} |']
lines += ['','- 新获8瓶＝奖励5/事件1/买2，实饮8、弃0、SL恢复0；无色/能力药生成牌非药瓶。F17能力/F22无色两条result为pending(unstable)，随后原槽均实际清空，不能只按completed计6饮；原audit动作检索沿旧completed索引，实际消费另核状态，不改旧基线。三HEAL各22合66、五SMITH一DIG不回血，浴场当前HP扣6/上限增6、跨幕44另分账。F22/23两胜65→58→47；F33两药分别T2/T4实饮，不把T1未执行拟饮计进去。',
    '- 巨兽本体T1—7需[250,221,187,160,132,77,29]、净扣[29,34,27,28,55,48,29]，T8残壳另挡自爆损10；整战损40。蟹六轮需[428,412,363,316,180,124]、净扣[16,49,47,136,56,56]、玩家损[20,19,0,28,0,2]，终余碾碎爪68。T6毒过量不计本体进度，死亡只扣剩2非完整血价。',
    '', '分阶/幕/房型全部非空血档，n为独立房、局数另列；存活净损中位排实死。','',
    '| 进阶/幕/房型/入口血档 | 房数/局数 | 实死/死亡率 | 存活净损中位 |','| --- | --- | --- | --- |']
for r in A['bands']:
    if r['n']:
        lines += [f'| A{r["asc"]}/幕{r["act"]}/{r["type"]}/{r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |']
lines += ['','休息/商店/普通事件入口血关联下一更高层战；非跨路线因果，多个节点可能关联同战。各幕/阶/血档全列：','',
    '| 进阶/幕/节点/入口血档 | 节点数/独立后战 | 后战实死/关联死亡率 | 存活净损中位 |','| --- | --- | --- | --- |']
for r in A['transfers']:
    if r['n']:
        lines += [f'| A{r["asc"]}/幕{r["act"]}/{r["screen"]}/{r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |']
lines += ['','各阶回血后独立后战；非HEAL动作含SMITH/DIG等，重复动作不冒称独立火。','',
    '| 进阶/完局数 | 独立火/HEAL/非HEAL动作 | 实回HP | 去重后战/实死/率 | 活损中位 |','| --- | --- | --- | --- | --- |']
for r in json.load(open(O/'rest-summary.json')):
    lines += [f'| A{r["asc"]}/{r["runs"]} | {r["rests"]}/{r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{100*r["deaths"]/r["nexts"]:.2f}% | {r["median"]} |']
lines += ['','真正SL按同房多次尝试，截断与实死分开；新局两个登记战均首试，未增加真正重打分母。','',
    '| 进阶 | 重打场/尝试/实际赢 |','| --- | --- |']
for r in json.load(open(O/'sl-summary.json')):
    lines += [f'| A{r["asc"]} | {r["fights"]}/{r["attempts"]}/{r["wins"]} |']
lines += ['','- 帝王蟹真正重打旧11场58试2赢；K2JAGKVJAWZJ第二试胜但目标/挡均变，QHK1XQ928TTM同盘转向使多损6且两线败；本局无天然重打对照，不能归因运气或声称重打能赢。完整explore/sl_attempt原记录在audit/各局原SL。',
    '', '### 经验库自己带偏或写了没被执行的地方','',
    '- DeepSeek真实调用0，没有其引用经验id的原话；不由败局认定经验误导。Codex F24：“升级迷雾增加双部件毒和持续虚弱，下一营火可安全回血”（原英文中文释义）；F25实际仍锻造，F29才回血，未来组件/火不当已兑现。F28原话“The Boots route avoids elites and provides an immediate rest. Dig safely now ...”，实际DIG不回、下一火回22；F32“Healing restores only seven HP”与69/76缺7一致，无升级换回血整场对照。',
    '- F33T1原线36伤含猎杀者，投掷匕首后Jev弃猎杀者、重算直接结束，实16伤；未执行20伤不是同线误差。T4完整同线106预测/136净扣差30尚未隔离，不能全部归饰品3力。F9护栏原线未执行，13点省血是方案差、替线实损3，不报实盘净赚13。',
    '- 速行者旧条目写“多目标总收益未核”，本局两次纯抽二已分别双敌各4，已据实更新。肌肉5+饰品3旧日志已有4局5次，新的锋利/虚弱四段40及撤层组合只核本局，n=1不称首次8力。0330原first_run/prior历史不改，限制记账；勘误残壳防御数字已采用。',
    '', '### 机制推理','', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
for r in F:
    e = next(c['after'] for c in C if c['id']==r['id'])
    premise, case = e['lesson'].split('典型案例：',1)
    if r['id'] == 'silent-flex-potion-temporary-strength':
        premise += ' 本局牌面Damage附魔值6、力量8/虚弱，实每段10与⌊(6+8)×0.75⌋=10相符，Repeat4→每敌40；只核该组合，不由同线总差30分配组件胜因。'
    lines += [f'| {r["name"]} | {premise} | {r["n"]}/{r["contra"]}，分阶{H[r["id"]]["by_asc"]}；适用{e["asc"]}；完整12位支持/反例见experience/historical-mechanism-summary | {case} | {r["id"]} |']
Q = json.load(open(O/'historical-trigger-checks.json'))
lines += ['','- 全历史822段静默主题复盘已流式筛选阅读，155局103855帧按角色核验foreign=0；各支持/反例分阶、实际动作/遭遇集合重新计算。检索集合不自动增加经验支持局数，整战单组件胜因未受控。',
    f'- 历史饰品临时层72次/10局均净+3、肌肉层59次/50局均净+5；肌肉与饰品同饮5次/4局（CSBR5CRDWQNB、3KME36ADUE4U、25226ZFLNR1J、0DJ6GFZZ0TG9）。这证明旧组合并非首次，本批新药条目只计更窄已核锋利虚弱四段/撤层案例，未逐一隔离旧组合的相同伤害条件。旧通用药增层检索不当该窄结论反例或50局支持。',
    '- 速行者36建立动作/15实用局、群蛇31/15、杀灭100/14仅作机制检索，沿已核语义保留支持分母；新帧撤力/双敌四段40/两抽二各敌4/残壳4及5挡/单侧末态断言均通过。没有敏捷层，本局“步法”只是计划，旧敏捷机制支持保留不增该卡证据；未来组件不预支。',
    '', '### 新增','',
    '- silent-flex-potion-temporary-strength：potion:FLEX_POTION 肌肉药水，[0,20]机制条目、1支持0反例/low，限定A10锋利/虚弱/四段与次轮撤层组合；账本0330已有复盘观察，未新建重复账。',
    '', '### 更新','']
for c in C:
    if c['before']:
        lines += [f'- {c["id"]}：支持{c["before"]["n_support"]}→{c["after"]["n_support"]}，加0DJ6GFZZ0TG9及近例/数字；原asc/反例不变；账本{",".join(M[c["id"]])}。']
lines += ['','### 退役','', '- 无；没有反例多于支持、高阶推翻或本批源码修复条目，不为预算退役。','',
    '### 和手写知识及代码冲突','',
    '- 其余8份silent JSON逐份核来源/口径/切点及SHA，全部与上批相等，无独立手写攻略；无须改手写知识。room-costs旧93局MAP房口径非本155局COMBAT房；monster-records尝试战非独立房，outcome-stats旧切点分阶观察，fight-value/gates为64局780战估值，不由一局死否定模型。double-boss本局未到，boss-trust固定切分及失败限制保持，不重建。',
    '- 代码的饰品饮药触发只列白名单、临时力仅接药水自身，与本局实建来源不一致；单侧蟹死亡的SL保守排除与求解器增力/99挡属不同边界。三独立提案：'+','.join(P)+'；source_task=experience-update/target_task=strategy-proposal，12变更active全有experience/账本/本角色证据，domains combat/potion/sl/terminal/structure。均pending，经验数据不标源码implemented/shipped。',
    '', '### 代码问题（不给 DS）','',
    '- 纯bug0329遗物饮药3力没有接同线推演，只做提案关联、status仍observed，不把代码定位写成独立DS经验。F33T4净扣差30含未隔离牌面/附魔，定位不等修后能赢；护栏符合当前规则、SL不确定非确认可活。原复盘三提案保留，独立任务先核当前源码/既有实现去重。',
    '- 缺完整dirty运行树、单侧死亡到攻击中间帧/实际毛伤、巨兽完整回血毛伤、替代整条路线/早建能力/药时点/护栏阈值受控整场胜线、实际最优完整执行率与实付费用。原记录不补预训练机制/假胜率，不把几条模拟死线当全部合法线必死。',
    '- 分析初稿只按completed筛饮药，漏两条pending而断言失败；verify-initial.py/log保留，改以8个原动作逐槽前后清空核验，REST只取HEAL/SMITH/DIG不把proceed算火。最终23项通过，非产品源码bug，不修改旧汇总口径。',
    '', '### 测试','',
    f'- bash agent/tools/test-sandbox.sh；TMPDIR本scratch、PATH本机node、SANDBOX_WORKERS=1，测试不设CHARACTER（只知识工具设）。tsc={T["tsc"]}，vitest {T["files"]}文件/{T["cases"]}用例/退出{T["vitest"]}；未重跑，测试前后经验SHA相同，固定数据/排除名单/预算不改。完整外部套件交调度器，不冒称通过。',
    '- JSON、其余条目逐项等价、角色/evidence/n/name/scope/asc、旧154局七数组/血档/节点/回血/SL、历史临时层及本局关键帧断言均通过；check-experience missing=[]退出0；ledger.py check0，git diff --check/gitleaks0。',
    '- 账本新增[]，提交后proposed '+','.join(L['proposed'])+'；退役[]。旧claim/首证/prior/版本/支持与repeat历史保持，0330更窄组合而非首次8力解释通过CLI补充；纯bug0329和未并入observed状态不动。实际数据shipped交运维根据完成事件登记。',
    '- live锁内结果：'+Z['result']+'；刷新'+str(Z.get('refresh'))+'；合前'+str(Z.get('pre'))+'；实际合入'+str(Z.get('merged'))+'。']
if Z.get('conflicts'): lines += ['- '+x for x in Z['conflicts']]
if not Z.get('merged'):
    lines += ['- 合入受阻后按任务停止，不硬解或覆盖刷新/并行记录；未造eval上线版本、未发实际规则上线双通知。保留源提交/刷新/预检交调用方与运维完成事件兜底；未停止对局。']
lines += ['','### 切片大小','',
    '- 固定种子20260929，截止点前SILENT最高两阶A9/A10，每阶每界面20状态×6=240配对；manifest保留池/时间戳，不足才同阶同界面有放回。CHARACTER=silent调用官方knowledge-slice.ts，common/silent其余知识冻结，仅替换经验。',
    '', '| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
before = json.load(open(O/'slice-before.json'))
after = json.load(open(O/'slice-after.json'))
bs=[];ass=[];ds=[];rows=[]
for b,a in zip(before,after):
    assert b['sample']==a['sample'] and b['n']==a['n']==20
    diffs=[y-x for x,y in zip(b['sizes'],a['sizes'])]
    bs+=b['sizes'];ass+=a['sizes'];ds+=diffs
    rows.append(dict(sample=b['sample'],before_median=b['median'],before_max=b['max'],after_median=a['median'],after_max=a['max'],paired_median=statistics.median(diffs)))
    lines += [f'| {b["sample"]} | {b["median"]}/{b["max"]} | {a["median"]}/{a["max"]} | {statistics.median(diffs)} |']
sl = dict(before_median=statistics.median(bs),after_median=statistics.median(ass),median_change=statistics.median(ass)-statistics.median(bs),paired_median=statistics.median(ds),before_max=max(bs),after_max=max(ass),max_growth=max(ds),min_change=min(ds),rows=rows)
(O/'slice-summary.json').write_text(json.dumps(sl,ensure_ascii=False,indent=2)+'\n')
for phase in ['before','after']:
    expected = (O/'experience-before.json').read_bytes() if phase=='before' else (W/'knowledge/characters/silent/experience.json').read_bytes()
    assert expected == (O/f'slice-knowledge-{phase}/characters/silent/experience.json').read_bytes()
lines += [f'- 整体中位{sl["before_median"]}→{sl["after_median"]}（{sl["median_change"]:+}字），配对差中位{sl["paired_median"]}；最大{sl["before_max"]}→{sl["after_max"]}，单片最少{sl["min_change"]}、最多增加{sl["max_growth"]}。',
    f'- active192、正文51373字符，置信度{U["after"]["confidence"]}；A8 {U["after"]["applicable"]["8"]}；A9 {U["after"]["applicable"]["9"]}；A10 {U["after"]["applicable"]["10"]}。无预算压缩/合并/退役，不改预算；需要Roy定：无。',
    '', '原始子集/偏移、复算、提案与CLI、切片、测试、合入预检/失败及完整报告均保存'+str(O)+'。','']
section = '\n'.join(lines)
(O/'changelog-heading.txt').write_text(heading+'\n')
(O/'changelog-section.md').write_text(section)
(O/'report.md').write_text(section)
print('报告与增量小节',len(section),'字；切片',json.dumps(sl,ensure_ascii=False))
