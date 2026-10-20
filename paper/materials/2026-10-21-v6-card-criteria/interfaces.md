# 最小运输合同

此候选只运输 source-manifest.json 中 8 叶与 minimal-source.patch，不运输父分支、整 main、805、知识或配置。base 是 572bf468bae3e248fbb6778e6b922f15baa5cc75；最终 source/tree 由 source-receipt.json 给出。实际 R408 前像也列在 manifest，ops 应依原锁核漂移后机械集成。

1. 新 agent/src/v6/card-criteria.ts 为纯消费器 cardCriteria(names, results)，输出 Decisions choice criteria 字符串。依赖既有 V6CardResults 的 immediate/paired_delta/progress/long_term/targets，未新增模拟或模型调用。
2. card-pick.ts 仅选择题面 schema/instructions/criteria 挂接；严格 postcombat 三选一、cardPickReflex、已知门/脑兜底与预算不变。
3. prompt-summary.ts 仅 paired-criteria-v1 分支为强制 criteria 保留字节并去重复 state A，完整请求仍≤24000B；旧题型沿原逻辑。数字 A 次序 death_rate,hp_loss,damage_per_turn,turns,losing_enemy_hp_fraction，显示 [mean,SE,n]，mean5/SE3有效位，完整审计不舍入。
4. sim/v6-card-results.ts 只改 B 准备/轮转和原因；public completedCore 的签名、A evaluate、pool/lease/cache 指纹未改。没有 v6ProjectionRuntime/loop 接线改动。
5. 生产已有 P0 提供方接线、strict reward 来源、input idleCombat/BOSS_KEYS、W8 搭车/off 和 pure peek getter，以及 P3 card-pick-reflex 是本 base 的必要已有依赖；实际 R408 已有这些。不要回装早期宽路由或独立方向请求。

criteria 的 A_vs_skip 每行 target 指向 state.targets，delta 按 columns；equal_option_means 标绝对均值在全部合法选项相同的列索引。B_progress 只列推进组合，保留 direction/core/advanced/cards_missing/unknown，results 可含未来目标 result/vs_current_deck/trust，numeric_targets_omitted 明确可选裁剪数。state 继续保存绝对结果与可信度，用 result_ref 时引用 display_catalog。

生产 B miss 仍存在，详 report；此处不把手工预热当生产有值。候选不改 R408 brain 开关，交 ops 单点 full 和 Claude 原质量门接续。
