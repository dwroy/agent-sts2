## 复盘：run HFNEL0CRKF96 — 阵亡，最高第 17 层

- 决策 261 个；Jev 调用 47 次，Claude 0 次，DeepSeek 16 次；token 234,001 入 / 2,504 出，约 $0.0099（Jev）；DeepSeek token 2,059,743 入（缓存命中 1,731,200，84%）/ 74,844 出；用时 14.2 分钟
- 决策者：code 135，jev-plan 57，jev 47，deepseek 22

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→64（-0，战后回复 +6），决策 jev-plan 6，code 4，jev 2
- 第 3 层 海洋混混: HP 70→69（-1，战后回复 +6），决策 code 12，jev-plan 4，jev 2
- 第 8 层 花园幽灵鳗: HP 60→47（-13，战后回复 +6），决策 code 12，jev-plan 8，jev 7
- 第 11 层 噬尸蛞蝓: HP 53→49（-4，战后回复 +6），决策 code 5，jev 4，jev-plan 4
- 第 14 层 潮湿邪教徒/钙化邪教徒: HP 80→73（-7，战后回复 +6），决策 jev 7，jev-plan 5，code 3
- 第 15 层 气态炸弹/活雾: HP 79→66（-13，战后回复 +6），决策 jev 4，jev-plan 3，code 3
- 第 17 层 瀑布巨兽: HP 72→0（-72），决策 code 43，jev-plan 27，jev 21

### 死亡战斗：第 17 层 瀑布巨兽
- T18 [code] combat/plan: code plan (only distinct line): end turn; hp -5, dmg 0
- T19 [code] combat/plan: code plan (only distinct line): 打击 -> 瀑布巨兽; hp -0, dmg 6
- T19 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T20 [code] combat/plan: code plan (only line): 预备打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽; hp -0, dmg 24
- T20 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 瀑布巨兽
- T20 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 瀑布巨兽
- T20 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T21 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 0): 战斗专注, 邪眼, 防御
- T21 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-42): 邪眼, 防御, 防御
- T21 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T21 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T21 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-42): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 57
- combat/plan / code: 45
- combat/plan-choice / jev: 45
- combat/plan-continue / code: 19
- reward/claim / code: 18
- map/route-follow / code: 15
- selection/add / code: 8
- combat/lethal / code: 6
- reward/card / deepseek: 6
- reward/proceed / code: 6
- event/leave / code: 4
- rest/plan / deepseek: 4
- rest/proceed / code: 4
- selection/upgrade / deepseek: 4
- combat/least-loss / code: 3
- event/choose / deepseek: 3
- combat/plan-choice+potion / jev: 2
- shop/buy / deepseek: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- event/plan / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/take-planned / code: 1
- shop/leave / code: 1
- shop/open / code: 1
- shop/plan / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：10 个
- 第 3 层 combat/plan-choice: Jev chose plan 1/2 (预备打击 -> 海洋混混, 防御, 防御) with confidence 0.26; code rank 1 (0.26)
- 第 8 层 combat/plan-choice: Jev chose plan 1/4 (potion 格挡药水, potion 液态记忆, 痛击 from 液态记忆 -> 花园幽灵鳗 #2) with confidence 0.31; code rank 1 (0.31)
- 第 14 层 combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.22; code rank 1 (0.22)
- 第 14 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 潮湿邪教徒, potion 敏捷药水) with confidence 0.23; code rank 1 (0.23)
- 第 15 层 combat/plan-choice: Jev chose plan 7/7 (打击 -> 活雾, 打击 -> 活雾, 熔融之拳+ -> 活雾) with confidence 0.26; code rank 7 (0.26)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 瀑布巨兽, 战斗专注, 打击 -> 瀑布巨兽, 祭品+, potion 鲜血药水) with confidence 0.07; code rank 1 (0.07)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 瀑布巨兽, 祭品+, 头槌 -> 瀑布巨兽, 打击 -> 瀑布巨兽, potion 鲜血药水) with confidence 0.23; code rank 1 (0.23)
- 第 17 层 combat/plan-choice: Jev chose plan 2/3 (防御, 痛击+ -> 瀑布巨兽) with confidence 0.34; code rank 2 (0.34)
- 第 17 层 combat/plan-choice: Jev chose plan 2/3 (预备打击 -> 瀑布巨兽, 双重打击+ -> 瀑布巨兽, 打击 -> 瀑布巨兽) with confidence 0.11; code rank 2 (0.11)
- 第 17 层 combat/plan-choice: Jev chose plan 2/3 (防御, 防御, 防御) with confidence 0.30; code rank 2 (0.30)
