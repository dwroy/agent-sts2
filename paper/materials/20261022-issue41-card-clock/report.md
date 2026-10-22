# #41 奖励牌契约的时钟隔离与固定复现

[dev #41] 已用固定输入复现 2/8 终局分母，并固定契约测试经过的完整计算时钟。仅改测试，交集成员 review。

基线 `50df9b70d04db388bd33b7731f7ed32af526b530`，分支 `issue-41-task`。来源问题为 #20/#37 共享的 `v6-card-option-loop.test.ts`。原集成员报告和失败保留于 `paper/materials/20261022-issue20-r3-integrator-review/`（材料提交 `5c235855809dc0178bb69eb458afd8d37357a2be`）；原 161/162 失败不改写。本工作树基线的 engine 时钟仍为 `performance.now()`；受检来源 `bfcb85bd0c30287aaee4e7fc4be4fb53bd4b6e2f` 已注入 `() => 0`，但仅此仍未固定其他时钟。

## 缺口与因果复现

`V6CardResultsEngine.now` 控制准备/采样调度并传入 `SerialDeckRunner`。`simulateFight` 的本地时钟虽固定为零，`solveTurnCurrent` 仍读取 AsyncLocalStorage 中的 `currentDecisionBudget().remaining()`。`runLoop` 创建真实时钟的 ledger，`withIndependentDecisionBudget` 继承它的时钟；runtime 的准备耗时还直接读取 `performance.now()`。因此只固定 engine 时钟不能证明八次求解都有充足时间。

以原冻结 T0TP8S9MMU9Q F2 输入、原模型、原八个绝对样本为基础，固定 engine 调度时钟为零。在首批 `[0,2)` 后、第二批 `[2,8)` 前，把 `performance.now()` 的虚拟值从 0 推进到 5000。真实 runtime 的独立 `V6_card_results` 预算从剩余 5000 变成 0；真实串行求解器观察到预算耗尽，产生 timedOut 求解。没有等待宿主负载，没有模拟或替换胜负结果。

保留原 `[8,8,8,8]` 断言运行时，稳定得到 `[2,2,2,2]`，退出 1：`reproduction-red.json` 与 `reproduction-red.patch`。这证明该时钟缺口足以产生原症状。原历史失败当刻未采预算/轨迹，因此仍不能证明历史那一次一定走了这个分支，亦不能推断宿主负载为唯一原因。

## 最终测试

原两组正向契约固定 `performance.now()`，同时覆盖 ledger、继承的独立预算、runtime 准备耗时及内层求解；engine 调度时钟单独固定。只在本用例作用域安装 spy，结束后恢复。真实 HTTP、setTimeout、setImmediate 继续运行，未提高 timeout。保留模型、观测牌面、配对样本、实际选牌、三种不同数值结果、24KB 传输和逐格精度断言；当前目标的四个选项仍严格要求八个终局样本，并增加零 capped/time_up/missing 断言。

新增两个独立测试实例使用同一冻结 F2 输入：

| 用例 | 实际 samples | capped | time_up | missing | death_rate.n |
|---|---:|---:|---:|---:|---:|
| 两组正向契约，各四选项 | 8 | 0 | 0 | 0 | 8 |
| 内层求解预算在两样本后耗尽，各四选项 | 8 | 6 | 0 | 0 | 2 |
| 外层采样时钟在两样本后截止，各四选项 | 2 | 0 | 0 | 6 | 2 |

内层用例还核独立预算 key、时钟值 `[0,5000]`、剩余值 `[5000,0]`、实际求解器 timedOut 及配对终局分母 2；外层用例核仅一次 runner 调用与 pending_work。采样数、缺失数与终局分母没有混同；capped 没有变成存活或零损失。原 `v6-card-results.test.ts` 的 capped/missing/连续样本语义另行通过。

## 验证与原件

- 生产 `tsc -p tsconfig.json --noEmit` 退出 0，`tsc.log`；未运行历史有遗留错误的 tsconfig.test。
- 最终单文件 6/6：`contract-final.json`。
- 相关定向 9 文件 76/76：`targeted.json`。包含 card-option-loop、card-results、card-results-input、card-input-bridge、card-face、human-pace-budget、human-pace-reuse、human-pace-sl-budget、build-sim-cancellation。
- 首次探针 `contract-green.json` 实际为 2 通过、4 失败：准备阶段重置 solveTap，使放在准备前的采样 observer 没收到求解事件。原失败保留；最终 observer 移到每个真实 runner 调用内部、链式调用原 tap 并在 finally 恢复，后续两份通过结果才是最终验证。
- 输入、测试源码与报告哈希见 `verification.json`。命令均 nice 19、单 worker，测试仅连接本地固定 HTTP 夹具，无游戏或模型调用。

按 #20 的原队列边界及 Roy 上线检查优先指示，没有新增完整 Vitest 或等位进程。9 文件定向通过不冒充原 14 文件组合或最终 full 通过。集成员沿 #37→#20 共享文件次序应用本测试补丁，在精确候选树补必要组合定向，并在原窗口做一次完整检查；不直接把旧 engine-only 固定时钟补丁覆盖回来。

## 影响与交接

仅一份测试源码变化，生产算法、预算耗尽/capped 的语义、游戏知识与冻结输入均不改，铁甲战士生产行为等价。不需要行为发布编号。没有合 main/live、启动 play、改 STOP/prompt/账号、关闭其他会话或回收工作树。

本单可验收的是测试时钟隔离和可复现原因；历史当刻归因限制仍保留，未证明生产游戏数值有误。后续组合准入、发布、自然首局与父 #20/#37/#39 的其他验收仍归原角色。本分支保留供集成，尚未满足 main/live 发布回收门禁。
