# V6-W3 路线入口与冻结路线回放

运行时新增 `projectV6RouteEntries(config, input)` 与 `V6TargetContext.routeEntries`。复用已有 route-projection/projectPath 和调用方本角色、本进阶房间代价；不新增游戏数值。显式提供后，目标入口优先使用该表，scope 不符、同目标重复、显式 unknown 或未来最大 HP 无法建模都保持未知，不能退回历史中位数填满。

`bossExit` 是可选的同一样本 Boss 模拟边界；未提供时跨 Boss 之后未知。不会假设跨幕回血，也不拿该局后来的实战血量填预测。入口为 0 保持死亡；off 不访问输入或执行回调。未给显式表时保留原有历史首试入口估计及来源标签。

离线入口：`agent/tools/v6/freeze-route-inputs.ts --manifest INPUTS.json --out NEW_INDEX.json` 只扫描冻结 jev-prompts 字节上限，保存原文 offset/bytes/SHA 引用；`replay.ts --route-inputs INDEX` 仅在 run/floor/observed_ts/状态 fingerprint 与题面 run_brief 全匹配时读取当时已展示的 route_review.plan_facts.boss。显示值带取整/历史模型标签；字段缺失、冲突、最大 HP 变化继续 unknown。读取原文再次逐条核 SHA。

实际冻结边界：1,810,708,841 字节，只找到 1 条含路线入口事实的题面，0 条解析坏行；该记录是事件题，不能宣称历史拿牌未知率因此下降。原文引用 offset 1652949424、bytes 11186，run Q9KFP3J3JNU5、floor 39、observed_ts 2026-10-18T01:44:14.988Z。真实回放统计另记，不以合成样例冒充实际覆盖。

6 个固定测试覆盖显式路线、跨 Boss、死亡、未来最大 HP/scope/重复错误、原文 SHA/时间/指纹与冲突。现有 v6-start 固定测试也通过。最终联合检查另记。

## 真实离线回放

同一冻结 372 局输入下取 6 道拿牌题和同一局 F17/F33 两个检查点，单 worker、nice10；运行机器同时有校准与全检，耗时只代表本次负载。详细输入哈希、逐题统计及实际结局在 `replay-summary.json`；摘要 SHA 和原输出路径在 `replay-receipt.json`。

拿牌冷算 p50 4509ms / p95 4667ms，重复 p50 3852ms / p95 4769ms；两次降级均为 4/6，缓存命中均为 0，条目 unknown 均为 100%。幕初冷算两个样本为 9679ms 和 34685ms，重复为 9013ms 和 32717ms；均降级、unknown、无缓存命中。幕初实际耗时超过 30s 软预算，单次在途批次未被硬中止；不能宣称硬截止。

两处检查点属于 MEQ6ETDCEEE9；first_stop 为 F33 predicted_death，并非已证实实际死亡；未观察到其 F48/F49 首试，包含 SL 的最终也未通关。这是描述性记录，不作为准确率。高 unknown 仍来自凑齐低概率/不可估、连续 Boss 缺配对观测及预算降级；过渡 construction 签名不能充当经学习证据确认的最小组合。等待核心卡 R2 与调用方接入，不额外派发任务或补写知识。

真实路线原文索引及 SHA 见 `route-inputs.json`；冻结帧中该层仅 2 帧、没有原题 observed_ts 的精确帧，故 `route-actual-probe.json` 明确 no_exact_frame。合成固定测试通过不等于实际历史覆盖提高。

## 联合验收

联合树基线 f7580b3f5，tsc与完整vitest通过；精确agent树 5e8b261e816a4b92cbf63f275d2473d0a3e749a2，完整统计见runtime报告。功能代码SHA与联合受测树一致；默认off且既有等价测试通过，gitleaks暂存0发现。
