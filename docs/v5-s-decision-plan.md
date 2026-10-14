# V5 S 决策与 Jev 定位：实施计划

- 状态：**已批准，分阶段实施中**。Roy 2026-10-14 在与 Claude 的对话中批准本方案（“我同意你的建议”），并要求整理成实施计划移交 Codex 开发。
- 请求 ID：`roy-20261014-s-decision`。
- 起草：Claude（只起草文档，不实现代码）。实现、自测、合入由 Codex 负责；发布编号、上线登记和兜底由运维 codex 负责。
- 范围：Silent（静默猎手）。其他角色在各开关关闭时保持现有行为；铁甲战士必须等价。

本文只规定**决策方法**：用模拟样本怎样排序、给谁看、谁来决定。本文不引入任何游戏知识。文中所有数字（血量、伤害、胜率等）都是说明算法用的虚构示例，不能当作任何牌、怪物或进阶的事实。

---

## 0. 摘要

| 阶段 | 内容 | 是否改变对局行为 | 依赖 |
|---|---|---|---|
| P0 | 离线基线：校验 S 符号与输赢一致；评估 Jev 选择与代码第一名的差距；整理各 Boss 模拟可信度 | 否 | 无 |
| P1 | Boss 准备度诊断：从当前牌组的现有样本算出缺口和敏感度曲线，先 shadow，再给大脑 | P1-on 时改变大脑题面 | P0.1 |
| P2 | 构筑排序：代码按“配对胜率差 → 配对 S 差”排序，大脑在此基础上决定，偏离第一组时必须给理由 | 是 | P1 |
| P3 | Boss 出牌排序：B2 胜率并列时，第二键从“赢局中位掉血”改为 S，修补“所有线胜率都是 0 时无法区分”的缺口 | 是 | P0.1 |
| P4 | Jev 重新定位：只在代码判定为“并列”的 2–4 条候选里打破平局；题面改为英文短题面；药水由代码决定 | 是 | P0.2、P3 |
| P5 | 整局准备度跟踪：逐层记录准备度，供整局计划和路线参考 | shadow | P1、P2 |

推荐顺序：先做 P0。P1 和 P3 可以并行，P2 接在 P1 之后，P4 等 P0.2 和 P3 完成后再做，P5 最后做。每个改变行为的阶段单独发布、单独登记编号。

---

## 1. 现状（2026-10-14 main `a40e93109`）

实现者开工前请重新核对，以下行号可能已经变化。

1. **S 已经算出来了。**
   - `agent/src/sim/boss-margin.ts`：`bossRelativeMargin()`、`marginOf()` 逐样本计算 `S = (outgoingHp/turns)/bossHp − (receivedHp/turns)/myHp`。被截断、超时、多 Boss 连战或伤害归属未知的样本返回 `null`，不补 0。
   - `summarizeBossMargin()` 输出分布、与基准的配对差，以及 `rankingEligible`。
2. **B3 构筑模拟已经具备主要统计。**
   - `agent/src/sim/build-sim.ts` 的 `OptionSim` 已有：原始胜率和校准胜率（Platt）、与当前牌组的配对胜率差及标准误（`diff.raw/se/cal/calSe`）、配对掉血差、配对 Boss 剩余血量差。
   - `agent/src/sim/build-sim-facts.ts` 把这些写进大脑题面。Boss 进场血量已经按路线投影（`routeEntry` / `projected`）。低可信 Boss 会把 `rankingEligible` 置为 false。
   - `agent/src/construction/evaluation.ts` 输出 `construction_evaluation`，其中包含 `bossMargin`。
   - 但目前**没有代码层的排序**，S 只以一段中文说明（`BOSS_MARGIN_NOTE`）交给模型自行比较。
3. **B2 Boss 选线已经是“胜率优先”。**
   - `agent/src/sim/boss-lines.ts` 的 `rankLines()`：先按胜率，2 个配对标准误以内算并列（`BOSS_LINES_TIE_SE = 2`）；并列时再比 `wonLoss`，即赢局中位掉血。
   - **缺口**：所有线都没有赢的样本时，`wonLoss` 全是 `Infinity`，排序退化为候选原始顺序。历史上出现过同类问题：`notes/fix-queue-v4.md` 2026-09-30 20:26 条（CDR0、F4K8、W80J，所有线都判死时偏向“乌龟线”）。
4. **Jev 题面过大，并且让 Jev 做统计判断。**
   - R342 之后，Silent 战斗题实测输入 18,300–22,252 tokens（V4 时期约 4–5.6k）。
   - 题面包含 S 统计量、`rankingEligible` 规则和中文说明（`reflex/jev/decision-projection.ts` 的 `jev_decision_contract`）。
   - 精简在 `eye/jev-prompt-log.ts` 里进行，也就是先生成完整题面、再由日志层裁剪。
   - 药水由 Jev 决定（`combat-plan.ts` 注释写明 “Potions are Jev's call (Roy 2026-09-28)”）。
5. **没有“Jev 是否优于代码第一名”的评估。**
   - `paper/materials/20261014-v5-jev-ablation/`（`notes/v5-jev-ablation-request-20261014.json`）评估的是题面压缩，不是 Jev 与代码的对照。

---

## 2. 原理：逐样本 S 的含义

设参考血量为 Boss 的 `H` 和我方的 `M`（模拟入口值），某个样本打了 `T` 回合，我方造成伤害 `O`，承受伤害 `R`（已扣除格挡）：

```
S = (O/T)/H − (R/T)/M = (O/H − R/M) / T
```

- **赢的样本**（O ≥ H，R < M）：S ≈ `(1 − R/M) / T`，即“我方剩余血量比例 ÷ 回合数”，必定大于 0。
- **输的样本**（R ≥ M，O < H）：S ≈ `−(1 − O/H) / T`，即“−Boss 剩余血量比例 ÷ 回合数”，必定小于 0。

推论：

1. **S 的符号等于胜负。** 胜率 = S > 0 的样本占比。例外情况（回血使 R 超过 M 仍然存活、溢出伤害、未知归属）需要由 P0.1 核实。
2. **S 的大小表示胜负的余量。** 赢时是“赢得多轻松”，输时是“离赢还差多远”。
3. **排序规则：先比胜率，并列再比 S。**
   - 构筑早期经常所有选项胜率都是 0%，后期又都接近 100%。这两种情况下胜率区分不了选项，S 仍然可以：早期显示离赢更近的方向，后期显示剩余血量更多。
   - 不直接用 S 的均值做第一键。一个高波动选项可能 S 均值更高，但输的样本更多；先比胜率可以避开这个问题。

**缺口与敏感度（只用于诊断，不用于排序）。** 以下按每回合速率恒定做线性近似。对每个输的样本 i：

```
进攻缺口 k_i = (H − O_i) / T_i                  # 需要每回合多造成多少伤害，才能在同一死亡回合前击杀
防守缺口 h_i = R_i · H / O_i − M  （O_i > 0）  # 需要多少额外有效血量，才能撑到原输出速率下的击杀回合
```

由此得到敏感度曲线：

- `W(+k) = (赢的样本数 + #{输的样本 i : k_i ≤ k}) / n`
- `W(+h)` 同理。

近似的局限：加伤害会让战斗变短、承受伤害变少，所以对进攻缺口的估计偏保守；加血不考虑成长和出牌顺序。因此敏感度曲线只告诉大脑缺的是进攻还是防守、大致缺多少，具体选哪张牌仍以真实配对模拟为准。

示例（虚构数字）：Boss 300 血，我方 60 血。某个输的样本在第 7 回合死亡，Boss 剩 60 血，造成伤害 O = 240，承受伤害 R = 60：
- 进攻缺口 `k = 60/7 ≈ 8.6`，即每回合需要多造成约 8.6 点伤害；
- 防守缺口 `h = 60·300/240 − 60 = 15`，即需要多约 15 点有效血量。

---

## 3. 目标与非目标

**目标**

- 构筑和 Boss 出牌的候选排序由代码依据配对样本完成，可复现、可审计。
- 大脑看到“缺口在哪、各选项补多少、是否并列”，在此基础上做最终选择；偏离代码排序时要留下理由，事后可以检验。
- Jev 只做它擅长的事，题面回到小而字面的英文；同时消除超长报错。
- 让“模拟预测的胜率”与“真实 Boss 战结果”可以持续校准。

**非目标**

- 不新增模拟模型、不新增游戏机制、不写入任何牌、怪物或数值事实（学习协议）。
- 不改变 Codex 大脑的路由，不改变 SL 和 HP 护栏的既有语义（P3、P4 只调整它们的输入排序）。
- 不改变必需完整计算（R341）的等待语义。是否给它加时间上限，见第 9 节，需要 Roy 另行确认。
- 不扩展到精英战和走廊战的 S 排序（第 9 节）。

---

## 4. 分阶段实施

### P0 离线基线（不改对局行为）

**P0.1 S 符号一致性审计**

- 新增工具 `agent/tools/s-sign-audit.ts`，输入用固定夹具；生产数据只经日志库只读查询。
- 对现有 B2/B3 样本统计：`sign(S) == won` 的比例；按 Boss、进阶、是否有回血、是否有溢出伤害分组列出不一致的样本。
- 验收：报告写入 `paper/materials/<日期>-s-decision/p0-sign-audit.md`。不一致率超过 1% 的分组，P1–P3 在该分组上退回原排序，并在报告里写明原因。

**P0.2 Jev 与代码第一名的对照**

- 新增 `agent/tools/jev-vs-code-replay.ts`。从 `decisions.jsonl`、`jev-prompts.jsonl` 和当时记录的 rollout/B2 结果中，取出每道 `combat/plan` 题的四项：Jev 的选择、代码第一名、rollout 或 B2 最佳、实际执行的方案。
- 统计：
  - Jev 偏离代码第一名的比例，按战斗类型（走廊/精英/Boss）、置信度分段、是否涉及药水分组；
  - 偏离时，按当时的模拟数字，Jev 所选方案相对代码第一名的配对差（期望掉血、Boss 胜率、S）及其标准误；
  - 偏离的回合与该场战斗实际结果的关联（只作描述，不作因果结论）。
- 与 `v5-jev-prompt-ablation-20261014` 的原拥有者协调：复用其冻结输入和工具，不重复跑全历史。
- 验收：报告写入 `paper/materials/<日期>-s-decision/p0-jev-vs-code.md`，并给出 P4 的模式建议（见 P4）。

**P0.3 各 Boss 模拟可信度清单**

- 汇总 `knowledge/characters/silent/boss-trust.json`、`eval/calibration.py` 及 silent-boss-calibration 的现有结论，列出每个 Boss 的 B2/B3 是否可信、样本数，以及预测胜率与实际胜率的偏差（Brier 分数、按胜率分桶）。
- 只整理已有证据，不新增校准结论。

### P1 Boss 准备度诊断

**新模块** `agent/src/sim/boss-readiness.ts`（纯函数，不运行模拟器）：

- 输入：B3 中当前牌组（`base`）的逐样本结果（`BossSimLineResult.outcomes`，含每个样本的 `boss-margin` 轨迹）、参考血量 `H`/`M`、可信度。
- 输出 `boss-readiness-v1`：
  - `samples`、`valid`、`missing`（沿用 `marginOf` 的空值规则）；
  - `win`：原始胜率和校准胜率，以及区间（`binomialInterval`）；
  - `loss`：输的样本数，`bossLeftFraction` 和死亡回合的分布（n / mean / p10 / p90）；
  - `win_side`：赢的样本数，`hpLeftFraction` 和回合数的分布；
  - `terms`：进攻项 `A = (O/T)/H` 与防守项 `D = (R/T)/M` 的分布；
  - `gap`：进攻缺口 `k_i` 与防守缺口 `h_i` 在输的样本上的分布（p25 / p50 / p75）；
  - `sensitivity`：`W(+k)` 与 `W(+h)`。网格用相对值，不写死游戏数值：进攻按当前平均 DPR 的 +10% / +25% / +50%，防守按 `M` 的 +10% / +25% / +50%；
  - `trust`：沿用 `bossTrustReason` / `rankingEligible`；
  - `limits`：英文常量，写明线性近似和不能用于排序（给大脑的题面另有中文说明，见下）。

**接线**

- 在 `build-sim-facts.ts` 的 B3 结果完成后计算，写入 `decisions.jsonl` 的 `boss_sim.readiness`（shadow）。`on` 时加入大脑题面 `facts.boss_readiness`。
- 大脑题面使用紧凑的中文摘要，示例：
  > 当前牌组对本幕Boss胜率30%±3；输局Boss平均剩20%（第7回合）；缺口：进攻约+8.6/回合 或 防守约+16有效血；敏感度：DPR+25%→48%，有效血+25%→52%；（线性近似，仅诊断）
- 低可信 Boss 仍然计算并记录日志，但不放进题面，只标注“低可信，未提供”。

**开关** `S_READINESS=off|shadow|on`：Silent 默认 `shadow`，其他角色默认 `off`。

**验收**

- 固定夹具测试覆盖：全赢、全输、混合、有 `null` 样本、低可信、`O_i = 0`。
- 对一道冻结的历史 B3 题，人工核算 2 个样本的 `k_i`、`h_i`，与模块输出逐值一致。
- `shadow` 运行两局：每道 B3 题都有 `readiness` 记录，耗时增加小于 50 ms。
- `on` 之后核对大脑实际题面读到了该字段（消费者读回）。

### P2 构筑排序（代码排序，大脑决定）

**新模块** `agent/src/sim/build-rank.ts`：

- 输入：`OptionSim[]`（含 `diff.cal/calSe`）、每个选项的 `boss_relative_margin`（与当前牌组的配对差）、可信度。
- 排序键：
  1. 配对校准胜率差 `ΔW = diff.cal`。与最好选项相差不超过 `BOSS_LINES_TIE_SE` 个标准误的算并列。
  2. 并列组内，若 `rankingEligible` 为真，按配对 S 差 `ΔS = paired.difference.mean` 排序，2 个标准误以内仍算并列。
  3. 仍然并列时，按现有的配对掉血差排序。
- 分组输出：`best_group`、`better_than_current`（ΔW > 2SE，或 ΔW 并列且 ΔS > 2SE）、`no_difference`、`worse_than_current`。
- 项分解：每个选项另外输出配对的 `ΔA` 和 `ΔD`，并标注改善主要来自进攻、防守还是两者。判定规则是比较两项配对均值的绝对值是否相差两倍以上。
- 饱和标志：当所有选项的原始胜率都低于校准下限（`calibratedFloor`），或者 ΔW 全部并列时，置 `win_saturated=true`，并在题面说明此时以 S 为主要区分依据。
- 低可信 Boss：不输出 S 排序，只给 ΔW，标注“低可信”。

**大脑题面与答案格式**

- 题面新增 `facts.build_ranking`：紧凑表格，包含名次、ΔW ± SE、ΔS ± SE、主要来源、分组和饱和标志。保留现有 `boss_sim` 文字，避免同一事实出现两套口径时互相矛盾；实现者应合并重复字段，不要叠加。
- 答案格式（`agent/src/brain/specs.ts`）：所选项不在 `best_group` 中时，必须填写 `ranking_override_reason`（25 词以内）。由校验器强制，缺失时按现有补问机制处理。
- 日志：`decisions.jsonl` 记录代码排序、大脑选择、是否偏离及理由，供第 6 节的评估使用。

**适用题型**：拿牌、跳过、商店购买、删牌、升级、休息/锻造，即 B3 已经支持的全部选项。事件和变化类等 B3 不支持的选项保持现状。

**开关** `S_BUILD_RANK=off|shadow|on`：`shadow` 只记录排序、不进入题面。Silent 先跑 `shadow` 两局，再切到 `on`。

**验收**

- 固定测试覆盖：并列判定、`win_saturated`、低可信、缺失 S、项分解、schema 强制填写理由、其他角色等价。
- 用历史冻结题回放（`decision-replay`），报告新排序与当时大脑选择的一致率。这只用于描述现状，不作为通过门槛。
- 上线后自然对局中核对：题面送达，偏离时理由已落盘，`module_health` 计数正常。

### P3 Boss 出牌排序（B2 第二键）

**修改** `agent/src/sim/boss-lines.ts`：

- `rankLines()` 的第二键改为可配置：胜率并列组内，若整组都满足 `rankingEligible`，按 S 均值（`bossMargin.score.mean`）从大到小排；两线之间的配对 S 差在 2 个标准误以内仍算并列，再用 `wonLoss` 打破。不满足条件时，保持 `wonLoss`。
- 生成 `order` 的排序键同步修改。
- 必须覆盖“所有线胜率都是 0”的情况：此时按 S 排序，即优先 Boss 剩余比例更低的线。

**保持不变**：HP 护栏（`guardKeepsPick`、`simWinsLess`）、SL 探索、药水否决语义、低可信时 `best = null`。

**开关** `S_COMBAT_RANK=off|on`：Silent 默认 `on`（在 P0.1 通过的前提下），其他角色默认 `off`。

**验收**

- 固定夹具：全输场景选中 Boss 剩余更少的线；全赢场景选中剩余血量更多、回合更短的线；低可信退回 `wonLoss`。
- 历史 Boss 题回放：报告排序变化的题数，以及变化前后两条线的配对差。
- 铁甲战士回放逐题等价。

### P4 Jev 平局仲裁

**模式选择（由 P0.2 的结果决定）**

| P0.2 结论 | 模式 |
|---|---|
| Jev 偏离代码第一名时，所选方案的配对差显著更好 | `tiebreak`（下文） |
| 无显著差别 | `tiebreak`，或在 Roy 确认后改为 `off` |
| 显著更差 | 先报告 Roy；确认后用 `off`，战斗直接执行代码第一名 |

`off` 会改变论文的实验设定（项目以 Jev 为名），因此必须经 Roy 确认后才能上线。

**`tiebreak` 规格**

- **候选**：只取代码判定的并列组。
  - Boss：B2 胜率并列，且 P3 的 S 也并列；
  - 其他战斗：现有 rollout 排序中，与第一名的期望掉血加药水代价相差在其标准误 2 倍以内的线。
  - 最多 4 条。只有 1 条时不调用 Jev，直接执行。
- **题面**：在 `combat-plan.ts` 中直接生成，不再由日志层裁剪。
  - 全部英文；
  - `state`：一行局面描述（我方血量/格挡/能量，各敌人血量和意图）；
  - 每个候选一行：打出的牌、回合结束后血量、造成伤害、击杀对象、喝掉的药水；
  - 不放统计量、`rankingEligible`、经验块、规则说明或中文文本；
  - 问题：`"Which of these equally-rated plans is best for this fight?"`。
- **大小**：目标 2,000 tokens 以内，硬上限 4,000。超过时，代码按固定优先级删掉附加行（先删提示，再删敌人能力描述）。不再依赖 `compactJevRequest`。
- **药水**：喝不喝由代码现有的药水成本排序决定。只有喝药方案和不喝药方案落在同一并列组时，才交给 Jev 打破平局。此项改变 Roy 2026-09-28 “Potions are Jev's call” 的规则，属于本次批准范围，上线时要按规则变更通知流程登记。
- **失败处理**：Jev 报错或超时时，立即执行并列组中的代码第一名，不等待。
- **日志**：`jev-prompts.jsonl` 照常记录实际发送体；`decisions.jsonl` 记录并列组、代码第一名、Jev 选择。

**开关** `JEV_ROLE=full|tiebreak|off`：默认 `full`（即现状），Silent 按上表切换，其他角色保持 `full`。

**清理**：Silent 切到 `tiebreak` 并稳定后，`decision-projection.ts` 在 Silent 路径上不再触发。是否删除它，由实现者在确认无其他调用方后决定。

**验收**

- 固定测试：并列组构造、只有 1 条时不调用、题面不含中文字符（用正则检查）、token 估计不超过上限、失败时回退、药水只在并列时交给 Jev。
- 自然对局 2 局：Jev 输入 token 的 p95 不超过 4,000，`max_tokens_exceeded` 为 0；报告调用次数下降比例。

### P5 整局准备度跟踪（shadow）

- 每次 B3 计算后，把 `boss-readiness` 的摘要（层数、胜率、缺口）写入本局记忆（`memory/run-journal`）。整局计划题可以读到“距 Boss 还有 N 层，胜率和缺口的变化趋势”。
- 下一幕 Boss 未知时，用候选 Boss 分别计算（若 B3 支持），记录各自胜率和按 `Σ Δp_i / p_i` 加权的汇总值。该汇总值只写日志，不进入排序，等 P0.3 的校准结论出来后再决定是否启用。
- 开关 `S_RUN_TRACK=off|shadow`。

---

## 5. 开关一览

| 开关 | 取值 | Silent 初始 | 其他角色 | 解析位置 |
|---|---|---|---|---|
| `S_READINESS` | off / shadow / on | shadow → on | off | `core/config.ts` |
| `S_BUILD_RANK` | off / shadow / on | shadow → on | off | 同上 |
| `S_COMBAT_RANK` | off / on | on（P0.1 通过后） | off | 同上 |
| `JEV_ROLE` | full / tiebreak / off | full → 按 P0.2 | full | 同上 |
| `S_RUN_TRACK` | off / shadow | shadow | off | 同上 |

- 所有开关写入 `logs/run-config.jsonl`。
- 开关只能把行为退回旧路径，不能绕过 R341 的必需计算。

---

## 6. 日志、健康检查与评估

- **日志**：上述字段都写入 `decisions.jsonl` 的现有记录行，不新建日志文件。
- **健康检查**：`ops/module_health.py` 新增计数项：readiness 产出、build_ranking 送达、偏离理由齐全、B2 S 排序生效、Jev tiebreak 调用及 token。缺失时进入现有的唯一告警链。
- **评估**：新增 `eval/s_decision.py`。
  - 预测胜率与真实 Boss 战结果的 Brier 分数和分桶校准；首次尝试与 SL 分开统计，并按 Boss 和进阶分组；
  - 大脑偏离代码排序的比例，以及偏离组和遵循组的 Boss 实际胜率（描述性比较，不作因果结论）；
  - Jev 调用次数、token、延迟，并与上线前对比；
  - 输出到 `paper/materials/<日期>-s-decision/`。

---

## 7. 发布与回退

- P1-on、P2-on、P3、P4 都会改变对局行为，各自单独发布：
  - `eval/versions.json` 新增版本，由 ops 分配 `V5-R*` 编号；
  - 写入 `paper/materials/decision-log.md`；
  - 在 `notes/for-roy.md` 和 `ops/inbox-dev.md` 发送规则变更通知，逐项写明旧规则、新规则、证据、预期影响和回退方法。
- **回退**：先把对应开关切回 `off` 或 `full`，下一局生效。需要撤回代码时，由 ops 精确 revert 该发布的增量，并登记新编号。
- 合入 live 前，核对 live 中刷新过的知识数据是否与本次合并冲突（AGENTS.md）。

---

## 8. 必须遵守的约束

- **学习协议**：不写入任何游戏事实或数值常量。阈值统一沿用现有的 `BOSS_LINES_TIE_SE` 和 `calibratedFloor`，或使用相对值。
- **角色隔离**：只读写 `knowledge/characters/silent/`；其他角色的开关默认关闭，铁甲战士逐题等价。
- **测试**：在 `agent/` 中运行 `npx tsc -p tsconfig.json --noEmit` 和 `npx vitest run`（沙箱内用 `bash tools/test-sandbox.sh`），只用固定数据，不 `npm install`。
- **工作树与流程**：一个功能一个工作树；不运行 `play`；不修改运维 prompt；提交前用 gitleaks 扫描。
- **代码风格**：代码注释用英文。给 Codex 大脑的文本用中文；**发给 Jev 的题面用英文**——这是 Roy 本次批准的例外，理由是 Jev 以英文为主要训练语言，中文准确度较低（`agent/PLAN.md` §2.2）。

---

## 9. 待 Roy 另行确认（本计划不实现）

1. **必需完整计算的时间上限**：超过上限时由代码按已有样本决策，并标记为不完整。这与 R341 的“失败或不完整就等待”相反，需要单独决定。
2. **把 S 排序扩展到精英战**：需要 B2 先支持精英战且通过校准。
3. **P4 选择 `off` 模式**：见 P4 的模式选择表。

---

## 10. 交接与派发

- **实现方**：由 ops 按既有的 Roy 授权功能通道派发，二选一：
  - (a) 新建任务模板 `learner/tasks/s-decision.md`（以本文为准），在 `ops/learner_jobs.py` 的 `FEATURE_REQUESTS` 中登记，写入 `notes/s-decision-dispatch.json`（`state=pending`、`task=s-decision`、`character=silent`、`authorized_by=Roy`、`request_id=roy-20261014-s-decision`），准备独立工作树 `.worktrees/s-decision`；
  - (b) 参照 2026-10-09 的先例，由 watcher 直接实现。
- **分批**：P0 → {P1, P3} → P2 → P4 → P5。每一批按任务模板中的 fix-batch JSON 协议回报，live 合入串行持锁。
- **父请求关闭条件**：P1–P4 均已上线，自然对局中消费者读回通过，`eval/s_decision.py` 至少输出一份完整报告，ops 和 Roy 的通知回执齐全。测试通过、回放通过或批次结束都不等于完成。
- **异议**：实现者如果认为本方案某项不成立（例如 P0.1 发现 S 符号与胜负大面积不一致），按学习要求闭环记录异议，经 ops → watcher → Roy 告知，不要硬做。


## 11. 实施接续（2026-10-14，首批 P0 / P1 shadow）

本次沿第10节(b)由原 watcher 直接实现，独立工作树 `s-decision-20261014`，父请求保持开放。远端计划 `7c7f91aed` 与本机 R343–R345 已合并为 main `264efa2ea`；保留双方记录和运维未提交内容。

- P0 工具：`agent/tools/s-sign-audit.ts`、`jev-vs-code-replay.ts`；现有冻结输入重算入口 `s-decision-fixture.ts`，只跑离线模拟，不调用 Jev 或游戏动作。`eval/s_decision.py` 输出三个基线报告、逐题来源/动作/结局和原校准清单。
- P0.1 当前覆盖：原冻结 B3 题、SOUL_FYSH/A10、4,000条样本、0缺失/0符号不一致。原 base/options 统计逐值等价，准备度汇总新增约7.12ms；两条原样本的 k/h 经独立 Python 复算。补充B2同Boss/A10冻结题1800样本中17条反号，其中一条候选8/600（1.333%）超门槛，P3整组不放行；详见p0-sign-audit-b2.md。其他Boss/进阶仍未审计。
- P0.2 复用原 ablation 的32题和原来源SHA，不再发API或重跑全历史。原代码顺序第一名（plan1）、rollout/B2第一名、Jev答案、护栏/SL后计划、单动作回执分列。20题偏离不能当总体偏离率；历史缺 S 或配对标准误保留未知，不把未知当“无显著差异”。阶段性保持 `JEV_ROLE=full`；不启用 off。
- P1：`boss-readiness.ts` 纯汇总，Silent `S_READINESS` 默认 `shadow`，其他角色强制 `off`。shadow 仅记录 `boss_sim.readiness`，原题面与排序保持；显式 `on` 只给紧凑中文 `facts.boss_readiness`。低可信、缺失轨迹或符号审计失败时仅给未提供说明。run-config记录实际模式，module-health区分产出、真实脑payload及accepted，不以shadow冒充送达。
- 默认部署属于诊断/日志阶段，不新增游戏知识或行为发布号。**P1-on、P2、P3、P4均未发布**；原R341完整计算、药水/HP/SL语义保持。实际 source/main/live、自测及两局自然验收以 `paper/materials/20261014-s-decision/` 的回执为准，代码通过不能关闭父请求。
- 下一阶段：原ops沿既有调度核部署树完整检查和两局shadow覆盖/耗时；原owner先定位B2反号与伤害归属、补其他Boss的P0证据后接P3，再按依赖做P2/P4/P5。不得另起同题任务、复派原R2/R3或把已有校准的固定模型结论当当前生产校准。自然验收未完成之前不开P1-on。
