## 复盘：run WCC7RMRLWLZK — 阵亡，最高第 17 层

- 决策 248 个；Jev 调用 51 次，Claude 0 次，DeepSeek 18 次；token 132,686 入 / 2,318 出，约 $0.0057（Jev）；DeepSeek token 310,057 入（缓存命中 225,152，73%）/ 35,825 出；用时 11.4 分钟
- 决策者：code 140，jev 51，jev-plan 39，deepseek 18

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→55（-9），决策 code 5，jev-plan 3，jev 2
- 第 4 层 蟾蜍蝌蚪: HP 61→50（-11），决策 code 9，jev 1
- 第 6 层 噬尸蛞蝓: HP 52→51（-1），决策 jev-plan 5，jev 4，code 4
- 第 7 层 化石追踪者: HP 57→41（-16），决策 code 6，jev 2，jev-plan 1
- 第 9 层 下水道蚌: HP 71→71（-0），决策 jev 4
- 第 9 层 下水道蚌: HP 71→70（-1），决策 jev-plan 4，code 3，jev 1
- 第 11 层 幽灵船: HP 76→78（+2），决策 jev 6，jev-plan 5，code 4
- 第 12 层 卑鄙地精/地精佣兵/胖地精: HP 80→63（-17），决策 jev 7，code 6，jev-plan 4
- 第 15 层 骇鳗: HP 69→21（-48），决策 code 12，jev 3，jev-plan 3
- 第 17 层 瀑布巨兽: HP 51→6（-45），决策 code 35，jev 20，jev-plan 14

### 死亡战斗：第 17 层 瀑布巨兽
- T16 [jev] combat/plan-choice: Jev chose plan 5/5 (防御, 耸肩无视, 防御) with confidence 0.87; code rank - (rollout's best line, added) conf 0.87
- T16 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 耸肩无视
- T16 [code] combat/plan: code plan (only distinct line): 打击+ -> 瀑布巨兽; hp -0, dmg 13
- T16 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T17 [code] combat/plan: code plan (only distinct line): 打击 -> 瀑布巨兽, 痛击+ -> 瀑布巨兽; hp -0, dmg 12
- T17 [code] combat/plan-continue: continuing the code-chosen plan: 痛击+ -> 瀑布巨兽
- T17 [code] combat/plan: code plan (dominates the score-best line): 怨恨 -> 瀑布巨兽; hp -0, dmg 13
- T17 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T18 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 28): 剑柄打击 -> 瀑布巨兽, 痛击+ -> 瀑
- T18 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 9): 耸肩无视+, 打击 -> 瀑布巨兽
- T18 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 0): 耸肩无视
- T18 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-35): end turn

### 各类决策由谁做
- combat/plan / code: 50
- combat/plan-choice / jev: 45
- combat/plan-continue / jev-plan: 39
- reward/claim / code: 20
- combat/plan-continue / code: 14
- map/route-follow / code: 13
- reward/card / deepseek: 8
- reward/proceed / code: 8
- combat/lethal / code: 7
- combat/least-loss / code: 6
- combat/plan-choice+potion / jev: 5
- combat/end_turn / code: 4
- combat/plan-potion / code: 3
- event/choose / deepseek: 3
- event/leave / code: 3
- rest/choose / deepseek: 3
- rest/proceed / code: 3
- map/route / code: 2
- shop/buy / deepseek: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/take into my hand / jev: 1
- selection/upgrade / deepseek: 1
- shop/buy / code: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：8 个
- 第 2 层 combat/plan-choice: Jev chose plan 2/3 (痛击 -> 淤泥旋螺, 打击 -> 淤泥旋螺) with confidence 0.22; code rank 2 (0.22)
- 第 7 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 化石追踪者, 无情猛攻 -> 化石追踪者) with confidence 0.22; code rank 1 (0.22)
- 第 9 层 combat/plan-choice+potion: Jev chose to drink 攻击药水, then re-plan (confidence 0.12) (0.12)
- 第 9 层 selection/take into my hand: Jev chose 突破 with confidence 0.05 (0.05)
- 第 12 层 combat/plan-choice: Jev chose plan 3/3 (痛击 -> 地精佣兵, 剑柄打击 -> 地精佣兵) with confidence 0.26; code rank 3 (0.26)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (防御) with confidence 0.18; code rank 2 (0.18)
- 第 17 层 combat/plan-choice: Jev chose plan 2/3 (打击 -> 瀑布巨兽, 血墙, 怨恨 -> 瀑布巨兽) with confidence 0.24; code rank 2 (0.24)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (打击+ -> 瀑布巨兽, 打击 -> 瀑布巨兽, 怨恨 -> 瀑布巨兽) with confidence 0.24; code rank 1 (0.24)
