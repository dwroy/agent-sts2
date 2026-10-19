# W3/B 覆盖修复接口增补（2026-10-20）

接续 `2026-10-19-v6-w3-request-factory/interfaces.md` 与 `2026-10-19-v6-w3-runtime/interfaces.md`。基于 main 31dcde919（含 8ae96db3c 摘要性能修复）的最终联合 tsc0/full0 已通过，原阈值不变；旧 e208 full1/同树定向0原件保留。main/live、17组合包与真实请求烟测以实际回执为准，不能据此恢复对局。

`createV6ProjectionFactory(snapshot).create(situation)`、`V6ProjectionRequest`、`projection-entry-v1`、幕初评估表和跨方向配对字段保持兼容。W5/W7 无需构造新请求类型；沿用本局的工厂、引擎和冻结 asOf，才能复用缓存。工厂不在局内重建历史包或读文件。

- `V6CompletionCombination.unknownReasons?: Record<string, string[]>` 为追加可选字段；原有提供方可不传。供给原因进入组合行的 `unknown_reasons`，包括 `supply_budget_exhausted`、`own_reached_target_route_missing`、`historical_supply_pool_missing`、`unforecast_prerequisite_facts`。
- 本次更新早期工厂文档的缺路线行为：不存在目标检查点的路线入口时，允许本角色、精确进阶、同检查点的首试历史 entry_hp/max_hp 比例中位数回退，标签为 `missing_route_own_checkpoint_hp_fallback`。路线表中显式 null、无效或死亡入口保持 unknown/原守卫；未提供 currentRouteHp（null）与不存在目标检查点均表示缺路线，可走历史回退。回血选项必须有实际重投影；缺失目标显式 `healing_requires_route_reprojection`，不能用历史基线假装回血效果。
- 同一供给源跨幕初、空闲与拿牌保留完成的绝对 MC 世界；未完成世界重新从该世界起点执行，不能把部分世界计作失败。默认 200 次、奖励至多一张、金币与休息升级约束不变。
- 战斗缓存以完整准备输入、最大 HP/Boss HP、角色、进阶、种子、模型及绝对样本序号为身份；换题与 100→20 场不会废弃同一场。跨请求缓存有界；淘汰不能丢失本批已完成配对样本。供给缓存和准备缓存同样有界。
- 空闲预计算继续走已有 `V6ProjectionRuntime.precompute(env, idleMs)` / `V6IdlePrecomputer`，没有定时器、新池或额外调度。前台请求与原空闲租约串行，计算预算独立于 Jev 预算。

当前离线题依然全部方向 unknown。冷/热 5 秒和幕初 60 秒结果仅见本目录测量，不能称为生产烟测通过。旧包 1/17 指标不是所有 unknown 的直接原因；缺升级模拟定义的 W0 样本保留未知，需要按既有学习闭环补证而非开发填造。17 组合新包、实际 live 请求及恢复授权仍待原流程。
