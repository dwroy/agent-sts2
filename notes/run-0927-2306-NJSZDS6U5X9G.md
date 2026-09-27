## 复盘：run NJSZDS6U5X9G — 阵亡，最高第 31 层

- 决策 478 个；Jev 调用 107 次，Claude 0 次，DeepSeek 0 次；token 207,145 入 / 4,766 出，约 $0.0089；用时 19.6 分钟
- 决策者：code 317，jev 103，jev-plan 54，code-fallback 4

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→61（-3），决策 code 6，jev-plan 2，jev 1
- 第 3 层 噬尸蛞蝓: HP 67→59（-8），决策 code 7
- 第 4 层 蟾蜍蝌蚪: HP 65→57（-8），决策 code 5，jev-plan 2，jev 1
- 第 5 层 幽灵船: HP 63→46（-17），决策 code 7，jev-plan 6，jev 3
- 第 7 层 卑鄙地精/地精佣兵/胖地精: HP 52→27（-25），决策 code 11，jev-plan 4，jev 2，code-fallback 2
- 第 12 层 海洋混混/钙化邪教徒: HP 57→52（-5），决策 code 4，jev-plan 2，jev 1
- 第 12 层 海洋混混: HP 52→49（-3），决策 code 5
- 第 14 层 潮湿邪教徒/钙化邪教徒: HP 55→54（-1），决策 code 7
- 第 14 层 潮湿邪教徒: HP 54→54（-0），决策 code 1
- 第 17 层 瀑布巨兽: HP 80→80（-0），决策 jev 2，jev-plan 1
- 第 17 层 瀑布巨兽: HP 80→55（-25），决策 jev 7，jev-plan 6，code 1
- 第 17 层 瀑布巨兽: HP 55→30（-25），决策 jev 9，jev-plan 2
- 第 17 层 瀑布巨兽: HP 30→26（-4），决策 jev 7，jev-plan 2
- 第 17 层 瀑布巨兽: HP 26→26（-0），决策 jev 1，jev-plan 1
- 第 17 层 瀑布巨兽: HP 26→14（-12），决策 jev 9，jev-plan 5，code 2
- 第 17 层 瀑布巨兽: HP 14→14（-0），决策 code 1，code-fallback 1，jev 1
- 第 17 层 瀑布巨兽: HP 14→14（-0），决策 code 6
- 第 19 层 偷窃草蜢: HP 66→66（-0），决策 code 4
- 第 19 层 偷窃草蜢: HP 66→50（-16），决策 code 11，code-fallback 1，jev 1，jev-plan 1
- 第 21 层 地道虫: HP 71→71（-0），决策 jev 2，jev-plan 1
- 第 21 层 地道虫: HP 71→44（-27），决策 code 14，jev-plan 3，jev 2
- 第 21 层 地道虫: HP 44→31（-13），决策 code 3，jev 1，jev-plan 1
- 第 25 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 76→20（-56），决策 code 14，jev 8，jev-plan 6
- 第 25 层 熟睡甲虫: HP 20→6（-14），决策 code 4
- 第 28 层 啃咬机: HP 27→8（-19），决策 code 12，jev 5，jev-plan 5
- 第 28 层 啃咬机: HP 8→14（+6），决策 code 16，jev 3，jev-plan 1
- 第 30 层 棘刺蟾蜍: HP 44→12（-32），决策 code 26，jev 2，jev-plan 2
- 第 31 层 蜂群术士: HP 18→18（-0），决策 code 2
- 第 31 层 蜂群术士: HP 18→5（-13），决策 code 16，jev 1，jev-plan 1
- 第 31 层 蜂群术士: HP 5→5（-0），决策 code 4

### 死亡战斗：第 31 层 蜂群术士
- T6 [code] combat/end_turn: no playable cards; ending the turn
- T7 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 9): 耸肩无视, 飞剑回旋镖
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-22): 打击 -> 蜂群术士
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-22): end turn

### 各类决策由谁做
- combat/plan / code: 113
- combat/plan-continue / jev-plan: 54
- combat/plan-continue / code: 50
- combat/plan-choice+potion / jev: 37
- reward/claim / code: 33
- combat/plan-choice / jev: 30
- map/route / code: 24
- combat/lethal / code: 15
- reward/proceed / code: 13
- reward/card / code: 10
- shop/buy / code: 8
- selection/add / code: 7
- combat/end_turn / code: 6
- event/leave / code: 6
- map/route / jev: 6
- selection/choose / jev: 6
- shop/buy / jev: 6
- combat/least-loss / code: 5
- event/choose / jev: 5
- shop/leave / code: 5
- shop/open / code: 5
- rest/proceed / code: 4
- selection/add / jev: 4
- combat/plan-choice / code-fallback: 3
- rest/choose / code: 3
- reward/card / jev: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/play / jev: 2
- bundle/choose / jev: 1
- bundle/confirm / code: 1
- combat/plan-choice+potion / code-fallback: 1
- event/only / code: 1
- rest/choose / jev: 1
- run/finalize / code: 1
- selection/remove / code: 1
- selection/take into my hand / jev: 1
- selection/upgrade / jev: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：22 个
- 第 1 层 event/choose: Jev chose 卷轴箱 with confidence 0.20 (0.20)
- 第 1 层 bundle/choose: Jev chose bundle 0 with confidence 0.03 (0.03)
- 第 14 层 selection/add: Jev chose 预备打击 with confidence 0.24 (0.24)
- 第 15 层 shop/buy: Jev chose buy 武装 (52g) with confidence 0.29 (0.29)
- 第 15 层 shop/buy: Jev chose buy 飞剑回旋镖 (24g) with confidence 0.22 (0.22)
- 第 16 层 selection/upgrade: Jev chose 踩踏 with confidence 0.19 (0.19)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.34; code rank 1 (0.34)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.25; code rank 1 (0.25)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.10; code rank 1 (0.10)
- 第 17 层 selection/add: Jev chose 彼岸咆哮+ with confidence 0.24 (0.24)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.19; code rank 1 (0.19)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.19; code rank 1 (0.19)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.29; code rank 1 (0.29)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/2 (战斗专注, 预备打击+ -> 瀑布巨兽) with confidence 0.15; code rank 1 (0.15)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.20; code rank 1 (0.20)
