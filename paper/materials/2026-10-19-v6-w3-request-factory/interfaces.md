# W3 共用生产请求工厂

本批接续 main 10936edd3 的冻结历史包、路线入口、跨方向配对和空闲预计算；不替换这些接口。实现位置为 `agent/src/sim/v6-request-factory.ts`。

## 开局快照

调用方在开局使用既有 `loadV6HistoryPack(knowledgeDir, character, config)`，再调用：

```ts
const factory = createV6ProjectionFactory({
  config, character, history, knowledge, templates, support, cores,
  doubleBoss, trust, modelVersion, models,
});
```

`history` 为 `V6HistoryLoad`，`templates`/`support` 是 construction 过渡目录，`cores` 是可选正式 build-core-v1 卡。缺卡时保留模板最小签名。工厂复制并校验本角色历史内容哈希，冻结配置、方向卡、目录、可信度和连战模型。历史包内的 `combo_metrics` 只覆盖开局内存中的对应组合指标，不改正式知识。`knowledge` 和 `models` 沿用调用方本局只读实例。

off 在读取历史、知识、局面或回调之前返回 disabled；缺包、异角色、哈希不符返回 unavailable，不回退其他角色。工厂不做文件 IO，也不在局内生成统计。

## 一次生产请求

```ts
const result = factory.create({
  state, phase: "pick", runId, asOf, seed,
  weights: directionProbabilities,
  options: [{ id: "take-0", changes: [
    { kind: "add", card: { id: offeredCardId, upgraded: false }, price: 0 },
  ] }],
  visibleBosses, route, currentRouteHp, currentRouteSignature,
  idealOverrides, appearedCards, rankings,
});
if (result.status === "ready") {
  const table = await engine.evaluate(result.request);
  const entries = v6ProjectionEntries(table, config);
}
```

`phase` 为 pick 或 act，供拿牌、商店、休息复用；`asOf` 是当前观测时间的 UTC ISO 毫秒字符串，`runId` 必须对应实际局面，不能把正文提到的局号当身份。已结束且早于该观测时间的历史才进入供给和目标模型，当前局排除。大脑方向概率通过 `weights` 原样传入，工厂不填均匀概率。缺目标检查点不猜楼层。

`options` 是 `V6SituationOption[]`，每个选项含顺序执行的 `changes`。基线自动生成，默认 id 为 skip，可用 `baselineId` 改名，不能与选项重复。改动类型：

| kind | 字段 | 行为 |
| --- | --- | --- |
| add | card、price、可选 copies | 加牌，核已知牌与牌组上限 |
| remove | index、price | 按当前执行步骤的牌组索引删牌 |
| upgrade | index、price | 按实例升级，核已知升级模型 |
| heal | amount、price | 受 max HP 限制的回血 |
| potion | slot、value、price | 改实际药水槽；value 为带 potion_id 的原始对象或 null |
| skip | 无 | 保留资源 |

价格逐项扣金币；不够、索引非法、未知牌或药水、虚构药水槽等只拒绝该选项，在 `rejected_options` 给出 id 与原因。原始局面不变，未删掉的牌实例计数、遗物对象和药水数据保留。移除/升级后下一步 index 指向修改后的牌组。

## 路线与模拟

`route` 复用 `V6RouteInput` 的 signature、steps，costs 可以是按选项返回本角色路线成本的函数，bossExit 可以是按选项接力的显式模拟边界。signature 必须涵盖路线、成本模型及回调实现和数据。每个选项从修改后的 HP 投影；未覆盖的目标显式 unknown，缺 Boss 离场模型不续造下一幕血量。

已有当前幕路线血量可传 `currentRouteHp` 加 `currentRouteSignature`。发生回血而没有 route 重投影时，工厂显式保留未知，不直接把回血加到旧 Boss 进场 HP。未来遗物和药水不预测。

ready 返回 `V6ProjectionRequest`、labels 和 rejected_options；disabled/unavailable 返回 reason，调用方须保留既有降级路径与日志。供给入口是冻结历史的 `v6SupplySource`，默认 200 次；ideal_overrides 优先级和既有公式沿用 W3。

`V6ProjectionRequest.prepare(target, completed, option?)` 追加可选第三参数。原两参数调用保持兼容；引擎传当前 option，`V6ProjectionOption.preparationKey?` 区分牌组相同但药水或路线不同的准备缓存。W5/W7 不应自行缓存后丢掉这项。

输出保持 `v6ProjectionEntries(table, config)`、`table.act_evaluations`、`rankings` 和 `table.pick_direction_comparisons`。跨方向配对参考最高有效大脑概率方向，同种子连战差为 `{mean,se,n}|null`，未知质量不重新归一；详见前批 `2026-10-19-v6-w3-runtime/interfaces.md`。
