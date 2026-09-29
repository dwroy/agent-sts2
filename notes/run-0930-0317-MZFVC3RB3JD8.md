## 复盘：run MZFVC3RB3JD8 — 阵亡，最高第 33 层

- 决策 482 个；Jev 调用 84 次，Claude 0 次，DeepSeek 34 次；token 325,480 入 / 4,519 出，约 $0.0139（Jev）；DeepSeek token 852,450 入（缓存命中 554,624，65%）/ 150,568 出；用时 28.9 分钟
- 决策者：code 266，jev-plan 85，jev 84，deepseek 47

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 64→64（-0，战后回复 +6），决策 code 9
- 第 4 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 70→67（-3，战后回复 +6），决策 code 5，jev 4，jev-plan 4
- 第 6 层 小啃兽: HP 64→59（-5，战后回复 +6），决策 jev-plan 4，code 4，jev 3
- 第 7 层 藤蔓蹒跚者: HP 65→45（-20，战后回复 +6），决策 jev 4，code 4，jev-plan 3
- 第 11 层 多尼斯异鸟: HP 75→41（-34，战后回复 +6），决策 code 7，jev 4，jev-plan 4
- 第 12 层 墨宝: HP 47→46（-1，战后回复 +6），决策 code 6，jev-plan 3，jev 1
- 第 14 层 蛇行扼杀者/闪光贾克斯果: HP 76→65（-11，战后回复 +6），决策 code 5，jev 4，jev-plan 4
- 第 15 层 旧日雕像: HP 71→48（-23，战后回复 +6），决策 code 14，jev 5，jev-plan 5
- 第 17 层 同族信徒/同族神官: HP 79→5（-74，战后回复 +6），决策 jev 18，code 15，jev-plan 10
- 第 19 层 地道虫: HP 66→48（-18，战后回复 +6），决策 code 19，jev 3，jev-plan 3
- 第 21 层 盛碗虫（石）/盛碗虫（蜜）: HP 54→52（-2，战后回复 +6），决策 jev-plan 7，code 6，jev 5
- 第 22 层 猎人杀手: HP 58→42（-16，战后回复 +6），决策 code 11，jev 6，jev-plan 4
- 第 27 层 盛碗虫（丝）/盛碗虫（石）/盛碗虫（蜜）: HP 48→43（-5，战后回复 +6），决策 jev-plan 6，code 5，jev 3
- 第 29 层 啃咬机: HP 73→47（-26，战后回复 +6），决策 jev-plan 9，code 8，jev 7
- 第 31 层 感染棱柱: HP 53→27（-26，战后回复 +6），决策 code 11，jev-plan 8，jev 5
- 第 33 层 知识恶魔: HP 80→0（-80），决策 code 23，jev 12，jev-plan 11

### 死亡战斗：第 33 层 知识恶魔
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 耸肩无视
- T8 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T9 [code] combat/plan: code plan (only distinct line): 打击 -> 知识恶魔, 头槌 -> 知识恶魔; hp -0, dmg 24
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 头槌 -> 知识恶魔
- T9 [code] selection/add: code: 火焰屏障 scores 119.1 vs 耸肩无视 116.6
- T9 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T9 [code] selection/curse: code: Knowledge Demon curse -> 衰朽 (HP cost for this deck: DISINTEGRATION 162 (outlasts the HP); WASTE_AWAY 239 (1.0 cards a turn); 14 dmg/turn, 20.2 turns left,
- T10 [jev] combat/plan-choice: Jev chose plan 3/4 (火焰屏障) with confidence 0.71; code rank 3 conf 0.71
- T10 [code] combat/plan: code plan (only line): end turn; hp -6, dmg 0
- T11 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): 双重打击 -> 知识恶魔, 双重打击 -> 知识恶魔
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击 -> 知识恶魔
- T11 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 85
- combat/plan / code: 81
- combat/plan-choice / jev: 77
- reward/claim / code: 42
- map/route-follow / code: 29
- combat/plan-continue / code: 27
- combat/lethal / code: 20
- reward/card / deepseek: 15
- reward/proceed / code: 15
- selection/add / code: 10
- shop/buy / deepseek: 8
- combat/plan-choice+potion / jev: 6
- event/leave / code: 6
- rest/plan / deepseek: 5
- rest/proceed / code: 5
- selection/curse / code: 5
- combat/end_turn / code: 4
- shop/leave / code: 4
- shop/open / code: 4
- shop/plan / deepseek: 4
- event/choose / deepseek: 3
- selection/take into my hand / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/least-loss / code: 2
- event/plan / deepseek: 2
- selection/add / deepseek: 2
- selection/transform / deepseek: 2
- event/act-plan / deepseek: 1
- event/after-discard / code: 1
- map/route / code: 1
- map/route-change / deepseek: 1
- map/route-follow / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/remove / deepseek: 1
- selection/take into my hand / jev: 1
- selection/upgrade / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：12 个
- 第 6 层 combat/plan-choice: Jev chose plan 4/4 (打击 -> 小啃兽, 剑柄打击 -> 小啃兽, 痛殴 -> 小啃兽) with confidence 0.28; code rank 4 (0.28)
- 第 14 层 combat/plan-choice: Jev chose plan 1/5 (燃烧, 头槌 -> 闪光贾克斯果, 痛殴 -> 闪光贾克斯果) with confidence 0.20; code rank 1 (0.20)
- 第 15 层 combat/plan-choice+potion: Jev chose to drink 技能药水, then re-plan (confidence 0.11) (0.11)
- 第 21 层 combat/plan-choice: Jev chose plan 2/4 (痛击 -> 盛碗虫（蜜）, 头槌 -> 盛碗虫（蜜）) with confidence 0.31; code rank 2 (0.31)
- 第 22 层 combat/plan-choice: Jev chose plan 1/4 (痛击 -> 猎人杀手, 剑柄打击 -> 猎人杀手, 打击 -> 猎人杀手) with confidence 0.32; code rank 1 (0.32)
- 第 22 层 combat/plan-choice: Jev chose plan 4/4 (坚定不移) with confidence 0.27; code rank 4 (0.27)
- 第 31 层 combat/plan-choice: Jev chose plan 2/2 (火焰屏障, 打击 -> 感染棱柱, 双重打击 -> 感染棱柱, 打击 -> 感染棱柱) with confidence 0.27; code rank 2 (0.27)
- 第 33 层 combat/plan-choice: Jev chose plan 1/2 (头槌 -> 知识恶魔, 突破, 双重打击 -> 知识恶魔) with confidence 0.16; code rank 1 (0.16)
- 第 33 层 combat/plan-choice: Jev chose plan 2/2 (耸肩无视, 打击 -> 知识恶魔, 耸肩无视) with confidence 0.18; code rank 2 (0.18)
- 第 33 层 combat/plan-choice: Jev chose plan 2/3 (打击 -> 知识恶魔, 耸肩无视, 突破) with confidence 0.24; code rank 2 (0.24)
- 第 33 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.16; code rank 2 (0.16)
- 第 33 层 combat/plan-choice: Jev chose plan 3/3 (双重打击 -> 知识恶魔, 防御, 防御) with confidence 0.30; code rank 3 (0.30)
