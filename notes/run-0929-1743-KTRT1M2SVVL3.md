## 复盘：run KTRT1M2SVVL3 — 阵亡，最高第 23 层

- 决策 321 个；Jev 调用 57 次，Claude 0 次，DeepSeek 22 次；token 183,690 入 / 2,787 出，约 $0.0078（Jev）；DeepSeek token 482,066 入（缓存命中 313,600，65%）/ 117,863 出；用时 21.1 分钟
- 决策者：code 172，jev 57，jev-plan 57，deepseek 35

### 战斗掉血（按层）
- 第 2 层 缩小甲虫: HP 64→52（-12），决策 code 8，jev-plan 3，jev 2
- 第 3 层 小啃兽: HP 58→58（-0），决策 code 6，jev 4，jev-plan 4
- 第 4 层 毛绒伏地虫: HP 64→56（-8），决策 code 12，jev-plan 4，jev 2
- 第 5 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 62→30（-32），决策 jev 7，code 7，jev-plan 6
- 第 12 层 方柱构装体: HP 90→89（-1），决策 jev-plan 5，code 5，jev 4
- 第 13 层 异蛙寄生虫/扭动虫: HP 90→57（-33），决策 code 13，jev 12，jev-plan 9
- 第 14 层 藤蔓蹒跚者: HP 63→47（-16），决策 jev 5，jev-plan 5，code 5
- 第 17 层 墨影幻灵: HP 80→43（-37），决策 jev-plan 12，jev 7，code 7
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 81→63（-18），决策 code 5，jev 3，jev-plan 2
- 第 22 层 偷窃草蜢: HP 69→50（-19），决策 code 7，jev 2，jev-plan 2
- 第 23 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 56→9（-47），决策 code 18，jev 9，jev-plan 5

### 死亡战斗：第 23 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）
- T5 [jev] combat/plan-choice: Jev chose plan 3/6 (血墙) with confidence 0.24; code rank 3 conf 0.24
- T5 [code] combat/plan: code plan (only line): end turn; hp -4, dmg 0
- T6 [code] selection/exhaust: code: 打击+ scores 52 vs 痛击+ 37
- T6 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 28): 剑柄打击 -> 熟睡甲虫, 痛击+ -> 熟
- T6 [code] combat/plan: code plan (only distinct line): 耸肩无视, 邪眼; hp -8, dmg 0
- T6 [code] combat/plan: code plan (only line): 邪眼; hp -8, dmg 0
- T6 [code] combat/plan: code plan (only line): end turn; hp -8, dmg 0
- T7 [code] selection/exhaust: code: 双重打击 scores 11 vs 双重打击 11
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): 防御, 防御, 双重打击 -> 熟睡甲虫
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击 -> 熟睡甲虫
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 57
- combat/plan / code: 48
- combat/plan-choice / jev: 31
- reward/claim / code: 27
- combat/plan-choice+potion / jev: 24
- map/route-follow / code: 19
- combat/plan-continue / code: 17
- selection/exhaust / code: 13
- combat/lethal / code: 12
- reward/proceed / code: 11
- reward/card / deepseek: 10
- shop/buy / deepseek: 7
- event/leave / code: 5
- combat/end_turn / code: 3
- combat/least-loss / code: 3
- event/plan / deepseek: 3
- rest/plan / deepseek: 3
- rest/proceed / code: 3
- selection/remove / deepseek: 3
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / deepseek: 3
- selection/take into my hand / jev: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- event/act-plan / deepseek: 1
- event/choose / deepseek: 1
- map/route / code: 1
- map/route-change / deepseek: 1
- map/route-follow / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/upgrade / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：11 个
- 第 2 层 combat/plan-choice: Jev chose plan 2/3 (防御, 防御, 打击 -> 缩小甲虫) with confidence 0.29; code rank 2 (0.29)
- 第 3 层 combat/plan-choice: Jev chose plan 1/3 (邪眼, 痛击 -> 小啃兽) with confidence 0.28; code rank 1 (0.28)
- 第 5 层 combat/plan-choice+potion: Jev chose plan 3/5 (飞剑回旋镖, 双重打击 -> 树叶史莱姆（中）, 打击 -> 树叶史莱姆（中）) with confidence 0.32; code rank 3 (0.32)
- 第 5 层 combat/plan-choice+potion: Jev chose plan 1/5 (防御, 打击 -> 树枝史莱姆（中）, 防御) with confidence 0.34; code rank 1 (0.34)
- 第 5 层 combat/plan-choice+potion: Jev chose plan 1/4 (飞剑回旋镖, 双重打击 -> 树枝史莱姆（中）) with confidence 0.29; code rank 1 (0.29)
- 第 13 层 combat/plan-choice+potion: Jev chose plan 1/2 (打击 -> 异蛙寄生虫, 双重打击 -> 异蛙寄生虫) with confidence 0.25; code rank 1 (0.25)
- 第 13 层 combat/plan-choice+potion: Jev chose plan 1/3 (放血, 上勾拳 -> 异蛙寄生虫, 打击 -> 异蛙寄生虫, 打击 -> 异蛙寄生虫, 打击 -> 异蛙寄生虫) with confidence 0.30; code rank 1 (0.30)
- 第 17 层 selection/take into my hand: Jev chose 狱火 with confidence 0.13 (0.13)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (痛击+ -> 墨影幻灵, 双重打击 -> 墨影幻灵) with confidence 0.16; code rank 2 (0.16)
- 第 23 层 combat/plan-choice: Jev chose plan 1/4 (剑柄打击 -> 盛碗虫（石）) with confidence 0.27; code rank 1 (0.27)
- 第 23 层 combat/plan-choice: Jev chose plan 3/6 (血墙) with confidence 0.24; code rank 3 (0.24)
