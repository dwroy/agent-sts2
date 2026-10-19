# W6 构筑 Jev 独立 5000ms 预算

2026-10-19，v6-w4w6，Codex gpt-6.1-sol xhigh。按 Roy/Claude 本次追加指示，选药和拿牌 Jev 最多 5000ms，与计算 5000ms 分开；战斗原预算不变。

`V6_BUILD=on|shadow` 时 `V6_JEV_MS` 默认及上限均为 5000ms，允许显式缩短；off 保留原默认 1000ms 与原合法配置范围，避免关闭时配置记录变化。计算预算由 watcher 的 e3aec6e85 独立修正，本包没有修改 sim/。

`withConstructionJevBudget(stage, work, scope)` 暂停父计时，创建无预留的独立子预算，整个 Jev 尝试（含 SDK 重试）共用同一硬超时；结束后记录 L2 或 shadow 独立耗时并恢复原父时钟。W6 保留 `withPotionJevBudget` 入口供现有选药路径调用，W5 复用相同构筑预算。计算已耗尽时，地图雕像选药也能进入独立 Jev 窗口，避免旧 generic fallback 抢先兜底。

固定测试验证默认和显式配置、超过 5000ms 的无效配置、父计算已用完 5000ms 后 Jev 仍有完整 5000ms、实际子计时独立记账，以及 off 配置对象保持相同。既有五角色关闭题面/行为等价、逐槽 noul、avoid 兜底、事件/休息点路由与真实循环测试继续运行；奖励有空槽直接领取、商店和战斗用药不改。

变基前的定向检查为主代码 tsc 退出 0、37 项测试通过。已变基到 main f14238bf7；最终主代码 tsc 退出 0，完整 Vitest 577 文件、5539 项通过、2 项原有跳过，耗时 421.24s（maxWorkers=4）。检查原件另存 budget-5000-final/，完整检查期间源码保持固定；无真实 API 或游戏动作。最终合 main 后仍不代表 live 发布，STOP 保留，工作树因 main/live 双发布回收前提未满足而保留。
