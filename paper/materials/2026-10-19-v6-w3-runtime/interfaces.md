# W3 生产接口补记（2026-10-19）

W1.2/W2.2 联合基线为 main f7580b3f5。W3 的 projection-entry-v1 仍由 `v6ProjectionEntries(table, config)` 导出；幕初评估表仍为 `table.act_evaluations`（方向/组合/目标、win/joint_win/availability/trust/tier、同种子 versus）及 `rankings`。本批只追加如下入口。

## 冻结历史

`agent/src/sim/v6-history-pack.ts` 导出严格 `v6HistoryPackSchema`、`V6HistoryPack`、`V6HistoryPayload`、`loadV6HistoryPack`。开局只读一次：

```ts
const snapshot = loadV6HistoryPack(knowledgeDir, character, config);
if (snapshot.status === "loaded") {
  const { generated_at, content_sha256, data } = snapshot.value;
  // data.character/cutoff/sources/coverage/floor_frames/histories/observations/opportunities/combo_metrics/labels
}
```

own 路径 `knowledge/characters/<character>/v6-history.json`。状态 loaded/disabled/missing/invalid；off 先返回且零 IO，缺包绝不跨角色回退。`data.observations` 可直接传给 V6TargetContext，`histories` 与 `opportunities` 可传 v6SupplySource。`combo_metrics` 为 `{id,metrics:[first,including_sl]}`，不能把一份 attempt 当另一份；缺失不补数。生产构建器 `knowledge/builders/build-v6-history.py` 在对局之间生成，更新后现有局保留旧快照。

## pick 跨方向配对

`table.pick_direction_comparisons` 每 option×direction 一项：

```ts
{ option_id, direction_id, reference_direction_id,
  targets: [{target_id, combination_id, reference_combination_id, joint_paired_delta}],
  joint_paired_delta, known_mass, labels }
// paired delta: {mean,se,n} | null
```

参考方向为最高有效大脑概率，字典序解决并列。差为候选方向减参考方向；targets 的差按同一选项、同一连战目标、同种子比较两方向最优组合；外层差按完整候选连战频率混合并保留战斗和供给世界协方差。未知质量不重新归一。off/act 数组为空。W4 T2/T3 应只消费非空差并保留 labels。

## 路线入口

`projectV6RouteEntries(config, input)` 返回 `V6RouteEntryTable|null`；传到 `V6TargetContext.routeEntries`，并将其 signature 纳入 request.contextDigest。表含 character/ascension/source_floor/source_act/max_hp/signature 和 entries `{act,floor,hp,max_hp,labels}`。显式未知阻止旧中位数回退。每个 Boss 之后必须有同样本 bossExit 模拟边界才能继续传播；不能填该局未来实际血量。未建模最大 HP 变化未知。

## 空闲预计算

`V6IdlePrecomputer(engine)` 使用同一个 V6ProjectionEngine/模拟池。调用方仅在已有空闲边界 schedule(request)，再显式 runIdle({contextDigest,isIdle,available_ms})；无新定时器。前台计算先 await acquireForeground()，然后 try/finally 调用 release。lease 等待在前台独立计算预算开始之前；活动预计算保留原有有界预算。invalidate() 清掉过期排队；最新上下文覆盖旧任务。在途旧结果标 discarded，缓存仍按完整上下文隔离。

以上是 W3 的接口交付；大脑/题型/触发/药水调用方由 W4/W5/W6 原会话接入。本批不改这些调用方文件。
