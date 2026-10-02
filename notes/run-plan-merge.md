# RUN_PLAN_MERGE：整局计划搭下一道大脑题（2026-10-02）

Dai 10-02：「进入新的一幕 为什么不直接先进去，然后一起问ds 选项和 这一幕的所有规划呢」。进新一幕要停两次：先在地图上单独问一次整局
计划（TMNFVW6DRQ20 F17 17:17:52 → 17:18:08，16 秒），再在第一个房间问古神的 event/act-plan（中位 94 秒；那道题另行处理）。现在把整局
计划并进下一道 DeepSeek 题。代码 src/strategy/run-plan-merge.ts，开关 `RUN_PLAN_MERGE`（默认开，off 和以前逐字节相同）。
不调用任何模型；数字用 `nice python3 tools/run-plan-merge-estimate.py --until 2026-10-02T11:15`（只读日志）可复现。

## 1. 怎么做

- **什么时候该做计划不变**：地图上照旧按 runPlanTrigger 判断（开局、新一幕、掉血、每 8 层复查）。到期了不再单独问，记成「待做」
  （screenMemory.runPlanPending）。开局另外在本局第一道题就算到期：一幕的涅奥在第一张地图之前，和二、三幕的古神一样带上计划。
- **谁来带**：待做时，下一道 DeepSeek 题（选牌、休息、商店、事件、古神 act-plan、路线、一次性计划，任何 decision.deepseek 题）多带：
  - `state.run_plan_task`：为什么到期、当前计划在哪（内容就是 `facts.your_run_plan`）；牌组、遗物、药水、HP、金币、boss 时钟都已经在
    题目的 facts 里，不重复（题目没有 facts 时把单独那次的输入全给）；
  - 题目说明末尾加 `RUN_PLAN_MERGE_NOTE`：单独那次的任务说明原文（RUN_PLAN_BRIEF）和回答格式（RUN_PLAN_FORMAT），在同一个 JSON 里多答
    一个 `"run_plan"`；要求先定计划、再按计划答本题。
  - 本题自己的答案照原样解析（choice、route、cards、discard、商店清单都不变）。
- **存**：`run_plan` 是计划（isRunPlanReply）就用 parseRunPlan 解析，和单独那次一样存 screenMemory.runPlan、写 run-plans.jsonl（带
  trigger、`merged_into`=题目 label、`decision_id`、`observed_ts`；这次调用的用量放在 `question` 里，顶层不写 latency_ms/tokens，免得和
  llm_calls 重复计）、journal.noteRunPlan。决策行多一个 `run_plan_merge: {trigger, outcome}`（stored / missing / error / no_answer）。
- **没答或答得不是计划**：写一行带 error 的 run-plans 记录，计划仍然待做，下一道题再带。题目本身照常用。任何搭车环节出错（组题、解析）：
  这道题按没搭车的样子问，计划仍待做。
- **兜底单独问（和以前一样的调用）**：
  - 待做满 `RUN_PLAN_MERGE_FLOORS = 2` 层还没有题带走（见 §2 为什么是 2）；
  - 下一个房间就是本幕 boss（地图上能走的节点全是 Boss）：boss 战在任何题之前打完，见 §4。
  - BUILD_DECIDER=jev（没有 DeepSeek 直接决策的题）或 BRAIN_ENGINE_RUN_PLAN 单独指定了别的引擎：不搭车，地图上照旧单独问。
- **思考档位**：带计划的题按「本题档位和 run-plan 档位取高」（llm/deepseek.ts questionEffort）。默认 run-plan 是 max，选牌、休息是
  high：带计划的选牌/休息题这次用 max，免得计划降成 high 档来想。
- **其他引擎**：pickSpec 和商店/路线的 spec 在题目带 run_plan_task 时多一个可选的 `run_plan` 字段（Claude 的固定 schema 有对应的带计划版本），
  从不因为它判答案不合格、也不因为它补问。

## 2. 日志里的 94 次单独计划（V4.3 起，14 局，到 10-02 11:15 UTC）

| 触发 | 次数 | 耗时 中位 / p90 / 最大 | 合计 | 之后第一道大脑题 | 隔几层 | 中间的决策 | 中间有战斗 |
|---|---|---|---|---|---|---|---|
| start | 14 | 18 / 37 / 37 s | 295 s | map/route-plan 14（同一张地图） | 0 | 1 | 0 |
| act | 26 | 41 / 82 / 90 s | 1,096 s | event/act-plan 26 | 1 | 2（地图走一步） | 0 |
| hp_drop | 21 | 35 / 51 / 70 s | 737 s | rest/plan 11、reward/card 4、event 4、shop 1、无 1 | 1：17，2：3 | 中位 2，最多 50 | 4 场（35 次问 Jev） |
| review | 33 | 30 / 59 / 87 s | 1,089 s | reward/card 15、rest/plan 14、shop 2、event 1、无 1 | 1：13，2：19 | 中位 7，最多 45 | 15 场（123 次） |
| 合计 | 94 | 31 / 57 / 90 s | 3,217 s（每局约 3.8 分钟） | | 0：14，1：56，2：22，无：2 | 中位 2 | 19 场 |

- 隔 2 层的 22 次全部是跨过本幕的宝箱房（F10、F26：那里没有大脑题）。所以 N = 2 层：日志里每一次都在 2 层内有题带走，兜底只在答案漏掉
  计划时才会触发，计划最多晚 2 层。
- 「无」：计划做完这一局就结束了（F45、F47 死亡）——合并后根本不用问。
- 中间有战斗的 19 次里 4 次是 boss 战前（GBBB/VNKN/TMNF F16 review → F17 boss，LTKW F32 → F33，合计 126 s）：这 4 次按 §1 的 boss 规则
  仍单独问。

## 3. 能省多少

- **挪出单独调用的时间**：3,217 − 126（boss 前仍单独问）= **3,091 s，14 局约 51 分钟，每局约 3.7 分钟**；按触发：act 1,096 s（每次进新
  一幕中位 41 s）、start 295 s、hp_drop + review 约 1,700 s。
- **但并不全省**：DeepSeek 的耗时几乎全是输出（拟合 V4.3 的 689 次调用：耗时 ≈ 0.5–2.4 s + 输出 token / 约 200 每秒；输入 13.5 万 token
  里约 96% 命中缓存，预填几乎不花时间）。单独那次中位输出 6.0k token（推理 5.7k）。合并后：
  - 一定省：每次的固定开销约 0.5–2.4 s；
  - 题目多读的输入：说明 1,765 字符 + run_plan_task 约 280 字符，约 500–700 token（单独那次是 13.5 万 token 的整份上下文）；
  - 题目多写的输出：计划 JSON 约 730 字符（约 250 token，约 1 s；单独那次也要写这些）+ 想计划的推理。后者没法离线量：本题的推理已经在看
    同一副牌、同一个 boss 时钟和同一张地图（TMNF F18 的 act-plan 推理里就在复述刚做的计划：「run plan says remove Strikes」「wants
    permanent Strength and AoE」），省多少取决于这部分重叠。
  - 区间：**下限**每次约 1–2 s（推理一点没省），14 局合计约 2–3 分钟；**上限**每次省掉整次单独调用，合计约 51 分钟。进新一幕：每次省
    2–41 s（中位），停顿从两次变一次。
  - 另一项成本：40 次 hp_drop/review 会搭在 high 档的题上（休息 25、选牌 15），带计划时这道题升到 max（§1），这道题自己的推理可能也变长。
- **上线后量**：`tools/run-plan-merge-estimate.py` 的第 2 部分读 `merged_into` 行，把带计划的题的输出 token 和耗时跟同 label 不带计划的题比，
  差值就是计划实际加了多少，对照它替掉的单独调用（act 中位 41 s）。

## 4. 现在哪些决定在新计划之前做

读计划的地方：build-facts（构筑题的 `your_run_plan`）、loop 的 run brief（Jev 和大脑都看到的计划一行）、Jev 战斗题的药水经验
（screens/jev-experience.ts：计划里提到药水的原话）、card value / 路线权重 / 休息分（代码基线，大脑失败时才用）、选牌屏的删牌加分、
route review 的 run_plan_hp。

- **搭车的那道题本身**：以前它看到刚做好的计划，现在它和计划一起定（94 次全部）。对 act 是好事：TMNF F18 古神选了营养汤（打击变永久），
  刚做的计划却写着「删打击」；一起定就不会自相矛盾。
- **start**：反而更早——计划跟涅奥题一起出来，在第一张地图之前（以前是涅奥之后在地图上），F1 的路线题照样能看到它。
- **act**：中间只有一步地图移动（代码，一条路），没有别的决定在等。
- **hp_drop / review 的下一个房间是战斗**（19 次里去掉 boss 前的 4 次，剩 15 次，每次一场走廊或精英战）：这场战斗 Jev 看到的是旧计划那一行
  和旧计划的药水原话，新计划在战后的选牌题里才出来。旧计划最多 8 层前做的，同一个 boss；Jev 的出牌不受计划约束，只有药水原话和那一行字
  是参考。代码在这之间的决定（地图按路线走、领奖励）不读计划。
- **boss 前**：留着单独问。日志里这 4 次新计划都写了针对这场 boss 的具体打法（GBBB「T1 Inferno; Bash priest for Vulnerable (potion adds
  3)…」，TMNF「hold Block potion + Defends so kill-turn HP+block covers eruption…」），合并的话 boss 战用的是 8 层前的旧计划，而新计划会搭在
  boss 的选牌题上、到下一张地图又被新一幕的 act 计划替掉，白做一次。这条是本次自己加的，Dai 不要可以删掉 run-plan-merge.ts 里的一行。

## 5. 测试

tests/run-plan-merge.test.ts（假的 DeepSeek 和脚本化的聊天服务，固定的牌局、房间代价、升级表）：

- 进新一幕：古神题带计划，一次调用，选项、路线、计划都存下；run-plans.jsonl 带 trigger act、merged_into、question 用量；
- review 搭在选牌题上（路线计划从日志恢复，route review 和计划都解析）；
- 答案里的 run_plan 不是计划：选项和路线照用，计划仍待做，2 层后单独问；路由器补问路线时第二次答案没带计划，用第一次的；
- 一直没有题：2 层后单独问；boss 是下一个房间：马上单独问；开局计划搭在本局第一道题上；
- 真客户端：`run_plan` 在答案里、或作为答案后面单独的 `{"run_plan": …}` 对象，都读得到；
- 开关关：地图上单独问（payload 的 task 和以前逐字节相同），古神题没有 run_plan_task、说明和屏幕给的一样；没有到期计划时，开关开和关题目
  逐字节相同；RUN_PLAN_TASK 和拆分前逐字节相同。
