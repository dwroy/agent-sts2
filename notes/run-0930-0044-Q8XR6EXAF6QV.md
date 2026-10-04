## 复盘：run Q8XR6EXAF6QV — 阵亡，最高第 48 层

- 决策 668 个；Jev 调用 115 次，Claude 0 次，DeepSeek 49 次；token 452,156 入 / 6,272 出，约 $0.0193（Jev）；DeepSeek token 1,303,990 入（缓存命中 856,576，66%）/ 201,841 出；用时 41.1 分钟
- 决策者：code 352，jev-plan 133，jev 115，deepseek 68

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 64→60（-4，战后回复 +6），决策 jev-plan 7，code 7，jev 4
- 第 3 层 小啃兽: HP 66→65（-1，战后回复 +6），决策 code 6，jev-plan 3，jev 2
- 第 4 层 毛绒伏地虫: HP 71→71（-0，战后回复 +6），决策 code 5，jev-plan 3，jev 2
- 第 6 层 闪光贾克斯果/飞蝇菌子: HP 68→63（-5，战后回复 +6），决策 code 7，jev-plan 6，jev 4
- 第 8 层 旧日雕像: HP 69→33（-36，战后回复 +6），决策 code 12，jev-plan 4，jev 2
- 第 11 层 异蛙寄生虫/扭动虫: HP 63→67（+4，战后回复 +6），决策 code 7，jev 6，jev-plan 6
- 第 13 层 墨宝: HP 73→70（-3，战后回复 +6），决策 code 5，jev-plan 3，jev 2
- 第 15 层 多尼斯异鸟: HP 76→62（-14，战后回复 +6），决策 jev 6，jev-plan 3，code 3
- 第 17 层 同族信徒/同族神官: HP 80→42（-38，战后回复 +6），决策 jev-plan 8，code 7，jev 5
- 第 19 层 地道虫: HP 73→69（-4，战后回复 +6），决策 code 9，jev 4，jev-plan 1
- 第 20 层 盛碗虫（卵）/盛碗虫（石）: HP 75→60（-15，战后回复 +6），决策 code 6，jev-plan 3，jev 2
- 第 21 层 寄生惧魔/胧光怪: HP 66→63（-3，战后回复 +6），决策 jev-plan 8，jev 5，code 5
- 第 24 层 虱虫之祖: HP 69→65（-4，战后回复 +6），决策 code 12，jev 4，jev-plan 2
- 第 28 层 残杀千足虫: HP 71→20（-51，战后回复 +6），决策 jev-plan 11，code 9，jev 6
- 第 31 层 异螨: HP 65→65（-0，战后回复 +6），决策 jev 7，jev-plan 7，code 5
- 第 33 层 知识恶魔: HP 71→38（-33，战后回复 +6），决策 code 23，jev-plan 11，jev 8
- 第 35 层 咬人卷轴: HP 72→72（-0，战后回复 +6），决策 jev 3，code 3，jev-plan 2
- 第 36 层 虔诚雕刻师: HP 78→78（-0，战后回复 +2），决策 jev 5，jev-plan 4，code 4
- 第 37 层 失落之物/遗忘之物: HP 80→79（-1，战后回复 +1），决策 code 9，jev 7，jev-plan 7
- 第 39 层 咬人卷轴: HP 68→68（-0，战后回复 +6），决策 jev 2，jev-plan 2，code 2
- 第 40 层 拳击构装体/方柱构装体: HP 74→42（-32，战后回复 +6），决策 jev 6，code 6，jev-plan 5
- 第 43 层 灵魂枢纽: HP 80→20（-60，战后回复 +6），决策 code 12，jev 8，jev-plan 7
- 第 45 层 电球头: HP 65→49（-16，战后回复 +6），决策 code 7，jev-plan 4，jev 3
- 第 48 层 女王/火炬头聚合体: HP 80→0（-80），决策 code 17，jev-plan 16，jev 12

### 死亡战斗：第 48 层 女王/火炬头聚合体
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 预备打击 -> 女王
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 耸肩无视
- T8 [code] combat/plan: code plan (only distinct line): 愤怒+ -> 女王; hp -16, dmg 14
- T8 [code] combat/plan: code plan (only line): end turn; hp -16, dmg 0
- T9 [jev] combat/plan-choice: Jev chose plan 1/2 (上勾拳+ -> 女王, 痛殴 -> 女王) with confidence 0.61; code rank 1 conf 0.61
- T9 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 痛殴 -> 女王
- T9 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-25): 拆卸 -> 女王, 防御, 头槌 -> 女王
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 头槌 -> 女王
- T10 [code] selection/add: code: 防御 scores 109.5 vs 拆卸 7.6
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-25): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 133
- combat/plan / code: 104
- combat/plan-choice / jev: 102
- reward/claim / code: 61
- map/route-follow / code: 42
- combat/plan-continue / code: 37
- combat/lethal / code: 23
- reward/card / deepseek: 23
- reward/proceed / code: 23
- selection/add / code: 12
- rest/plan / deepseek: 11
- rest/proceed / code: 11
- combat/plan-choice+potion / jev: 10
- shop/buy / deepseek: 9
- combat/end_turn / code: 6
- event/choose / deepseek: 6
- event/leave / code: 6
- selection/upgrade / deepseek: 5
- selection/curse / code: 4
- shop/leave / code: 4
- shop/open / code: 4
- shop/plan / deepseek: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- selection/take into my hand / jev: 3
- combat/least-loss / code: 2
- event/act-plan / deepseek: 2
- map/route / code: 2
- map/route-follow / deepseek: 2
- selection/remove / deepseek: 2
- bundle/choose / deepseek: 1
- bundle/confirm / code: 1
- event/plan / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/transform / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：16 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 树叶史莱姆（小）, 打击 -> 树叶史莱姆（小）, 打击 -> 树枝史莱姆（中）) with confidence 0.21; code rank 1 (0.21)
- 第 8 层 combat/plan-choice: Jev chose plan 1/4 (岩石铠甲, 与我一战！ -> 旧日雕像, 愤怒 -> 旧日雕像) with confidence 0.21; code rank 1 (0.21)
- 第 11 层 combat/plan-choice: Jev chose plan 2/3 (与我一战！ -> 异蛙寄生虫, 头槌 -> 异蛙寄生虫) with confidence 0.28; code rank 2 (0.28)
- 第 11 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.30; code rank 2 (0.30)
- 第 11 层 combat/plan-choice: Jev chose plan 1/8 (与我一战！ -> 异蛙寄生虫, 岩石铠甲, potion 鲜血药水) with confidence 0.22; code rank 1; HP guard: plan 1 (与我一战！ -> 异蛙寄生虫, 岩石铠甲, potion 鲜血药水) loses 4 (0.22)
- 第 15 层 combat/plan-choice: Jev chose plan 1/2 (potion 火焰药水 -> 多尼斯异鸟) with confidence 0.26; code rank 1 (0.26)
- 第 20 层 combat/plan-choice: Jev chose plan 1/7 (防御, 岩石铠甲+, 打击 -> 盛碗虫（石）) with confidence 0.17; code rank 1 (0.17)
- 第 24 层 combat/plan-choice: Jev chose plan 3/5 (双重打击 -> 虱虫之祖, 防御+) with confidence 0.20; code rank 3 (0.20)
- 第 31 层 combat/plan-choice+potion: Jev chose plan 2/4 (防御, potion 力量药水, 飞剑回旋镖+, 头槌 -> 异螨 #2) with confidence 0.34; code rank 2 (0.34)
- 第 31 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.07; code rank 1 (0.07)
- 第 31 层 combat/plan-choice+potion: Jev chose plan 1/5 (飞剑回旋镖+, 剑柄打击 -> 异螨 #2, 头槌 -> 异螨 #2) with confidence 0.28; code rank 1 (0.28)
- 第 31 层 selection/take into my hand: Jev chose 拳斗 with confidence 0.13 (0.13)
- 第 31 层 combat/plan-choice: Jev chose plan 1/2 (旋风斩, 拳斗 -> 异螨 #2) with confidence 0.27; code rank 1 (0.27)
- 第 31 层 combat/plan-choice: Jev chose plan 1/2 (燃烧+, 邪眼, 双重打击 -> 异螨 #2) with confidence 0.22; code rank 1 (0.22)
- 第 36 层 combat/plan-choice: Jev chose plan 2/3 (与我一战！+ -> 虔诚雕刻师, 拆卸+ -> 虔诚雕刻师) with confidence 0.28; code rank 2 (0.28)
