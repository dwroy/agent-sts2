# V6 开场未知题面合同（2026-10-20）

- 共用入口：`agent/src/v6/prompt-summary.ts` 的 `compactProjection(entry, reasons?)`。仅作题面视图；不改 `projection-entry-v1`、数值、组合或原始审计记录。
- 每行新增 `opening: { Wk, W0 }`，对应 `win_complete`、`win_incomplete`。估计对象存在（包括 value=0）显示 `evaluated`；否则显示字面量 `opening unknown`。这表示估计未得或未报告，不自行断定构造失败；P=1 时未用到的 W0 仍为 null。
- 非空 `reasons` 原样复制为 `unknown_reasons`。缺诊断时不编原因；`budget_remaining_unknown` 不等价于缺升级模型。
- 大脑桥接：`directionEvaluationFromProjection` 从 baseline 的 `table.combinations[].unknown_reasons` 生成可选 `DirectionEvaluation.projectionReasons`；键为 option_id/direction_id/target_id/combo_id。`ensureDirectionPlan` → `directionTask` 原样传给共用视图。诊断仅显示，不进入 T2 评价摘要或改变 T1–T7。
- 拿牌、商店、休息逐行复用共用视图；选药复用 `boundedV6Jev` 的全局 `opening_note`（选药条目无独立 Wk/W0，不编造逐槽模拟）。
- `boundV6State`/`boundedV6Jev` 保留 `opening_note`：Wk/W0 分支含义、不把未知当 0、失败样本不排除、Wk 不代 W0、延长预算不能补模型。原 V6 64000 字符、Jev state 16000B/总请求 24000B 上限和确定性裁剪保持。
- 提供方未报告开场原因时只能展示未知；当前 main 的 prepare 错误仍需 watcher 在 W3 内完整传播。本补丁不改 sim/、构造守卫、知识文件或模型。
