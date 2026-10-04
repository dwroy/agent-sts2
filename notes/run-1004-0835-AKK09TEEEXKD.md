## 复盘：run AKK09TEEEXKD — 阵亡，最高第 17 层

- 决策 654 个；Jev 调用 170 次，Claude 0 次，大脑 16 次（codex 16）；token 1,321,703 入 / 7,891 出，约 $0.0558（Jev）；大脑 token 2,827,889 入（缓存命中 1,646,720，58%）/ 14,424 出；用时 42.9 分钟
- 决策者：code 322，jev 170，jev-plan 143，codex 19

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→53（-11，战后回复 +6），决策 code 8，jev-plan 4，jev 2
- 第 3 层 噬尸蛞蝓: HP 59→49（-10，战后回复 +6），决策 jev-plan 5，code 5，jev 3
- 第 5 层 淤泥旋螺: HP 55→48（-7，战后回复 +6），决策 jev-plan 6，jev 5，code 1
- 第 7 层 化石追踪者: HP 64→43（-21，战后回复 +6），决策 code 7，jev-plan 3，jev 2
- 第 8 层 拳击构装体: HP 49→42（-7，战后回复 +6），决策 code 9，jev-plan 7，jev 3
- 第 9 层 下水道蚌: HP 48→32（-16，战后回复 +6），决策 jev 7，code 7，jev-plan 6
- 第 14 层 海洋混混/钙化邪教徒: HP 62→59（-3，战后回复 +6），决策 code 7，jev-plan 6，jev 5
- 第 15 层 卑鄙地精/地精佣兵/胖地精: HP 65→49（-16，战后回复 +6），决策 code 9，jev-plan 4，jev 2
- 第 17 层 瀑布巨兽: HP 79→0（-79），决策 code 214，jev 141，jev-plan 102

### 死亡战斗：第 17 层 瀑布巨兽
- T18 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T19 [jev] combat/plan-choice: Jev chose plan 3/3 (心神不宁) with confidence 0.46; code rank - (rollout's best line, added) conf 0.46
- T19 [jev] combat/plan-choice: Jev chose plan 3/3 (战斗专注+, 防御) with confidence 0.50; code rank - (rollout's best line, added) conf 0.50
- T19 [jev] combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.76; code rank 1 conf 0.76
- T20 [code] combat/plan: code plan (only distinct line): 耸肩无视, 打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽; hp -0, dmg 16
- T20 [code] combat/plan: code plan (only line): 打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽; hp -0, dmg 16
- T20 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 瀑布巨兽
- T20 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T21 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-53): 防御, 防御, 防御
- T21 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T21 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T21 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-53): end turn

### 各类决策由谁做
- combat/plan / code: 161
- combat/plan-choice / jev: 144
- combat/plan-continue / jev-plan: 143
- combat/plan-continue / code: 56
- selection/add / code: 29
- combat/plan-choice+potion / jev: 23
- reward/claim / code: 19
- map/route-follow / code: 15
- combat/least-loss / code: 11
- combat/lethal / code: 9
- reward/proceed / code: 9
- reward/card / codex: 8
- combat/plan-choice+potion-lethal / jev: 3
- event/choose / codex: 3
- event/leave / code: 3
- rest/plan / codex: 2
- rest/proceed / code: 2
- shop/buy / codex: 2
- shop/leave / code: 2
- shop/open / code: 2
- shop/plan / codex: 2
- chest/open / code: 1
- chest/proceed / code: 1
- combat/end_turn / code: 1
- map/route-change / codex: 1
- map/route-plan / codex: 1
- run/finalize / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：16 个
- 第 9 层 combat/plan-choice: Jev chose plan 1/3 (心神不宁, 防御, potion 肌肉药水, 头槌+ -> 下水道蚌, 打击 -> 下水道蚌, 打击 -> 下水道蚌) with confidence 0.11; code rank 1 (0.11)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.29; code rank 1 (0.29)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 瓶装潜能, then re-plan (confidence 0.33) (0.33)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽) with confidence 0.29; code rank 1 (0.29)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (耸肩无视, 打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽) with confidence 0.16; code rank 1 (0.16)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 瓶装潜能, then re-plan (confidence 0.30) (0.30)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽) with confidence 0.28; code rank 1 (0.28)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (耸肩无视, 打击 -> 瀑布巨兽) with confidence 0.01; code rank 2; SL explore: replaying attempt 2's 耸肩无视, 打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽 instead of 耸肩无 (0.01)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 瓶装潜能, then re-plan (confidence 0.32) (0.32)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽) with confidence 0.10; code rank 1 (0.10)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 瓶装潜能, then re-plan (confidence 0.33) (0.33)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽) with confidence 0.20; code rank 1 (0.20)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (耸肩无视, 打击 -> 瀑布巨兽) with confidence 0.05; code rank 2; SL explore: replaying attempt 2's 耸肩无视, 打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽 instead of 耸肩无 (0.05)
- 第 17 层 combat/plan-choice: Jev chose plan 4/4 (防御, 打击 -> 瀑布巨兽); plan 1 (战斗专注+, 防御, 打击 -> 瀑布巨兽, 头槌+ -> 瀑布巨兽) is as good or better on every axis, playing it with confidence 0.28;  (0.28)
- 第 17 层 combat/plan-choice: Jev chose plan 4/4 (痛击 -> 瀑布巨兽, 头槌+ -> 瀑布巨兽) with confidence 0.33; code rank 4 (0.33)
