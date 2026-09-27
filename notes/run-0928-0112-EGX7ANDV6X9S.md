## 复盘：run EGX7ANDV6X9S — 阵亡，最高第 31 层

- 决策 389 个；Jev 调用 79 次，Claude 0 次，DeepSeek 0 次；token 154,006 入 / 3,795 出，约 $0.0066；用时 17.0 分钟
- 决策者：code 247，jev 79，jev-plan 63

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 64→50（-14），决策 code 7，jev-plan 3，jev 2
- 第 4 层 蟾蜍蝌蚪: HP 56→46（-10），决策 code 11
- 第 6 层 淤泥旋螺: HP 44→40（-4），决策 jev-plan 4，code 4，jev 2
- 第 7 层 卑鄙地精/地精佣兵/胖地精: HP 46→36（-10），决策 code 8，jev 2，jev-plan 2
- 第 9 层 噬尸蛞蝓: HP 66→60（-6），决策 code 8，jev 2，jev-plan 2
- 第 12 层 拳击构装体: HP 80→69（-11），决策 code 7，jev-plan 2，jev 1
- 第 13 层 幽灵船: HP 75→62（-13），决策 code 6，jev 1，jev-plan 1
- 第 15 层 双尾鼠: HP 68→62（-6），决策 code 4
- 第 15 层 双尾鼠: HP 62→62（-0），决策 code 1
- 第 17 层 瀑布巨兽: HP 80→80（-0），决策 jev 1，jev-plan 1
- 第 17 层 瀑布巨兽: HP 80→69（-11），决策 jev-plan 7，jev 5，code 3
- 第 17 层 瀑布巨兽: HP 69→61（-8），决策 jev 5，jev-plan 5
- 第 17 层 瀑布巨兽: HP 61→29（-32），决策 jev 9，jev-plan 4，code 3
- 第 19 层 偷窃草蜢: HP 66→49（-17），决策 code 7
- 第 19 层 偷窃草蜢: HP 49→39（-10），决策 code 6，jev-plan 2，jev 1
- 第 21 层 地道虫: HP 45→32（-13），决策 code 15，jev 2，jev-plan 2
- 第 23 层 猎人杀手: HP 53→18（-35），决策 jev-plan 10，jev 7，code 6
- 第 23 层 猎人杀手: HP 18→11（-7），决策 jev 3，jev-plan 2
- 第 28 层 蜂群术士: HP 75→53（-22），决策 code 7，jev-plan 4，jev 3
- 第 28 层 蜂群术士: HP 53→32（-21），决策 code 10
- 第 30 层 盛碗虫（卵）/盛碗虫（石）/盛碗虫（蜜）: HP 64→9（-55），决策 jev-plan 6，jev 5，code 5
- 第 31 层 虱虫之祖: HP 15→13（-2），决策 jev-plan 6，jev 4
- 第 31 层 虱虫之祖: HP 13→13（-0），决策 jev 5，code 1

### 死亡战斗：第 31 层 虱虫之祖
- T2 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (无惧疼痛) with confidence 0.88; code rank 1 conf 0.88
- T2 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.76; code rank 1 conf 0.76
- T3 [jev] combat/play: Jev chose c0 (Play 防御) with confidence 0.41 conf 0.41
- T3 [jev] combat/play: Jev chose c0->e0 (Play 预备打击 on 虱虫之祖) with confidence 0.25 conf 0.25
- T3 [jev] combat/play: Jev chose c0->e0 (Play 打击 on 虱虫之祖) with confidence 0.24 conf 0.24
- T3 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 63
- combat/plan / code: 58
- combat/plan-continue / code: 41
- combat/plan-choice+potion / jev: 36
- reward/claim / code: 33
- map/route / code: 26
- combat/plan-choice / jev: 21
- combat/lethal / code: 15
- reward/proceed / code: 14
- reward/card / code: 11
- event/choose / jev: 6
- event/leave / code: 6
- selection/add / code: 6
- combat/end_turn / code: 5
- shop/buy / code: 5
- map/route / jev: 4
- rest/proceed / code: 4
- combat/play / jev: 3
- rest/choose / code: 3
- reward/card / jev: 3
- shop/leave / code: 3
- shop/open / code: 3
- sphere/clear / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- selection/take into my hand / code: 2
- shop/buy / jev: 2
- event/only / code: 1
- rest/choose / jev: 1
- run/finalize / code: 1
- selection/add / jev: 1
- selection/enchant / jev: 1
- selection/take into my hand / jev: 1
- sphere/proceed / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：17 个
- 第 1 层 event/choose: Jev chose 涅奥的护符 with confidence 0.16 (0.16)
- 第 5 层 event/choose: Jev chose 这个 with confidence 0.28 (0.28)
- 第 6 层 combat/plan-choice: Jev chose plan 1/3 (防御, 燃烧, 打击 -> 淤泥旋螺) with confidence 0.24; code rank 1 (0.24)
- 第 15 层 reward/card: Jev chose 被遗忘的仪式 (Skill, 1E) with confidence 0.09 (0.09)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 2/2 (预备打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽, 头槌 -> 瀑布巨兽) with confidence 0.26; code rank 2 (0.26)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.24; code rank 1 (0.24)
- 第 18 层 event/choose: Jev chose 佩尔之泪 with confidence 0.32 (0.32)
- 第 22 层 shop/buy: Jev chose buy 凶恶 (75g) with confidence 0.28 (0.28)
- 第 24 层 event/choose: Jev chose 进入你的洞 with confidence 0.08 (0.08)
- 第 24 层 selection/enchant: Jev chose 燃烧 with confidence 0.18 (0.18)
- 第 27 层 map/route: Jev chose Elite (row 10, col 2) with confidence 0.09 (0.09)
- 第 28 层 combat/plan-choice: Jev chose plan 2/2 (彼岸咆哮) with confidence 0.13; code rank 2; HP guard: plan 2 (彼岸咆哮) loses 18 HP, more than 8 over the cheapest line, playing plan 1 ( (0.13)
- 第 30 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.34; code rank 1 (0.34)
- 第 31 层 combat/plan-choice+potion: Jev chose plan 1/2 (战斗专注, 燃烧, 被遗忘的仪式, 彼岸咆哮, potion 能力药水, card from 能力药水) with confidence 0.21; code rank 1 (0.21)
- 第 31 层 combat/plan-choice+potion: Jev chose plan 1/2 (挑衅 -> 虱虫之祖, 燃烧, 打击 -> 虱虫之祖, potion 能力药水, card from 能力药水) with confidence 0.29; code rank 1 (0.29)
