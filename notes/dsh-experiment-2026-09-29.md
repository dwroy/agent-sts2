# DeepSeek 约束决策三方案对比实验（2026-09-29）

Roy 今天批准（含安装 DeepSeek Harness）。实验代码在 worktree `jev-sts2-dsh`（分支 `dsh-exp`，基于 v3 3e41460）的 `experiments/dsh/`；Harness 装在仓库外 `~/tools/`。live bot、v3 和其他 worktree 都没动，live `.env` 和 live 代码没改，没跑 `play`。

## 0. 结论先看

- **93 题 × 3 组，全部 93/93 最终可用、live 解析器全部接受**。首答（任何恢复之前）格式失败：A 0/93（另有 1 个无害的多余字段），B 1/93，C 2/93。三组的失败都是同一种：**thinking 模式下模型没调工具、直接把 JSON 写成文字**；B 修复 1 次、C 用 harness 拉回 1 次后都成功。A 在 13 道 run plan（含 6 个历史上出过 echo/空回复/截断/包裹的现场）和 4 个历史“选项文字当 key”现场里一次都没失败。
- 历史失败率本来就低（直接决策 ~0.2%，run plan ~0.6%）：93 题的样本**区分不了**这个量级（0/93 的 95% 上限约 3%）。能说的是：三组都没有 >3% 的格式问题；工具调用方案**引入了新的失败方式**（不调工具，3/186 ≈ 1.6%），因为 **thinking 模式不支持 `tool_choice` = required 或指定工具**（API 直接 400），强制不了。
- **B、C 更贵更慢**：同题配对，输出 token B/A 几何均值 1.18（59/93 题更多，符号检验 p=0.01），C/A 1.25；成本（高峰价）A $0.0096/题，B $0.0118（+23%），C $0.0123（+27%）；延迟 p50 A 18.4 s，B 24.1 s，C 25.7 s（C 含 dsh 每次调用约 10 s 的网络停顿，见 4.3）。
- 答案质量代理：选项题与日志答案一致率 A 83% / B 81% / C 84%，组间 77–84%——与“同一管线再问一次”的噪声同级，看不出哪组更好或更差。
- **建议：保留 A（JSON mode），按 fix-queue 的 HIGH 项把校验/修复做全；不上 C；B 不整体切换**，只借用它的 per-question JSON Schema 当校验器（代码已在 `experiments/dsh/lib/spec.ts`、`validate.ts`）。详见第 6 节。

## 1. 问题

BUILD_DECIDER=deepseek 时，DeepSeek（deepseek-flash，JSON mode，按标签的 thinking 强度）决定 build/路线/休息/事件。已知失败（fix-queue “HIGH: DeepSeek answers that don't follow the format”）：选项文字代替 key（“休息”“读下封底”“沉溺”“再撑一会”），空/截断 JSON，run plan 回了 {choice, reason} 的 echo 还被当成空计划接受（9GRP F9/F25，YFG5 的包裹对象），一致性重问丢了 route 字段，超长 act-start 回答（139–166 s，26–32k 输出 token）。本实验比较三种拿“受约束决策”的方式：A 现状、B API 严格工具调用、C DeepSeek Harness。

## 2. 方法

### 2.1 题目
- 从 `logs/deepseek-reasoning.jsonl` 与 `logs/decisions.jsonl`（均流式读取）里挑 09-28 06:00 之后的 DeepSeek 直接决策，按标签分层抽样（种子 20260929，每局每标签最多 2 题），**过采样失败**：控制台日志里能找到的全部可见失败（4 个选项文字当 key；reward/card 空回复；selection/upgrade 截断 JSON）、4 个一致性重问（rest），以及 `run-plans.jsonl` 里的全部 run plan 失败（空回复 ×2、截断 ×1、echo+plan ×1、{choice, reason} echo 被当空计划接受 ×2、`{"type":"json_object","content":{…}}` 包裹被接受成空计划 ×1）。`select_targets.py` → `data/targets.json`（97 题）。
- **请求重建**：日志不存 DeepSeek 看到的 `state`（只有问题、选项 key、memory）。所以按 live 的“重启恢复”路径重放整局：`replayRun`（src/project/journal-replay.ts）重建 run journal、路线计划、run plan；在目标决策处用**当前 v3 代码**的 `planDecision` 在当时的游戏状态上重新出题，得到 live 现在会发的 `state`/问题/选项；memory 由 journal 渲染；user message 由 live 的 `choiceMessage`/`taskMessage` 拼成。run plan 按 `ensureRunPlan` 拼。系统提示 = live 的 SYSTEM + 攻略 + 手册（guide `892a2f5f+62173a17`，与 live 最新一行一致），三组逐字相同（18,745 字符）。
- 97 题里 **93 题重建成功**：2 个 map/route-plan 在当前代码下变成“按路线走”不再提问，1 个 bundle/choose 和 1 个 run plan（VBHZ F17 的空 act plan）在重放中没走到目标行。当前代码下标签变化：09-28 的 rest/choose → rest/plan（4 题），Ancient 的 event/choose → event/act-plan（4 题），1 个 event/choose → event/plan。重建的 memory 比当时记录的长 3–10%（当前代码写得更多）。93 条消息都能由 live 函数逐字复现（dry-run 0 差异）。知识 JSON 用的是 worktree 提交版（v3 工作区里有未提交的数据刷新，差别只在 memory.knowledge 的数字）。
- 分布（93）：reward/card 13（12 题带 route_review）、rest/plan 13（8 题带 route_review）、run-plan 13、event/act-plan 10（全部带 act_routes，3 题要选牌）、shop/plan 10、event/plan 8（1 题要选 2 张牌）、map/route-plan 8、event/choose 5、selection/* 13。强度同 live：reward/card、rest/plan、selection/upgrade|remove|add = high，其余 max。

### 2.2 三组实现
- **A 现状**：直接用 `src/llm/deepseek.ts` 的 `DeepSeekClient`，入口与 loop.ts 相同：选项题 `choose()`（JSON mode、label→key 映射、o1+cards 拼接、一致性重问、推理结论），失败再走 loop 的 `recoverFrom()`；商店 `choosePlan()`；run plan `askJson()`（`pickJsonObject`）。fetch 包装记录每次 HTTP 调用。
- **B 严格工具调用**：`https://api.deepseek.com/beta`，每种题一个工具（`submit_choice` / `submit_shop_plan` / `submit_run_plan`），`strict: true`。Schema：choice = 本题合法 key 的 enum；有 route_review 时 route ∈ {keep, 路线 key} + route_reason；有 act_routes 时 route ∈ 路线 key；要选牌时 cards 元素 ∈ eligible key；商店 plan 元素 ∈ 合法步骤（buy_* / discard_potionN / leave / remove:<cN>）；run plan 的 elites、rest 为 enum，remove ∈ 牌组 card id。全部字段 required、additionalProperties false（strict 不支持 minItems/maxItems，数量由校验器查）。thinking/强度同 live，不设 response_format。`tool_choice` 只能用默认 auto（见 3.1）。user message 末尾加一句“用工具作答，不要写成文字”（B、C 相同）。无效/没调工具/参数不是合法 JSON 时，**同一对话修复 1 次**（工具结果写明错在哪和合法取值）。
- **C DeepSeek Harness**：每题起一个 dsh 子进程（`DeepSeekHarness` SDK，profile `sdk-minimal` + 我们的 patch），唯一的模型可见工具 = 与 B 同 schema 的决策工具（插件 `harness/sts2-decision.mjs`）。用 harness 自己的循环校验和重试：工具体用同一个校验器，无效就抛错（harness 把它作为 isError 工具结果交回，循环继续）；有效就 `concludeTurn()` 立即结束（不再多一次模型调用）；模型用文字作答时 `agent/turn-stopping` 钩子 `steer` 它回来；重试上限 2（首答 + 最多 2 次纠正），用尽后 `agent/pre-step` 拒绝后续步骤。
- 三组共用一个校验器 `lib/validate.ts`；另用 **live 解析器**（`judge.ts`：屏幕自己的 `resolve()`、商店 `parseShopPlan`+首步检查、`parseRunPlan`）判断最终答案 live 会不会接受。

### 2.3 指标
- **首答格式失败**（任何恢复之前）：A = 第一次回复严格 `JSON.parse` 成一个对象且通过校验；B = 第一次回复里有本工具调用、参数是合法 JSON 且通过校验；C = 第一次提交通过校验。类别：解析失败（空/截断/非 JSON/多个对象/没调工具/参数 JSON 坏）、值不在合法集合（key/路线/步骤/牌）、缺必需字段（route、route_reason、要选牌时的 cards、run plan 字段）、不是 run plan（echo）；“minor”（多余字段、空 reason）单列不计入。
- **自身恢复后失败**：A = client 的映射/重问/推理恢复之后；B = 修复 1 次后；C = harness 重试后。
- 延迟 = 调用方等到决策的总时间（多次调用相加；C 不含子进程启动 0.3–0.6 s）。token：输入/缓存命中/输出/推理（C 走 Anthropic 格式，推理 token 含在输出里不单列）。成本按 deepseek-flash 高峰价（$0.30/M 未命中、$0.006/M 命中、$1.20/M 输出，同 ops/paper_dataset.py；非高峰半价）。
- 质量代理：与日志答案一致率（选项题比 key；商店比步骤列表；run plan 比 elites+rest）与组间一致率。

### 2.4 预算与并发
- 2 个工作线程，每线程一次一题、组内三组依次跑（顺序按题号轮换 ABC/BCA/CAB，抵消缓存先后），任何时候最多 2 个请求在飞。live bot 同时在跑：它的 DeepSeek 调用 p50 延迟实验前 11.9 s、实验中 10.6 s，输出速度 176 → 185 token/s，缓存命中 67% → 66%——没被拖慢。
- 调用次数：见第 7 节（总计 < 450）。

## 3. 结果

### 3.1 总表（93 题，每组 93 个答案）

| 组 | 首答失败 | 其中：无对象/没调工具 | 值越界 | 缺字段 | run plan 不是计划 | minor | 自身恢复后失败 | live 解析器接受 | 调用数 | 延迟 p50 / p95 (s) | 成本 $（93 题） |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 0/93 | 0 | 0 | 0 | 0 | 1（多余 `"choice":""`） | 0/93 | 93/93 | 93 | 18.4 / 83.2 | 0.895 |
| B | 1/93 | 1（JSON 写成文字） | 0 | 0 | 0 | 0 | 0/93 | 93/93 | 94 | 24.1 / 122.2 | 1.101 |
| C | 2/93 | 2（JSON 写成文字） | 0 | 0 | 0 | 0 | 0/93 | 93/93 | 95 | 25.7 / 110.7 | 1.140 |

- 恢复路径：A 93 个全是首答直接可用（没触发映射、一致性重问或推理恢复）；B 92 首答 + 1 修复；C 91 首答 + 2 第二次提交。
- route 字段：20 题 route_review、10 题 act_routes，三组 30/30 都给了 route；route_review 三组答案完全一致（18 keep、2 换路）。
- `finish_reason=length`（截断）：0。

### 3.2 按标签（首答失败 / 恢复后失败 / 延迟 p50 s / 平均成本 $ 每题）

| 标签 | n | A | B | C |
|---|---|---|---|---|
| reward/card | 13 | 0 / 0 / 8 / 0.0044 | 0 / 0 / 9 / 0.0052 | 0 / 0 / 10 / 0.0052 |
| rest/plan | 13 | 0 / 0 / 6 / 0.0063 | 0 / 0 / 6 / 0.0058 | 0 / 0 / 10 / 0.0059 |
| event/choose + event/plan | 13 | 0 / 0 / 19 / 0.0083 | 0 / 0 / 37 / 0.0114 | 0 / 0 / 26 / 0.0102 |
| event/act-plan | 10 | 0 / 0 / 41 / 0.0178 | 1 / 0 / 78 / 0.0228 | 0 / 0 / 82 / 0.0235 |
| map/route-plan | 8 | 0 / 0 / 47 / 0.0149 | 0 / 0 / 75 / 0.0211 | 2 / 0 / 82 / 0.0250 |
| shop/plan | 10 | 0 / 0 / 38 / 0.0144 | 0 / 0 / 41 / 0.0171 | 0 / 0 / 53 / 0.0159 |
| run-plan | 13 | 0 / 0 / 26 / 0.0092 | 0 / 0 / 44 / 0.0135 | 0 / 0 / 42 / 0.0143 |
| selection/* | 13 | 0 / 0 / 13 / 0.0069 | 0 / 0 / 5 / 0.0050 | 0 / 0 / 10 / 0.0063 |

平均输出 token/题（A / B / C）：map/route-plan 10.2k / 15.2k / 18.4k；run-plan 5.6k / 8.5k / 9.2k；event/act-plan 11.6k / 15.5k / 16.2k；shop/plan 9.5k / 11.1k / 10.1k；reward/card 1.3k / 1.7k / 1.7k；rest/plan 2.6k / 1.8k / 1.9k；selection/* 3.7k / 1.7k / 2.7k。**max 强度的长题上 B、C 想得明显更久**，high 强度的短题上差别小或相反。

### 3.3 token 与成本

| 组 | 调用 | 输入 | 缓存命中 | 输出 | 推理 | 输出/题 | 成本 $ | 成本/题 $ |
|---|---|---|---|---|---|---|---|---|
| A | 93 | 2,084,996 | 1,221,888 (59%) | 524,312 | 516,017 | 5,638 | 0.895 | 0.0096 |
| B | 94 | 2,168,196 | 1,149,952 (53%) | 657,259 | 643,439 | 7,067 | 1.101 | 0.0118 |
| C | 95 | 2,211,572 | 1,195,648 (54%) | 690,045 | （含在输出里） | 7,420 | 1.140 | 0.0123 |

- 配对比较（同一题）：输出 token B/A 中位比 1.28、几何均值 1.18，B 更多的题 59/93（符号检验 p=0.012）；C/A 中位 1.35、几何均值 1.25，56/93（p=0.06）。成本差主要来自输出（推理）token，不是工具 schema 的输入开销（B 输入只多 ~4%）。
- 缓存命中 A 59% vs B/C 53–54%：B/C 的 tools 定义改变了前缀（系统提示那段仍命中），加上轮换顺序后的剩余差异。live 自己的命中率约 66%。
- 修复/重试的代价小：B 的修复调用输入 41k（命中 41k）、输出 158 token、1.2 s；C 的第二次提交输入 ~50k（几乎全命中）、输出 ~110 token——前缀缓存让“同一对话里重问”几乎免费。但**首答那次的推理已经花掉了**（q060 首答 28.7k 输出 token 后才发现没调工具）。

### 3.4 延迟

| 组 | p50 s | p95 s | 最慢 5 题 |
|---|---|---|---|
| A | 18.4 | 83.2 | q040 act-plan 169, q078 selection/enchant 135, q057 shop 124, q024 act-plan 110, q059 shop 89 |
| B | 24.1 | 122.2 | q024 act-plan 171, q023 act-plan 153, q060 route-plan 135, q053 shop 125, q059 shop 123 |
| C | 25.7 | 110.7 | q061 route-plan 191, q060 route-plan 148, q023 act-plan 135, q065 route-plan 129, q024 act-plan 115 |

- 同题配对：B 比 A 慢的题 57/93（p=0.04，几何均值 ×1.14），C 比 A 慢 69/93（p<0.001，×1.62）。C 的慢有一部分是 dsh 的网络停顿（每次模型调用约 +10 s，4.3 节）；扣掉后估计 C 的 p50 约 15.7 s，与 A 同级。见 3.7 的 relay 复测。
- 超长回答（139–166 s 那类）三组都有，工具调用不能缩短推理；它们是 max 强度 + 长上下文的问题，不是格式问题。

### 3.5 失败例子

本次实验中的（全部可恢复）：
- **B q041 event/act-plan**：首答没调工具，content 里是一个合法 JSON：`{"choice": "o1", "reason": "Mittens: permanent +1 Str/turn …", "route": "p3", "cards": []}`（79 s、15.6k 输出）；修复轮（1.2 s）用工具提交了同样的答案。
- **C q060 / q067 map/route-plan**：首答把 `{"choice":"p1","reason":"…"}` 写成文字（q060 首答 28.7k 输出 token）；harness 的 turn-stopping 钩子 steer 后第二次提交通过。
- **A q056 shop/plan**：回复 `{"choice":"","plan":["buy_card0","buy_card4"],"reason":"…"}`——商店计划里混进了系统提示 {choice, reason} 格式的空 `choice`（echo 污染的轻症），live 的 `parseShopPlan` 忽略它，无害。
- 共同根因：**系统提示最后一句“Reply with JSON only: {"choice": …}”**。A 里它偶尔让 run plan/商店回成 echo；B/C 里它让模型不调工具、直接写 JSON 文字。三例 B/C 失败的文字内容本身都是合法且正确的答案。

历史上的（日志，用来选题；本次同一现场重放全部正常）：
- WXMB F11 rest/choose：`choice` 回了 “休息”（选项文字），推理说 heal，交给 Jev 后 0.05 置信度去锻造。当前代码已有 label→key 映射（`resolveOptionKey`），这类现在会被接住。
- 9GRP F9 run plan：`{"choice": "review", "reason": "n/a"}` 被 `parseRunPlan` 接受成空计划，覆盖了有效计划；F25 同样 `{"choice": null, "reason": null}`；YFG5 F44：`{"type":"json_object","content":{…真正的计划…}}` 被接受成空计划。
- 0B5Y F30：echo 后面跟着真正的计划（当时报 non-JSON，现在 `pickJsonObject` 能取出后一个）。
- P2E4 F33 截断 `{"archetype":"Streng`；M6P7 F41、VBHZ F17 空回复（VBHZ 等了 48 s）。
- 0H1X F13 selection/upgrade：截断 JSON，从推理恢复成 card9。

### 3.6 答案一致性（质量代理）

| 题型 | n | A~日志 | B~日志 | C~日志 | A~B | A~C | B~C |
|---|---|---|---|---|---|---|---|
| 选项题（key 完全相同） | 70（有日志答案 63） | 52/63 (83%) | 51/63 (81%) | 53/63 (84%) | 59/70 (84%) | 57/70 (81%) | 54/70 (77%) |
| 商店（步骤列表完全相同） | 10 | 7/10 | 7/10 | 5/10 | 6/10 | 7/10 | 5/10 |
| run plan（elites+rest） | 13（有日志计划 7） | 6/7 | 6/7 | 6/7 | 10/13 | 12/13 | 11/13 |

- A~日志 83% 就是“同一管线、同一题再问一次”的噪声基线（当时的 memory 略不同、代码版本不同）。B、C 与日志的一致率与之相同，组间一致率 77–84% 也在这个范围——**看不出工具调用改变了决策倾向**。
- act_routes（10 题）：B~C 9/10、A~B 6/10、A~C 5/10。可能是巧合（n=10），也可能工具 schema 把路线 enum 摆在显眼位置改变了选择；不足以下结论。
- 违反显式指令：0（没有超出金币的商店清单，run plan 全都是计划，route 全部给出）。

### 3.7 追加测试（部分完成，按协调要求在 20 分钟处截止）

两项追加测试用剩余预算（每项 1 个工作线程，与 live 并存时总并发 ≤ 2），12:17 UTC 按协调要求截止：

**(a) 16 个失败现场题再跑一遍（部分完成：A 16/16，B、C 15/16，缺 q089 的 B、C）**

| 组 | n | 首答失败 | minor | 恢复后失败 | 与第一遍答案相同 |
|---|---|---|---|---|---|
| A | 16 | 0 | 1（run plan 多出 `boss_prep_extra` 字段） | 0 | 11/16 |
| B | 15 | 0 | 0 | 0 | 10/15 |
| C | 15 | 0 | 0 | 0 | 9/15 |

同一现场第二次也没有复现历史失败；同一组两次答案只有 60–70% 相同（这些多是难题/边界题），再次说明单题答案噪声很大。

**(b) C 经本地纯 HTTP 转发（去掉 dsh 的 ~10 s 停顿），每隔两题抽 1 题共 31 题（完成）**

| 同 31 题 | p50 s | p95 s | 平均输出 token | 输出 token/s 中位 |
|---|---|---|---|---|
| A | 17.8 | 106.1 | 6,435 | 192 |
| B | 29.7 | 83.5 | 6,342 | 188 |
| C 直连 | 23.0 | 112.5 | 8,005 | 189 |
| C 经转发 | 21.1 | 91.6 | 5,799 | 187 |

短题上停顿最明显：q016 直连 10.3 s / 227 token，转发 2.2 s / 367 token；q046 10.3 → 2.0 s；q075 10.3 → 1.6 s。去掉停顿后 C 的延迟与 A 同级，剩下的差别来自推理长度的随机波动（同一题两次输出 token 常差 2 倍）。转发的 31 题 31 个都被接受，1 题（q061 map/route-plan）又是“JSON 写成文字”、第二次提交通过——C 的“不调工具”在 124 次首答里共 3 次（2.4%）。

## 4. 各方案的搭建成本与风险

### 4.1 A（现状）
- 零新代码；问题都在“边角”：各路径校验不统一、run plan 无效时会覆盖好计划、重问可能丢字段。fix-queue HIGH 那 5 条估计 150–250 行。
- 风险：系统提示里的 {choice, reason} 格式与 run plan/商店的格式冲突（echo 根因），修法是在 run plan/商店题里显式说明、并在校验失败时保留旧计划。

### 4.2 B（API strict 工具调用）
- 代码：schema 生成 ~140 行（`lib/spec.ts`，可复用）+ 请求/修复 ~120 行（`lib/arms-ab.ts`）。
- **thinking 模式不支持 `tool_choice` = `required` 或指定函数**（API 400：“Thinking mode does not support this tool_choice”），只能 auto → 不能保证模型调用工具，新增“没调工具”失败（本次 1/93）。要强制就得关 thinking，那是另一个实验（会影响决策质量）。
- 修复轮必须把 `reasoning_content` 原样传回（带 tools 的请求否则 400）。strict 属 beta（`/beta` 端点），schema 不支持 minItems/maxItems/minLength。
- 已知 bug（DeepSeek-V3 issue #1069：strict 模式下 `function.arguments` 可能是坏 JSON）：本次 94 次调用 **0 次**坏 JSON。
- 成本 +23%、输出 +18%（配对显著）、p50 慢 ~6 s。
- 好处是结构性的：一旦调用了工具，值就在 enum 里（本次 B 的工具参数 0 次越界、0 次缺字段）。但 A 本次也是 0。

### 4.3 C（DeepSeek Harness）
- **安装（仅当前用户，无 sudo、无全局改动）**：`npm install --ignore-scripts` 到 `~/tools/dsh`（523 个包、519 MB、49 s）；Harness 家目录 `~/tools/dsh-home`（700 权限，会话 JSONL 在这里）；源码浅克隆 `~/tools/deepseek-harness-src`（只为读文档）。没改 PATH、没 `npm -g`、没碰 `jev-sts2/node_modules`（live 在用）。
- **版本**：`@deepseek-ai/dsh@0.1.7-rc.2`（npm `latest`；仓库 tag `dsh-v0.1.7-rc.2` = commit `477b4f420553e8a52c2fbccc464d7561b239c443`）+ `@deepseek-ai/dsh-sdk-client@0.1.7-rc.2`。npm `next` 的 0.2.0-rc.2（仓库 HEAD `639ed015`，今天发布）装不上：依赖 `@deepseek-ai/dsh-client-ui-settings-account@0.2.0-rc.2` 在 npm 上不存在。
- **能程序化逐题驱动**：TypeScript SDK `DeepSeekHarness`（stdio JSON-RPC 起 dsh 子进程）+ `sdk-minimal` + patch（`harness/sts2.patch.yml`，35 行）+ Cordis 插件（`harness/sts2-decision.mjs`，83 行）+ 驱动（`lib/arm-c.ts`，~140 行）。每题一个子进程（工具 schema、重试状态按题），启动 0.3–0.6 s。
- **工具面最小化**：`sdk-minimal` 默认只有一个持久 bash，且沙箱策略是 `danger-full-access`。patch 全部禁用：persistent-bash/pwsh、terminal-bash/pwsh、pty、subprocess、sandbox、sandbox-policy、jobs、mcp-resources。模型可见工具只有决策工具（会话日志 `request/header.tools` 核对过；`--dump-config` 核对过禁用行）。
- **默认上传**：dsh 的 DeepSeek 适配器默认在每个请求体里附 `dsh_session_log`（会话日志增量：系统提示、用户/助手内容、工具参数和结果、工作目录）和 `dsh_plugin_packages`（插件包清单），并带 `x-deepseek-harness-user-id`（本机匿名 UUID）与 session id 请求头。patch 禁用了前两项；请求头关不掉。
- **协议**：dsh 只走 DeepSeek 的 Anthropic 兼容接口（`/anthropic/v1/messages`，流式）。工具的 `strict` 没实现（dsh-llm 文档：per-tool strict “no producer”），`tool_choice` 没映射——C 的约束只能靠 harness 里的校验+重试，不是服务端 schema。用量只有 input/output/cache_read，无推理 token。
- **~10 s 网络停顿**：dsh 直连 DeepSeek 时每次模型调用有约 10 s 固定停顿（首个 reasoning delta 在 block-start 后约 10 s 才到，之后一口气到齐）。同样的请求体和请求头用 Node fetch 直接打 Anthropic 接口 0.8–1.5 s 流完；让 dsh 经本地纯 HTTP 转发（`probes/relay.mjs`）再连 DeepSeek，同一题 1.1–1.2 s。停顿在 dsh 进程的网络层（启动器用 `dsh-http-proxy` 装了一个 npm undici 全局 dispatcher，疑与 gzip 流有关），未彻底定位。
- **开发者预览风险**：SAFETY.md 写明“未经安全审计，不可视为安全或生产可用”，本月报告过沙箱缺陷；版本日更、`next` 装不上；插件加载按 peer 版本放行/拒绝；事件名和 SDK 选项在 0.1.7→0.2.0 之间还在变。每题一个 Node 子进程 + 519 MB 依赖，接进 bot 还要处理进程生命周期。
- 好处：harness 的循环（工具报错→重答、turn-stopping 拉回、concludeTurn 零额外调用、pre-step 收尾）确实好用，“校验 + 重试”写起来很干净。但这套逻辑在 A 里自己写 50 行就有，不需要一个运行时。

## 5. 局限
- 样本 93 题/组：历史失败率 0.2–0.6%，本实验**无法**在这个量级上区分三组；只能排除 >3% 的格式问题，并看到工具方案的新失败模式（~1–2%）。
- 题目用当前代码重建，不是当时的原始请求（state 日志里没有）；失败现场的“触发条件”未必复现（本次 A 在全部失败现场都没有再失败）。
- 顺序轮换抵消了大部分缓存先后差异，但 live bot 同时在跑、共享系统提示前缀的缓存。
- C 的延迟含 dsh 网络停顿；3.7 的 relay 复测只覆盖部分题。
- 质量只有一致性代理，没有胜率；一致率 ~80% 的噪声很大。
- 成本按高峰价；本次大部分在非高峰（实际约半价）。

## 6. 建议

1. **保留 A（JSON mode + 现有 client）**，按 fix-queue HIGH 5 条做：每种题一个校验器（可直接移植 `experiments/dsh/lib/validate.ts` + `spec.ts` 生成的 schema 当“合法集合”）；无效时先映射文字→key、再推理恢复、再**同对话修复 1 次**（前缀缓存让它几乎免费：本次修复轮 ~150 输出 token、1–2 s）；无效 run plan/路线计划/act plan **保留旧计划**（这条修掉 9GRP/YFG5 那种静默损坏，是最有价值的一条）；截断检测；按标签统计失败和修复路径。
2. **不采用 C**：没有格式上的收益，却多了 +27% 成本、网络停顿、每题一个子进程、默认上传会话日志、开发者预览的安全免责和版本不稳。
3. **B 不整体切换**：strict 保证的是“调了工具就合法”，但 thinking 模式下强制不了调用，新增的“没调工具”失败率（1/93）不低于 A 的现状；还多 +23% 成本、+18% 输出、更慢。可选的小实验：只对 run plan 用 B（run plan 的历史失败率最高、echo 根因正是格式冲突），并且把“content 里是合法 JSON”也当作可接受答案（本次 3 例没调工具的文字内容都是对的，这样就零额外调用）。
4. 顺手可做：run plan / 商店题的 user message 里明确“本题不用 {choice, reason} 格式”（A q056 那个空 choice 就是这个冲突）。

## 7. 预算、文件与复现

- DeepSeek 调用：探针 11 次（B 的 tool_choice 探针 3、C 玩具题 1、Anthropic 接口直连 4、经转发的 C 3）+ 正式实验 282 次（93 题 × 3 组，含 3 次修复/重试）+ 追加测试 78 次（另有截止时被中断的 1–2 次在途调用）= **约 373 次**（上限 450）。并发 ≤ 2（追加测试期间两个追加任务各 1 线程）。
- 代码（worktree `jev-sts2-dsh`，分支 `dsh-exp`，提交 5063843）：`experiments/dsh/` —— `select_targets.py`（选题）、`split_runs.py`（切出目标局的日志）、`build-dataset.ts` + `lib/capture.ts`（重放重建请求）、`lib/spec.ts`（schema）、`lib/validate.ts`（共用校验器）、`lib/arms-ab.ts`（A、B）、`lib/arm-c.ts` + `harness/`（C）、`run-arms.ts`（跑实验）、`judge.ts`（live 解析器判定）、`analyze.py` / `analyze_extra.py`（表）、`probes/`（探针与转发）。
- 数据（本地保留，未提交）：`experiments/dsh/data/`——`targets.json`、`dataset.jsonl`（93 个重建请求）、`results.jsonl`（279 行）、`judged.jsonl`、`results-c-relay.jsonl`、`results-rep2.jsonl`、`analysis.md`、`armA-reasoning.jsonl`（A 的完整推理）、`raw/<id>/`（B 的原始响应、C 的会话日志）。
- 复现：`python3 experiments/dsh/select_targets.py && python3 experiments/dsh/split_runs.py && npx tsx experiments/dsh/build-dataset.ts && npx tsx experiments/dsh/run-arms.ts && npx tsx experiments/dsh/judge.ts && python3 experiments/dsh/analyze.py`（选题读的是当时的日志尾部，重跑会因新日志而抽到不同的题；`data/targets.json` 是本次的冻结版）。
- API key 只从 `~/.deepseek_api_key` 读进内存/子进程环境，没有打印、没写进文件、日志或提交。
