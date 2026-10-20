# P3：奖励选牌观察对照接口

正式源 `ab1f2561832b2909233bc55e52842f1bf726e5a0`，基线 `ed8bb3aca8376bd196b3e878418b37280ee92de6`。精确 11 叶、blob/SHA、补丁见 checks/source-manifest.json 和 checks/minimal-source.patch。只运这些增量，不运整支、基线、805 或知识文件。完整检查待 ops 单点窗口，尚未合 main/live。

## 格式

`agent/src/v6/formats.ts` 对 `reflex-entry-v1` 追加 `signal.kind=contrast`，仅允许 `applies_to=card_pick`。原 hp/win/tag 结构保持可读，旧出牌条目不转换为拿牌建议。

| 字段 | 合同 |
| --- | --- |
| design | observational |
| metric / unit | hp_loss / hp；turns / turns；damage_per_turn / hp_per_turn |
| value / se | 调整后的拿牌减同候选出现但未拿对照差；有限值、SE 严格为正 |
| baseline | treatment=take_candidate；control=same_offer_not_taken；definition/outcome_window/adjustment 必填 |
| n | take、not_take 为正整数；clusters 为独立局数，至少 2，不超过两组观察总数 |
| uncertainty | method=run_cluster_t；cluster=run_id；interval={level,lower,upper}，level 在 .95–.99 |
| audit | path 和小写 sha256；学习草稿应把复现账本复制到可保留的 pending，不能仅引用可回收 scratch |
| confidence | `contrastConfidence(value,se,clusters)`；不是固定值，也不是因果概率 |

置信区间须以 value 为中心，与自由度 clusters-1 的双侧 t 区间一致。`contrastInterval` 和 `contrastConfidence` 在 `agent/src/v6/contrast-statistics.ts` 导出，供学习者使用。独立固定测试覆盖 df=1、df=2 的闭式结果和已知 t 分位点；没有引入依赖。

predicate 每一条 OR 分支都必须同时约束顶层候选 `card.id` 和观察到的牌组状态（deck/deck_size/combos.items）；只写候选、方向权重或生命值不合格。证据至少列两个不同局号。cores/combos 若填写，必须引用已加载的正式构筑卡。draft metrics 的 design/n/effect/SE 必须与 signal 对账。此格式不证明匹配方法有效；研究设计、删失与反例仍须审计。

## 运行时

唯一挂接点是 `buildV6CardPick` 中每个奖励候选的 facts.reflex。沿用原严格战胜后三选一来源门，不新增路由或大脑调用。`V6_REFLEX=on` 且文件有效才求值；off/shadow 均不发送。只发送候选/牌组条件为 true、角色与实际进阶相符、区间严格不含 0 的 contrast。跨 0、谓词 unknown、缺进阶或缺文件均不发送。正负差值均可发送，文字明确观察关联和差值方向。

实际条件来源由 `cardPickPredicateFacts` 导出：

- run 的 act/floor/hp/max_hp/gold，raw.deck 的完整实际卡牌及显式 upgraded/energy_cost，显式遗物 ID/stack。
- 本候选实际 ID/升级/费用；组合进度只读 `v6CardResults.progress[当前 option]`；权重只读本局最近有效方向。
- 仅 `targets.kind=current` 提供当前 Boss；敌人池不能当作下一精英，未观测身份显式 unavailable。缺 deck、费用、计数或组合不补零，不用历史包推断。

不调用 input/factory/context/evaluate，不新增模拟、文件回填或后台工作。发送条目保留 baseline、两组样本、区间、confidence 方法、cores/combos、证据局号、entry 内容 SHA、正式文件路径和审计文件 SHA。现有有界题面函数继续负责总量；若预算不足会按原规则去掉 reflex，不能把草稿正式发布或保证每条都发送。

## 学习任务与验收边界

`learner/tasks/v6-reflex-distill-r4.md` 已就绪，默认 gpt-6.1-sol/high、240 分钟，按当前仓库规则；只由 ops 派发。本会话没有派发。仅 scratch/pending，simulation off，不改正式知识。模板要求全部已结束 Silent 观察、同候选机会对照、牌组条件、SL/死亡删失、局聚类误差、所有尝试/跨零结果及逐经验状态；不提供游戏知识。

固定数据 tsc0、6 文件 103 例通过；五角色 off/shadow 题面等价，区间跨零/未知不发、关联检查和草稿对账已锁。固定两条发送题面 6,895 字节，小于 30,000。它是本地构造，不是真实请求或 live 读回；没有效益证据。正式发布仍须 ops 的实际组合完整检查、开局边界运输、版本登记和消费者读回。
