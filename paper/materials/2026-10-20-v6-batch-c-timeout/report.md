# batch-c 单用例超时对照（2026-10-20）

结论：未复现候选回归。按 Claude20:3x 指定判定口径，本轮归为宿主负载/调度导致的偶发超时；不需要修改生产代码、断言或 15 秒阈值。原失败 23.054 秒时没有逐用例 CPU 采样，无法确定具体争用进程，也不能用本次采样倒填历史。单例通过不替代原完整检查：原 full1 保留，发布/后续完整检查仍由 Claude/ops 决定。

## 固定输入与方法

- live：`64c218a04ebe029fdda0b5f25025302ebf2a4124`，tree `b67fdda76792cae81587a108e686e26bc2ca4c57`。
- 候选：tree `496948c2f9a9fb4d45056aa2394940cb81e0862b`；验证快照 commit `eeaa6ef683699c668101c29f3794674063a1b1a7` 仅用于本地检验，禁止运输该验证父/整支。候选全部 2,379 输入（含 458 知识）三次运行前均逐字核对原 SHA `17053663e821d3a754b6d84f4a5dc2987c1ec958a64d1295b6cd04cfeb3e1775`，每次运行后核不变。基线使用原 live 文件；按同一 2,379 路径核对，有 22 个候选新增路径在旧 live 不存在、共 194 项不同，未把候选文件补进 live 基线。
- 自有工作树 `/home/dw/Projects/agent-sts2/.worktrees/v6-batch-c-timeout-20261020`。通过 `ops/worktree_checkout.py` 分配后因 package scripts 不同拒绝挂共享依赖；已核依赖字段及 package-lock 完全一致，仅在自有树建立 node_modules 链接，证据见 checks/shared-tools-verification.json。没有安装依赖。
- live、候选交替各三次，每次新 Vitest 进程；`nice 19`、`ionice -c3`、`--maxWorkers=1`、主盘短 TMPDIR `/home/dw/Projects/agent-sts2/.cache/w8b`。原 15,000 ms 阈值及配置未改；Node v22.23.3 / Vitest 4.1.11。
- 仅过滤 `the logged elite T1 with the clock past the budget`；每次 1 例通过、其余 26 例被过滤。本次没有启动完整测试、模型、API、模拟批次、刷新或游戏。

## 六次结果

下表用例耗时来自 Vitest JSON 的 assertion.duration；末列是独立进程从启动至退出的实测墙钟，包含配置、导入与报告。

| 次数 | live 用例 | 候选用例 | live / 候选进程墙钟 |
|---|---:|---:|---:|
| 1 | 1.719 s | 1.708 s | 5.027 / 5.027 s |
| 2 | 1.733 s | 1.744 s | 4.977 / 5.026 s |
| 3 | 1.695 s | 1.979 s | 4.976 / 5.829 s |

中位数 live **1.719 s**，候选 **1.744 s**，候选差 **1.45%**。最慢用例 1.979 s，约为阈值的 13.2%。候选最后一轮宿主平均 busy 从前几轮约 9% 增至约 29%，该轮 1.979 s；这只是本次样本的宿主总量，不是历史失败时的采样，也不能当作单核调度延迟。六次均 rc0，所有测试 PID 与 runner 已退出。

## 调用路径与 idleCombat 排查

1. 用例直接构造 `loggedEnv(logged("x7lu-f7-t1"))`，同步调用 `planCombatTurn`，随后验证 rollout 是预算耗尽兜底、没有伪造 forecast/全线必死。`loggedEnv` 没有提供 v6Projection。
2. `planCombatTurn` 调用 `withMechFallback → withSlRetryFallback → guardSandpit → planTurn`。该函数与测试引用的 logged.ts、状态 fixture、两份 setup 在 live/候选之间没有变更；没有进入控制循环，也不调用 v6Projection。
3. 候选的空闲预计算由 `agent/src/hand/loop.ts:900` 的非战斗 wait 分支与 `:1594` 的实际网络等待分支驱动；`projection-runtime.ts:156` 的 startCardBackground 才会向 cardRequest 传 idleCombat=true。这些入口不在本用例直调路径。
4. 用例体逐字相同，SHA `4264d9fc33d16ff130825733e76b2315c9ac7951f95e9aac15d8ed279fd5c736`。整个 batch-c 测试文件相对 live 有一处临时目录 helper 导入变更（node:fs → temp-fixtures），所以**整个文件 blob 并不与 live 相同**；其 blob 与第一次五项组合相同是 ops 原件的另一项核验。不能混为一谈。
5. B2 整场方案由原 setup 的 BOSS_SIM_LINES=off 保持关闭；用例内 rollout 假时钟每次读跳 400ms，potionMc 假时钟固定为 0。未发现 V6 后台构筑评估进入这条直接调用路径。

## 限制与交付

原完整检查 tree4969 的 tsc0/full1（623 文件 / 5908 通过 / 1 超时 / 2 跳过）保持原件，未排除失败用例、未放宽阈值。六次隔离测量支持偶发负载结论，不证明原完整检查已经通过。没有修改 live、main 工程源码、STOP 或游戏状态。原始六次报告、runner、输入与 SHA 清单见 checks/；原始逐轮完整输入快照还保留在自有 .artifacts/batch-c-20261020/。
