# 下一版架构：记忆与意图优先（DeepSeek 定方向、Jev 执行、代码只管机制和护栏）

**结论：** 你提的分工大体对，但要补两点。
- 出牌的主体是求解器（search），Jev 只在求解器判为接近的几条线里挑。各开源 bot 都靠搜索打战斗，拿网络或 LLM 替代搜索的 6 次尝试全部失败。
- "避免死套路"不能靠多写 if-then。做法是把经验写成三样东西：带标签、可检索、有版本的知识条目；DeepSeek 给出的意图（intent）；求解器的评估项。代码里只留机制、护栏和 bug 级教训。

## 1. 各类决策谁来做
| 决策 | 负责方 | 做法 |
|---|---|---|
| 出牌顺序 | 求解器 + Jev | 求解器按"本场意图"的权重预设给每条线打分。差距 ≥6 由代码直接出，差距小的由 Jev 选。DeepSeek 退出逐回合出牌：它有拿 HP 换伤害的老毛病，额外失血 3.12，Jev 是 2.59。 |
| 药水时机 | 求解器 + Jev | DeepSeek 在意图里给出本场药水预算（如"boss 可用 2 瓶"），求解器按预算给药水定价。现在 plan-choice+potion 有 64% 走 DeepSeek，约每局 15 次调用，全部可以省掉。 |
| 卡牌奖励 | DeepSeek | 代码先过滤掉明显该跳过的牌，给出前 3 名，并附上"加这张牌前后，模拟下一个精英或 boss 的失血差"。现在 74% 由代码的 tier 表决定，这是最大的"死套路"来源。tier 表降级为先验特征，不再直接拍板。 |
| 商店 | DeepSeek 定购买意图，代码执行 | 删牌、强制离开、药水栏满这类操作留在代码。 |
| 升级 / 删牌 | 代码为主 | 删牌顺序（诅咒 > 打击 > 防御）属于确定性规则。升级顺序从 run_plan 的 archetype 里读，不再用固定列表。 |
| 事件 | DeepSeek | 代码只保留 HP 护栏，过滤掉危险选项。 |
| 地图 / 休息 | 代码打分，Jev 做接近的选择 | 精英门槛这类参数改由 run_plan 给，如"本局要打 2 个精英拿遗物"或"保血"，不再按楼层写死 0.8/0.7。 |
| boss 专项战术 | 知识条目 + 意图 | 现在写在代码里的 7 个 boss 加成、Knowledge Demon 诅咒边际，迁成带触发条件的知识条目。只有纯机制部分（如 Sandpit 死亡判定）留在代码。 |
| 局面方向 / 转型 | DeepSeek | 开局写一份 run_plan：archetype、缺什么、转型条件。每个 act 结束后，或转型条件触发时重写。设冷却，一个 act 内最多转型 1 次。 |

## 2. 意图层（新增）
- **run_plan**（跨楼层）：`{archetype, needs[], avoid[], elite_appetite, pivot_if[]}`。它进 DeepSeek 的每次调用，也进代码的地图、奖励、商店打分。
- **fight_intent**（只在精英和 boss 战开始时调用一次 DeepSeek）：从有限枚举里选，如 `race`、`turtle_until:<power>`、`scale`、`preserve:<resource>≥N`（例：sandpit≥2），外加 `potion_budget` 和 `hp_floor`。
- 每个枚举对应求解器的一组权重预设。预设由人工标定，并先离线回放验证过。
- DeepSeek 不能直接给数值权重，HP 护栏永远优先。这样既灵活又稳定：DeepSeek 只挑方向，数值始终在我们验证过的范围内。
- 同一个意图作为 `fight_intent` 字段放进 Jev 的 state，让两层目标一致。这也能化解 JEGBU7 的冲突（护栏与成长牌价值互相拉扯）：`turtle_until:DemonForm` 明确告诉 Jev，这一场允许为了搭成长多挨一点。

## 3. 经验怎么流动、怎么修剪
- **知识库**：`knowledge/*.jsonl`。每条字段：
  - `id`
  - `text`：25 词以内，正面表述，带明确条件
  - `triggers`：敌人 / boss / act / 界面 / HP 区间 / archetype / 遗物
  - `audience`：jev、ds 或两者
  - `kind`：fact、hint 或 guard 候选
  - `source_runs`
  - `version`
  - `status`：candidate、active、promoted 或 retired
  - `stats`：命中次数，以及命中时相对基线的失血差
- **复盘时的分流**：
  - 纯 bug 或未建模的机制（45 局败局里有 34 局属于这类）直接修代码。
  - 反复出现的致死路径变成护栏。
  - 其余一律写成 candidate 条目，不改 tier 表或分数常量。
- **写入闸门**：candidate 至少要在 2 局里出现，或在离线回放里改善结果，才升为 active。只来自一局的条目只进 DeepSeek，不进 Jev。
- **修剪**：active 条目命中 20 次以上仍然没有正效应就退役；被新证据推翻的条目改版本，不叠加新条目。条目总数设上限（DeepSeek 端约 150 条，Jev 端约 60 条），超出时淘汰效果最差的。
- **升级进代码**：只有在回放里每次都成立、不依赖局面的条目，才能固化成代码。反向也要做：现在 D 类里只有 1-2 局证据的规则（boss 加成、Breakthrough 62、Armaments 48、事件 maxHP 8、keep 4 attacks 等）退回成条目，重新接受检验。

## 4. Jev 能不能拿到经验：能，但只能通过 state 或问题文本
- Jev 没有 system 字段，也不能微调。经验只能放进 state 或问题的 instructions / criteria。
- 放法按效果排：
  1. 把经验变成 `describePlan` 里每个选项的事实标签，例如 `setup_turn`、`hp_after`、`lethal_next_turn`、`wastes_block`、`breaks_intent`。
  2. 新增 `fight_hints` 字段，按触发条件检索，最多 5 条，约 200 token。
  3. 放入 `fight_intent`。
- 同时要在战斗 state 里删掉整份牌组和遗物列表。官方文档说无关内容会降低 Jev 的准确率。
- 成本几乎为零：延迟在 1k 到 3k token 之间基本不变（约 530ms）；多 300 token 每次约 $0.00001。
- **不能**把整份 handbook 塞给 Jev：约 8-9k token，而且大部分与当前决策无关。

## 5. 延迟与成本预算（每局约 379 个决策）
- **现在**：DeepSeek 约 33 次/局，每次约 12 秒，合计约 6.6 分钟。
- **新方案**：
  - 去掉战斗里的 DeepSeek，约省 15 次，即 3 分钟。
  - 新增：run_plan 约 4 次，fight_intent 约 12 次（精英加 boss），多出来给 DeepSeek 看的卡牌奖励约 10 次。
  - 合计约 40 次，约 8 分钟，只占一局 45-60 分钟的 15% 左右。
  - fight_intent 可以在进战斗动画时并行请求。
- **静态提示**：DeepSeek 的 handbook 改成按触发检索，提示长度目标砍半，p50 延迟应该跟着下降。

## 6. 迁移步骤（每步可单独回滚，都有指标）
| 步骤 | 内容 | 成功指标 |
|---|---|---|
| M0 | 把 lessons.md 和 handbook 拆成条目，建立标签；DeepSeek 改为检索加载 | 提示 token 降 50%；离线重问 100 个历史 DeepSeek 决策，选择一致率 ≥80% |
| M1 | Jev 加 `fight_hints`、选项标签，删减 run_brief；用 `replay.ts` 在 873 个升级回合上做 A/B | Jev 额外失血从 2.59 降到 2.3 以下；升级到 DeepSeek 的比例变化在 ±20% 以内（否则重调阈值） |
| M2 | 战斗（含药水）不再走 DeepSeek，由 Jev 决定；药水按预设预算定价 | 10 局 plan-choice 的额外失血不高于现在；每局 DeepSeek 调用减少 12 次以上 |
| M3 | 精英和 boss 战加 fight_intent 和权重预设，与无意图版本交替跑 | 精英 / boss 战平均失血下降，且没有新增"拿 HP 换伤害"导致的死亡 |
| M4 | 引入 run_plan，卡牌奖励和商店交给 DeepSeek，附带模拟价值；代码拍板的差距阈值从 6 放宽，让 DeepSeek 看到更多选择 | 20 局平均楼层高于当前 A2 基线；boss 战失血下降；楼层方差不上升 |
| M5 | 把只有单局证据的 D 类规则降级为条目 | 10 局平均楼层不退步；代码常量数量减少 |
| M6 | 复盘子代理按闸门写条目，每 5 局自动修剪 | active 条目数稳定；每条都有命中统计 |

## 7. 主要风险
- **样本太小**：每组 10 局，楼层方差很大。优先用单场战斗和单个决策的离线指标（min-loss 差、回放一致率），整局胜率只做最终验收。
- **DeepSeek 方差和反复转型**：用有限枚举、冷却和转型触发条件约束。只有在模拟价值给出依据时，它才能推翻代码的前 1 名。
- **意图映射出错会放大 DeepSeek 的 HP 毛病**：权重预设由人工标定，HP 护栏不可覆盖，`hp_floor` 只能收紧、不能放松。
- **Jev 会照字面执行 hint 并用错场合**（例如在斩杀回合去打能力牌）：能标到选项上的经验不写成泛化的 hint；每条 hint 都要写明条件。
- **知识库膨胀**：同样会变成死套路，只是换成了文本形式。靠上限、命中统计和退役机制控制。
- **归因难**：多层同时改动会分不清是谁的效果。每步只改一层，决策日志记录条目 id 和意图版本。
- **经验跨模型迁移不可靠**（AgenticSTS 实测：同一套 skill 在 DeepSeek V4-Pro 上下降 18%，在 Qwen 上提升 84%）：同一条目分别在 Jev 和 DeepSeek 上验证，不假设通用。

**关键源码位置：**
- `/home/dw/Projects/sts2-jev/jev-sts2/src/screens/combat-plan.ts`（741 行是选项描述，766-791 行是 state 构造）
- `/home/dw/Projects/sts2-jev/jev-sts2/src/strategy/card-value.ts`（tier 表）
- `/home/dw/Projects/sts2-jev/jev-sts2/src/llm/deepseek.ts`（handbook 加载）
- `/home/dw/Projects/sts2-jev/jev-sts2/src/replay/replay.ts`（离线回放）