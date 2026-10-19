# V6-W6：Jev 药水条目与取舍路由

记录时间：2026-10-19 18:38 +0800。会话 v6-w4w6，Codex gpt-6.1-sol。实现提交 `35ed7015e`，最终测试基线 main `877be78dc`（已包含 W4 与 W8）。

## 交付与适用边界

- 新增 `v6-potion-entry-v1`：ID/类别、大脑档位/目标/理由、角色自身 potion-equivalents 的持有血量价值及样本/进阶来源、药槽占用、价格/买后金币、逐槽价值和档位比较、当前 Boss/连战的投影可信度，以及仅 applies_to=potion 的适用小脑记忆。商店价格由调用方显式传入，本包不接商店路由。
- 仅 `V6_BUILD=on` 且 `V6_POTION_DECIDER=jev` 生效。默认、off、shadow、SHOP、战斗保持旧路由。角色目录和 potion-equivalents 的 realpath 都受角色边界校验；缺文件/缺测量/冲突可信度保留 null 或 unknown，不借用其他角色或 pending。小脑记忆还要求 V6_REFLEX=on、角色/进阶/方向及 predicate 实际匹配；缺失 predicate 输入不当 true。
- 事件/休息点大脑题只选原选项；独立 Jev choice 决定是否先腾药槽，再沿用 potion-discard.ts 逐槽 noul。忽略大脑原 discard 列表，逐槽执行继续保留原药水身份检查和后续事件/休息点选择。随机新药水身份未知，不编造其持有价值。
- 地图保留原路线题，由独立 Jev 问每个候选起点的保留/丢弃/饮用方案；大脑答案不再决定药水 slot。已有纯 Jev 雕像后续题不升级回大脑。战斗用药、奖励界面空槽代码直接领取不变，商店药水留 W7。
- 新的兜底排序：获取排除 avoid 后按 must/prefer/normal、再按持有价值；丢弃优先 avoid、再低档位和低持有价值；同档未知排在已测值之后，未知不当零。已经选定腾槽但 slot 答案缺失/越界/类型错误时按该排序丢弃；条件 choice 本身无效、未回答或超时则保留现有药水，因为随机新药身份未观察。
- 整个药水 Jev 尝试（含 SDK 重试）受 V6_JEV_MS 默认 1000ms 和父预算共同约束，不追加普通题的重试。记录完整题/答及 token、耗时、fallback，并以 W1 V6BuildLog 追加药水审计关联。W1 的 entries 仍仅承载 ProjectionEntry，不把新药水格式塞入旧字段。
- choice 的合法选项与有限 0–1 confidence、noul 的有限 0–1 数值逐题校验。原始答案保留审计，只有有效答案进入实际 resolve；无效 choice 不因具备字符串选项而执行丢弃。旧 DISCARD_ANSWER_NOTE 常量及其唯一文本定义继续复用，原静态回归测试不改。
- 与 W4 的最小接线：有效投影按当前 boss_id 与 joint 读取活跃方向的可信度，缺任一方向或标签冲突保持 unknown；药水连续兜底按 run_id 计数，成功清零，新局不继承；W4 检测 T6 时读取该计数。

## 冻结题真实请求

原固定场景为 agent/tests/logged-states/batch-g/zgz0-f11-rest-mailbox.json，构建出的独立药水题包含 potion_o0、discard_p1、discard_p2。未启动游戏或执行答案，未写正式或 pending 知识。verify-frozen.mts 仅允许一次 request-once，SDK maxRetries=0；freeze 禁止覆盖已发请求，后续 readback 不访问网络。

冻结 wire SHA256：`4e01ca1a6e3acfdf8e2ee4adf662e3299c3d12c02fe8e4faef5acba8fd7d3b5b`，4884 bytes。Nova `/api/alpha/decisions` 实际 selector `typesafe/jev-1.14`，HTTP 200，输入 1794 tokens、输出 79 tokens，全部答案结构有效，requestId 未返回。最终实现重建请求与已发 wire 精确一致，读回网络请求数 0。

**延迟限制**：该唯一真实请求为 1486ms，未达到生产 1000ms 预算。格式验收脚本单独使用 60000ms 传输超时，不能据此声明生产延迟达标；实际生产路由仍执行 1000ms 整体预算，超时进入已测试的保守兜底。本次不调大预算、不重发请求，也不据一次格式题声称策略有效或自然采用。

## 检查及剩余集成

定向检查曾以 2 文件、38 项通过（含原 batch-i 回归），随后将关闭等价范围扩为 ironclad/silent/defect/necrobinder/regent 五角色，最终以完整测试验证。覆盖角色隔离/符号链接、记忆 predicate、可信度缺失、档位优先与 avoid、预算/无效 slot/越界 confidence、事件多次丢弃后续、路线与药水分离、循环调用及 T6 读回。五角色事件/休息点/地图关闭开关题面与动作逐字节相等；W0 三角色冻结基准未改。

早期变基重复导入导致的定向失败、随后 target_id 固定样本断言失败均保留原日志；已分别修正重复导入与固定样本使用实际 boss_id，未改投影模拟或降低断言要求。第一次全量检查发现旧常量引用静态回归失败；期间修改了源码和测试，造成同次进程旧模块缓存与新测试混用的另外两项失败（新增校验导出缺失及 invalid 答案执行路径），该混合版本运行不作为最终验收，原日志为 vitest-intermediate-failure.log。修复后独立定向 38 项通过。第二次全量为补齐五角色覆盖而用核实过的 Vitest PID 发 SIGINT 结束，保留 vitest-cancelled-for-role-coverage.log；终止后才修改测试，最终全量期间不再改源码或测试。最终结果见文末。

W3 生产提供方尚未交付，本包可信度与 W4 接线使用 W1 固定数据；待 W3 合入后核对实际 target_id、活跃方向及缺测标签，并补真实提供方的集成测试。历史药水换算本身的估计/进阶外推不在本包重新校准。正式药水小脑记忆发布、live 消费及收益另由原学习/运维流程验收。

只合 main、开关默认关闭，不分配行为发布号。没有修改 sim/、reflex/jev/、eye/jev-prompt-log.ts 或 W1 格式；未开局、改 STOP、恢复 Regent、写知识、派学习批次、改共享配置。W4/W6 对铁甲及其他角色在关闭时等价；显式启用后的新路由属于本次授权。live 不存在，保留工作树待原调度器验收，不伪造 main/live 双落地回收回执。

18:31 的稳定源码全量已通过：566 文件、5435 项通过、2 跳过，306.31 秒，tsc 退出 0；原日志见 vitest-before-doc-rebase.log。随后按最新设计文档变基到 877be78dc，源码没有额外改动，最终检查结果另附。W4 的多组合核心构筑卡调整单独实现，本包药水格式与路由不受影响。

最终验收（变基后，源码 35ed7015e）：`npx tsc -p tsconfig.json --noEmit` 退出 0；`npx vitest run --maxWorkers=4` 全量 566 文件、5435 通过、2 跳过，342.82 秒。代码范围 877be78dc..HEAD 的 gitleaks 退出 0；材料暂存扫描结果见 gitleaks-materials.log。源码和测试在本次全量期间保持固定。
