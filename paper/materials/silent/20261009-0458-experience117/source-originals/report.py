import collections,hashlib,json,re,statistics,subprocess,sys
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');W=ROOT/'.worktrees/exp'
A=json.load(open(O/'audit.json'));U=json.load(open(O/'update-summary.json'));C=json.load(open(O/'changes.json'))['entries'];M=json.load(open(O/'ledger-map.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};S=json.load(open(O/'slice-summary.json'));E=json.load(open(W/'knowledge/characters/silent/experience.json'));P=json.load(open(O/'proposal-ids.json'));V=json.load(open(O/'verified.json'))
commit=(O/'source-commit.txt').read_text().strip() if (O/'source-commit.txt').exists() else '待提交'
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip();day=stamp[:10]
heading=f'## {day} 静默猎手 第一百一十七次增量：2 局 A10（version {E["version"]}，分支 exp-silent，{commit[:8]}）'
lines=[heading,'','### 来源','',f'- 记录时间{stamp}；只读根notes/lessons.md:6789、6826两节。FU8ZUQHBHNV9选包成功帧及0019已上线时点按两勘误；456MRNGCPD8E石头F27账本转录更正用34→19，不用旧35→20。runs.jsonl:633/634均SILENT/A10败，F8/F31、a7c2a411+dirty；未复原完整dirty源码。',f'- 开工exp-silent干净，git merge --no-edit main快进到ab3a003a，无冲突。README、最新STATE、decision-log末尾、学习协议/代码提案、首次构建与两份变更记录末两节的方法及账本README已读。独立完成，不派agent、不联网/play/模拟池、不改打法源码或其他角色。',f'- 全引擎静默学习观察截至{A["cutoff"]}，153完局、{len(A["fights"])}独立战斗房、{sum(x["death"] for x in A["fights"])}实死；分阶{dict(sorted(collections.Counter(r["ascension"] for r in R.values()).items()))}。除新两局外151局只进汇总与历史机制核验；排缺character旧铁甲、其他角色、进行中和切点后局，不称纯Codex爬塔成绩。', '- 口径同前：同房首COMBAT入口HP−末次退出HP，含开场遗物/回复/自损，不是敌毛伤；SL同房只算一场，判死截断不当实死/零损。Monster走廊与Unknown分列；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入口血关联下一更高层首战、排Ancient，多个节点可重复关联，回血后战另去重。', '- 原始大日志按run id rg；states/reasoning按决策时间窗二分字节seek流读，核state.run.character_id与run_id；旧151局原子集依前批只读链接再跑分析。七数组、所有旧血档/节点转移/回血/SL全相等；没有基线漂移。脚本、原行、字节偏移与失败初稿留本scratch。']
for run in ['FU8ZUQHBHNV9','456MRNGCPD8E']:
 ds=[json.loads(x) for x in (O/run/'decisions.jsonl').open()];ss=[json.loads(x) for x in (O/run/'states.jsonl').open()];bs=[json.loads(x) for x in (O/run/'brain.jsonl').open()]
 lines.append(f'- {run}：{len(ds)}决策、{len(ss)}状态、{len(bs)}脑、{len((O/run/"sl-attempts.jsonl").read_text().splitlines())}SL原行；{min(x["ts"] for x in ds)}—{max(x["ts"] for x in ds)}，首observed_ts={ss[0]["observed_ts"]}。实际脑{dict(collections.Counter(x["engine"] for x in bs))}，DeepSeek推理0；ds_*兼容字段不当真实DeepSeek调用。')
lines+=['- 旧基线逐行计数：'+json.dumps(json.load(open(O/'baseline-check.json')),ensure_ascii=False)+'。',f'- 新增1、更新18（18加证据、0只改数字）、退役0；active190→191，正文51240→{U["after"]["chars"]}字符，UTF-16同值。无预算合并/退役或单为预算压缩，低于55000压缩线与60000预算，原全文/证据/反例留before/changes。','','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
 e=c['after'];counts=dict(sorted(collections.Counter(R[r]['ascension'] for r in e['evidence']).items()))
 lines.append(f'| {e["id"]} | {e["n_support"]}支持/{e["n_contradict"]}反例；分阶{counts}；账本{",".join(M[e["id"]])} | {e["lesson"]} |')
lines+=['| 药水库存/生成/恢复 | FU新获3瓶、实饮3；456常规新获8（奖励7/商店1），蟾蜍另新生成4石、实饮12；弃0、SL恢复0。历史蟾蜍5局40新房生石/10次恢复、50投石 | 不把生成算奖励、恢复算新获；前场留药/改变持有价/时点整战未控，保持规则 |','', '逐房资源链（HP首帧→末出口；含回复，不当敌毛伤）：','','| 局/层/幕/房型 | 敌人 | 入口→出口/净损 | 实死 |','| --- | --- | --- | --- |']
for f in A['fights']:
 if f['run'] in ['FU8ZUQHBHNV9','456MRNGCPD8E']:lines.append(f'| {f["run"]}/F{f["floor"]}/幕{f["act"]}/{f["type"]} | {",".join(f["enemies"])} | {f["hp"]}→{f["last_hp"]}/{f["loss"]} | {f["death"]} |')
lines+=['', '血量与路线观察：以下n是独立房，局数另列；死亡只认GAME_OVER、存活净损中位排死亡但含回复/自损。只用静默、各进阶分开，不由比例拟硬血线。','','| 进阶/幕/房型/入口血档 | 房数/局数 | 实死/死亡率 | 存活净损中位 |','| --- | --- | --- | --- |']
for r in A['bands']:
 if r['n']:lines.append(f'| A{r["asc"]}/幕{r["act"]}/{r["type"]}/{r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
lines+=['','非战斗节点按入口血关联下一首战；分母为节点、另列去重后战，中间回复/买牌/事件混杂，不能解读为节点的因果收益。','','| 进阶/幕/节点/入口血档 | 节点数/去重后战 | 后战实死/节点死亡率 | 存活后战净损中位 |','| --- | --- | --- | --- |']
for r in A['transfers']:
 if r['n']:lines.append(f'| A{r["asc"]}/幕{r["act"]}/{r["screen"]}/{r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
lines+=['','| 进阶 | 完局 | 独立营火/回血动作 | 实回总HP | 去重后战/实死/死亡率 | 存活后战净损中位 |','| --- | --- | --- | --- | --- | --- |']
for r in json.load(open(O/'rest-summary.json')):lines.append(f'| A{r["asc"]} | {r["runs"]} | {r["rests"]}/{r["heal"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{100*r["deaths"]/r["nexts"] if r["nexts"] else 0:.2f}% | {r["median"]} |')
lines+=['','低血节点对照只作观察：A10一幕25–40%入口的456MRNGCPD8E F8 REST 26→47，F9 Monster净损6、胜出41；BJLTVSYXCSGS F11 SHOP入口/出口22，F12 Monster净损7、存活。两局构筑、路线/层数/敌人不同，未核同图同时可选REST/SHOP的整局对照，不认定回血或改线因果更优。新456 F3绕过精英后仍死于连走廊，FU F7唯一强制精英无法临时改线；未到F32/F9等节点不入统计。','', 'SL按attempt>1取真正多试房，尝试行不当独立局；赢次只认result=won。','','| 进阶 | 多试房 | 尝试行 | 赢次 |','| --- | --- | --- | --- |']
for r in json.load(open(O/'sl-summary.json')):lines.append(f'| A{r["asc"]} | {r["fights"]} | {r["attempts"]} | {r["wins"]} |')
lines+=['','本次两局均无重载/真正多试；456的3行是F17首胜、F30首胜、F31首死，不能说重打赢两次。新毒/暗影/药组合没有赢的重试对照，不归因运气或药时点。历史同型3KME36ADUE4U A7 F27三试0赢：前两T3/T5判死并重载、第三T4实死；第三丝虫先毒死但甲虫仍15攻致死，与456 F31T6剩余甲虫16攻同型。原手/抽序/explore/实际牌序在原行与analysis，不能据两实死证明所有合法线必死。','','### 经验库自己带偏或写了没被执行的地方','', '- 两局实际DeepSeek推理0，无其引用条目id的真实原话，不从死亡自动认定某经验误导或重复犯错。FU0019运行前S1.exp114已shipped按勘误，S1.exp115晚于局不冒称当局版本；复盘support不是repeat。', '- FU d303553原话：“双精英四营火，后期商店补毒与防御，兼顾成长和血线。”实仅到第一个精英/用一火；p2806想要毒雾/毒药/触媒未实际获得。F7回复实兑现，不能从败局认定没回血、没带药或当时可绕路。', '- 456 d303707原话：“早店兑现金币，三火保血强化，打一精英备战巨兽。”F3改线后两幕0精英，早店删的是打击、贪婪终局仍在；不能写已经删咒或按原精英计划推真实收益。F28 d304227原话：“Heal to 64 HP for three mandatory hallway fights. The immediate buffer and substantially better projected boss progress outweigh any single upgrade.”实回64后逐场到24、4、0，F32回复未兑现，属于资源链支持，未有替代全局证明原选择错。', '- F17T2 HP guard原话：“plan 2 ... hp -12 ... playing plan 1 ... hp -5 instead”。计划省7血少8伤，但步法抽2后重问，末张防御没执行、改打回响，实际损12净清28；不登记7血实际省下或8伤实际牺牲。', '- F31末轮原话：“every simulated line dies; playing the one that keeps the most HP (0): end turn”。实死与最小损0相符；SL又引“an ally\'s death may change the move ... (its hits not counted)”拒判，实际甲虫未停攻。模型全死和所有合法线必死分开，不把这项知识边界报新纯bug。', '', '### 机制推理','', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |', '| --- | --- | --- | --- | --- |']
mechanisms=[]
mechanism_names={'silent-strength-weak-observation':'力量、敏捷与倍率','silent-deck-burst-observation':'构筑组件兑现','silent-terror-eel-vigor-vulnerable':'骇鳗活力与易伤','silent-slumbering-beetle-wake-growth':'熟睡甲虫与同伴死亡','silent-hunter-tender-card-attributes':'猎人柔嫩','silent-louse-progenitor-strength-growth':'虱虫成长','silent-act-transition-missing-hp-heal':'跨幕回血','silent-giant-explosion-window':'巨兽自爆','silent-frail-card-block':'脆弱'}
for c in C:
 e=c['after']
 if '机制：' not in e['lesson']:continue
 main,case=e['lesson'].split('典型案例：',1)
 counts=dict(sorted(collections.Counter(R[r]['ascension'] for r in e['evidence']).items()))
 label=mechanism_names.get(e['id'],e.get('name') or e['scope'])
 lines.append(f'| {label} | {main} | {e["n_support"]}/{e["n_contradict"]}；支持分阶{counts}；适用{e["asc"]}；12位局号在experience/historical-summary | {case} | {e["id"]} |')
 mechanisms.append(dict(id=e['id'],name=label,support=e['n_support'],contradict=e['n_contradict'],asc=e['asc'],case=case))
lines+=['','- 全历史796段静默复盘及原动作/遭遇检索验证。步法1021动作/94实用局、净2/3/6/1分布701/292/22/6；净1全带柔嫩1，不把净差当基础机制反例。毒雾948动作/82实用局净2/3/6为465/482/1，暗影152次均建1，触媒526次净1/2为343/183；这是动作检索集合，不直接提升经验支持局数。敏捷药95次/61实饮局均+2且原挡不变；既有支持语义只追加本次核到的456。', '- 蟾蜍5局40独立新房生石，50转变/使用含10次SL恢复，玩家HP当步50次均不变；41次同实体无遮拦读数扣15，格挡吸收7/9/4与现场滑溜5下扣1分核，退场/同ID重排的旧index差不当负伤。满槽/保留旧石与整战替用法未知。初稿把1伤简称无实体的归因不成立，原帧是SLIPPERY_POWER5；最终条目写现场减伤，提案详细段也写滑溜，旧临时稿及注册时条目快照保留，不外推组合。', '- 新石案例、敌增长/力敏、毒结算与倍率的局部收益可复算；提前建能力、改喝/留药、改路线/杀序的整战胜因没受控。末轮死亡实际扣2/20不等完整血价2/27，理论多次毒遇剩血截断，不预支下一轮能力收益。','','### 新增','', '- silent-petrified-toad-opening-rock：relic:PETRIFIED_TOAD 石化蟾蜍，5支持0反例/high，机制asc[0,20]；A2一局、A7一局、A10三局，空槽生成与实际15基础伤、现场修正/SL分账；账本0327，首证ZZMYZ5UBCG72/prior yes保留。','','### 更新','']
for c in C:
 if c['before']:lines.append(f'- {c["id"]}：支持{c["before"]["n_support"]}→{c["after"]["n_support"]}，加{",".join(r for r in c["after"]["evidence"] if r not in c["before"]["evidence"])}及案例/数字；账本{",".join(M[c["id"]])}。')
lines+=['','### 退役','', '- 无；未改打法源码、无反例多于支持或新高阶推翻。甲虫新SL观察并进同敌条目，不另建重复scope；旧证据/反例与案例全文留before/changes。','','### 和手写知识及代码冲突','', '- 核其余8份silent JSON的来源/生成切点/首试重试/校准及SHA，other-knowledge.json；无独立手写攻略，不需要改手写知识。room-costs为93局旧MAP房血口径、monster-records旧1383尝试战，outcome-stats旧切点分阶观察，与本任务153完局2218独立房不能直接比较；fight-value/gates为64局780战模型/估值、非实战保证；double-boss F48/49与历史端点一致，4局8192未校准模拟限制保持；新两局未抵达连王。', '- 蟾蜍/普通刀刃之舞生成、当前柔嫩/能力/毒/弱与SL同伴死亡保守排除的模型边界，均只存独立策略提案，不在本任务改手写源码知识。四提案'+','.join(P)+'；source_task=experience-update/target_task=strategy-proposal，19变更active全有experience/账本/本角色证据，domains combat/potion/sl/terminal/structure，全部pending，不冒称implemented/shipped。','','### 代码问题（不给 DS）','', '- 纯bug0324刀刃之舞Cards3被读即时抽3、未接普通生成SHIV，技能药取得的0费牌被代码结束，T4实际添3刀扣12；仅提案关联、不放经验正文。没有修后整场胜果，不承诺漏12足以转胜。技能药随机样本/实际三候选分开，其他费用/生成模板没核不扩展。', '- 0326甲虫同伴先毒死的攻击排除属必死规则证据边界；只核两角色内场景，缺所有合法操作/未知抽牌时保留拒判，不按模拟死线改整个SL定义。纯bug0324状态observed保留、0325校准非本任务记录不动。', '- 完整dirty源码、另一全路线/锻造/喝留药/早建能力整场对照、部分退场0HP与同ID身份、F17吸取完整毛伤、silent时钟、远期boss实打对比及最优方案完整执行比例/实付费用缺数据，维持旧规则。', '- 本scratch初稿用str.format误解释{@10:...}导致KeyError，改只替{n}；核验误读药槽slot_index改真实index。原脚本/失败日志保留，异常处理还碰inspect.py同名标准库，改名inspect-states.py；没有产品源码修改。首轮切片抓到未最终定稿的经验，旧产物留slices-initial，最终切片SHA与经验原字节相等。首轮测试也完整留存，最终静态快照另跑原全入口。','','### 测试','']
if (O/'test-results.json').exists():
 t=json.load(open(O/'test-results.json'));lines.append(f'- 原bash agent/tools/test-sandbox.sh；TMPDIR本scratch、PATH本机node、SANDBOX_WORKERS=1，固定数据/排除/预算保持。最终tsc={t["tsc"]}，vitest {t["files"]}文件/{t["cases"]}用例/退出{t["vitest"]}；首轮结果与最终重跑均留日志，最终经验SHA测试前后相等。沙箱外完整套件交调度器，不冒报通过。')
else:lines.append('- 沙箱套件运行中，待最终固定快照结果；不把草稿当完成。')
lines+=['- JSON合法、19条变更/其余逐项等价、角色/evidence/n/name/scope、25关键帧/全历史动作/50投石与旧151局七数组/血档/节点/回血/SL复算通过；check-experience missing=[]退出0，ledger.py check0，git diff --check与gitleaks0。']
if (O/'ledger-results.json').exists():
 l=json.load(open(O/'ledger-results.json'));lines.append('- 账本新增[]；提交后proposed '+','.join(l['proposed'])+'；退役[]。旧claim/首证/prior/版本及support/repeat保留，未并入的observed/纯bug不改status；由运维据实际合入登记数据shipped。')
if (O/'live-merge.json').exists():
 m=json.load(open(O/'live-merge.json'));lines.append('- live锁内：'+m['result']+'；刷新'+str(m.get('refresh'))+'；合前'+str(m.get('pre'))+'；合入'+str(m.get('merged'))+'。')
 for conflict in m.get('conflicts',[]):lines.append('- '+conflict)
 if m.get('overlap_conflicts'):lines.append('- 刷新知识重叠：'+','.join(m['overlap_conflicts']))
 if not m.get('merged'):lines.append('- 未实际合入，不造eval上线版本/规则双通知；保留源、刷新、预检/失败原件交运维兜底，不停对局。')
lines+=['','### 切片大小','', '- 固定种子20260929，从截止点之前SILENT状态最高两阶A9/A10各20状态×6界面=240配对，manifest留池/时间戳，不足同阶同界面才有放回；CHARACTER=silent调用官方knowledge-slice.ts，冻结common/silent其余知识/统计，只换经验。最终after经验原字节一致，初稿留slices-initial。','','| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for r in S['rows']:lines.append(f'| {r["sample"]} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["delta_median"]} |')
lines+=[f'- 整体中位{S["before_median"]}→{S["after_median"]}（{S["median_increase"]:+}字），配对差中位{S["paired_delta_median"]}；最大{S["before_max"]}→{S["after_max"]}，单片最多增加{S["max_increase"]}、最少变化{S["min_increase"]}。',f'- active191，正文{U["after"]["chars"]}字符，置信度{U["after"]["confidence"]}；A8 {U["after"]["applicable"]["8"]}；A9 {U["after"]["applicable"]["9"]}；A10 {U["after"]["applicable"]["10"]}。未压缩/合并/退役或改预算；需要Dai定：无。','',f'原始证据、复算、失败初稿、提案/CLI、切片、测试与合入回执均留{O}。','']
section='\n'.join(lines)
(O/'changelog-heading.txt').write_text(heading+'\n');(O/'changelog-section.md').write_text(section)
(O/'mechanisms.json').write_text(json.dumps(mechanisms,ensure_ascii=False,indent=2)+'\n')
(O/'report.md').write_text('# 经验库更新报告\n\n'+section)
print('报告',len(lines),'行',len(section),'字符；',heading)
