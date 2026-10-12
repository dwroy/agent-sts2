# 静默猎手十项已领取提案复核

本批：20261012-183755-strategy-proposal。记录时间以终报告为准（本文件写入前已执行date）。来源任务与原提案逐项保持；本次实现任务为strategy-proposal。

## 身份、边界与结论

根learn.json本批task=strategy-proposal、character=silent、reason=proposal，工作树与题目一致，领取的十个proposal_ids精确对应下面十项；没有research_request、implementation_request或proposal_repair。普通专题文件绑定其他批次，因此不进入专题、不读取其他专题正文。起始干净，按任务git merge --no-edit main返回Already up to date，base为`5131744f62198cf2469da2734e4a0da2b751c84e`。

本批没有新的源码、知识或策略参数修改。十项完整父提案均waiting，已经上线的诊断和展示不重复实现、不冒充父项duplicate。原十份Markdown逐份SHA与队列保存值相同，副本及队列历史保存在本目录。只查本批来源与silent账本，没有读取其他角色知识。

六局runs.jsonl均唯一SILENT/A10；六局是六个证据局，其中多次SL互相关联，不当独立样本。L9SGRBB5R698使用历史混合大脑来源，仅作状态证据，不能作为纯Codex爬塔成绩。本批未分析晚于派发锚点的其他局来拟策略。

## 原帧核验和现有消费者

`source-manifest.json`沿此前同六局材料的有界偏移索引，重新从只读logs逐字节读出并核SHA：4071决策、4167状态、43条SL尝试，共8281行。输入不是仅复制旧报告；全部重新核run身份并落盘本批-input.json。另复核15组资源端点、五组同指纹决策及七次耗药，见evidence-audit.json、focused-evidence.json。缺少decision_id的六条原行保留在原输入，消费者副本明确排除并保存原行号，不重排来源行号。

当前离线消费者六次退出0，861个片段中330个被新问题替代，344个结束于end_turn请求，187个跨轮/房/尝试边界（详细计数以consumer-verification.json为准）。完整候选结果仍为null：这是消费者有意保留的未知字段，不能据此声称原始日志完全不可分析，也不能把预测或净HP差自动认证为整候选因果。重点实证：751 T7有弃牌/排队回执；KV第五试T5去毒线随后重问；KEN F15发光水重问、技能药随机选牌；KEN末试T5继续重问。可核实际端点，尚无保持后轮动作与随机输入一致的完整反事实。

现有源码经git merge-base核实均为本base和实际live `1d3b8508d4b58b2dc24815c8b740d95e7c54a48b`的祖先。10个独立源码文件与live blob相同，combat-plan/combat/explore三个消费者文件仅有已核的Roy/Dai注释署名差异；保存原patch与逐路径哈希，不声称整个main/live等同。

- `1a00f10af95c78dfbf75de318a0083256110cf8a`：呼唤保守持牌失血与弃牌未决展示，actual_held_hp_loss保持null。
- `c4670f4f416c7d93e192e889c5080e7e4e0e733f`：未知药水持有价和同题无药参考；holdHp=null没有变成已证0价值。
- `66283dd9982bdd7f480da7a4d9bfefea0572a9ac`：SL预测配对、当轮资源与选线审计；不认证实际整线。
- `fdaf787a372880b0438e73bcac7e6d2168b038ed`：单动作派发回执；completed与整候选生效分开。
- `83512ddcd2c70fd9b983dc38524ff25c8970c1d3`、`dc0e6080cb20c508d94c006648cc3edf0188d306`：离线终局/区间观测子项，缺失因果不补零。
- `b01edf46b4b619f217d070a196e161df9fe716a0`：巨兽阶段及有限末态资源；限制条件不覆盖YQL有药组合。
- `b14880d1b1780d03e4c1c87b5afdc2a1e08fd456`：巨兽本体结束、自爆与毒药局部历史观察进入整回合及逐张fallback题面；已实际进入live，不再沿用旧报告“尚未合入”的阻塞理由。

旧SL参考序仍按存活回合及原始末轮enemyHp排序；阶段展示已明确占位体血不等于本体进度。不能用展示完成声称改序完成。更改排序可能改变路径，尚缺相同后续条件的比较。

## 逐项处置

### silent-proposal-366288801d9150d9

原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-sl-cost.md`。来源任务：postmortem；领域：sl, combat。账本：silent-0079, silent-0176。

证据：751FN9QM9MHQ F17 T2/T7：decisions272434/272575、272531/272652同指纹；T2实损13→18、净扣敌9→18；T7实损13→23、净扣敌12→18。

处置：waiting。751 F17 T7仍有pending弃牌及续步；已有持牌预测、B2配对和派发诊断，缺完整候选收益归属、同随机输入的原替整战和独立局校准，不能拟探索血价阈值。

### silent-proposal-85929bdfc8a3fc1b

原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-combat-potion-facts.md`。来源任务：postmortem；领域：combat, potion。账本：silent-0019, silent-0021, silent-0005, silent-0007, silent-0129, silent-0176。

证据：751FN9QM9MHQ F13 T3：272361同题有药/无药均8损、8/8胜，伤26/16；272362实际饮用。F17 T7 states278577/278580/278581：弃牌前模型持牌12，弃后6，实际整轮损13。

处置：waiting。751 F13 T3无药或留药整战没有实际执行；未知持有价和保守持牌拆项已上线，毒/荆棘、弃牌及药价的完整联合收益尚未认证。

### silent-proposal-efd9f83ee9e1a6dc

原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-sl-cost.md`。来源任务：experience-update；领域：sl, combat。账本：silent-0079, silent-0176。

证据：751FN9QM9MHQ F17 T2/T7同上，来源为经验补链；保留其独立原ID与原Markdown，未把同局六次SL当六个样本。

处置：waiting。共享366的预测/派发子项已有live祖先；未决弃牌后的整线归属及更差线准入的受控后继仍缺，六次相关SL不能作为独立验证关闭父项。

### silent-proposal-131042659448ae74

原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-combat-potion-facts.md`。来源任务：experience-update；领域：combat, potion。账本：silent-0019, silent-0020, silent-0021, silent-0005, silent-0006, silent-0007, silent-0046, silent-0129, silent-0176。

证据：751FN9QM9MHQ F13 T3与F17 T7，沿原九个账本的机制组合范围；原经验补链与复盘提案分别保留。

处置：waiting。逐机制与未知药价事实已有；缺敏捷、毒/荆棘、持牌及药价的完整联合消费者验证，F13无药分支只有模型预测，不能改为实盘收益。

### silent-proposal-990f054036609447

原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-200255-experience-update/proposal-sl-accounting.md`。来源任务：experience-update；领域：combat, sl。账本：silent-0102, silent-0019, silent-0020。

证据：KV0JHNJCKXLS F33第4/5试T5：273400/273450同指纹、states279460→279465和279511→279515，HP均30→30，敌334→298/305；第五试273451续问。

处置：waiting。KV F33 T5两线净扣36/29、都零损且下一轮毒20/13已核；删毒线后续重问，缺跨续问的毒/回血完整归属及保持后轮条件一致的原替整战。

### silent-proposal-e18d3f18e6cac2a0

原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-201301-postmortem/phase-sl-proposal.md`。来源任务：postmortem；领域：combat, potion, sl, terminal。账本：silent-0017, silent-0250, silent-0011, silent-0027, silent-0046。

证据：YQL8RZ8BWN1E F17末试T9/T10、states280156—280162；L9SGRBB5R698 F17 T14及PU80F84P6HPN F17 T17的旧参考记录，sl-attempts681/717；本体结束后占位血与自爆分账。

处置：waiting。巨兽阶段和毒药题面子项b14880d1b1780d03e4c1c87b5afdc2a1e08fd456已是live祖先；旧占位HP同轮排序仍保留，缺改序后的完整后继及独立验证，不能将展示上线记为父项完成。

### silent-proposal-9733bb80f445aeae

原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-203654-experience-update/proposal-giant-phase.md`。来源任务：experience-update；领域：combat, potion, sl, terminal。账本：silent-0017, silent-0019, silent-0020, silent-0250。

证据：YQL8RZ8BWN1E F17 T10、states280160→280161，毒2→8、HP26、挡13、DeathBlow41均原帧核实；同上L9/PU阶段反例。

处置：waiting。共享巨兽阶段药水展示已上线；YQL T10仅证毒2→8而26血/13挡/41来袭不变，缺提前喝、不喝、留药及新参考序的受控整战，无法校准持有价值。

### silent-proposal-c51468c5e8ba6668

原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-resources.md`。来源任务：postmortem；领域：potion。账本：silent-0019。

证据：KEN58SH9SLZ6 F3T2/F4T1/F5T2/F11T1,T2/F15T1：274131/274156/274185/274235/274237/274267/274272对应七次槽位变化；F15技能药选牌274273。

处置：waiting。KEN七次耗药逐槽核实；F15发光水后重问、技能药有选牌和pending回执，缺整条候选收益归属及不喝或留药到boss的完整对照。

### silent-proposal-86a7db08d1a31976

原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-combat-sl.md`。来源任务：postmortem；领域：combat, sl。账本：silent-0079, silent-0021, silent-0125, silent-0005, silent-0176。

证据：KEN58SH9SLZ6 F17第4/5试T10：274505/274568同指纹，states280588→280592和280651→280655，实损15/21、扣敌2/4；第4/6试T5：274484/274601同指纹，损7/5、扣敌1/2。

处置：waiting。KEN F17 T10多2实伤付6血已核，T5省2血但步法延迟且发生续问；缺能力窗口的完整执行归属、同后轮受控整战及后期独立局验证。

### silent-proposal-e282a9131b99129a

原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-214301-experience-update/proposal-sl-cost.md`。来源任务：experience-update；领域：combat, sl。账本：silent-0021, silent-0079, silent-0125, silent-0176。

证据：KEN58SH9SLZ6 F17 T5/T10同上；274601候选在274603续问前结束，不能将追加动作收益全记原候选；原经验ID与提案历史保持。

处置：waiting。共享KEN持牌预测已有live祖先；T5续问后的能力收益、T10换线的整战因果仍缺，六次SL只算同一局，不能据局部差值拟统一探索门槛。

## 反例、预期行为及验证条件

1. 751 T7两线各有未决弃牌保守部分；实际差10血成立，但不能把每线绝对预测误差算进换线差。预期保留已确定/未决来源展示，选牌后按实手重新计算；不要猜弃牌或给所有探索加统一血价阈值。
2. KEN T10多2伤付6血，是探索成本实证；T5省2血却延迟步法（原提案记录T5→T9，原帧和完整本局输入保留）反驳“少失血恒优”。预期同时呈现血价、实伤与能力窗口，当前不缩窄统一探索准入。要进一步修改，须固定完整随机输入、保存原替后继及能力兑现时点，并用之后独立局验证。
3. 751 F13有药/无药模型同胜数不等于无药实打必胜；KEN F15零损也不能证明不喝零损。预期保留当前饮用/持有价及null语义，后续按槽位核实际药水效果、重算与整战后继；不能由空药boss失败倒推出留药的HP价值。
4. KV当轮零损的两线删毒后净输出变少，不是已记录的保血收益。毛伤、敌回血、下一轮毒与净HP各列；要改策略须跨重问及回血窗口核完整后继，单个净HP差不足归因。
5. 巨兽YQL毒2→8不等于减自爆6、增加挡6或本体伤6。末态26+13−41=−2是原场算式，不能直接与别局限定末态消费者混用。PU第5试F17胜与之前尝试同属一局，后续动作也变，不能用它证明新参考序更优；直接把占位HP全部归0可能改用自爆缺口更大的平局路径。

本批只复核冻结证据，不拟合参数，不用某局同时训练又宣称留出验证；按独立局和真实时间分训练/验证，相关SL不能跨集合分拆。预期收益仅是明确还缺什么数据，不预报通关率提升。没有新策略行为，铁甲及所有其他角色等价，无需回退。本批不新增代码提案ID；继续沿原十ID，后续新局按缺口重派，不重复历史复盘或已沉淀经验。

## 验证记录

本批新增的是本目录审计材料，无生产源码改动。固定验证运行现有silent-held-loss、silent-potion-reference、silent-giant-potion三个测试文件，3文件27项通过；未运行tsc或完整vitest，未执行源码撤除/恢复实验，未运行沙箱完整提交入口，没有源码提交。首轮vitest因本机版本不接受--minWorkers而在参数解析处退出1、未执行用例；去掉该参数后通过，日志均保留。

证据核查初稿误用slot_index，原日志字段为index；原字节核验已经通过而七次耗药断言首项失败。修正审计脚本后全部通过，初稿.txt和初败.log保持，不把它记成游戏源码失败。

最后仅通过根ledger.py update追加现有账本的本批proposal/report链接，不新增观察、不重计证据，不修改claim/prior/status/version或原shipped范围。未改知识、eval版本、根请求、提案原文、learn.json、运维prompt；未推送、运行play、调用LLM或联网。完整材料和最终无源码变化证明见report.md及no-change.json。
