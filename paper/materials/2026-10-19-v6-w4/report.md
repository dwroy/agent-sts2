# V6-W4：方向题面与重规划触发

记录时间：2026-10-19 18:17 +0800。会话 v6-w4w6，Codex gpt-6.1-sol。实现提交 `3a6f5eadf`，最终测试基线 main `51ba92470`。

## 交付

- 幕初及重规划改用 W1 `direction-weights-v1`：必须覆盖当前角色、进阶的全部方向，权重和为 1；允许目录或本局已出现卡牌的 ideal_overrides，校验 potion_directions、合法路线、休息选项及未来复查层。答案规范只做分支追加，旧规范保持不变。
- 题面含 `projection-entry-v1` 方向评估表、补齐可得率和方向摘要。正式方向卡按角色/进阶读取；过渡适配器只读原 construction 模板及 support，ideal 保留 null，不生成、提升或发布知识。缺投影保留 null/unknown 并记录降级，不用 take-skip 配对冒充方向间比较。
- T1–T7 按计划配置检测。T2 使用方向相对领先方向的独立配对均值/标准误，要求有效样本和连续两次新评估；T3 共享显著性门槛。T4 消费新遗物与已有组件要求或提供方 pivot 信号；T5 只比较提供方给出的入 Boss 血量和危险阈值。T6 使用未知占比或连续 Jev 兜底；T7 使用已校验复查层。
- 同一 run/幕/层/回合合并触发；请求前持久化预约，失败也计数，重启读回预约与状态，防止轮询重复发题。每局非战斗大脑调用软上限 15，超过后仅保留幕初、T5、T7 的重规划。普通非战斗大脑题亦登记调用量；软上限不撤销业务题本身。
- `V6_BUILD=on` 且存在当前角色方向才启用规划。shadow 仅记录，不请求或安装答案。`V6_CARD_DECIDER=jev` 在 on 模式路由掉逐题拿牌的大脑入口及升级路径；Jev 拿牌条目留给 W5。默认关闭。

## W3 接口及待验收

`LoopOptions.v6DirectionEvaluation(env)` 接收异步提供方，向 DecisionEnv 注入 DirectionEvaluation。必要字段是 id 与 entries；可选 comparisons（direction、leader、mean、se、n、offeredCore）、coreCompletion、acquiredComponentIds、pivotMatched、bossEntryHp、hazardHp、consecutiveJevFallbacks。entries 必须通过 W1 校验，缺失方向/目标补 unknown。数据类型及注释见 agent/src/v6/replan-triggers.ts。

当前没有接入 W3 生产提供方；固定数据已覆盖题面、答案校验、触发合并/上限及重启。W3 合入后必须核对 target_id、评估 id 更新节奏、方向间配对含义、补齐可得率、危险阈值与真实读取，再补集成测试。缺失提供方时保持显式 unknown，不声明完成投影集成或收益验证。W6 后续补入本局药水连续兜底计数及投影可信度读回测试。

## 验证

- agent/：`npx tsc -p tsconfig.json --noEmit` 退出 0；`npx vitest run --maxWorkers=4` 全量 565 文件、5413 通过、2 跳过，305.75 秒。均 nice -n 10，PATH 含 ~/.local/node/bin 与 ~/.local/bin。
- W0 关闭开关冻结 SHA 测试继续锁住 ironclad、silent、regent 的配置、题面和动作；覆盖 unset/off/off+各子开关。没有修改冻结基准。
- 前次全量唯一失败为 ops Python 子进程找不到 gitleaks（PATH 漏 ~/.local/bin），原日志 vitest-path-failure.log 保留；修正运行环境后该 Python 检查 16 项通过，最终全量也通过，未改测试以避开失败。
- 源码提交范围 gitleaks 退出 0；材料完整暂存扫描另存 gitleaks-materials.log。没有修改 sim/、reflex/jev/ 或 eye/jev-prompt-log.ts。

本次仅快进 main，默认关闭；不合 live、不分配发布号。未开局、改 STOP、恢复 Regent、写游戏知识、派学习批次或改共享配置。live 工作树不存在，无法满足原回收工具 main/live 双落地条件；保留工作树及原日志交原调度器验收，不伪造回收成功。此报告不关闭 W3/W9、学习入库、live 消费或收益要求。
