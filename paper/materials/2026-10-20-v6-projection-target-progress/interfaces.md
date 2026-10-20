# W3 查表构筑评估接口

`agent/src/sim/v6-request-factory.ts` 的 `createV6ProjectionFactory(snapshot).create(situation)` 继续返回同一 `V6ProjectionRequest`，不改 W5/W7 屏幕路由。工厂只读开局历史包；可选 `data.appearance` 交 `v6FormationTableSource`，缺字段保持 unknown。表的 canonical 格式与生成器由 v6-w8 的 `agent/src/v6/appearance.ts` 负责；W3 仅用结构子集，不另定义发布格式。

`agent/src/sim/v6-formation-table.ts` 新增 `V6FormationTable`、`v6FormationTableSource`：提供方 kind=`historical_appearance_lookup_v1`，生成 P、统一凑齐牌组和原因。`V6CompletionSource.rank` 为可选廉价排名接口，用 P 排序后应用组合上限。供给 MC 的旧实现可保留供历史工具使用，生产工厂不再调用，W₀ 不再求值。

`V6ProjectionEngine.evaluate(request)` 仍输出 `v6-projection-table-v1`：

- `combinations[].completed_win` / `completed_joint_win` 是 Wₖ；`general_win` / `general_joint_win` 为 null，`general_source="not_computed"`。
- `combinations[].entry.availability` 是对应拿牌与 skip 的 P；`formula="formation_times_completed"` 时 `entry.win` / `joint_win` 是 P×W。`entry.combo_id` 标识组合。
- `entries` 是各选项×方向×目标的已完成组合中最大 P×W。新增可选 `combination_coverage` 含 selected/evaluated/catalog/pending；`selection="computed_subset_maximum"` 明确还有未算竞争组合，全部覆盖才是 `catalog_maximum`。没有已完成组合保持 unknown。
- `act_evaluations` 继续输出幕初逐组合、逐目标评估与同种子配对。幕初每方向前两个组合完整评估，拿牌每方向最多四个。
- `pick_direction_comparisons` 保留相对大脑最高概率方向的连战同种子差与标准误；缺方向或未观测目标质量不归一、不补零。
- `telemetry.timings_ms` 为 formation_lookup/preparation/completed_single/completed_relay/aggregation_pairing，supply_mc=0、incomplete_case=0；`pending_work` 区分可继续补样本与结构性未知。

引擎缓存按实际模拟输入和种子索引复用，逐目标完成即出值，不再要求其他目标全部完成。`V6IdlePrecomputer` 可在已有空闲边界继续有界片段；不建立新轮询或后台模型。开关 off 仍直接返回既有空结果，不读表、不准备或模拟。旧 projection-entry 格式字段可继续读取，新 formula 和 coverage 均为追加可选字段。

目标和进场血量仍由 `v6ProjectionTargets`、`v6EntryHp` 与工厂统一生成。本幕仅实际已知 Boss；后续幕仍用同角色、同进阶的历史候选及连战联合频率。路线为空允许精确层历史血量中位数回退；明确路线构筑评估失败或资源变化缺模型继续 unknown。
