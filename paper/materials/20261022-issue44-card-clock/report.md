# #44 奖励牌事实契约的预算时钟隔离

[dev #41] 按主管指派，在原 issue-41 会话接续 #44；只修测试，不改生产算法。固定输入已复现真实预算异常和空表，tsc 与定向 17 文件 167 项通过，交 review。

分支 `issue-44-clock`，独立工作树 `.worktrees/issue-44-clock`，allocator 基线 `d76da078334e57ba93f21471e160cdec15d32256`。不复用或改写已交付的 #41 分支。授权及验收见 [主管评论](https://github.com/dwroy/agent-sts2/issues/44#issuecomment-6344141656)。

## 原失败与归因边界

#40 热修候选 `01b4bec2076c70f1d08fe3e9e2c58db0b73dc0f8` 首次完整检查的旧测试为空表：T0TP8S9MMU9Q F2，`actual.tables.at(-1)` 为 undefined。原完整检查 6218 通过、1 失败、2 跳过，不由后来单文件或本次定向覆盖。`original-failure.json` 是原 Vitest JSON 中失败文件的精确摘录；完整 JSON/log/checks 已复制到本树忽略目录 `.artifacts/issue44/original-*`，原位置、字节和 SHA 在 `original-manifest.json`。issue 中一个 after-inputs 路径已不存在，明确记 missing，不把主管/集成员的前后输入核验冒作本会话独立完成。

`CardValueRuntime.evaluate` 直接用 `performance.now()` 建立开始时间并在加载模型/核心卡后检查预算；之后在核心、选项、目标遍历中继续检查。`V6ProjectionRuntime.evaluateBrainCardValue` 原样传入 450ms，catch 任何异常后返回 undefined。该路径不用 `currentDecisionBudget` 决定 450ms，固定 ledger 或 engine 时钟不足以隔离它。

本次仍运行真实模型加载、预测、HTTP 夹具和 runLoop；仅在真实 `loadOpeningModel` 返回后推进可控时钟。T0TP8S9MMU9Q F2 在 450ms 检查中实际抛出 `card_value_preparation_budget`，外层实际捕获，未写入表，原正向存在性契约失败。`reproduction-red.json`：1 失败、6 跳过；错误诊断明确记录 budgetMs=450、elapsedMs=450。没有 stub 掉 evaluate 或手工抛同名异常。`reproduction-red.patch` 是相对最终测试的一行改动，`git apply --check` 通过。

这证明足以产生同症状的具体路径。历史首次失败没有内部异常/预算轨迹，仍不认定本次复现是唯一历史原因，也不认定生产游戏数值错误。三个原输入的 Git blob 与首败树完全一致，SHA/字节见 `frozen-inputs.json`。

## 修复及保留的契约

- 两组原 combat→reward 正向业务契约固定计算用 `performance.now`，包含 ledger/runtime/预测的传递路径；真实 HTTP、异步计时器和原 test timeout 不变。原四选项 known、逐格数值、skip 零增量、无 rank/tier、题面/criteria 字节等价、相同模拟调用数及新增 <4000 字节断言全保留。原 <500ms 断言继续检查可控计算时间，不再把宿主测量当作业务正确性。
- 通过导入时绑定的真实时钟单独记录 `wall_preparation_ms`；冷加载、完整审计写入和紧凑 JSON 打包均计入。最终定向 F2/F3 分别测得约 307/210ms，只是本窗口观测，不推定长期性能。`prediction_ms` 与 `computation_preparation_ms` 明确属于可控计算钟。
- 原 timeout 用例从模拟异常改为真实预算耗尽；另加 F2 449/450/451ms 边界：449ms 仍产四个已知选项并进入题面；450 和 451ms 真实抛错、无表、原大脑题面字节等价。始终核实际传入预算 450，未提高预算。
- missing/corrupt 仍真实加载缺失/坏模型；核表 model_id=null、全部选项 unknown、无异常且原题面保留。no-combat 保持零 evaluate。
- #41 后台 B 契约也固定 runtime/ledger/solver 时钟；将固定 600ms 伪模型等待换成真实后台完成事件。仍只有原大脑请求，仍禁止前台 evaluate，仍核缓存数值及环境变化失效。
- 大型 204 行缓存题面的业务断言与性能拆分：原样提取共用 fixture，业务仍核 17 核心、全部目标、数值/精度/省略记录、字节上限及输入不变；原 1500ms 断言移至 `v6-prompt-summary-perf.test.ts`，继续用真实时钟和原阈值，未删除或放宽。专用性能文件原 5000/1500ms 阈值也保留，10 条性能观测另存 `performance.jsonl`。

## 其余时钟契约排查

静态搜索覆盖全部 `agent/tests/**/*.ts` 的 `performance.now` / `currentDecisionBudget`；原 12 个直接读取文件逐行清单见 `clock-readers-before.json`，最终 11 个见 `clock-readers.json`（summary 的读钟已移到 perf）。另沿生产调用链检查三份间接预算测试。

| 测试 | 处置与原因 |
|---|---|
| v6-brain-card-value-loop | 修复真实 450ms 预测门，分开宿主测量与计算钟，补真实耗尽/边界。 |
| v6-card-option-loop | 原 #41 前台隔离保留；后台 allowance、内层求解器也固定，改完成事件同步。 |
| v6-projection-runtime | 固定默认 DecisionBudget 及后台 runtime 的钟；保留已有注入钟的取消/耗尽/独立预算用例与全部断言，避免真实调度消耗 100/500ms 断言余量。 |
| v6-potions | 固定无 parent 的默认 DecisionBudget 钟，消除 >4900ms 的宿主余量竞争；原挂起 SDK 的真实 10ms 取消定时器保留并通过。 |
| v6-prompt-summary | 纯业务断言保留；共用同一大表 fixture，把宿主 1500ms 门移入 perf 文件。 |
| v6-prompt-summary-perf | 明确的性能检测，真实时钟与原阈值保留；不充作业务稳定性证据。 |
| human-pace-budget / direction / sl-budget | 现有显式注入钟或 fake Date/timers，耗尽、外层恢复和实际余量均可控；未修改。 |
| human-pace-sl-loop | 原已固定 performance.now，保持原样。 |
| human-pace-animation-reserve | 原已显式 fake performance/timers，保持原样。 |
| human-pace-card-shadow | 相关预算/超时用例原已 fake timers/Date，并使用注入 Date 钟；保持原样。 |
| v6-card-value（间接） | 原调用 evaluateBrainCardValue 的 450ms 门同样受宿主影响，固定计算钟；缓存/其他角色/零预算断言保留。 |
| v6-card-input-bridge（间接） | engine 固定零仍不能固定 runtime 准备耗时及继承 ledger；一并固定，保留真实输入/工厂/路由与四选项断言。 |
| v6-completed-core-peek（间接） | 固定后台 runtime 的 100ms 准备窗口；原缓存读回、失效与不启动额外工作断言保留。 |

已改变的时钟 spy 都在单用例/文件作用域恢复。未设置全局测试钟；专用性能、真正的定时器取消测试和故意耗尽的注入钟仍分别运行。本次排查不证明所有传递调用的所有性能上限已与宿主无关。

## 验证与记录

- 生产 TypeScript 检查退出 0：`tsc.log`。
- 固定红测退出 1：`reproduction-red.json`，实际预算异常和空表如上。
- 初版正向单文件 7/7：`brain-final.json`；此后扩展至 9 项，最终 17 文件 167/167 的 `targeted.json` 包含全部 9 项，及 #41 六契约、预测缓存、实际输入桥接、runtime、药水、提示词/性能和全部直接预算读取文件。
- 所有正式检查 nice19、单 worker、文件不并行，没有发起完整 Vitest 或等位进程。最初曾在第一探针未退出时误启动第二轮并提前恢复源码；第一探针实际读到恢复后的正向测试，1 过/6 跳，不计红测（`startup-overlap-probe.*`）；已终止重叠第二轮（exit143，`cancelled-overlap.log`），随后红测和最终检查均串行。该操作失误及原件保留，不计作代码失败或可靠性通过证据。
- 改动仅 `agent/tests` 和本单材料/decision-log，生产源码、知识和输入模型树均未改；铁甲战士生产行为等价。不需要行为发布编号。没有合 main/live、调用游戏/模型、修改 STOP/账号/prompt，未关闭任何其他会话。

最终精确组合及完整检查由集成员在原唯一窗口执行，排在当前在途项之后；#40 热修沿原门独立处理，本单不新增阻塞。#41 原前台完整时钟修复及双方历史失败/归因限制均须保留。本单只交测试契约，不代父任务发布、首局或学习验收。
