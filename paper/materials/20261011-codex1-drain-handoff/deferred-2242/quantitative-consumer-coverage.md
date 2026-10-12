# 消费覆盖与路径协调

本表是源码核查，不是调用测试通过或新版本已被自然局消费的证明。当前工作树基线为 `3f94d48f043fb49ea2780902edd7e493faf551ad`。

| 环节 | 已有入口与能力 | 本请求缺项 | 本批处置 |
| --- | --- | --- | --- |
| 战斗/回合开始、状态变化重规划 | `combat-plan.ts` 的 `factsOf` 调 `quantitativeTurnFacts`；已有当轮伤害、挡、余能、HP和计划动作数。`rollout-live.ts` 有状态/输入缓存。 | 现场已建与拟建立、延迟副本/后继、实际费用分源、完整组合资格/首次启动、耗尽和断链事件未由量化接口输出。 | `combat-plan.ts`、`quantitative-facts.ts`属于watcher六文件。当前函数无组合结果参数；协调后沿这一个入口接入，不在hand另造一份解释/排名。 |
| 出牌、药水、弃牌/保留/复制对象 | 既有card-model/turn-solver、`replaySteps`和selection执行；当轮动作合法性与收益由现有机制处理。 | `Plan.steps`是动作，不是自动重放/实际抽弃/复制到手事件；selection链与后继计划的完整绑定尚缺。 | 不能从动作数或同ID推断完整组合。先由学习者在非保留的求解/记录层做可选事件追踪，再由已协调接口输出。 |
| 结束回合与SL | 原终局/SL路径、HP与模拟界仍在；通用说明警示小样本和截断。 | 本批尚无已校准的完整组合/延迟生存界可供这里消费。 | 保留既有行为；不把零胜模拟、预算不足、未知值当必死。本批无SL规则变更。 |
| 奖励拿/跳、商店买/删、升级/变换/事件 | `hand/loop.ts`→`withBossSim`→`compareOptions`；已有同样本身份、同预算的boss对照与`quantitative_fight`。 | 完整组合/启动/净费用的样本轨迹未传入；`compactQuantitativeFight`再次固定组合为null。保留/复制对象不是所有入口均有整场候选模拟。 | `build-sim.ts`、`build-sim-facts.ts`及`quantitative-facts.ts`为保留路径，不能只在CLI计算而称生产已消费。 |
| 路线、休息、战前及后续战斗 | 休息/已有构筑入口、boss-start与连续战斗资源模型已存在；机制从当前进阶的既有数据库取。 | 核心启动与可活窗口、不同选项后战重建代价未形成统一可校验组合轨迹。 | 不用牌数或抽象12轮代替整局；此项未补接入。 |
| 复盘/校准/后续自然对局 | `quantitative-calibration.ts`已有严格身份匹配、偏差/MAE/RMSE/经验区间覆盖。旧决策日志含decision、fingerprint、SL尝试和已选选项。 | 预测值与逐动作实际结果的自动提取、当前准确模型源码身份、偏离计划/重规划排除、未完成样本未补齐。 | 本批审计74条旧决策、10个已选旧题面；当前模型有效匹配0，不伪造校准或真实区间。 |

## 精确的协调范围

任务正文要求：“原三个提案的消费者实现；先复用watcher交付接口，冲突路径停止并交ops协调”，并逐项保留六文件职责。本批依此停止生产编辑。阻点是接口契约和职责相交，不是缺少Roy对量化升级的总体授权，也不是把本批误当纯研究。

1. `agent/src/sim/quantitative-facts.ts`：`quantitativeTurnFacts(state, plan)`仅消费聚合Outcome；`quantitativeFightFacts(samples, base, ids)`只读聚合FightSampleResult；`compactQuantitativeFight(full)`的`complete_combinations`仍直接返回null。三处都没有传入已验证组合结果的可选契约。
2. `agent/src/reflex/combat-plan.ts`：同一`factsOf`供普通criteria及Jev criteria使用；这是原0376/0385提案应复用的生产入口。需要把现场已建效果与学习者的可选结果传进去；只改离线工具不能完成这里的消费验收。
3. `agent/src/sim/build-sim.ts`：`simOf`调用量化函数，需同sample身份传学习者的轨迹统计。`agent/src/sim/build-sim-facts.ts`负责compact展示，需保留定义/适用性/空值原因及启动/组合数量。

`quantitative-stats.ts`和`quantitative-calibration.ts`当前基础统计/匹配函数可复用，无需为已存在能力造第二套；本批未发现必须改变它们的游戏语义。

## 可审查的接入契约草案（未实现）

学习者提供 `CoreRealization`，每项包含：定义ID/修订、角色/已见进阶、证据与账本、状态指纹、准确模型版本、窗口、sample ID、适用性和不适用理由；按阶段记录已持有、到手、合法施放、已建、实际后继。数值包括实际费用、单卡动作/效果次数、完整组合次数、首次合法启动、当前与延迟伤挡、HP/药水及终止原因。任何缺模型/断帧/超预算的指标为null并给原因。

完整组合定义必须对四个原核心签名分别核实，不能另选一个容易计数的二牌动作替代原“整套”。已建能力的持续收益、次轮复制、当轮自动重放、再次抽入要分账；缺物理UID时不强标副本来源。同一机制只执行card-model/turn-solver/rollout的现有状态转移；新增事件记录读取转移结果，不能再写一份机制算式。

函数建议增加可选、默认缺失的realization参数/字段，非Silent输出逐字保持。上游按sample身份携带；统计复用`summarizeSamples`/`pairedDifference`，不给零填充；胜/败/截断分母保留。下游只追加事实和限制，原候选、顺序、同值并列、硬评分、SL和药价保持。缺值有明确不可用原因，不让消费者把null当0。

需要ops协调的是上述生产路径如何交付：由watcher补这个可选契约、学习者消费，或明确将这个有限适配交给本批学习者。不能因通用框架已合live便将保留路径默认视为转交。此文随原批次报告交ops，没有新建调度器、事件、定时器或外部请求。

## 五类验收分别登记

| 验收 | 本批真实状态 |
| --- | --- |
| 固定输入真实消费者调用 | 未新增实现，未运行新消费者测试；源码读到调用不等测试通过。 |
| 实际live源码 | 通用框架源`199596dfcf99c18cda5ce146b8de618636f60d40`及`3ee649f69260309677ad075cac726d705a66e6ef`已核为live祖先；原三宽提案没有整体实现commit。 |
| 自然局真实请求读取 | 本批无发布，不声称新组合事实被读取；旧题面仅作历史审计。 |
| 是否采用 | 未知；旧已选选项不能等同本批新事实被采用。 |
| 收益观察 | 未知；冻结样本重叠不相加，抽象改进不解释通关率。继续原ops效果跟踪。 |
