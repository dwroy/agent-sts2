## 复盘：run W8JDDTMSYA6T — 阵亡，最高第 31 层

- 决策 427 个；Jev 调用 62 次，Claude 0 次，DeepSeek 0 次；token 129,637 入 / 2,830 出，约 $0.0056；用时 20.7 分钟
- 决策者：code 321，jev 62，jev-plan 44

### 战斗掉血（按层）
- 第 2 层 缩小甲虫: HP 64→62（-2），决策 code 8，jev-plan 3，jev 2
- 第 3 层 小啃兽: HP 68→65（-3），决策 code 7，jev-plan 4，jev 2
- 第 4 层 毛绒伏地虫: HP 71→67（-4），决策 code 4，jev 1，jev-plan 1
- 第 4 层 毛绒伏地虫: HP 67→67（-0），决策 code 2
- 第 6 层 闪光贾克斯果/飞蝇菌子: HP 73→44（-29），决策 code 7，jev-plan 3，jev 2
- 第 6 层 闪光贾克斯果: HP 44→44（-0），决策 code 1
- 第 12 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 80→58（-22），决策 code 12，jev-plan 3，jev 2
- 第 12 层 树叶史莱姆（中）: HP 58→58（-0），决策 code 3
- 第 13 层 异蛙寄生虫: HP 64→64（-0），决策 code 4，jev-plan 2，jev 1
- 第 13 层 异蛙寄生虫: HP 64→64（-0），决策 jev 1
- 第 13 层 异蛙寄生虫/扭动虫: HP 64→64（-0），决策 code 7，jev 2，jev-plan 2
- 第 13 层 扭动虫: HP 64→52（-12），决策 code 8
- 第 13 层 扭动虫: HP 52→52（-0），决策 code 7
- 第 15 层 劫掠者刺客/劫掠者暴徒/劫掠者追踪手: HP 58→49（-9），决策 code 7，jev-plan 2，jev 1
- 第 15 层 劫掠者暴徒/劫掠者追踪手: HP 49→39（-10），决策 code 5
- 第 17 层 仪式兽: HP 69→21（-48），决策 code 17，jev 2，jev-plan 2
- 第 19 层 偷窃草蜢: HP 69→58（-11），决策 code 8，jev 1
- 第 19 层 偷窃草蜢: HP 58→58（-0），决策 code 3，jev-plan 2，jev 1
- 第 24 层 盛碗虫（石）/盛碗虫（蜜）: HP 80→69（-11），决策 jev-plan 3，jev 2，code 2
- 第 24 层 盛碗虫（石）/盛碗虫（蜜）: HP 69→69（-0），决策 jev 1
- 第 24 层 盛碗虫（石）: HP 69→62（-7），决策 code 2
- 第 24 层 盛碗虫（石）: HP 62→62（-0），决策 code 3
- 第 25 层 蜂群术士: HP 68→37（-31），决策 code 8，jev 2，jev-plan 2
- 第 25 层 蜂群术士: HP 37→37（-0），决策 jev-plan 2，jev 1
- 第 25 层 蜂群术士: HP 37→8（-29），决策 code 4，jev 2，jev-plan 1
- 第 28 层 异螨: HP 38→37（-1），决策 code 31，jev-plan 2，jev 1
- 第 29 层 盛碗虫（卵）/盛碗虫（石）/盛碗虫（蜜）: HP 43→25（-18），决策 code 8，jev 1，jev-plan 1
- 第 29 层 盛碗虫（石）/盛碗虫（蜜）: HP 25→16（-9），决策 code 6，jev 1，jev-plan 1
- 第 31 层 直飞产卵虫/结实的卵: HP 21→21（-0），决策 code 4，jev-plan 3，jev 1
- 第 31 层 幼虫/直飞产卵虫/结实的卵: HP 21→1（-20），决策 jev 6，jev-plan 5，code 1
- 第 31 层 直飞产卵虫/结实的卵: HP 1→1（-0），决策 code 4

### 死亡战斗：第 31 层 直飞产卵虫/结实的卵
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): 打击 -> 直飞产卵虫, 防御, 防御+
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 防御+
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): end turn

### 各类决策由谁做
- combat/plan / code: 83
- combat/plan-continue / code: 67
- combat/plan-continue / jev-plan: 44
- reward/claim / code: 36
- combat/plan-choice / jev: 26
- map/route / code: 25
- combat/lethal / code: 17
- reward/proceed / code: 13
- reward/card / code: 11
- selection/add / code: 11
- combat/end_turn / code: 10
- combat/plan-choice+potion / jev: 9
- event/leave / code: 7
- shop/buy / code: 6
- event/choose / jev: 5
- map/route / jev: 5
- shop/buy / jev: 5
- rest/choose / code: 4
- rest/proceed / code: 4
- selection/add / jev: 4
- selection/take into my hand / jev: 4
- shop/leave / code: 4
- shop/open / code: 4
- combat/least-loss / code: 3
- reward/card / jev: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/plan-guarded / code: 2
- selection/remove / code: 2
- selection/upgrade / code: 2
- combat/play / jev: 1
- combat/potion-now / code: 1
- event/heal / code: 1
- event/only / code: 1
- run/finalize / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：12 个
- 第 8 层 shop/buy: Jev chose buy 岩石铠甲 (35g) with confidence 0.14 (0.14)
- 第 13 层 selection/take into my hand: Jev chose 坚毅 with confidence 0.17 (0.17)
- 第 13 层 selection/add: Jev chose 挑衅 with confidence 0.23 (0.23)
- 第 13 层 reward/card: Jev chose 拆卸 (Attack, 1E) with confidence 0.20 (0.20)
- 第 18 层 event/choose: Jev chose 佩尔之肉 with confidence 0.08 (0.08)
- 第 20 层 shop/buy: Jev chose pay 150g to remove a card with confidence 0.12 (0.12)
- 第 20 层 shop/buy: Jev chose buy 双重打击 (52g) with confidence 0.22 (0.22)
- 第 24 层 combat/plan-choice: Jev chose plan 1/3 (欺凌 -> 盛碗虫（蜜）, 头槌 -> 盛碗虫（蜜）, 头槌 -> 盛碗虫（蜜）) with confidence 0.16; code rank 1 (0.16)
- 第 24 层 selection/add: Jev chose 头槌 with confidence 0.12 (0.12)
- 第 25 层 combat/plan-choice+potion: Jev chose plan 1/1 (愤怒 -> 蜂群术士) with confidence 0.08; code rank 1 (0.08)
- 第 25 层 combat/plan-choice+potion: Jev chose plan 1/1 (打击 -> 蜂群术士, 坚毅) with confidence 0.04; code rank 1 [calc mismatch: solver says ending now does not kill, mod says lethal] (0.04)
- 第 31 层 selection/take into my hand: Jev chose 战斗专注 with confidence 0.26 (0.26)
