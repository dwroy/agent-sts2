## 复盘：run FYQUP0GVWNUU — 阵亡，最高第 33 层

- 决策 457 个；Jev 调用 102 次，Claude 0 次，DeepSeek 33 次；token 563,932 入 / 5,252 出，约 $0.0239（Jev）；DeepSeek token 4,531,003 入（缓存命中 4,269,952，94%）/ 228,254 出；用时 33.2 分钟
- 决策者：code 194，jev-plan 108，jev 102，deepseek 53

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→64（-0，战后回复 +6），决策 jev 7，jev-plan 6，code 4
- 第 3 层 海洋混混: HP 70→69（-1，战后回复 +6），决策 jev 7，jev-plan 4，code 2
- 第 4 层 淤泥旋螺: HP 75→69（-6，战后回复 +6），决策 code 4，jev-plan 3，jev 2
- 第 6 层 幽灵船: HP 75→70（-5，战后回复 +6），决策 jev 11，jev-plan 8，code 1
- 第 7 层 噬尸蛞蝓: HP 76→69（-7，战后回复 +6），决策 jev 11，jev-plan 6，code 1
- 第 11 层 骇鳗: HP 75→58（-17，战后回复 +6），决策 jev-plan 11，jev 10，code 3
- 第 14 层 拳击构装体: HP 64→64（-0，战后回复 +6），决策 jev-plan 4，jev 3，code 2
- 第 17 层 灵魂异鱼: HP 70→35（-35，战后回复 +6），决策 code 15，jev-plan 10，jev 8
- 第 19 层 地道虫: HP 76→60（-16，战后回复 +6），决策 code 12，jev 2，jev-plan 2
- 第 22 层 偷窃草蜢: HP 66→58（-8，战后回复 +6），决策 code 9，jev-plan 6，jev 3
- 第 23 层 猎人杀手: HP 80→60（-20，战后回复 +6），决策 jev-plan 9，jev 6，code 6
- 第 25 层 蜂群术士: HP 66→42（-24，战后回复 +6），决策 jev 9，jev-plan 5，code 5
- 第 27 层 幼虫/直飞产卵虫/结实的卵: HP 48→40（-8，战后回复 +6），决策 jev 7，jev-plan 6，code 4
- 第 30 层 感染棱柱: HP 64→47（-17，战后回复 +6），决策 jev-plan 11，jev 6，code 1
- 第 33 层 火箭/碾碎爪: HP 73→0（-73），决策 jev-plan 17，code 13，jev 10

### 死亡战斗：第 33 层 火箭/碾碎爪
- T6 [jev] combat/plan-choice: Jev chose plan 1/3 (狱火+, 烙印, 防御, 闪电霹雳) with confidence 0.93; code rank 1 conf 0.93
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 烙印
- T6 [code] selection/exhaust: code: 放血 scores 32 vs 防御 -159
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 闪电霹雳
- T6 [code] combat/end_turn: no playable cards; ending the turn
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 火焰屏障, 打击 -> 碾碎爪, 坚毅+, 双重打击 -> 火箭
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 碾碎爪
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 坚毅+
- T7 [code] selection/exhaust: code: 痛击 scores 18 vs 双重打击 -141
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击 -> 火箭
- T7 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 108
- combat/plan-choice / jev: 96
- reward/claim / code: 39
- map/route-follow / code: 29
- combat/plan / code: 25
- combat/plan-continue / code: 22
- combat/lethal / code: 18
- reward/card / deepseek: 14
- reward/proceed / code: 14
- shop/buy / deepseek: 11
- selection/exhaust / code: 10
- combat/plan-choice+potion / jev: 6
- event/leave / code: 6
- combat/end_turn / code: 5
- rest/plan / deepseek: 5
- rest/proceed / code: 5
- shop/leave / code: 5
- shop/open / code: 5
- shop/plan / deepseek: 5
- selection/upgrade / deepseek: 4
- event/plan / deepseek: 3
- selection/remove / deepseek: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- event/choose / deepseek: 2
- selection/enchant / deepseek: 2
- bundle/choose / deepseek: 1
- bundle/confirm / code: 1
- combat/least-loss / code: 1
- event/act-plan / deepseek: 1
- map/route-follow / deepseek: 1
- map/route-only / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/take into my hand / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：7 个
- 第 3 层 combat/plan-choice: Jev chose plan 1/6 (痛击 -> 海洋混混, 耸肩无视) with confidence 0.24; code rank 1 (0.24)
- 第 6 层 combat/plan-choice: Jev chose plan 2/6 (燃烧, 痛击 -> 幽灵船) with confidence 0.20; code rank 2 (0.20)
- 第 7 层 combat/plan-choice: Jev chose plan 4/6 (耸肩无视, 防御, 防御) with confidence 0.33; code rank 4 (0.33)
- 第 11 层 combat/plan-choice: Jev chose plan 3/4 (end turn) with confidence 0.34; code rank 3 (0.34)
- 第 11 层 combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.11; code rank 1 (0.11)
- 第 23 层 combat/plan-choice: Jev chose plan 1/3 (愤怒 -> 猎人杀手, potion 虚弱药水 -> 猎人杀手) with confidence 0.19; code rank 1 (0.19)
- 第 30 层 combat/plan-choice: Jev chose plan 1/7 (potion 异鱼之油, 闪电霹雳+, 与我一战！+ -> 感染棱柱, 愤怒 -> 感染棱柱, 双重打击 -> 感染棱柱, 飞剑回旋镖) with confidence 0.33; code rank 1; HP guard: plan 1 (potion 异 (0.33)
