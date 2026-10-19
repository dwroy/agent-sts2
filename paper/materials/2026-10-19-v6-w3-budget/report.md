# V6-W3 独立计算预算与本轮停点

记录时间：2026-10-19 20:52 CST。基线 main `1daceab74093f9c819bdbecb0c8b7f6f478a8978`。

## 已完成的预算修正（追加项 A）

`agent/src/sim/v6-projection.ts` 的拿牌计算预算直接读取 `config.budgets.pick_ms`，不再减去 Jev 预算。沿用配置项 `V6_PICK_MS`，默认 5000ms；其中最多 500ms 留给计算结果汇总与序列化。Jev 使用自己的预算配置，由 W4/W6 会话维护。幕初预算仍读取 `V6_ACT_MS`。

固定数据测试锁定：默认计算截止点、只改变 Jev 预算时计算截止点不变、修改计算配置生效、幕初预算不变；保留软超时降级与 V6 关闭时逐字节等价测试。最终 tsc 退出 0；全量 vitest 576 文件通过、5535 项通过、2 项原有跳过，449.69 秒；源码 gitleaks 退出 0。原始日志见 `checks/`；早先取消的检查保留在工作树 `.artifacts/v6-w3-budget/check-2043/`，没有覆盖或当作代码失败。

本轮仅修正预算分配，没有再次运行历史回放。因此原 W3 报告的耗时分布仍是当时预算下的结果，不能作为本修正后的测量。

## 校准续批实际结果：未进入计算

批次 `v6-boss-calibration-resume-20261019-2022` 由原启动器按授权派出一次，在 20:31:51 退出 0；业务结果为 `blocked-host-process-visibility` / `incomplete`。实际原生回执独立核实为 codex1 学习者 home、`gpt-6.1-sol / high`，线程 `01a1541e-b402-7ad3-bdce-dad92d39ce57`。原 owner、任务关联、proposal `silent-proposal-da817af4fc7159de`、ledger `silent-0519` 不变。

学习者只完成冻结输入核验、恢复检查点和分片计划；没有启动模拟子进程，没有新增起点。现状仍为 **217/1316**（215 成功、2 显式失败），剩余 **1099**。本会话另行复核 32 份输入、722 个模型文件、检查点 SHA、剩余键唯一性及原始行号种子规则，均通过。冻结生产模型仍为 `9f4245511181c6228cf63dc44700ea28ccf35730`。

原因是学习者沙箱的 `/proc/1` 为 `codex-linux-sandbox`，无法独立检查宿主旧进程及原锁。**这不是已证实的进程冲突，也没有自动审批拒绝。** 原始 result.json 把宿主核验要求归因于 Roy；该字段是学习者的原文归因，实际要求来自本次派发说明对原续跑安全检查的继承，不构成新的 Roy 审批门槛。本会话宿主工具可见 systemd；后续可由原宿主启动器补齐新鲜进程/原锁核验及游戏恢复时的限额监测，沿同一冻结任务继续，不需改共享权限或重建模型。

尚无新的四门表、完整逐 Boss 对比或 H0 优先级；没有用时间前缀推断完整结论，没有发布 boss-trust。`calibration/` 保留学习者原件、原生回执及独立审计，比较表当前值仍显式未知。

## W1.2 已开发、尚未合入

独立树 `.worktrees/v6-w12-build-core-pooled-20261019`，精确接口见 `w12-pending-interface.md`，类型入口 `agent/src/v6/build-core.ts` 的 `buildMetricSchema` / `BuildMetric`。组合指标仅 first / including_sl 两份合并主口径；来源版本/进阶、原始独立局计数、A10 simulation/regression、direction shrinkage 可对账。组合 prerequisites 与 fits.when 复用现有 predicate 白名单，W3 按前提判断供给与模拟，未知继续保留。

`simulation.entry_hp` 已允许 null；null 时四项模拟指标必须 n=0 且未知。学习任务已写入共同入口 HP 为冻结历史最小已知 max_hp、每条 SHA 核验、保持实际牌组/遗物/max_hp、精确 A10 与截断整场未知。`agent/tests/v6-combo-metrics.test.ts` 仅修改合同 fixture 的 `scope=[10]` 与 `prerequisites:null`，留给 W8 继承。

该树 tsc 通过、7 文件 62 项定向测试通过；W8 当前冻结生成器样本的两份 metrics 通过新合同校验。main 旧生成器仍使用旧合同，故等 W8 的可集成提交后联合完整检查、原子合入，避免 main 中间失配。尚无 W1.2 合入号，不声称全量验收完成。最终未提交文件及哈希清单已封口在该树 `.artifacts/v6-w12/handoff-2052/`；正式知识未动。

## 待续与停止条件

追加项 B 的生产冻结历史包/运行时加载器尚未实现，尚无已合入的路径或接口可供 W5 使用。路线进场血量、空闲预计算与降低回放未知等 W3 余项待续。核心构筑卡第二轮等待 W8 新口径生成器完成后再由既有授权派出，本轮未派。

校准续批已经返回业务结果，按“校准有结果即停下回报”的指派，在预算修正完成合入后停止并等 Claude。建议下一步先沿原宿主启动器解决校准可见性，再联合 W1.2/W8 生成器集成，随后做生产历史包及 W3 余项；不另开学习项。

全程保留 `ops/STOP`，live 不重建，Regent 暂停；未开局、未调用游戏模型 API、未修改正式知识、未发布行为版本、未改共享配置。原学习入库父要求保持开放。
