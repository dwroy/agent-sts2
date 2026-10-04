## 复盘：run 5CWLPJLYJKRL — 阵亡，最高第 33 层

- 决策 451 个；Jev 调用 97 次，Claude 0 次，DeepSeek 33 次；token 610,374 入 / 5,332 出，约 $0.0259（Jev）；DeepSeek token 4,550,220 入（缓存命中 4,208,512，92%）/ 187,146 出；用时 35.4 分钟
- 决策者：code 207，jev-plan 102，jev 97，deepseek 45

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→58（-6，战后回复 +6），决策 code 10，jev 1，jev-plan 1
- 第 4 层 淤泥旋螺: HP 64→50（-14，战后回复 +6），决策 jev-plan 3，code 3，jev 2
- 第 6 层 噬尸蛞蝓: HP 56→47（-9，战后回复 +6），决策 code 6，jev-plan 4，jev 3
- 第 8 层 鬼祟珊瑚群: HP 77→60（-17，战后回复 +6），决策 jev-plan 8，jev 7，code 5
- 第 9 层 潮湿邪教徒/钙化邪教徒: HP 66→64（-2，战后回复 +6），决策 jev 7，jev-plan 4，code 2
- 第 11 层 海洋混混/钙化邪教徒: HP 72→58（-14，战后回复 +6），决策 jev 5，code 5，jev-plan 3
- 第 12 层 下水道蚌: HP 66→66（-0，战后回复 +6），决策 code 6，jev 3，jev-plan 2
- 第 15 层 花园幽灵鳗: HP 74→58（-16，战后回复 +6），决策 jev-plan 7，code 6，jev 4
- 第 17 层 乐加维林族母: HP 80→45（-35，战后回复 +6），决策 code 20，jev 9，jev-plan 7
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 76→62（-14，战后回复 +6），决策 jev 5，jev-plan 5，code 1
- 第 21 层 偷窃草蜢: HP 75→61（-14，战后回复 +6），决策 code 4，jev-plan 3，jev 2
- 第 22 层 盛碗虫（丝）/盛碗虫（石）/盛碗虫（蜜）: HP 74→71（-3，战后回复 +6），决策 jev 8，jev-plan 7，code 3
- 第 23 层 棘刺蟾蜍: HP 79→61（-18，战后回复 +6），决策 jev 10，jev-plan 8，code 2
- 第 24 层 幼虫/直飞产卵虫/结实的卵: HP 69→61（-8，战后回复 +6），决策 jev 10，jev-plan 8，code 6
- 第 30 层 感染棱柱: HP 80→61（-19，战后回复 +6），决策 jev 12，jev-plan 9，code 5
- 第 33 层 火箭/碾碎爪: HP 74→0（-74），决策 jev-plan 23，code 13，jev 9

### 死亡战斗：第 33 层 火箭/碾碎爪
- T7 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 岩石铠甲+
- T7 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 坚毅
- T7 [code] combat/end_turn: no playable cards; ending the turn
- T8 [jev] combat/plan-choice: Jev chose plan 5/5 (打击 -> 火箭, 血墙, 双重打击 -> 碾碎爪) with confidence 0.83; code rank - (rollout's best line, added) conf 0.83
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 血墙
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 双重打击 -> 碾碎爪
- T8 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 0
- T9 [code] combat/plan: code plan (only distinct line): 飞剑回旋镖, 愤怒 -> 火箭, 势不可当, 打击 -> 火箭; hp -1, dmg 49
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 愤怒 -> 火箭
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 势不可当
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 火箭
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-26): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 102
- combat/plan-choice+potion / jev: 70
- reward/claim / code: 40
- combat/plan / code: 37
- map/route-follow / code: 29
- combat/plan-choice / jev: 26
- combat/plan-continue / code: 25
- combat/lethal / code: 22
- reward/card / deepseek: 15
- reward/proceed / code: 15
- event/choose / deepseek: 6
- event/leave / code: 6
- rest/plan / deepseek: 6
- rest/proceed / code: 6
- selection/discard / code: 6
- shop/buy / deepseek: 6
- combat/end_turn / code: 3
- selection/upgrade / deepseek: 3
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / deepseek: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- selection/remove / deepseek: 2
- selection/take into my hand / code: 2
- combat/least-loss / code: 1
- event/act-plan / deepseek: 1
- event/plan / deepseek: 1
- map/route-follow / deepseek: 1
- map/route-only / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/confirm / code: 1
- selection/take into my hand / jev: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：3 个
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 赌徒特酿, then re-plan (confidence 0.24) (0.24)
- 第 24 层 combat/plan-choice+potion: Jev chose plan 2/3 (愤怒 -> 直飞产卵虫) with confidence 0.28; code rank 2 (0.28)
- 第 33 层 combat/plan-choice: Jev chose plan 7/9 (撕裂, potion 缚魂药水, 双重打击 -> 碾碎爪, 打击 -> 碾碎爪, 坚毅) with confidence 0.21; code rank 7 (0.21)
