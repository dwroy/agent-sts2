# V6 开场未知题面修复（2026-10-20）

题面把已知 Wk 与未知 W0 分开显示为 `evaluated` / `opening unknown`，透传已有提供方原因；不将未知当 0，不用 Wk 填 W0，不删失败样本。大脑幕初/重规划、Jev 拿牌/商店/休息使用同一逐行函数，选药也保留共用未知说明。开关关闭时的路径未改，固定回归检查全部角色原字节等价。

诊断来源为 watcher 原离线核验，不是本次学习结论：冻结 F48 的 33 个选项×组合行重复使用同一组 20 个样本；Wk 660/660 可构造，W0 330/660 无法构造。这些不是 660 个独立对局。缺升级模型为 AFTERIMAGE、MALAISE、CALCULATED_GAMBLE、MIRAGE、INFINITE_BLADES、SPEEDSTER；`agent/src/sim/v6-start.ts:37` 的守卫保留。供给可找到 17/17 正式组合牌，旧 1/17 指标包不能解释全部 unknown；SURVIVOR 是已持起始牌，缺前提遗物 P=0 属提供方口径。本补丁不写这些游戏知识或模拟数值。

原件只读：`.artifacts/v6-projection-opening-guard-20261020/summary.json`，已逐字复制为本目录 `opening-guard-summary.json`；完整诊断在 `.worktrees/v6-projection-coverage-cache-20261020/.artifacts/coverage-bench/opening-guard-diagnostic.json`，SHA256 为 `6e18677c358e3762599bd7e9b76018239cdfb0cf0d2edde2c07141f7b5dbdc5b`。

当前 main 尚未将 prepare 的完整失败原因放入 unknown_reasons；因此题面不能声称某条实际行必由某张缺模型牌引起。提供方—消费方测试用真实固定引擎制造 W0 prepare=null，并显式注入固定诊断以检查消费合同；测试注明这个注入，不冒充 main 已修提供方。watcher 的入口 HP 中位数回退、缓存、MC 断点复用和原因传播在独立树，尚待正式合入。预算延长不能消除确定的开场模型缺口；冷/热 5 秒及幕初 60 秒尚无完整期望值，不称策略质量通过。

验证：固定 7 文件 113 项通过，完整 tsc/vitest 与扫描见 `checks.json`（结束后归档）。首轮新增 runtime 测试因固定输入 win=null 却沿用旧 win_tier 被现有校验拒绝，改为合法 unknown 后通过，未放松校验。最初本地预检另有工作目录和不支持的 CLI 参数错误，没有修改源码或运行测试；原工具回执保留。本轮不重试模型、不执行对局、不派学习、不改 live，不处理 STOP 或旧 MWMR855QHTWR 故障。

后续由 Claude 决定六项模型的学习证据安排；ops 按既有主通道同步候选，再按 Claude 的恢复验收安排执行。本次题面修复不能替代模型补证或恢复验收。

完整检查（2026-10-20 04:00:23 CST）：tsc0，vitest 591 文件/5666 通过/2 原跳过；2109 个受测输入全程 SHA256 不变。期间 main 合入 watcher 历史边界代码；此提交先保留原受测基线，变基后的最终联合检查随共用选项最小摘要补丁在独立功能树执行，不把旧基线全检冒充最新联合检查。

2026-10-20 04:19:01 CST：归档输入清单改为逐项 path/sha256 字段，全部内容哈希保持原值；原始对象清单保留在本工作树 .artifacts/opening-unknown/checks/inputs.json。此表示调整用于消除文件名含 key 与 SHA256 同行触发的 gitleaks 通用密钥误报，未添加排除规则。
