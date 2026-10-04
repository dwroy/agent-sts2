## 复盘：run G3MU2NADPEDU — 阵亡，最高第 33 层

- 决策 476 个；Jev 调用 109 次，Claude 0 次，DeepSeek 32 次；token 581,809 入 / 5,814 出，约 $0.0247（Jev）；DeepSeek token 4,371,249 入（缓存命中 4,012,416，92%）/ 219,356 出；用时 33.0 分钟
- 决策者：code 235，jev 109，jev-plan 91，deepseek 41

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 64→61（-3，战后回复 +6），决策 code 6，jev-plan 5，jev 4
- 第 5 层 海洋混混: HP 61→49（-12，战后回复 +6），决策 jev-plan 5，code 5，jev 4
- 第 6 层 蟾蜍蝌蚪: HP 55→46（-9，战后回复 +6），决策 jev 10，jev-plan 6，code 3
- 第 7 层 鬼祟珊瑚群: HP 52→20（-32，战后回复 +6），决策 jev 16，jev-plan 7，code 1
- 第 9 层 骇鳗: HP 50→7（-43，战后回复 +6），决策 jev 16，code 10，jev-plan 7
- 第 11 层 幽灵船: HP 13→6（-7，战后回复 +6），决策 code 11，jev 2，jev-plan 1
- 第 12 层 海洋混混/钙化邪教徒: HP 12→4（-8，战后回复 +6），决策 code 6，jev 4，jev-plan 4
- 第 14 层 花园幽灵鳗: HP 34→28（-6，战后回复 +6），决策 jev-plan 7，code 6，jev 5
- 第 17 层 灵魂异鱼: HP 60→26（-34，战后回复 +6），决策 jev-plan 17，jev 16，code 13
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 79→50（-29，战后回复 +6），决策 jev-plan 5，code 5，jev 4
- 第 20 层 外骨骼虫: HP 58→56（-2，战后回复 +6），决策 jev-plan 4，jev 3，code 3
- 第 23 层 猎人杀手: HP 64→41（-23，战后回复 +6），决策 code 7，jev 6，jev-plan 5
- 第 24 层 外骨骼虫: HP 49→41（-8，战后回复 +6），决策 jev-plan 4，jev 2，code 2
- 第 29 层 盛碗虫（丝）/盛碗虫（卵）/盛碗虫（石）: HP 75→50（-25，战后回复 +6），决策 code 7，jev 5，jev-plan 2
- 第 30 层 啃咬机: HP 78→64（-14，战后回复 +6），决策 code 8，jev 4，jev-plan 3
- 第 33 层 知识恶魔: HP 87→0（-87），决策 code 25，jev-plan 9，jev 8

### 死亡战斗：第 33 层 知识恶魔
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T8 [code] combat/plan: code plan (only line): end turn; hp -4, dmg 0
- T9 [jev] combat/plan-choice: Jev chose plan 4/4 (与我一战！+ -> 知识恶魔, 打击 -> 知识恶魔) with confidence 0.85; code rank - (rollout's best line, added) conf 0.85
- T9 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 知识恶魔
- T9 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T9 [code] selection/curse: code: Knowledge Demon curse -> 衰朽 (HP cost for this deck: DISINTEGRATION 78 (outlasts the HP: 8 a turn x 9.7 turns + 20 > 34 HP); WASTE_AWAY 132 (0.8 cards a tu
- T9 [code] selection/curse: code: Knowledge Demon curse -> 衰朽 (HP cost for this deck: DISINTEGRATION 78 (outlasts the HP: 8 a turn x 9.7 turns + 20 > 34 HP); WASTE_AWAY 132 (0.8 cards a tu
- T10 [jev] combat/plan-choice: Jev chose plan 2/3 (完美打击 -> 知识恶魔) with confidence 0.78; code rank 2 conf 0.78
- T10 [code] combat/plan: code plan (only line): end turn; hp -23, dmg 0
- T11 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 0): 耸肩无视, 防御
- T11 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-16): 防御
- T11 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-16): end turn

### 各类决策由谁做
- combat/plan-choice / jev: 107
- combat/plan-continue / jev-plan: 91
- combat/plan / code: 71
- reward/claim / code: 45
- map/route-follow / code: 29
- combat/plan-continue / code: 19
- reward/card / deepseek: 15
- reward/proceed / code: 15
- combat/lethal / code: 14
- event/leave / code: 6
- rest/plan / deepseek: 6
- rest/proceed / code: 6
- event/choose / deepseek: 5
- selection/curse / code: 5
- selection/exhaust / code: 4
- shop/buy / deepseek: 4
- combat/least-loss / code: 3
- sphere/clear / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/end_turn / code: 2
- map/route-change / deepseek: 2
- shop/leave / code: 2
- shop/open / code: 2
- shop/plan / deepseek: 2
- combat/plan-choice+potion / jev: 1
- event/act-plan / deepseek: 1
- event/plan / deepseek: 1
- map/route-follow / deepseek: 1
- map/route-only / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/choose / deepseek: 1
- selection/remove / deepseek: 1
- selection/take into my hand / jev: 1
- selection/upgrade / deepseek: 1
- sphere/proceed / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：18 个
- 第 6 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 蟾蜍蝌蚪 #1, 防御, 防御) with confidence 0.19; code rank 1 (0.19)
- 第 6 层 combat/plan-choice: Jev chose plan 1/3 (end turn) with confidence 0.23; code rank 1 (0.23)
- 第 6 层 combat/plan-choice: Jev chose plan 8/8 (打击 -> 蟾蜍蝌蚪 #1, 打击 -> 蟾蜍蝌蚪 #1, 打击 -> 蟾蜍蝌蚪 #1) with confidence 0.33; code rank - (rollout's best line, added) (0.33)
- 第 6 层 combat/plan-choice: Jev chose plan 3/3 (打击 -> 蟾蜍蝌蚪, 打击 -> 蟾蜍蝌蚪) with confidence 0.32; code rank - (rollout's best line, added) (0.32)
- 第 7 层 combat/plan-choice: Jev chose plan 2/3 (potion 异鱼之油) with confidence 0.17; code rank 2; HP guard: plan 2 (potion 异鱼之油; hp -1 + potions 9.1 HP) is more than 8 HP over the  (0.17)
- 第 9 层 combat/plan-choice: Jev chose plan 1/5 (耸肩无视, 痛击 -> 骇鳗) with confidence 0.13; code rank 1 (0.13)
- 第 9 层 combat/plan-choice: Jev chose plan 2/2 (potion 异鱼之油) with confidence 0.33; code rank 2; HP guard: plan 2 (potion 异鱼之油; hp -0 + potions 9.1 HP) is more than 8 HP over the  (0.33)
- 第 14 层 combat/plan-choice: Jev chose plan 1/5 (防御, 突破, 防御) with confidence 0.19; code rank 1 (0.19)
- 第 17 层 combat/plan-choice: Jev chose plan 2/5 (燃烧契约, 双重打击 -> 灵魂异鱼, potion 鲜血药水) with confidence 0.19; code rank 2 (0.19)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (双重打击 -> 灵魂异鱼, 愤怒 -> 灵魂异鱼, 打击 -> 灵魂异鱼, potion 鲜血药水) with confidence 0.27; code rank 1 (0.27)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (血墙, 痛殴 -> 灵魂异鱼) with confidence 0.28; code rank 1 (0.28)
- 第 19 层 combat/plan-choice: Jev chose plan 6/6 (痛击 -> 盛碗虫（蜜）, 防御) with confidence 0.24; code rank - (rollout's best line, added) (0.24)
- 第 20 层 combat/plan-choice: Jev chose plan 4/4 (打击 -> 外骨骼虫 #3, 打击 -> 外骨骼虫 #3, 耸肩无视, potion 稳定血清) with confidence 0.30; code rank 4 (0.30)
- 第 23 层 combat/plan-choice+potion: Jev chose to drink 能力药水, then re-plan (confidence 0.27) (0.27)
- 第 23 层 selection/take into my hand: Jev chose 无惧疼痛 with confidence 0.24 (0.24)
