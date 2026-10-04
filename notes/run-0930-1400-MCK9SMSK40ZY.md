## 复盘：run MCK9SMSK40ZY — 阵亡，最高第 33 层

- 决策 377 个；Jev 调用 48 次，Claude 0 次，DeepSeek 31 次；token 200,696 入 / 2,249 出，约 $0.0085（Jev）；DeepSeek token 4,026,452 入（缓存命中 3,368,704，84%）/ 226,361 出；用时 32.2 分钟
- 决策者：code 202，jev-plan 78，deepseek 49，jev 48

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→57（-7，战后回复 +6），决策 jev-plan 5，code 5，jev 3
- 第 3 层 噬尸蛞蝓: HP 63→60（-3，战后回复 +6），决策 jev-plan 7，jev 5，code 3
- 第 4 层 蟾蜍蝌蚪: HP 66→65（-1，战后回复 +6），决策 code 11，jev-plan 4，jev 3
- 第 9 层 花园幽灵鳗: HP 71→54（-17，战后回复 +6），决策 jev-plan 5，jev 3，code 3
- 第 11 层 双尾鼠: HP 60→60（-0，战后回复 +6），决策 jev 2，code 2，jev-plan 1
- 第 12 层 拳击构装体: HP 66→64（-2，战后回复 +6），决策 code 15，jev-plan 3，jev 2
- 第 15 层 潮湿邪教徒/钙化邪教徒: HP 70→68（-2，战后回复 +6），决策 code 5，jev 4，jev-plan 4
- 第 17 层 乐加维林族母: HP 80→11（-69，战后回复 +6），决策 code 16，jev-plan 10，jev 7
- 第 19 层 偷窃草蜢: HP 67→54（-13，战后回复 +6），决策 code 13，jev-plan 3，jev 2
- 第 21 层 盛碗虫（卵）/盛碗虫（石）: HP 60→59（-1，战后回复 +6），决策 jev-plan 10，code 4，jev 3
- 第 22 层 外骨骼虫: HP 65→54（-11，战后回复 +6），决策 jev-plan 6，code 4，jev 2
- 第 28 层 异螨: HP 60→56（-4，战后回复 +6），决策 code 13，jev-plan 6，jev 4
- 第 33 层 无厌沙虫: HP 77→0（-77），决策 jev-plan 14，jev 8，code 8

### 死亡战斗：第 33 层 无厌沙虫
- T4 [jev] combat/plan-choice: Jev chose plan 3/3 (耸肩无视) with confidence 0.32; code rank - (rollout's best line, added) conf 0.32
- T4 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T5 [jev] combat/plan-choice: Jev chose plan 3/4 (欺凌 -> 无厌沙虫, 防御, 旋风斩+) with confidence 0.38; code rank 3 conf 0.38
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 旋风斩+
- T5 [code] combat/plan: code plan (only line): end turn; hp -15, dmg 0
- T6 [jev] combat/plan-choice: Jev chose plan 6/7 (血墙, 防御) with confidence 0.92; code rank 6 conf 0.92
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T6 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): 防御+, 狂乱逃离
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 狂乱逃离
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 78
- combat/plan / code: 60
- combat/plan-choice / jev: 47
- map/route-follow / code: 29
- reward/claim / code: 29
- combat/plan-continue / code: 25
- combat/lethal / code: 12
- reward/card / deepseek: 12
- reward/proceed / code: 12
- selection/upgrade / deepseek: 8
- event/leave / code: 7
- rest/plan / deepseek: 7
- rest/proceed / code: 7
- shop/buy / deepseek: 7
- event/choose / deepseek: 6
- shop/leave / code: 4
- shop/open / code: 4
- shop/plan / deepseek: 4
- combat/end_turn / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/least-loss / code: 2
- combat/plan-choice+potion / jev: 1
- event/act-plan / deepseek: 1
- event/plan / deepseek: 1
- map/route-follow / deepseek: 1
- map/route-only / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/remove / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：7 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 淤泥旋螺, 防御, 防御) with confidence 0.11; code rank 1 (0.11)
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 淤泥旋螺, 防御) with confidence 0.07; code rank 1 (0.07)
- 第 22 层 combat/plan-choice: Jev chose plan 3/3 (预备打击 -> 外骨骼虫 #3, 防御, 打击 -> 外骨骼虫 #3, 打击 -> 外骨骼虫 #3, 痛击+ -> 外骨骼虫 #4, 欺凌 -> 外骨骼虫 #4, 欺凌+ -> 外骨骼虫 #4) with confidence 0.31; code rank  (0.31)
- 第 22 层 combat/plan-choice: Jev chose plan 1/2 (旋风斩+) with confidence 0.13; code rank 1 (0.13)
- 第 28 层 combat/plan-choice: Jev chose plan 6/6 (放血+, 防御, 剑柄打击+ -> 异螨 #2, 狂宴 -> 异螨 #2) with confidence 0.21; code rank - (rollout's best line, added) (0.21)
- 第 28 层 combat/plan-choice: Jev chose plan 1/2 (头槌+ -> 异螨, 撕裂+) with confidence 0.29; code rank 1 (0.29)
- 第 33 层 combat/plan-choice: Jev chose plan 3/3 (耸肩无视) with confidence 0.32; code rank - (rollout's best line, added) (0.32)
