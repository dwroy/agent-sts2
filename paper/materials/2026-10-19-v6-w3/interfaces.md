# V6-W3 接口与集成边界

本包增加 `agent/src/sim/v6-*`、离线工具与固定数据测试，W1 格式仅修正 P=1 时对零权重条件估计的要求，不接管实际决策。所有入口接受 W1 的 `V6Config`；`mode=off` 时不解析提供器、不准备战斗、不模拟、不创建日志。未修改游戏知识、题型、触发、药水路由或 Jev/小脑模块。真实模型调用继续受 Nova 接入要求约束；本包没有在线调用。

## 输入与来源

- `v6Directions(character, ascension, templates, support, cores)`：优先读取本角色、本进阶 `build-core-v1`；缺失的方向按 `construction-templates` 要求签名生成 `<direction>:minimal`，和 W4 的过渡 ID 一致。不跨角色回退。卡池角色来自原卡池/support，组合指标缺失保持 null。
- `V6CompletionSource`：`kind`、冻结 `signature` 与同步 `resolve(context)`。可插拔，按调用方顺序取第一个非 null 结果。生产提供器为 `v6SupplySource`，其内部将 `idealOverrides` 加为 `<direction>:brain` 临时组合，正式组合随后、过渡签名最后；逐条标 `brain` / `build_core` / `construction_adapter`。
- `v6SupplySource` 只接收本角色、本进阶且排除本局的数据：路线及一般补牌取题前已结束的局，供给机会取题前可见的记录。默认 200 个共同供给世界，奖励最多拿一张、商店扣实际价格和历史净正金币增长、休息点每次最多升级一张。W0 为同层段实际加牌/升级/删除样本，分摊同种子战斗样本。匹配使用容量约束，实体牌不能重复抵多个要求；未知和 0 不混用。
- `v6History` 将冻结 coverage、逐层帧、Boss 战与机会转换为上述输入；首试按首个 predicted_death/死亡截断，SL 回退后的帧不纳入；没有首帧/移除目标/升级目标的缺口写限制，不以最终牌组倒填。
- `v6ProjectionTargets` 输出本幕、后续候选和 F48→F49 有序连战，候选频率只取本角色本进阶。目标 ID 为 `f17:<boss>`、`f33:<boss>`、`f48:<boss>`、`f48:<first>:then:f49:<second>`。当前 Boss HP 来自调用方的既有路线投影；远期用本角色本进阶首试历史进场 HP 比例中位数。缺本幕路线 HP 时返回未知，不用当前 HP 冒充预测。
- `v6ProjectionStart` 保留当前遗物、药水、资源和已有牌对象计数器，只补缺牌/升级；复用 synthetic Boss start 和现有连战开局。F49 沿接力传递 HP、药水和复活状态。模型不完整、血量来源、未来遗物/药水未预测都保留标签。

## 投影输出

`new V6ProjectionEngine(runner).evaluate(request)` 返回 `v6-projection-table-v1`；`runner` 是已有 `DeckSimRunner`（可用 `BuildSimPool`）。调用方必须提供 `contextDigest` 和 `modelVersion`，覆盖当前资源、路线、当前局、冻结历史及 trust 版本。拿牌 20、幕初 100 个配对种子，实际样本 ID 在输出中可核查。

| 字段 | 合同 |
|---|---|
| `combinations[]` | 选项×组合×目标的 `projection-entry-v1` 包装；含 `combination_id`、补齐来源、P、Wk、W0、组合期望、供给标准误、指标与角色、逐样本 ID、部分模型/未知标签 |
| `entries[]` | 选项×方向×目标的最大组合结果；若某候选组合未知，最大值也未知，不能把已知子集下界冒充最大值 |
| `weighted[]` | 按大脑概率加权后的 Boss/连战期望和配对差；缺方向质量不重归一化，提供 `known_weight` 和显式限制 |
| `target_mixtures[]` | 本幕门槛与连战通关估计，按遇敌频率混合，不把各 Boss 胜率相乘；缺失目标质量不重归一化 |
| `act_evaluations[]` | 全方向×全部组合×目标，含 availability、win、joint_win、可信度/档位，以及对其他组合的同种子配对差，供 W4 幕初题面消费 |
| `rankings` | 各方向按本次连战期望（缺连战时单 Boss）排序的组合 ID；拿牌时交回 request.rankings，最多计算四个组合；幕初不裁剪 |
| `telemetry` | 实际耗时、缓存 hit/miss、模拟数、超时、按序降级、未知比例和幕初表缓存命中 |

`v6ProjectionEntries(table, config, optionId?)` 是供 W4/W5 的严格格式桥接入口，返回真正的逐组合 `ProjectionEntry[]`，不将方向聚合值复制给所有组合。字段含 `combo_id`、`combo_source`、`win_complete`、`win_incomplete`、`incomplete_source`、`expected_win`、`direction_value` 和 `combo_metrics`。连战行的 `win`/配对差/Wk/W0/档位映射为 joint 口径，包装原件同时保留首战与 joint。

`expected_win` 只要求非零权重项的条件估计：P=1 时不运行无用的 W0，`expected_win=win=W_k`；0<P<1 时 W_k、W_0 均须有值，否则保持未知。W4 的 `directionTask` 读取此组合期望，无须将缺失 W0 补零。

W4 的现有占位目标名与本包含层数、有序第二 Boss 的目标 ID 不相同。W5 集成时应传入上述 targets / 幕初表并显式映射；本包不改 W4 题面、触发或消费者。固定集成测试直接调用 W4 `directionTask`，确认 `<direction>:minimal` 行按组合匹配且严格格式通过，包括 P=1 边界。

## 缓存、日志和预计算

`precompute(request)` 计算 skip 基准；移动/动画/过场调度由 W5 接入，W3 不改游戏循环。战斗缓存包括实际补齐牌组、完整准备输入、资源、目标、样本/种子和模型/上下文签名；排除选项名/P/组合名，使组合内相同凑齐后牌组可共享结果。超时/不完整结果不缓存为完整结果。供给缓存独立且只缓存 P 全部已知的结果。幕初表只缓存无超时且全已知的表。

`v6ProjectionLog(config, table, context, logger)` 通过 W1 `V6BuildLog` 写逐组合条目和 telemetry；off 时不创建文件，离线验收日志位于工作树 `.artifacts`。现有 `logs/v6-build.jsonl` 骨架保持兼容。

供给统计和战斗模型的误差没有混为一项：配对差包含共同供给世界协方差，目标混合的标准误使用跨目标相关性上界；历史频率估计误差、选择偏差、模型误差不在置信区间内，均写限制。核心牌首次出牌回合只统计模拟中实际观察到的首次使用，未打出的牌被截尾，不解释为完整启动时间。
