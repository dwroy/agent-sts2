## 复盘：run NH8A3VBDRDZW — 阵亡，最高第 33 层

- 决策 534 个；Jev 调用 111 次，Claude 0 次，DeepSeek 31 次；token 392,811 入 / 5,814 出，约 $0.0167（Jev）；DeepSeek token 777,284 入（缓存命中 499,328，64%）/ 110,326 出；用时 25.4 分钟
- 决策者：code 292，jev 111，jev-plan 88，deepseek 43

### 战斗掉血（按层）
- 第 2 层 缩小甲虫: HP 64→62（-2，战后回复 +6），决策 code 7，jev 1，jev-plan 1
- 第 4 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 68→68（-0，战后回复 +6），决策 jev-plan 4，jev 3，code 3
- 第 6 层 小啃兽: HP 74→62（-12，战后回复 +6），决策 code 3，jev 2，jev-plan 1
- 第 7 层 藤蔓蹒跚者: HP 68→71（+3，战后回复 +6），决策 jev-plan 8，code 7，jev 5
- 第 9 层 方柱构装体: HP 77→63（-14，战后回复 +6），决策 code 11，jev 6，jev-plan 5
- 第 12 层 异蛙寄生虫/扭动虫: HP 69→48（-21，战后回复 +6），决策 code 14，jev 12，jev-plan 6
- 第 14 层 树叶史莱姆（中）/蛇行扼杀者: HP 54→46（-8，战后回复 +6），决策 code 9，jev 4，jev-plan 4
- 第 15 层 毛绒伏地虫/缩小甲虫: HP 52→49（-3，战后回复 +6），决策 jev 9，code 5，jev-plan 3
- 第 17 层 仪式兽: HP 79→37（-42，战后回复 +6），决策 code 14，jev 12，jev-plan 10
- 第 19 层 偷窃草蜢: HP 72→68（-4，战后回复 +6），决策 code 8，jev 4，jev-plan 4
- 第 21 层 盛碗虫（卵）/盛碗虫（石）: HP 74→79（+5，战后回复 +1），决策 jev 7，code 5，jev-plan 2
- 第 22 层 棘刺蟾蜍: HP 80→61（-19，战后回复 +6），决策 code 10，jev-plan 6，jev 5
- 第 25 层 盛碗虫（丝）/盛碗虫（卵）/盛碗虫（石）: HP 67→26（-41，战后回复 +6），决策 code 9，jev-plan 7，jev 6
- 第 27 层 外骨骼虫: HP 32→20（-12，战后回复 +6），决策 code 11，jev 10，jev-plan 5
- 第 29 层 猎人杀手: HP 50→34（-16，战后回复 +6），决策 code 10，jev-plan 5，jev 4
- 第 30 层 幼虫/直飞产卵虫/结实的卵: HP 40→32（-8，战后回复 +6），决策 code 9，jev 7，jev-plan 6
- 第 31 层 异螨: HP 38→27（-11，战后回复 +6），决策 code 15，jev 4，jev-plan 4
- 第 33 层 无厌沙虫: HP 58→0（-58），决策 code 14，jev 10，jev-plan 7

### 死亡战斗：第 33 层 无厌沙虫
- T5 [code] selection/exhaust: code: 打击 scores 46 vs 剑柄打击 14
- T5 [jev] combat/plan-choice: Jev chose plan 5/5 (防御, 防御) with confidence 0.78; code rank - (rollout's best line, added) conf 0.78
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T5 [jev] combat/plan-choice: Jev chose plan 2/3 (燃烧) with confidence 0.29; code rank 2 conf 0.29
- T5 [code] combat/plan: code plan (only line): end turn; hp -10, dmg 0
- T6 [code] selection/exhaust: code: 连环拳 scores 46 vs 拆卸 18
- T6 [jev] combat/plan-choice: Jev chose plan 3/3 (耸肩无视, 狂宴 -> 无厌沙虫, 防御) with confidence 0.53; code rank - (rollout's best line, added) conf 0.53
- T6 [code] combat/plan: code plan (only distinct line): 拆卸 -> 无厌沙虫, 防御; hp -7, dmg 25
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T6 [code] combat/plan: code plan (only line): end turn; hp -7, dmg 0
- T7 [code] selection/exhaust: code: 剑柄打击 scores 15 vs 痛击+ 8
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-9): 血墙, 防御

### 各类决策由谁做
- combat/plan-choice / jev: 99
- combat/plan-continue / jev-plan: 88
- combat/plan / code: 76
- reward/claim / code: 50
- selection/exhaust / code: 39
- combat/plan-continue / code: 30
- map/route-follow / code: 29
- combat/lethal / code: 23
- reward/card / deepseek: 17
- reward/proceed / code: 17
- combat/plan-choice+potion / jev: 10
- rest/plan / deepseek: 6
- rest/proceed / code: 6
- event/leave / code: 5
- shop/buy / deepseek: 5
- combat/end_turn / code: 4
- event/choose / deepseek: 3
- selection/upgrade / deepseek: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- selection/take into my hand / jev: 2
- shop/leave / code: 2
- shop/open / code: 2
- shop/plan / deepseek: 2
- combat/least-loss / code: 1
- event/act-plan / deepseek: 1
- event/plan / deepseek: 1
- map/route / code: 1
- map/route-change / deepseek: 1
- map/route-follow / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/remove / deepseek: 1
- selection/transform / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：15 个
- 第 7 层 combat/plan-choice: Jev chose plan 4/10 (战斗专注, 痛击 -> 藤蔓蹒跚者, 剑柄打击 -> 藤蔓蹒跚者, potion 鲜血药水, potion 马萨雷斯的赠礼) with confidence 0.32; code rank 4 (0.32)
- 第 9 层 combat/plan-choice: Jev chose plan 3/3 (战斗专注, 打击 -> 方柱构装体) with confidence 0.29; code rank - (rollout's best line, added) (0.29)
- 第 12 层 combat/plan-choice: Jev chose plan 2/3 (potion 能量药水, 打击 -> 异蛙寄生虫, 拆卸 -> 异蛙寄生虫) with confidence 0.10; code rank 2 (0.10)
- 第 14 层 combat/plan-choice: Jev chose plan 3/3 (打击 -> 蛇行扼杀者, 拆卸 -> 蛇行扼杀者, 打击 -> 蛇行扼杀者, 愤怒 -> 蛇行扼杀者) with confidence 0.23; code rank 3 (0.23)
- 第 15 层 combat/plan-choice: Jev chose plan 1/2 (预备打击 -> 毛绒伏地虫, 愤怒 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫) with confidence 0.34; code rank 1 (0.34)
- 第 15 层 combat/plan-choice: Jev chose plan 1/2 (痛击+ -> 毛绒伏地虫) with confidence 0.04; code rank 1 (0.04)
- 第 19 层 combat/plan-choice: Jev chose plan 6/6 (防御, 愤怒 -> 偷窃草蜢, 拆卸 -> 偷窃草蜢, 耸肩无视) with confidence 0.30; code rank - (rollout's best line, added) (0.30)
- 第 21 层 combat/plan-choice+potion: Jev chose to drink 能力药水, then re-plan (confidence 0.10) (0.10)
- 第 21 层 selection/take into my hand: Jev chose 薪火之源 with confidence 0.09 (0.09)
- 第 21 层 combat/plan-choice: Jev chose plan 1/2 (战斗专注, 势不可当, 残酷) with confidence 0.03; code rank 1 (0.03)
- 第 22 层 combat/plan-choice+potion: Jev chose plan 2/2 (预备打击 -> 棘刺蟾蜍) with confidence 0.13; code rank 2 (0.13)
- 第 30 层 combat/plan-choice: Jev chose plan 1/5 (战斗专注, 痛击+ -> 直飞产卵虫, 防御) with confidence 0.28; code rank 1 (0.28)
- 第 31 层 combat/plan-choice: Jev chose plan 5/5 (打击 -> 异螨 #2, 双重打击 -> 异螨 #2) with confidence 0.23; code rank - (rollout's best line, added) (0.23)
- 第 33 层 combat/plan-choice: Jev chose plan 3/4 (战斗专注, 燃烧+, 熔融之拳 -> 无厌沙虫, 狂宴 -> 无厌沙虫) with confidence 0.32; code rank 3 (0.32)
- 第 33 层 combat/plan-choice: Jev chose plan 2/3 (燃烧) with confidence 0.29; code rank 2 (0.29)
