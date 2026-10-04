# V4 M2 构筑题面：事实字段表（2026-09-30）

原则（v4-dev-brief 第 3 项、v4-architecture §4 M2）：大脑有推理能力，代码只给算得准、能追溯的事实，不替它打分、不排名、不删选项。
验收测试：`tests/build-facts-audit.test.ts`（固定数据渲染每类题面，断言没有分数型字段和文字；最后一条锁定卡牌奖励题面的原文）。

来源缩写：
- **状态** = 本回合 mod 给的游戏状态（state.raw）；
- **游戏数据** = `.cache/game-data.json`（卡牌、遗物、药水的文字、稀有度、费用）；
- **日志库** = 由 logs/*.jsonl 自动统计出的数据文件（每局结束刷新）：`src/knowledge/outcome-stats.json`（tools/build-outcome-stats.py）、`monster-db.json`、`room-costs.json`、`card-upgrades.json`、`boss-damage.json`，以及 `relic-values.ts` / `potion-values.ts` / `enchant-text.ts` 里注明局号和样本数的实测值；
- **确定性计算** = 由上面的数字按固定规则算出（无权重、无打分），规则写在代码注释里。

## 1. 去掉了什么（大脑题面里不再出现）

| 去掉的字段 / 文字 | 原来在哪 | 原来是什么 |
|---|---|---|
| `code_value`、`code_rank` | 所有构筑题的每个选项（pick.ts deepseekPick） | 选项的代码启发式分数和名次 |
| 打分理由 `why` | 选牌（卡牌价值理由、运行计划加分、boss 时钟加分）、商店（`card value … - 62 - price/25`、`relic: 18 - price/40`、药水估值）、休息（`heal 10`、`smith 6`、`boss clock gap +2`）、选牌屏（升级优先级、删牌顺序等说明）、事件/宝箱/礼包（"code does not score …"）、一次决策的目标牌（`upgrade target: X 95`） | 分数怎么来的 |
| `SKIP_BAR` 说明（`code_value below the skip line (50) means code would skip it`）、离开选项的 "the bar: anything scoring below 0…" | 选牌、商店 | 门槛 |
| `deck_needs`（AOE/过牌/成长/伤害/格挡张数）、选牌题 state 里 "skipping is a legitimate choice…" 的建议 | 选牌题 state | card-value.ts 手工角色集合的计数、代码的建议 |
| `deck_profile` 里的 `AOE n / 格挡牌 n / 过牌 n / 成长 n / 伤害牌 n` | 所有问题的 facts、本局记忆「构筑」行、整局计划 | 同上 |
| `expected_hp_saved_in_boss`（药水在 boss 战预计省多少血） | 商店药水 | potion-value.ts 的估值模型 |
| `code_removal_order`（删牌顺序和分数） | 商店一次决策 | 代码的删牌排序 |
| `eligible_cards` 里的 `[code remove value 80]`、`target_why` | 一次决策里要选多张牌的选项 | 代码对目标牌的打分 |
| 删牌服务文字 "a smith/removal is usually strong" | 商店 | 建议 |

这些分数在代码里**照旧存在**，只作没有大脑时的回退（Jev 的问题、代码直接决定）：card-value.ts、shopScore、休息的 heal/smith 分、选牌屏的 selectionScore 都没删；DeepSeek 决策行的 rationale 仍记下代码的回退名次（"code's fallback order … not shown to DeepSeek"），只进日志，不进题面。

不在本次范围、照旧带代码分数的：路线问题（`map/*`，pick.ts `ROUTE_SCORED`）和构筑题里附带的路线块（`route_review`、`act_routes`），等 V4 路线工作（v4-brain）换成完整地图后一起去掉。

## 2. 每类题面里的数字字段

### 所有构筑题共有：`state.facts`（strategy/build-facts.ts）

| 字段 | 含义 | 来源 |
|---|---|---|
| `act`、`floor`、`ascension`、`gold` | 幕、层、进阶、金币 | 状态 |
| `floors_to_act_boss` | 到本幕 boss 层（17/33/48）还有几层 | 确定性计算 |
| `hp` | 当前/上限（百分比） | 状态 |
| `deck_size`、`deck` | 牌组张数、每张牌的名字/费用/文字 | 状态 + 游戏数据 |
| `deck_profile` | 张数（攻击/技能/能力/诅咒或状态，按游戏的卡牌类型）、升级数、平均费用、力量来源（牌面或遗物文字写明获得持续力量的牌和遗物，壶铃带锻炼次数） | 状态 + 游戏数据；力量来源由 card-model.ts `givesLastingStrength` 按文字判断，列出名字作依据 |
| `relics` | 遗物文字，占位数值只填实测过的，其余写「?(数值未知)」 | 游戏数据 + 日志库（relic-values.ts） |
| `potions`、`potion_slots` | 药水文字（实测数值）、已用/总格数 | 状态 + 日志库（potion-values.ts） |
| `act_boss_clock` | boss 血量、预计进场血量、可撑回合、每回合掉血、战斗回合、每回合需要伤害、本牌组估计伤害、缺口 | boss 时钟（boss-clock.ts，算法未改）：boss 血量和每回合掉血来自怪物库/boss-damage.json（带 n），进场血量和回合是确定性计算，牌组伤害是在 215 场 A8 boss 战上校准的估计（注明约 25% 误差） |
| `your_run_plan` | 大脑自己写的整局计划 | 大脑 |
| `outcome_stats_basis` | 下面各 `*outcome_stats` 字段的口径、数据文件、生成时间、进阶、总局数、各幕基线通过率（A9 起另有 A8 的基线） | 日志库（outcome-stats.json） |

`*outcome_stats` 的格式（knowledge/outcome-facts.ts），全部原样来自 outcome-stats.json，口径未改。2026-10-04 起（Dai：按进阶分开统计）outcome-stats.json 每个进阶一张表（`by_ascension`：A8、A9，以及有了局的更高进阶；每张表只数这个进阶的局，基线也是这个进阶的），本局读自己进阶的表（knowledge/outcome-tables.ts）：
- A8、A8 以下、不知道进阶：读 A8 的表，文字和以前逐字相同（以前的单表文件也照旧读）；
- A9 起：读本局进阶的表；某一行不足 5 局、而 A8 的同一行够 5 局时（卡牌按「拿了 / 给了没拿」一对看，A8 在 A9 不足的那一边够 5 局），后面括号里另附 A8 的那一行：`（A9 不足5局，另附 A8：…）`，不合并成一个数；A8 也不足 5 局的不附（起始牌从不出现在卡牌奖励里，「给了没拿」各进阶都是空的）；basis 里写 A9 的基线和 A8 的基线；
- 更高进阶同理，附最近的、够 5 局的低进阶（到 A8 为止）；
- 攻略里的 {CARD_OUTCOME:ID} 同样：A9 起标成 {@9:CARD_OUTCOME:ID}，当天冻结表里有自己的 key（render/facts.ts），A8 的 key 和值不变。

格式：
- 卡牌：`A8 第1幕 拿了 n=41 过本幕boss 73% 均终层27.9 / 给了没拿 n=1(少) 过本幕boss 0% 均终层17；第2幕 …`（「拿了」= 这一幕牌组多了这张牌，任何来源；「给了没拿」= 这一幕卡牌奖励给过、这一幕没拿）；
- 遗物：`A8 第1幕获得 n=5 过本幕boss 80% 均终层28.8；…`；
- 事件选项：`A8 选这个选项 n=10 过本幕boss 20% 均终层32.4，到下一层平均 HP-3`（以遗物命名的选项再附遗物那一行）；
- 休息动作：`A8 HP<40% n=137 过本幕boss 31% 均终层30.4；HP40-60% …`（按到达时 HP 档）；
- 没有记录：`无数据`；n<5 标「(少)」；本局进阶和统计进阶不同时（A8 以下）在 basis 里写明。
- 药水不在 outcome-stats.json 里，药水选项不带统计。

题面带统计时，memory.knowledge 不再重复统计行（run-journal `statsCovered`）；经验条目照旧。

### 整局计划搭车：`state.run_plan_task`（RUN_PLAN_MERGE，默认开；notes/run-plan-merge.md）

RUN_PLAN=v1 的整局计划（strategy/run-plan.ts）什么时候到期没变：地图上按 runPlanTrigger（开局、新一幕、掉血 30%、每 8 层）。变的是谁来问：
到期后不再在地图上单独调用一次，而是由下一道大脑直接决策的题带上（任何 decision.deepseek 题：古神 act-plan、选牌、休息、商店、事件、
路线、一次性计划）；开局的计划在本局第一道题（涅奥）就带上。

- 题面多两样：`state.run_plan_task`（`trigger`、`due_because`、当前计划在哪：内容就是 `facts.your_run_plan`，这里写它在第几幕第几层、
  当时 HP、为什么做的）；题目说明末尾加单独那次的任务说明和格式（run-plan-merge.ts `RUN_PLAN_MERGE_NOTE`），要求在同一个 JSON 里多答
  `"run_plan"`。牌组、遗物、药水、HP、金币、boss 时钟只在 facts 里出现一次。
- 本题自己的答案照原样解析；`run_plan` 是计划就存（screenMemory.runPlan、run-plans.jsonl 带 `merged_into`、journal），不是就仍待做，
  下一道题再带。带计划的题思考档位取本题和 run-plan 的较高者（选牌、休息从 high 升到 max）。
- 仍单独问（和以前同一个调用）：待做满 2 层没有题带走；下一个房间就是本幕 boss；BUILD_DECIDER=jev；BRAIN_ENGINE_RUN_PLAN 单独指定了引擎。
- 没有到期计划的题，和关掉开关（`RUN_PLAN_MERGE=off`）时一样，逐字节不变。决策行的 `run_plan_merge` 记搭车结果（stored / missing /
  error / no_answer）。

### 选牌 `reward/card`

| 选项字段 | 含义 | 来源 |
|---|---|---|
| `card`、`type`、`rarity`、`cost`、`text` | 牌名、类型、稀有度、费用、当前牌面文字 | 状态 + 游戏数据 |
| `in_deck` | 牌组里已有几张同 id 的牌 | 状态（计数） |
| `outcome_stats` | 见上 | 日志库 |
| `skip` 选项 | 不拿牌 | — |

### 商店 `shop/buy`（逐步）和 `shop/plan`（一次决策）

| 字段 | 含义 | 来源 |
|---|---|---|
| `price`、`affordable_now`（plan） | 价格、按当前金币买不买得起 | 状态 |
| 卡牌 `type/rarity/cost/text`、`in_deck`、`outcome_stats` | 同选牌 | 状态 + 游戏数据 + 日志库 |
| 遗物 `text`、`outcome_stats` | 遗物文字（实测数值）、统计 | 游戏数据 + 日志库 |
| 药水 `potion_slots` | 空格数，或「满了，要先扔」 | 状态 |
| `remove` 的 `price`、`not_removable_eternal` | 删牌价格、删不掉的永恒牌 | 状态 |
| `discard_potionN`（plan） | 扔掉某格药水 | 状态 |
| `leave` | 不买 / 离开 | — |
| facts `shop_stock`、`card_removal`、`potion_belt` | 全部库存（含买不起的）、删牌服务、药水格 | 状态 |
| state `your_cards`、`your_cards_outcome_stats`（plan） | 牌组每种牌（删牌目标用的 key）、每张可删牌的统计 | 状态 + 日志库 |

### 休息 `rest/choose`（逐步）和 `rest/plan`（一次决策）

| 字段 | 含义 | 来源 |
|---|---|---|
| 选项 `option/kind/description` | 游戏的休息选项和文字（含回血数） | 状态 |
| `rest/plan` 每张可锻造牌：`upgrade`、`copies`、`card_outcome_stats` | 升级前 -> 后文字和数值、张数、统计 | 状态 + card-upgrades.json（日志库）+ outcome-stats |
| facts `rest_site.heal_amount`、`hp_after_heal` | 回血量（游戏文字；没有时按 30% 向下取整 + 休息遗物）、回血后血量 | 状态 + 确定性计算 |
| `upgradable_cards`、`floors_to_act_boss`、`next_nodes`、`forced_next`、`forced_elite_ahead` | 可升级牌、到 boss 层数、下一步节点、是否必经精英/boss | 状态 + 记住的地图（确定性） |
| `boss_start_heal` | boss 战开场回血遗物的回血量和两种选择下的进场血量 | 遗物表 + 确定性计算 |
| `hp_band_now`、`option_outcome_stats` | 当前 HP 档、各休息动作按 HP 档的统计 | 状态 + 日志库 |
| `potion_slots` / `:discard` 选项 | 选项给的药水放不下时会丢；先扔药的变体 | 状态 |

### 事件 `event/choose`、`event/plan`、`event/act-plan`

| 字段 | 含义 | 来源 |
|---|---|---|
| `option/description`、`lethal` | 选项文字、游戏的致死标记 | 状态 |
| `relics` | 选项文字里点名的遗物及其文字 | 游戏数据 + relic-values |
| `hp_cost`、`max_hp_cost`、`hp_after` | 选项文字写的扣血/扣上限、之后的血量 | 选项文字 + 确定性计算 |
| `before_forced_fight`、`hp_after_vs_forced_fight` | 前面有必经精英/boss 时，之后血量和那场战斗实测失血（中位、p75、n）比较 | 记住的地图 + room-costs.json / 怪物库（日志库） |
| 一次决策的目标牌：`card_text` / `upgrade`、`copies`、`card_outcome_stats`；多张牌时 `eligible_cards` + `card_outcome_stats` | 牌面、升级差异、张数、统计 | 状态 + 日志库 |
| facts `event.option_outcome_stats` | 每个选项（按 key）的统计 | 日志库 |
| facts `named_enemies_from_monster_db`、`forced_fight_ahead`、`left_out_as_lethal` | 事件点名的怪物数据、前方必经战斗、被去掉的必死选项 | 怪物库 + 地图 + 状态 |
| `route_effect`（act-plan） | 选项文字写明的血量/上限/金币变化 | 选项文字 + 确定性计算 |

### 选牌屏 `selection/upgrade|remove|transform|enchant|add|choose`

| 字段 | 含义 | 来源 |
|---|---|---|
| `card/upgraded/type/cost/text` | 候选牌 | 状态 |
| `upgrade`（升级屏） | 升级前 -> 后 | 状态 + card-upgrades.json |
| `in_deck`（加牌屏） | 牌组里已有几张 | 状态（计数） |
| `outcome_stats` | 该牌的统计 | 日志库 |
| facts `selection.selecting`、`enchantment` | 第几张/共几张、附魔效果（前一事件点名的附魔的实测说明） | 状态 + enchant-text.ts |

### 宝箱 `chest/relic`、礼包 `bundle/choose`、`capstone/choose`

| 字段 | 含义 | 来源 |
|---|---|---|
| 遗物 `text`、`rarity`、`outcome_stats` | 文字（实测数值）、稀有度、统计 | 游戏数据 + 日志库 |
| 礼包 `cards`、`card_outcome_stats` | 礼包里的牌、每张牌的统计 | 状态 + 日志库 |
| capstone `description` | 选项文字 | 状态 |

## 3. 选项有没有在给大脑之前被删

查过的地方（BUILD_DECIDER=deepseek，默认）：
- **没有按分数截断**：大脑路径（pick.ts `deepseekPick`）一直是全部选项；`codeMargin`（分差大就代码直接决定）、`maxModelOptions`（只给前 N 个）、选牌的 `SKIP_BAR` 过滤只在回退（Jev/代码）路径上，大脑问题不经过它们。默认配置下大脑失败后不会再拿到回退题面（loop.ts：刚失败的问题不再升级给 DeepSeek，预算用完也不升级）。BUILD_DECIDER=jev（非默认的旧基线）时 DeepSeek 作为 Jev 的升级对象，看到的是 Jev 的题面（前 N 个 + 代码分数），未改，留给 Dai 定。
- **按合法性去掉、保留**：锁住的事件选项、逐步商店里买不起的物品（仍列在 facts.shop_stock，一次决策里全部列出并标 affordable_now）、禁用的休息选项、已选中或已升级的牌、只有一个合法选项时直接执行。
- **按确定事实去掉、保留，待 Dai 定**：事件里「一定会死」的选项（游戏标 will_kill_player，或扣血 ≥ 当前血量），列在 facts.left_out_as_lethal。
- 宝箱在拿遗物之前没有「跳过」动作（日志里 CHEST 屏只有 choose_treasure_relic），不是被删。
