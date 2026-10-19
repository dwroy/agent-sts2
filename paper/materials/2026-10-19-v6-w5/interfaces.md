# W5 生产消费接口与 W7 复用合同

正式工厂基线为 main `a92e8b37f`（交接记录 `13a06c1e4`），合同见 `paper/materials/2026-10-19-v6-w3-request-factory/interfaces.md`。本包不修改 sim 提供方。

`runLoop` 在 V6 开启时建立一个 `productionV6Projection(buildSim?.runner, runPlanLog)`，放入 `env.v6Projection`。已有 `LoopOptions.v6Projection` 注入优先。默认 off 不创建 runner、不读 V6 文件、不增加该 env 字段；off 时各角色的旧题面与动作路径沿用原实现。

## W7 共享上下文与前台求值

```ts
const runtime = env.v6Projection;
const context = await runtime?.context(env, "pick");
if (runtime && context) {
  const { factory, situation } = context;
  const result = factory.create({
    ...situation,
    baselineId: "leave",
    options: [{ id: "rest", changes: [{ kind: "heal", amount: actualHeal, price: 0 }] }],
  });
  if (result.status === "ready") {
    const table = await runtime.evaluateRequest(env, result.request);
    // W7 consumes projection entries and keeps its own existing legal-action fallback.
  }
}
```

- `V6ProjectionInput` 从 `agent/src/v6/projection-input.ts` 导出：`{factory: V6ProjectionFactory, situation: V6ProjectionSituation}`。独立固定数据调用方也可用 `v6ProjectionInputs(knowledgeDir, now?)` 创建相同提供器。
- `V6ProjectionRuntime.context(env, phase)` 返回 `Promise<V6ProjectionInput | null>`。factory 是本局共享的冻结实例，situation 每次由当前实际资源、最新大脑方向概率/临时组合与选定路线生成。W7 替换 options/baselineId；如有选项相关路线模型，沿正式工厂合同替换 route 并更新 signature。不得把已修改的 situation 写回共享 env。
- `V6ProjectionRuntime.evaluateRequest(env, request)` 返回 `Promise<V6ProjectionTable | null>`，与普通 `evaluate(env, phase)`、空闲预计算共用同一引擎和 runner/pool。先 invalidate 并 await acquireForeground，再开始独立计算窗口，finally release；异常向调用方抛出。pick 默认计算 5000ms，act 默认 60000ms，Jev 5000ms 由调用方另计。off、战斗、request.config.mode=off 返回 null。
- `context` 在 off/战斗返回 null；自定义注入的 runtime 若未提供第四个 input 回调，也返回 null，W7 保留既有 unknown/兜底。生产 runtime 已提供该回调。
- ready 的 labels/rejected_options 由 W7 按其题型记录；只拿合法实际动作，拒绝选项不得直接执行。通用投影日志的 `stage=projection` 按 act/pick 标记，W7 自己的 Jev/兜底记录仍用 shop/rest 题型。

## 拿牌与触发消费

奖励 baseline 为 `skip`，候选 ID 为 `card${reward.card_options[i].index}`（缺 index 才用数组索引），直接对应 choose_reward_card.option_index，复制数沿 `permanentCardGain`。只提供当前合法奖励动作。`V6_CARD_DECIDER=jev` 时英文 Jev choice 的候选放 criteria，独立最多 5000ms；shadow 仅记录，off 沿原题面和动作。奖励空药槽直接领取、战斗用药不变。

方向/组合身份使用正式 build-core-v1 或 construction 过渡适配器；临时组合沿 W3 `<direction>:brain`。每次 situation 读取当前计划，存下新大脑答案后立即重算奖励 pick 表。组合题面保留正式条目可得率、凑齐与凑不齐胜率、组合期望、指标、来源与 unknown 限制；不从历史自行推导知识。

T2/T3 正式读取 `table.pick_direction_comparisons`，仅接受相对当前最高脑概率方向、known_mass=1 的 joint_paired_delta；不从边际 SE 拼配对 SE。T3 另核该奖励选项在对应方向为 core；同一次评估不会累计 T2 连续证据。act_evaluations 继续用于幕初。

`directionEvaluationFromProjection(table, config, "skip", plan, extra)` 的 extra 保留 bossEntryHp/hazardHp、acquiredComponentIds、pivotMatched。既有 `LoopOptions.v6DirectionEvaluation` 可提供完整补充评估，应保留正式 entries/targets；T5 消费已校准危险线，不在本包新造阈值。

## 冻结、路线与未知

每局/角色/进阶只读加载一次本角色 v6-history、正式 cores/过渡模板、support、trust、双 Boss 模型和只读知识，工厂由 W3 提供。模型摘要包含历史哈希/时间与上下文版本；不跨角色回退。asOf 在进程首次观察该局时固定，局内换包不生效；重启或新局重新读取。

路线签名含本局、楼层、HP、路线与成本。显式传 route，包括空路径；缺目标进场 HP 保持 unknown。只接已选择的本幕路线，没有同样本 bossExit 的跨 Boss 路线保持 unknown，不能拿历史 HP 冒充当前路线。W7 若有正式 bossExit 回调，须连同其实现/数据版本纳入 route.signature。

生产包当前仅 1 个组合指标，既有回放未知 100%、cache 0；固定接口测试通过不代表投影质量或自然收益验收。验收过程和原件见 `runtime-integration.md` 与 `checks/`。
