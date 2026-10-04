## 复盘：run 2WNTQHYY4GAD — 阵亡，最高第 13 层

- 决策 167 个；Jev 调用 33 次，Claude 0 次，DeepSeek 0 次；token 42,072 入 / 1,386 出，约 $0.0018；用时 10.5 分钟
- 决策者：code 91，jev 33，jev-plan 26，deepseek 17

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→50（-14），决策 code 4，jev-plan 3，jev 2
- 第 4 层 淤泥旋螺: HP 56→53（-3），决策 code 2，jev 1，jev-plan 1
- 第 5 层 噬尸蛞蝓: HP 59→38（-21），决策 jev 5，jev-plan 5，code 5
- 第 7 层 气态炸弹/活雾: HP 44→32（-12），决策 jev 7，code 6，jev-plan 4
- 第 8 层 鬼祟珊瑚群: HP 38→37（-1），决策 jev 3，jev-plan 3，code 1
- 第 8 层 鬼祟珊瑚群: HP 37→3（-34），决策 code 8，jev 4，jev-plan 3
- 第 11 层 海洋混混/钙化邪教徒: HP 33→18（-15），决策 jev 8，code 6，jev-plan 5
- 第 13 层 地精佣兵: HP 24→1（-23），决策 code 13，jev 3，jev-plan 2

### 死亡战斗：第 13 层 地精佣兵
- T2 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 0
- T3 [jev] combat/plan-choice: Jev chose plan 1/4 (防御, 与我一战！ -> 地精佣兵) with confidence 0.37; code rank 1 conf 0.37
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 与我一战！ -> 地精佣兵
- T3 [code] combat/plan: code plan (only line): end turn; hp -5, dmg 0
- T4 [code] combat/plan: code plan (only distinct line): 痛击+ -> 地精佣兵, 防御; hp -17, dmg 7
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T4 [code] combat/plan: code plan (only line): end turn; hp -17, dmg 0
- T5 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 12): 耸肩无视, 防御, potion 力量药水,
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): 防御, 防御, potion 力量药水
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T5 [code] combat/plan-continue: continuing the code-chosen plan: potion 力量药水
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): end turn

### 各类决策由谁做
- combat/plan-choice / jev: 33
- combat/plan / code: 28
- combat/plan-continue / jev-plan: 26
- reward/claim / code: 16
- map/route-follow / code: 10
- combat/lethal / code: 8
- combat/plan-continue / code: 6
- reward/card / deepseek: 6
- reward/proceed / code: 6
- shop/buy / deepseek: 5
- combat/least-loss / code: 3
- event/leave / code: 2
- rest/choose / deepseek: 2
- rest/proceed / code: 2
- selection/take into my hand / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- event/choose / deepseek: 1
- event/only / code: 1
- map/route / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/remove / deepseek: 1
- selection/upgrade / deepseek: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：13 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (防御, 痛击 -> 海洋混混) with confidence 0.26; code rank 1 (0.26)
- 第 4 层 combat/plan-choice: Jev chose plan 1/3 (痛击 -> 淤泥旋螺, 防御) with confidence 0.10; code rank 1 (0.10)
- 第 5 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 噬尸蛞蝓, 防御) with confidence 0.27; code rank 1 (0.27)
- 第 7 层 combat/plan-choice: Jev chose plan 1/3 (重锤 -> 活雾) with confidence 0.11; code rank 1; HP guard: plan 1 (重锤 -> 活雾) loses 8 HP, more than 9 over the cheapest line, playing p (0.11)
- 第 7 层 combat/plan-choice: Jev chose plan 1/3 (狱火) with confidence 0.13; code rank 1 (0.13)
- 第 7 层 combat/plan-choice: Jev chose plan 3/3 (防御, 打击 -> 活雾, 劫掠 -> 活雾) with confidence 0.06; code rank 3 (0.06)
- 第 8 层 combat/plan-choice: Jev chose plan 1/2 (防御, 打击 -> 鬼祟珊瑚群) with confidence 0.25; code rank 1 (0.25)
- 第 8 层 combat/plan-choice: Jev chose plan 3/3 (狱火, 劫掠 -> 鬼祟珊瑚群, 防御) with confidence 0.28; code rank 3 (0.28)
- 第 11 层 combat/plan-choice: Jev chose plan 1/2 (与我一战！ -> 钙化邪教徒, 打击 -> 钙化邪教徒) with confidence 0.34; code rank 1 (0.34)
- 第 11 层 combat/plan-choice: Jev chose plan 1/4 (耸肩无视, 挑衅 -> 钙化邪教徒, 防御) with confidence 0.33; code rank 1 (0.33)
- 第 11 层 combat/plan-choice: Jev chose plan 1/4 (挑衅 -> 钙化邪教徒, 打击 -> 钙化邪教徒) with confidence 0.32; code rank 1 (0.32)
- 第 11 层 combat/plan-choice: Jev chose plan 1/4 (防御, 耸肩无视, 打击 -> 海洋混混) with confidence 0.29; code rank 1 (0.29)
- 第 13 层 combat/plan-choice: Jev chose plan 1/4 (防御, 撕裂) with confidence 0.20; code rank 1 (0.20)
