## 复盘：run 0NZBAVFAT3JG — 阵亡，最高第 25 层

- 决策 310 个；Jev 调用 52 次，Claude 0 次，DeepSeek 27 次；token 171,192 入 / 2,720 出，约 $0.0073（Jev）；DeepSeek token 555,127 入（缓存命中 381,184，69%）/ 103,140 出；用时 18.3 分钟
- 决策者：code 167，jev-plan 53，jev 52，deepseek 38

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→60（-4），决策 jev-plan 5，code 5，jev 3
- 第 3 层 噬尸蛞蝓: HP 66→60（-6），决策 code 6，jev 2，jev-plan 1
- 第 5 层 蟾蜍蝌蚪: HP 58→72（+14），决策 code 5，jev 2，jev-plan 2
- 第 8 层 拳击构装体: HP 76→58（-18），决策 code 7，jev-plan 4，jev 3
- 第 9 层 气态炸弹/活雾: HP 64→52（-12），决策 jev 7，code 7，jev-plan 6
- 第 12 层 卑鄙地精/地精佣兵/胖地精: HP 80→69（-11），决策 code 6，jev-plan 5，jev 3
- 第 13 层 骇鳗: HP 75→47（-28），决策 code 11，jev 7，jev-plan 7
- 第 15 层 下水道蚌: HP 53→42（-11），决策 code 5，jev 1，jev-plan 1
- 第 17 层 乐加维林族母: HP 72→72（-0），决策 jev 2，code 1
- 第 17 层 乐加维林族母: HP 72→14（-58），决策 jev-plan 11，code 11，jev 8
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 68→68（-0），决策 jev-plan 2，jev 1
- 第 19 层 盛碗虫（石）: HP 68→68（-0），决策 code 6，jev 3，jev-plan 1
- 第 22 层 地道虫: HP 63→63（-0），决策 code 8，jev 4，jev-plan 4
- 第 25 层 残杀千足虫: HP 69→69（-0），决策 jev 1
- 第 25 层 残杀千足虫: HP 68→16（-52），决策 code 7，jev-plan 4，jev 3

### 死亡战斗：第 25 层 残杀千足虫
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 坚毅
- T1 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T2 [jev] combat/plan-choice: Jev chose plan 5/6 (恶魔之焰 -> 残杀千足虫) with confidence 0.10; code rank 5 conf 0.10
- T2 [code] combat/end_turn: no playable cards; ending the turn
- T3 [jev] combat/plan-choice: Jev chose plan 1/7 (防御, 突破, 防御) with confidence 0.16; code rank 1 conf 0.16
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 突破
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T3 [code] combat/plan: code plan (only line): end turn; hp -19, dmg 0
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-6): 挑衅 -> 残杀千足虫, 飞剑回旋镖, 防御+
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 飞剑回旋镖
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 防御+
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-6): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 53
- combat/plan / code: 49
- reward/claim / code: 28
- combat/plan-choice / jev: 26
- combat/plan-choice+potion / jev: 24
- map/route-follow / code: 21
- combat/plan-continue / code: 15
- combat/lethal / code: 13
- reward/card / deepseek: 11
- reward/proceed / code: 11
- shop/buy / deepseek: 7
- event/choose / deepseek: 6
- event/leave / code: 6
- combat/plan-potion / code: 4
- shop/leave / code: 4
- shop/open / code: 4
- shop/plan / deepseek: 4
- event/plan / deepseek: 3
- combat/end_turn / code: 2
- combat/least-loss / code: 2
- rest/plan / deepseek: 2
- rest/proceed / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- event/act-plan / deepseek: 1
- map/route / code: 1
- map/route-follow / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/add / jev: 1
- selection/exhaust / code: 1
- selection/remove / deepseek: 1
- selection/take into my hand / jev: 1
- selection/transform / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：9 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 淤泥旋螺, 防御+) with confidence 0.31; code rank 1 (0.31)
- 第 2 层 combat/plan-choice: Jev chose plan 3/3 (防御, 防御+, 防御) with confidence 0.22; code rank 3 (0.22)
- 第 8 层 combat/plan-choice+potion: Jev chose plan 3/3 (飞剑回旋镖, 耸肩无视, 打击 -> 拳击构装体) with confidence 0.33; code rank - (rollout's best line, added) (0.33)
- 第 8 层 combat/plan-choice+potion: Jev chose plan 3/3 (打击 -> 拳击构装体, 防御, 打击 -> 拳击构装体) with confidence 0.26; code rank - (rollout's best line, added) (0.26)
- 第 9 层 combat/plan-choice+potion: Jev chose plan 1/5 (势不可当, 打击+ -> 气态炸弹) with confidence 0.12; code rank 1 (0.12)
- 第 12 层 combat/plan-choice+potion: Jev chose plan 2/8 (与我一战！ -> 地精佣兵, 打击+ -> 地精佣兵, potion 能量药水, 无情猛攻 -> 地精佣兵) with confidence 0.34; code rank 2 (0.34)
- 第 19 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.04; code rank 2 (0.04)
- 第 25 层 combat/plan-choice: Jev chose plan 5/6 (恶魔之焰 -> 残杀千足虫) with confidence 0.10; code rank 5 (0.10)
- 第 25 层 combat/plan-choice: Jev chose plan 1/7 (防御, 突破, 防御) with confidence 0.16; code rank 1 (0.16)
