## 复盘：run 77UJNKSLHHL9 — 阵亡，最高第 33 层

- 决策 448 个；Jev 调用 74 次，Claude 0 次，DeepSeek 0 次；token 150,296 入 / 3,370 出，约 $0.0065；用时 19.9 分钟
- 决策者：code 315，jev 72，jev-plan 59，code-fallback 2

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→52（-12），决策 code 7，jev-plan 3，jev 2
- 第 3 层 淤泥旋螺: HP 58→48（-10），决策 code 6，jev-plan 2，jev 1，code-fallback 1
- 第 4 层 海洋混混: HP 54→39（-15），决策 jev-plan 3，code 3，jev 2
- 第 7 层 潮湿邪教徒/钙化邪教徒: HP 44→41（-3），决策 code 17，jev-plan 2，jev 1
- 第 12 层 噬尸蛞蝓: HP 71→70（-1），决策 code 5，jev-plan 3，jev 1
- 第 14 层 化石追踪者: HP 76→64（-12），决策 code 5，jev 1，jev-plan 1
- 第 14 层 化石追踪者: HP 64→64（-0），决策 code 2
- 第 15 层 双尾鼠: HP 70→69（-1），决策 code 6，jev 1，jev-plan 1
- 第 17 层 瀑布巨兽: HP 75→75（-0），决策 code 5，jev-plan 4，jev 2，code-fallback 1
- 第 17 层 瀑布巨兽: HP 75→70（-5），决策 code 14
- 第 17 层 瀑布巨兽: HP 70→54（-16），决策 code 7
- 第 19 层 偷窃草蜢: HP 73→73（-0），决策 code 3，jev-plan 2，jev 1
- 第 19 层 偷窃草蜢: HP 73→65（-8），决策 code 5，jev-plan 2，jev 1
- 第 20 层 地道虫: HP 71→71（-0），决策 code 3，jev-plan 2，jev 1
- 第 20 层 地道虫: HP 71→47（-24），决策 code 12，jev 1，jev-plan 1
- 第 25 层 虱虫之祖: HP 67→47（-20），决策 code 18，jev 1
- 第 27 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 53→26（-27），决策 code 19
- 第 28 层 寄生惧魔/胧光怪: HP 32→22（-10），决策 code 7，jev 3，jev-plan 2
- 第 28 层 寄生惧魔/胧光怪: HP 22→15（-7），决策 jev 6，jev-plan 6，code 1
- 第 29 层 盛碗虫（丝）/盛碗虫（卵）/盛碗虫（石）: HP 17→17（-0），决策 code 3，jev-plan 2，jev 1
- 第 29 层 盛碗虫（丝）/盛碗虫（卵）/盛碗虫（石）: HP 17→17（-0），决策 code 9，jev 1，jev-plan 1
- 第 30 层 幼虫/直飞产卵虫/结实的卵: HP 23→12（-11），决策 jev 8，jev-plan 7，code 4
- 第 30 层 直飞产卵虫/结实的卵: HP 12→12（-0），决策 code 5
- 第 31 层 啃咬机: HP 18→6（-12），决策 code 9，jev-plan 5，jev 4
- 第 33 层 无厌沙虫: HP 36→8（-28），决策 jev 13，jev-plan 10，code 1

### 死亡战斗：第 33 层 无厌沙虫
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 无厌沙虫
- T3 [jev] combat/plan-choice+potion: Jev chose plan 1/2 (potion 虚弱药水 -> 无厌沙虫) with confidence 0.77; code rank 1 conf 0.77
- T3 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.53; code rank 1 conf 0.53
- T4 [jev] combat/plan-choice+potion: Jev chose plan 1/4 (燃烧, 痛击+ -> 无厌沙虫, 熔融之拳 -> 无厌沙虫) with confidence 0.97; code rank 1 conf 0.97
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 痛击+ -> 无厌沙虫
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 熔融之拳 -> 无厌沙虫
- T4 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.79; code rank 1 conf 0.79
- T5 [jev] combat/play: Jev chose c4 (Play 防御) with confidence 0.77 conf 0.77
- T5 [jev] combat/play: Jev chose c1->e0 (Play 打击 on 无厌沙虫) with confidence 0.46 conf 0.46
- T5 [jev] combat/play: Jev chose c0 (Play 燃烧) with confidence 0.27 conf 0.27
- T5 [jev] combat/play: Jev chose c1 (Play 突破) with confidence 0.41 conf 0.41
- T5 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan / code: 102
- combat/plan-continue / jev-plan: 59
- combat/plan-continue / code: 54
- reward/claim / code: 39
- combat/plan-choice+potion / jev: 26
- map/route / code: 24
- combat/plan-choice / jev: 22
- reward/proceed / code: 16
- combat/lethal / code: 13
- reward/card / code: 12
- map/route / jev: 8
- combat/end_turn / code: 7
- selection/add / code: 7
- event/leave / code: 5
- rest/choose / code: 5
- rest/proceed / code: 5
- shop/buy / code: 5
- combat/play / jev: 4
- event/choose / jev: 4
- reward/card / jev: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- shop/leave / code: 3
- shop/open / code: 3
- combat/plan-choice / code-fallback: 2
- selection/upgrade / code: 2
- shop/buy / jev: 2
- event/only / code: 1
- run/finalize / code: 1
- selection/remove / code: 1
- selection/take into my hand / jev: 1
- selection/transform / code: 1
- selection/upgrade / jev: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：17 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (防御, 打击 -> 蟾蜍蝌蚪, 打击 -> 蟾蜍蝌蚪) with confidence 0.22; code rank 1 (0.22)
- 第 2 层 reward/card: Jev chose 突破 (Attack, 1E) with confidence 0.24 (0.24)
- 第 3 层 combat/plan-choice: Jev chose plan 2/2 (突破, 防御, 打击 -> 淤泥旋螺) with confidence 0.31; code rank 2 (0.31)
- 第 7 层 combat/plan-choice: Jev chose plan 1/3 (头槌 -> 潮湿邪教徒, 防御, 防御) with confidence 0.26; code rank 1 (0.26)
- 第 17 层 selection/take into my hand: Jev chose 挑衅 with confidence 0.25 (0.25)
- 第 18 层 event/choose: Jev chose 营养汤 with confidence 0.34 (0.34)
- 第 19 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 偷窃草蜢, 打击 -> 偷窃草蜢, 火焰屏障) with confidence 0.16; code rank 1 (0.16)
- 第 19 层 combat/plan-choice: Jev chose plan 1/2 (防御, 无惧疼痛, 防御) with confidence 0.15; code rank 1 (0.15)
- 第 21 层 event/choose: Jev chose 用火烧杀 with confidence 0.16 (0.16)
- 第 22 层 event/choose: Jev chose 拒绝 with confidence 0.04 (0.04)
- 第 22 层 selection/upgrade: Jev chose 地狱狂徒 with confidence 0.31 (0.31)
- 第 23 层 shop/buy: Jev chose stop shopping with confidence 0.19 (0.19)
- 第 25 层 reward/card: Jev chose 双重打击 (Attack, 1E) with confidence 0.31 (0.31)
- 第 28 层 reward/card: Jev chose 熔融之拳 (Attack, 1E) with confidence 0.08 (0.08)
- 第 30 层 combat/plan-choice: Jev chose plan 1/2 (熔融之拳 -> 直飞产卵虫, 打击 -> 直飞产卵虫, 无惧疼痛) with confidence 0.19; code rank 1 (0.19)
