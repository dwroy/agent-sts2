# V6-W7 商店、休息接口

2026-10-19。W7 只构造现场合法选项及明确资源变更；W3 提供冻结历史、路线入口、组合供给配对与模拟。正式知识不在本功能中修改。

## 开关与预算

`V6_BUILD=on` 且 `V6_SHOP_DECIDER=jev` 或 `V6_REST_DECIDER=jev` 才替换对应题面。默认仍为 `brain`；master off/shadow、对应开关为 brain 时沿原路径，零投影调用。计算和 Jev 分别使用独立 L2 预算，计算最多 5000ms，Jev 复用 W6 的 `withConstructionJevBudget`，最多 5000ms；SDK 重试共享本次 Jev 剩余时限。Jev 超时、失败或非法回答只执行一次合法兜底，不转大脑。

## 选项与挂接

`v6ShopOptions` / `v6RestOptions` 返回 `V6RoomOptions`，每项含原动作、`state`、`changes`、`unknown_reason`。删牌和升级按牌的现场身份展开，仍使用原有 PendingPick、后续选择身份闸。药水变更必须有现场明确且唯一的槽位身份与价格，槽位身份不依赖数组顺序；不推测药效。丢药之后重新读取商店，不承诺后续购买。休息选项保留 W6 的逐槽问题与丢药后续动作。

`changes` 对齐 W3 的 `V6ProjectionChange`：加牌、删牌、升级、回血、skip 和显式 potion。未知价格、库存或槽位、未支持的遗物/其他休息资源变更为 null，不作为不变牌组传给工厂。会获得未知药水的回血也不冒充纯回血；最大 HP 变化目前保留未知。

`createV6RoomProjection(factory, engine, situation)` 返回可注入 `LoopOptions.v6RoomProjection` 的回调。`situation(env,input)` 提供 W3 的 `V6ProjectionSituation`，去掉 `state/phase/options/baselineId`；这些字段由 W7 填为实际 GameState、pick、非空 changes 与独立基线 ID。调用方负责提供开局冻结的 factory 与共用 engine、路线 context；W7 不再实现历史加载或路线模型。

生产挂接使用 `bindV6RoomProjection(source, evaluate)`：

- `source(env)` 取共用生产提供器当前 run 的 `{ factory, situation }`，可异步；`situation` 与上文相同，不包含 W7 填写的四个字段。工厂和路线都来自共用提供器，W7 不另冻快照或重读历史。
- `evaluate(request, { budget_ms, signal })` 调用同一模拟运行器，在共用前台锁下求值。W7 已直接交 W3 构造完整 request，不需要另做外部房间变更翻译器。

运行器应在拿到锁后再次检查取消信号，并限制剩余计算预算。W7 将取上下文和构造请求耗掉的时间计入本题计算额度，迟到结果不进入题面；本地未知 changes 与工厂拒绝原因一并保留。off/shadow、对应 decider=brain、战斗或已取消时不访问 `source` 或 `evaluate`。W5 当前的 reward-only 请求入口不能直接用于商店或休息，不能把拿牌表当作房间选项表。

截至本次接线，共用提供器仍需开放 `source(env)` 对应的快照/现场上下文入口及带前台锁的 `evaluateRequest`。这两个入口是生产绑定所需的剩余协调项；不要求 W5 再实现与 W3 重叠的选项工厂。

W3 ready 的 labels、rejected_options 原样进入题面和审计；本地无法表达完整资源变更的选项也保留拒绝原因。无路线时回血的 Boss 入口未知，由工厂按选项处理。

## Jev 条目与兜底

按 option × direction × combo × target 输出 projection-entry-v1；组合来源与角色来自已有 W1/W3 数据，不用方向内最高胜率替代组合期望。题面保留 n、误差、可信度、模型标签和未知原因，完整来源保留在 `v6-build.jsonl` 的 entries；题面移除逐局证据明细。组合描述统计优先使用 W3 冻结历史覆盖后的 summary，观察指标不称为因果。

兜底先排除当前关口明显变差的已知候选，再比较连战差与当前关口差；没有有效数值时商店合法离开，休息取现场第一个无需额外 Jev 子答案的合法选项。不会为未知投影补零。

## 固定数据验收边界

`agent/tests/v6-room.test.ts` 覆盖实际库存/金币、删牌/升级身份、回血、药水槽位、W6 后续动作、工厂拒绝原因、数值/来源/未知、独立预算和本地脚本化 loop。五角色关闭开关题面与解析动作的 SHA256 基线采自 W7 前提交 `7aa094344`；冻结时钟和知识路径，避免把历史统计刷新误当题面回归。本地脚本化 loop 只使用测试 HTTP 服务与假 Jev，不启动游戏、不发真实模型请求。

本接口文档不代表生产适配器已挂接；以最终 report 与 main 提交中的实际运行接线为准。

## 共用工厂后续对齐（2026-10-19T23:54:52.346645+08:00）

W3 `a92e8b37f` 已在当前基线。`runtimeV6RoomProjection(runtime)` 接收结构接口 `context(env,"pick")` 与 `evaluateRequest(env,request,{budget_ms,signal})`，直接使用上述 binder，逐项资源由实际 W3 工厂验证。W5 `db4efec79` 的 context 已匹配，但 evaluateRequest 还需可选取消/剩余预算参数并在获取前台锁后检查；W7 不编辑 W5 模块。最终 loop 默认绑定待该共享运行时合入 main；注入提供器仍优先。
