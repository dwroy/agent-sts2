# G4 revision 3：四候选核心资格与 R 零主选

2026-10-16，写入前已执行 date。请求 `roy-20261012-concrete-core-decklists`，revision **3**，关联 `roy-20261016-global-build/G4.1–G4.3`；输入 SHA `13f08f48c42377df6983f906c2792043cb2ae9177a58a8fcd2b902d3d4cca36e`。

**新学习和源端验证已完成，实际 live 发布因共享记录冲突受阻。** 独立数据源 `f79983e1cae6ec066814e8085959638bc827106c` 只修改四条已有 Silent 经验，版本 `2026-10-16.1`，其余 228 条保持。账本 `silent-0493` proposed，原 CLI 代码提案 `silent-proposal-fee52fe475a0d0ac`；旧已 shipped 项未降级。未实际合并、未编号、未标 shipped，不把本报告退出当学习入库完成。

## 身份、输入和边界

原 owner/thread `01a12eba-13a8-7550-ac47-692d3d19bed1`，原批 `20261012-140741-strategy-proposal`；实收接续批 `20261016-075639-strategy-proposal`，同工作树、同账号/home/沙箱，未派子 agent。`binding.json` 保存本批 running 注册，`native-binding.json` 和原 turn_context 保存实际 gpt-6.1-sol/xhigh/default、workspace-write/no-network 记录。没有自行改请求、learn.json 或 ACK。

启动树干净，HEAD `e886085ad98ad48a06a76ab2a32ed21bd30a6f49` 是 main 祖先，按授权仅快进 main 至批准基线 `50e2da099a5e1745878070ea960f3160324f2217`；没有合整条 live。已读当前 AGENTS、README、最新 STATE、decision-log 末尾、学习协议、代码提案与学习要求闭环。五份 r3 快照及本输入逐 SHA 核对，见 `frozen-input-verification.json`；父快照 G4.1–G4.3 与实际范围一致。只恢复任务需要的精确历史 Git 文件，核 materialize 返回 HEAD/blob。

原 r1/r2 报告、512 条件样本、作废首轮、冲突和模拟边界不改。旧六要求沿 revision 2 实际 live 数据源 `dca4d3e13e066ebcba7f5d48fde9e24f824e856f`、行为提交 `730db1e7b0bf2b313a4cb7193d9568f402cba503`、V4-R313 和原实际消费者回执复用；原回执 SHA `4f0b8033c04c73976ed4552593eb7f9c02280d3cc1eddd9a8327835be3b112bd`。后续经验压缩/补证不倒写为原字节，旧六当前内容 SHA 另算在 `live-prior-six-coverage.json`，原件指纹在 `prior-revision-reuse.json`。

没有重跑旧 30 题/54 池/Jev144、107 调参/460 验证或原 512 模拟；没有新游戏、模型/API、网络、play、对局重启、ops prompt 修改或其他角色改动。

## 当前四模板的逐项资格

当前文件 `knowledge/characters/silent/construction-templates.json` SHA `fa2bbf98407f9898ee8fcbcd76d8de731a3a2228c23f8b01a63384b53e12b500`；P/D/S/R 全为 candidate，原匹配条件、身份、字节和模板摘要保持不变，避免热替并行 G3 校准。它们是四类共现签名，与旧五套具体牌表实例、五套目标和 25 臂分别保留。以下只复核原明确证据，不重做全历史。

| 当前候选 | 持有与实际兑现 | 存活/通关反例及资格结论 |
|---|---|---|
| P 施毒触媒与防御 | HNX4A2WBC34W A10 F48 第3试，T1触媒、T2余像、T5毒雾；末态原牌组匹配当前P | T8真实死。已施/有局部收益仍不充分；不要求所有防御替代件等价。KF9/7S的限定胜局复用旧六，不能认定当前P签名必要充分 |
| D 双步法多挡与输出 | 25226ZFLNR1J A10 F48 首试，严格双步法签名齐，T2步法/T3毒雾，T8仍有后空翻、蜃景、斗篷 | T8判死截断；已建敏捷与后续挡仍未补足生存/输出。旧夜魇代理撤销保持，不恢复33局旧口径 |
| S 供刀、增益、防御 | YF0LXT1QSTGG A10 F48 第6试，末态S签名齐，T5刀舞及四刀实际打出，敏捷/触媒均有原帧 | T5真实死。同局六试不是六独立验证；KAY低阶混合胜局不移植成A10稳定刀核心 |
| R 抽弃与收益遗物 | L704TLETMZBM A10 F48 第3试，R签名齐，T3爆发/杂技/下注实际施放、绷带收益已由原研究核实 | T6真实死；1LMB A4 F48 首试11轮胜是低阶混合局部通过，不证明A10完整循环/独立输出/通关 |

`historical-evidence-verification.json` 的 22 条原行均按原 offset/bytes/SHA 复核并保留原字节，约 0.92 MB；末态库存复算均匹配各自签名，见 `template-qualification.json`。来源账本 0352/0353/0354/0355、原机制 0005/0011/0027/0085/0194/0284 与旧反例保留。没有发现足以新增最小充分模板或数值阈值的受控证据；**保留候选资格是限定结论，不是判定这些组件无效。**

## 冻结 231 计划：R 未选的可知与未知

只取原物理顺序最早 231 条含 `plan.construction.primary` 的记录；起点 offset 7612949，终点由最后一行 offset 8396984 加原行长度冻结，精确值和每行 SHA 见 `plans-231-frozen.json`。末条时间 2026-10-15T23:42:30.033Z；之后计划不纳入。计数完整重现原冻结报告：P130、D29、S13、uncommitted59、R0。它们来自 30 个 Silent A10 局号，29 已结束、9KP 在当时进行中；231 不是独立局分母。

原存档脚本没有给 run-plans 原字节截止或前缀SHA；本轮按只追加原日志的最早231条重建，计数与批准快照吻合，再保存实际行身份/字节指纹。不能倒造原统计时未测的前缀SHA，也不把本轮SHA称为原统计的既有SHA。

231 个状态都与原计划 `observed_ts` 相同，逐行核 Silent/A10；29 结束记录和 9KP 原 run-config 另核。只读索引缺 9KP，按已知 Silent 尾部起点冻结 11,099,186 字节窗口，只补原三道计划的精确 observed_ts，不提取新轨迹。原始指纹/查询/补链见 `plan-states.json`、`plan-frame-query.json`、`index-lag-recovery.json`。

| 主方向 | 声明次数 | 同期已持有自身签名 | 尚未持有自身签名 |
|---|---:|---:|---:|
| P | 130 | 32 | 98 |
| D | 29 | 12 | 17 |
| S | 13 | 0 | 13 |
| 未定 | 59 | 不适用 | 不适用 |

全体 231 状态中，库存签名 P32/D22/S0/R2；候选可重叠，不能相加。计划是在声明未来方向，不等同当前成型；这些计数不能推出选择错误或组件没用。

R 被列为备选 **46** 次。228 道状态缺铜钹/绷带，3 道持铜钹；没有绷带。两道满足完整R持有签名的记录都是 **LTQ083RTNZJQ F18/F23**：有工具/有备等抽弃及铜钹，仍声明 P，理由分别明确毒触媒已提供输出、缺可扩展防御、完整运转未知；F23还承认R支撑及模型未知。F13持铜钹但尚缺另一类支撑，不用后取得组件倒填。关键词统计仅描述已写理由，不作因果模型：71条写收益遗物条件，91条提R备选或抽弃。完整原理由、实际牌表及缺件逐项见 `plan-analysis.json` 和 `plan-inventory-audit.json`。

因此，已证的解释包括大量计划缺收益遗物，以及个别已经具备签名仍优先既有毒输出、保留生存/完整运转未知；**R零主选不识别R无效、R低于P的普遍优先级，或改选R就能赢。** 对未写出的心理原因不推测。缺失的最小反事实是同题真实可执行R/P完整输出、付费/实际后继/生存及自然选择结果；沿已有消费者和量化owner收集，不另开研究/局或给出硬阈值。

## 经验修改及实际源端消费者

只修订已有四条：`silent-core-poison-defense-observation`、`silent-core-dexterity-defense-observation`、`silent-core-shiv-defense-observation`、`silent-core-discard-relic-observation`。P/D/S增加目标、持有、施放/付费、存活与整局结果分账，R增加上述零主选的证据与限制。只有R新增LTQ主题证据，n7→8；冻结6局签名分母未改，不把231计划当231独立支持。旧字段/既有支持计数、反例、证据前缀和其它228对象均保持。代码提案 CLI check-experience 退出0、missing=[]，不伪造id或将宽代码提案标implemented。

实际生产函数 `missingRequirements` 与 `constructionPlanContext` 对231状态逐项核对通过，P/D/S/R均可见且candidate=true。复用KF9真实奖励F2、升级F6、商店F22三帧，调用 `parseGameState → RunJournal.render → KnowledgePrompt.apply`：四条新段12/12、旧六要求涉及的五条经验内容15/15。保留实际输入、输出、冻结知识文件和源码参数。案例标题装饰省略；不调用模型、不执行动作。

撤新经验的负对照实际exit1，12个新段全缺，旧六内容仍在；恢复新数据exit0。`source-consumer-receipt.json` 有真实输入/输出 SHA，kind=fixed-consumer、scope=source-only；**它不是live消费者回执或自然采纳/收益证明。** 源端执行代码在批准50e2da099上，数据为随后精确提交f79983e1c的同一补丁，生产源码不变。

只改数据，tsc/vitest/cases 均 null，不制造源码撤回测试或借其它树全套绿。提交前 gitleaks 扫描11.21KB补丁退出0/no leaks。首轮固定读回要求三条后续压缩的旧经验仍与r2全段逐字相同，导致断言失败；新12段本来全读到。原 `source-attempt1-legacy-byte-assertion/` 和日志保留，核实当前压缩文本后改为具体旧结论片段断言通过，没有改游戏知识去迁就测试。

## 合入受阻、通知与恢复办法

对 immutable live `fd06a361bf958bd1637d5f28053770002f0e5ce6` 的合并预检exit1，冲突只在 `notes/fix-queue-v4.md`、`notes/ops-handoff.md`、`ops/inbox-dev.md`、`paper/materials/decision-log.md`、`paper/materials/learning/ledger.jsonl` 五个共享记录。经验叶的旧字节与该live完全相同，新数据只有四对象限定。没有启动实际merge、改live索引、覆盖共享记录或回滚；初次取得共享读锁遇busy的失败也保留。`merge-preview.*` 和 `publication-request.json` 是具体现场与精确源包。

按r3恢复授权，交原ops在原live锁内精确集成单经验叶源提交，核实际源码/知识树、分配正式编号、decision-log/实际上线双通知及shipped；随后原学习者对真正部署的live做同一消费者读回。不能把源端通过或本报告退出写成已上线。

两项异议和上述技术交接已实际追加根 `notes/for-roy.md`、`ops/inbox-dev.md`；每项旧观点、新结论、证据/账本、预期和回退均在原文，offset/bytes/SHA见 `ops-handoff-notification-receipts.json`。这里只确认文件追加，不冒称watcher已读或Roy已知，不编辑ACK。正式通知链由原ops→原watcher→Roy完成。

本轮结论：旧六要求复用；四模板审查与R非选择的新学习已完成源端入库提交及固定消费者，**live新经验/正式版本/新消费者/ops shipped尚未完成**，outcome=blocked、merged=null。更宽量化父、自然采用和global-build其它阶段继续开放。

## 失败与范围偏差

初次探查日志结构时误读了run-plans最前两条其它角色旧记录，违反预期只读角色边界；未将其原文保存进本批产物，也未用于任何知识、阈值或结论。后续全部输入先按本冻结计划筛选，再逐条Silent/A10身份核对。此偏差与早期状态wrapper断言、索引延迟、旧文字断言失败均见 `scope-deviation.json`，不隐去，不将探针失败当游戏反证。

报告/中间原件均在本工作树learner/runs下；paper/materials/20261016-global-build-g4的交付索引保留引用及SHA，不改冻结输入、原报告、已完成revision2、其它学习owner文件或注册。
