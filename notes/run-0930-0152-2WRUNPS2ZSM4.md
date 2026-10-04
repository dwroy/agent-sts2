## 复盘：run 2WRUNPS2ZSM4 — 阵亡，最高第 17 层

- 决策 299 个；Jev 调用 70 次，Claude 0 次，DeepSeek 18 次；token 217,821 入 / 3,395 出，约 $0.0093（Jev）；DeepSeek token 436,745 入（缓存命中 262,400，60%）/ 47,835 出；用时 12.4 分钟
- 决策者：code 138，jev 70，jev-plan 67，deepseek 24

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 64→52（-12，战后回复 +6），决策 jev-plan 6，code 6，jev 4
- 第 3 层 淤泥旋螺: HP 58→57（-1，战后回复 +6），决策 code 5，jev-plan 4，jev 3
- 第 6 层 海洋混混: HP 58→46（-12，战后回复 +6），决策 code 7，jev-plan 4，jev 3
- 第 8 层 骇鳗: HP 76→52（-24，战后回复 +6），决策 code 11，jev-plan 9，jev 8
- 第 12 层 鬼祟珊瑚群: HP 80→61（-19，战后回复 +6），决策 jev 11，jev-plan 10，code 8
- 第 13 层 拳击构装体: HP 67→56（-11，战后回复 +6），决策 jev 12，jev-plan 7，code 6
- 第 15 层 下水道蚌: HP 62→60（-2，战后回复 +6），决策 code 17，jev 4，jev-plan 2
- 第 17 层 瀑布巨兽: HP 80→0（-80），决策 jev 25，jev-plan 25，code 21

### 死亡战斗：第 17 层 瀑布巨兽
- T13 [code] combat/end_turn: no playable cards; ending the turn
- T14 [jev] selection/take into my hand: Jev chose 痛击 with confidence 0.31 conf 0.31
- T14 [jev] combat/plan-choice: Jev chose plan 4/4 (剑柄打击 -> 瀑布巨兽) with confidence 0.89; code rank - (rollout's best line, added) conf 0.89
- T14 [jev] combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.73; code rank 1 conf 0.73
- T15 [jev] combat/plan-choice: Jev chose plan 1/2 (双重打击 -> 瀑布巨兽, 双重打击 -> 瀑布巨兽) with confidence 0.81; code rank 1 conf 0.81
- T15 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 双重打击 -> 瀑布巨兽
- T15 [jev] combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.91; code rank 1 conf 0.91
- T16 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 0): 耸肩无视+, 耸肩无视, 防御
- T16 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 0): 耸肩无视, 防御
- T16 [jev] selection/take into my hand: Jev chose 耸肩无视+ with confidence 0.94 conf 0.94
- T16 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 0): 耸肩无视+
- T16 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-9): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 67
- combat/plan-choice / jev: 60
- combat/plan / code: 40
- combat/plan-continue / code: 22
- reward/claim / code: 21
- map/route-follow / code: 15
- combat/lethal / code: 8
- reward/card / deepseek: 8
- selection/take into my hand / jev: 8
- reward/proceed / code: 7
- shop/buy / deepseek: 5
- combat/least-loss / code: 4
- combat/end_turn / code: 3
- event/choose / deepseek: 3
- event/leave / code: 3
- rest/plan / deepseek: 3
- rest/proceed / code: 3
- selection/add / code: 3
- selection/add / jev: 2
- shop/leave / code: 2
- shop/open / code: 2
- shop/plan / deepseek: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/choose / deepseek: 1
- selection/remove / deepseek: 1
- selection/take into my hand / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：13 个
- 第 2 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 噬尸蛞蝓 #2, 防御, 防御) with confidence 0.20; code rank 2 (0.20)
- 第 12 层 combat/plan-choice: Jev chose plan 2/2 (双重打击 -> 鬼祟珊瑚群) with confidence 0.11; code rank 2 (0.11)
- 第 13 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.20; code rank 2 (0.20)
- 第 13 层 combat/plan-choice: Jev chose plan 6/6 (双重打击 -> 拳击构装体, 打击 -> 拳击构装体, 打击 -> 拳击构装体) with confidence 0.21; code rank 6 (0.21)
- 第 13 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.11; code rank 2 (0.11)
- 第 13 层 selection/add: Jev chose 耸肩无视+ with confidence 0.27 (0.27)
- 第 15 层 combat/plan-choice: Jev chose plan 1/6 (头槌 -> 下水道蚌, 打击 -> 下水道蚌, potion 格挡药水) with confidence 0.25; code rank 1 (0.25)
- 第 17 层 combat/plan-choice: Jev chose plan 3/8 (非凡技艺, 耸肩无视+, 防御) with confidence 0.33; code rank 3 (0.33)
- 第 17 层 combat/plan-choice: Jev chose plan 2/3 (计策, 耸肩无视+, 坚毅) with confidence 0.26; code rank 2 (0.26)
- 第 17 层 combat/plan-choice: Jev chose plan 4/4 (放血, 踩踏); plan 1 (放血, 打击 -> 瀑布巨兽, 踩踏) is as good or better on every axis, playing it with confidence 0.33; code rank 1 (0.33)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (双重打击 -> 瀑布巨兽, 双重打击 -> 瀑布巨兽, 坚毅) with confidence 0.16; code rank 2 (0.16)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 瀑布巨兽, 打击 -> 瀑布巨兽, 放血, 双重打击 -> 瀑布巨兽, 双重打击 -> 瀑布巨兽) with confidence 0.33; code rank 1 (0.33)
- 第 17 层 selection/take into my hand: Jev chose 痛击 with confidence 0.31 (0.31)
