## 复盘：run 0DJ6GFZZ0TG9 — 阵亡，最高第 33 层

- 决策 401 个；Jev 调用 76 次，Claude 0 次，大脑 34 次（codex 34）；token 292,889 入 / 3,906 出，约 $0.0125（Jev）；大脑 token 4,555,261 入（缓存命中 2,705,920，59%）/ 9,791 出；用时 25.3 分钟
- 决策者：code 184，jev-plan 92，jev 76，codex 49

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 56→55（-1），决策 jev-plan 9，jev 7，code 6
- 第 5 层 噬尸蛞蝓: HP 49→48（-1），决策 jev-plan 9，jev 8，code 4
- 第 9 层 骇鳗: HP 70→59（-11），决策 jev 10，jev-plan 10，code 7
- 第 12 层 海洋混混: HP 59→58（-1），决策 code 6，jev-plan 4，jev 3
- 第 14 层 卑鄙地精/地精佣兵/胖地精: HP 58→39（-19），决策 code 6，jev 5，jev-plan 5
- 第 15 层 潮湿邪教徒/钙化邪教徒: HP 39→39（-0），决策 code 9，jev-plan 7，jev 5
- 第 17 层 瀑布巨兽: HP 61→21（-40），决策 jev 15，jev-plan 12，code 9
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 65→65（-0），决策 code 7，jev-plan 6，jev 3
- 第 22 层 地道虫: HP 65→58（-7），决策 jev 5，code 5，jev-plan 4
- 第 23 层 异螨: HP 58→47（-11），决策 jev-plan 10，code 7，jev 5
- 第 33 层 火箭/碾碎爪: HP 69→0（-69），决策 jev-plan 16，code 13，jev 10

### 死亡战斗：第 33 层 火箭/碾碎爪
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 中和 -> 碾碎爪
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 投掷匕首 -> 碾碎爪
- T5 [jev] selection/choose: Jev chose 防御 with confidence 0.11 conf 0.11
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T5 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 19
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): 蛇咬 -> 火箭, 打击 -> 火箭, 生存者+, 打击 -> 火箭, 打击 -> 火箭
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 火箭
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 生存者+
- T6 [jev] selection/choose: Jev chose 致命毒药+ with confidence 0.70 conf 0.70
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 火箭
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 火箭
- T6 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 92
- combat/plan-choice / jev: 50
- combat/plan / code: 40
- reward/claim / code: 35
- map/route-follow / code: 29
- combat/plan-continue / code: 18
- selection/choose / jev: 16
- combat/lethal / code: 15
- reward/card / codex: 10
- reward/proceed / code: 10
- rest/plan / codex: 9
- rest/proceed / code: 9
- event/leave / code: 8
- combat/plan-choice+potion / jev: 7
- event/choose / codex: 7
- shop/buy / codex: 6
- selection/upgrade / codex: 5
- combat/end_turn / code: 3
- combat/least-loss / code: 3
- event/plan / codex: 3
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / codex: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- map/route-change / codex: 2
- selection/take into my hand / jev: 2
- event/act-plan / codex: 1
- map/route-follow / codex: 1
- map/route-only / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/add / jev: 1
- selection/enchant / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：9 个
- 第 9 层 combat/plan-choice: Jev chose plan 4/6 (生存者, 蛇咬 -> 骇鳗) with confidence 0.29; code rank 4; HP guard: plan 4 (生存者, 蛇咬 -> 骇鳗; hp -16) is more than 8 HP over the cheapest lin (0.29)
- 第 9 层 selection/choose: Jev chose 打击 with confidence 0.27 (0.27)
- 第 14 层 selection/choose: Jev chose 进阶之灾 with confidence 0.27 (0.27)
- 第 14 层 combat/plan-choice: Jev chose plan 1/2 (蛇咬 -> 地精佣兵) with confidence 0.34; code rank 1 (0.34)
- 第 22 层 selection/take into my hand: Jev chose 深谋远虑 with confidence 0.21 (0.21)
- 第 22 层 selection/add: Jev chose 打击 with confidence 0.16 (0.16)
- 第 33 层 selection/choose: Jev chose 猎杀者+ with confidence 0.23 (0.23)
- 第 33 层 combat/plan-choice: Jev chose plan 1/3 (potion 癫狂之触, 速行者) with confidence 0.12; code rank 1 (0.12)
- 第 33 层 selection/choose: Jev chose 防御 with confidence 0.11 (0.11)
