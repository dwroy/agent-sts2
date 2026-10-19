# W5 生产提供器接入合同

当前只接消费边界，未实现 W3 负责的历史包加载器；所有开关默认 off。

```ts
const runtime = new V6ProjectionRuntime(engine, async (env, phase) => {
  // The W3 loader builds a fresh formal request from frozen, role-scoped evidence.
  return provider.request(env, phase);
});
await runLoop({ ...options, v6Projection: runtime });
```

以上 provider 为待接入组件，不是本包已经提供的实现。`engine` 可使用正式 `V6ProjectionEngine`；request 可返回 null，消费端保持 unknown。

1. 奖励 baseline ID 必须为 `skip`，每张候选牌 option ID 必须为 `card${reward.card_options[i].index}`（缺 index 时用数组索引），对应 actual choose_reward_card 的 option_index；不得重编号到 0/1/2 后直接投喂 W5。只应提供当前合法奖励动作。
2. 方向、组合 ID/source 与本角色 build-core-v1 或 construction 过渡适配器相同；临时组合按 W3 的 `<direction>:brain`。请求的 weights/idealOverrides 每次从当前 env.screenMemory.runPlan.v6 读取；存下新大脑答案后会立即重算奖励 pick 表，不能复用旧概率/旧临时组合。
3. 使用正式 targets（含 f48→f49 次序）、当前角色/进阶、完整资源、seed/modelVersion/contextDigest、冻结历史签名、实际路线进场 HP。缺来源不伪造数字；历史包只在局间生成、开局只读加载。上下文签名必须隔离本局、角色/进阶、权重、资源、临时组合与证据版本。
4. `phase=act` 用幕初计算预算，pick 用独立默认 5000ms；Jev 使用独立最多 5000ms。等待预计算会将 pick_ms 限制为当前空闲窗口；不触发游戏动作。off/战斗不读 request、不调用 engine。
5. W4 读取 `directionEvaluationFromProjection(table, config, "skip", plan, extra)`；extra 保留既有路线投影的 bossEntryHp/hazardHp、acquiredComponentIds、pivotMatched 注入入口。可通过原 `LoopOptions.v6DirectionEvaluation` 提供完整补充评估；该回调在正式表消费之后调用，应保留其 entries/targets。
6. 当前 act_evaluations 的跨方向 joint_paired_delta 可读；pick 缺少该字段时 T3、增量 T2 保持 unknown。待 watcher 提供正式字段后补消费和集成测试，不从边际胜率 SE 合成配对 SE。

W5 题面在 ProjectionEntry 之外按正式 `table.combinations` 的 option/direction/combo/target 四项身份消费 `role`、`role_labels`、`formation_se/n` 与 `unknown_reasons`；模型限制 `model_labels` 共享去重。无正式组合行时不制造该信息，已有 unknown 条目保持不变。

W1.2 合并统计以 main f7580b3f5 的 `buildMetricSchema` 为准：每个组合保留 first / including_sl 两项，不按来源版本/进阶筛选，不合并两个分母；target_ascension 明示校正目标。短题面保留 sources 的版本、进阶和计数、raw_counts、测量 value/SE/n/unit/method/unknown_reason、小样本标签及模拟/回归/收缩摘要；来源 run_ids 留在完整 ProjectionEntry 日志。无指标的过渡或 brain 组合保持未知，不向 W1 共用 schema 增补消费端字段。

W7 可复用 `withConstructionJevBudget(stage, work)` 获得构筑独立窗口；本包未迁移商店、删牌、升级或休息选择。
