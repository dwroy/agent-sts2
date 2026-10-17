# H2 自然验收口径（首个合格局启动前冻结）

父请求 `roy-20261017-human-pace`；原 watcher/codex1。只读分析，无新模型或模拟。

- 准入：原 run-config 为 Silent/F1/非 restart，代码是 `3910f41b9c3784a70362f63aad5f0994794c68b7` 的祖先后继，H2 明确 shadow、Boss 预算 60000；完整原终局。额外启动分段单列，不作完整自然局。正常知识刷新 dirty 单列，不能由六/十二叶相同推出整个运行树干净。逐局保留后继发布差异。
- 单位：每个实际 `reward/card` 决策 ID，不用层号或粗 fingerprint 去重。同层不同候选可有两题。每题按 card0/card1/…/skip 比较，附原牌 ID；缺 sidecar/实际动作或执行失败单列。原始 `actual_decider` 为 code-fallback 的题不冒充成功大脑判断。
- Jev：主一致率只计没有 fallback 的真实成功回答与可核大脑实际选择；超时/报错后模块兜底单列，也另报 shadow 最终记录答案与实际动作的一致率。三个两两一致率都给分子、分母，不把未知当不一致或跳过。
- 拿/跳过：主表按大脑实际动作分组；另给 Jev take/skip × 大脑 take/skip 混淆表，具体牌不同仍是不一致。take 必须同一 card key 才算一致。
- 难度以 **用于模块胜率排序的完整比较** 为三分层：若所有选项的加权 Act2 胜率差或误差缺失、模块明确 fallback，则为“比较 unknown”；否则最高均值比所有其他选项均高出 `2 × (SE最高 + SE对手)` 才叫“领先明显”，其余“接近”。这里误差采用保守相关上界，仅 MC 误差，不代表模型准确或核心合格。2 沿现有 BOSS_LINES_TIE_SE，不新设游戏阈值。
- 同时逐项报告更广事实 unknown（S、第三幕目标、下一个 Boss、核心/支撑、资源、计划覆盖）；即使胜率比较完整，也不能称题目所有事实已知。若所有题因既定支撑/第三幕未知而含 unknown，如实报告，不用另一个口径隐藏。
- 分歧后果：从同局真实 SL/Boss 原记录列下一个 Boss 的首试与最终结果，未到达/未记录为 unknown；多题可共享一个结果。不能当每题独立整战样本，不能断言换选会赢。
- 叫醒：逐题列任一选项 possible_direction_change=true 或 uncovered_by_plan=true，按触发项及实际所选项分别统计。null 保留未知，不能当 false；shadow 不代表真的叫醒或执行转向。
- 方向覆盖按“当前所在幕”和“目标 Boss 所在幕”分别列当前计算的 computed/partial/unknown、数值有无；不能用 stale previous 充覆盖。目标重复方向 variant 与独立 Boss 题分开，最终联合对象始终单列。持有组件、实际施放、存活和整局结果分开，不把 inventory 满足当核心合格。
- 整幕计划：对原 run-plans 的已接受 plan 更新与 H2 act_plan 投影逐一匹配。报告日志覆盖、字段结构完整率及有效内容率；允许 uncommitted，但单列没有方向/缺 checkpoint 或 pivot_if。未产计划的幕单列，不能靠多个同幕日志充各幕覆盖。
- 耗时：各模块 time_budget.actual_ms 与 Jev latency_ms 分别给 p50/p90/max/sum；每局只加方向、卡事实、Jev 各一次，不叠加其内部 stages。该和是已记录增量墙钟，未采集的读数据/写日志/调度额外成本保持 unknown，也不是因果净慢多少。超预算以各自声明 budget 和 timed_out 双列。
- 成本：成功返回的 meta tokens 与真实 request_id；失败调用的未知 token 不填0。若无真实计费凭据，按冻结本地价格表算估计并明确不等于账单；缺价格则 unknown。
- R385：Boss 首试 B2 单列，与 SL10秒分开；候选样本数、完成状态、deadline partial、低可信 cap、memo 重用分别统计。对比 H1 的25MF/2PQK两个30秒完整局，并保留同时间的 R384/H0/H2/知识差，非随机因果实验。
- 推荐：仅提出题型与证据缺口，不启用 Jev、不改题面/排序/SL/药水或其他阶段。

复现：局末监听退出后以 `nice -n 19 python3 freeze-inputs.py` 冻结一次；再运行同目录分析/校验脚本。每项不超过4进程，本任务默认单Python进程。
