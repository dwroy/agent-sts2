# 独立角色运行通道

多实例准备分为代码隔离、本地游戏启动和真实爬塔三项。已通过模拟测试的代码不能证明本机能启动第二个独立单人游戏。Steam Workshop mod 的 AI 队友是联机模式，不能作为独立单人实验。

## 分支与目录

独立角色可以使用独立分支 WT。储君运行目录为 `.worktrees/regent-climb`，分支 `regent-climb`。其 `STS2_WORKSPACE`、`CODEX_OPS_ROOT`、`STS2_LIVE` 指向这个目录，`CODEX_OPS_DIR` 指向其私有 `ops/codex-ops`，`LEARNER_BASE_REF=regent-climb`。logs、data、notes、当前局、STOP、脑等待、队列、锁、复盘和账本必须是本通道实际私有文件；不链接原通道。依赖可以复用。通用数据缓存可以复制，角色经验不能搬用。

学习者渲染模板时从 `LEARNER_BASE_REF` 和 `STS2_LIVE` 取得基线及合入目录；显式冻结的 `--set base_branch/merge_dir` 优先。未设置这些变量时仍使用原模板默认值。新经验树可使用通道内 `.worktrees/exp`，但共享 Git 下分支名必须唯一，例如 `exp-regent`。新修复/策略树原有角色和批次命名继续适用。

角色知识只消费 `knowledge/characters/<角色>/`；储君没有本角色经验时从空开始。保留仓库历史不等于允许把历史中的其他角色知识提供给储君。

## 游戏身份

第二实例启动前必须有本地可核的启动命令、mod 加载和独立 userdata/settings/profile 依据。启动后核对原实例未改变，新实例是单人模式。每条通道设置：

```text
STS2_BASE_URL=<该实例真实地址>
STS2_EXPECTED_PROCESS_ID=<health 与 Windows 进程共同核实的 PID>
STS2_EXPECTED_NATIVE_PROFILE_ID=<state 实际报告的 profile>
```

设置 PID 后发现器只尝试配置的地址，不扫描其他端口。ModClient 在请求前核对健康接口；动作前再核对 profile。不匹配或缺身份就拒绝，不 POST。ops 入场、mod-state 和卡死读取使用同一身份门禁。未绑定的原通道请求流程保持兼容。

profile 编号可能在不同 userdata 根下重复，所以 PID/profile 绑定不能替代独立存档根的启动验收。原生路径、设置身份、进程启动身份和 solo 模式都必须有本机实际回执；重启第二实例后重新登记 PID，不能自动追随新进程。

进程查询和停止以实际 `/proc` 的 cwd 与脚本路径判定通道归属。`index.ts play` 必须从该通道 live/agent 启动；其他 ops/learner/刷新脚本必须属于该通道，避免原运维误判第二个控制器或按 PID 停错进程。

## 合并知识与共享代码

各通道刷新和学习合入自己的运行分支，锁与租约独立。中央集成必须使用原主通道 live 锁，先保存正在刷新的知识与并行记录，再取本角色文件的精确增量。禁止把带有旧 Silent/common 数据及记录的整个实验分支合到 main/live。不同角色目录自然分离；同角色同文件的内容冲突交回原学习者按证据整理，不能整文件 ours/theirs 覆盖。

共享机制、构建器和代码修改走原主运维串行集成与完整检查，确认无关角色等价后才同步给各通道。正式全局编号由主运维分配；通道先保留实际提交 SHA、角色经验版本和待同步状态，不生成竞争的正式编号。学习异议和阻塞沿原学习请求通知链交付，不代填后续角色 ACK。

## 验收

先跑固定数据的身份/进程/学习目标测试与沙箱检查，再由原调度器补完整宿主检查。随后核对真实第二窗口、存档/设置根、API/PID/profile、独立目录和模型 native 身份。最后读回 REGENT A0 的 run-config、本角色知识前缀、实际决策/动作和学习调度状态，才算爬塔已开始。shell space、配置、条件模拟和队友窗口都不能代替这一验收。
