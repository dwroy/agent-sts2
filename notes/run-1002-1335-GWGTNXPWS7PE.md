## 复盘：run GWGTNXPWS7PE — 阵亡，最高第 44 层

- 决策 597 个；Jev 调用 133 次，Claude 0 次，DeepSeek 48 次；token 644,772 入 / 5,989 出，约 $0.0273（Jev）；DeepSeek token 6,642,746 入（缓存命中 6,195,072，93%）/ 256,142 出；用时 46.6 分钟
- 决策者：code 277，jev 133，jev-plan 127，deepseek 60

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 64→62（-2，战后回复 +6），决策 code 6，jev-plan 2，jev 1
- 第 4 层 缩小甲虫: HP 68→66（-2，战后回复 +6），决策 code 7，jev-plan 2，jev 1
- 第 5 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 72→68（-4，战后回复 +6），决策 jev-plan 5，jev 4，code 1
- 第 6 层 闪光贾克斯果/飞蝇菌子: HP 74→69（-5，战后回复 +6），决策 jev-plan 5，code 4，jev 3
- 第 9 层 方柱构装体: HP 75→61（-14，战后回复 +6），决策 jev-plan 7，jev 4，code 3
- 第 12 层 异蛙寄生虫/扭动虫: HP 80→63（-17，战后回复 +6），决策 jev 9，jev-plan 8，code 5
- 第 14 层 蛮兽: HP 69→60（-9，战后回复 +6），决策 code 5，jev 2，jev-plan 2
- 第 15 层 多尼斯异鸟: HP 66→62（-4，战后回复 +6），决策 jev 7，jev-plan 7，code 3
- 第 17 层 墨影幻灵: HP 77→12（-65，战后回复 +6），决策 jev 19，jev-plan 18，code 1
- 第 19 层 地道虫: HP 65→53（-12，战后回复 +6），决策 jev 9，jev-plan 6，code 5
- 第 21 层 外骨骼虫: HP 59→48（-11，战后回复 +6），决策 code 5，jev 4，jev-plan 3
- 第 22 层 幼虫/直飞产卵虫/结实的卵: HP 54→31（-23，战后回复 +6），决策 jev 9，jev-plan 6，code 6
- 第 28 层 蜂群术士: HP 77→50（-27，战后回复 +6），决策 jev 8，code 6，jev-plan 6
- 第 30 层 猎人杀手: HP 80→72（-8，战后回复 +6），决策 jev 7，code 5，jev-plan 4
- 第 31 层 棘刺蟾蜍: HP 78→69（-9，战后回复 +6），决策 jev 4，code 4，jev-plan 2
- 第 33 层 知识恶魔: HP 75→26（-49，战后回复 +6），决策 jev 15，code 12，jev-plan 11
- 第 35 层 咬人卷轴: HP 72→53（-19，战后回复 +6），决策 code 6，jev-plan 4，jev 3
- 第 39 层 虔诚雕刻师: HP 74→67（-7，战后回复 +6），决策 jev 5，code 5，jev-plan 4
- 第 40 层 灵魂枢纽: HP 69→27（-42，战后回复 +6），决策 jev 11，jev-plan 11，code 9
- 第 42 层 史莱姆狂战士: HP 29→4（-25，战后回复 +6），决策 code 12，jev-plan 7，jev 4
- 第 44 层 失落之物/遗忘之物: HP 29→0（-29），决策 code 9，jev-plan 7，jev 4

### 死亡战斗：第 44 层 失落之物/遗忘之物
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 双重打击 -> 失落之物
- T2 [jev] combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.23; code rank 2 conf 0.23
- T3 [code] selection/exhaust: code: 进阶之灾 scores 100 vs 闪电霹雳 25
- T3 [jev] combat/plan-choice: Jev chose plan 2/3 (闪电霹雳, 上勾拳 -> 失落之物, 万向斩 -> 失落之物) with confidence 0.97; code rank 2 conf 0.97
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 上勾拳 -> 失落之物
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 万向斩 -> 失落之物
- T3 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T4 [code] selection/exhaust: code: 愤怒 scores 30 vs 突破 16
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): 防御, 残酷, 防御
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 残酷
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 127
- combat/plan-choice+potion / jev: 96
- reward/claim / code: 52
- selection/exhaust / code: 52
- map/route-follow / code: 38
- combat/plan-choice / jev: 35
- combat/plan / code: 24
- combat/plan-continue / code: 24
- combat/lethal / code: 23
- reward/card / deepseek: 20
- reward/proceed / code: 20
- event/choose / deepseek: 10
- event/leave / code: 9
- rest/plan / deepseek: 8
- rest/proceed / code: 8
- shop/buy / deepseek: 7
- selection/curse / code: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / deepseek: 3
- combat/least-loss / code: 2
- event/act-plan / deepseek: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- selection/add / deepseek: 2
- selection/upgrade / deepseek: 2
- bundle/choose / deepseek: 1
- bundle/confirm / code: 1
- combat/plan-choice+potion-lethal / jev: 1
- combat/potion-now / code: 1
- event/plan / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/remove / deepseek: 1
- selection/take into my hand / code: 1
- selection/take into my hand / jev: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：7 个
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.03; code rank 1 (0.03)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.14; code rank 1 (0.14)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.24; code rank 1 (0.24)
- 第 40 层 combat/plan-choice+potion: Jev chose plan 1/3 (防御+, 无情猛攻 -> 灵魂枢纽) with confidence 0.10; code rank 1 (0.10)
- 第 40 层 combat/plan-choice+potion: Jev chose plan 3/3 (撕裂) with confidence 0.08; code rank - (rollout's best line, added) (0.08)
- 第 40 层 combat/plan-choice+potion: Jev chose to drink 混沌药水 (confidence 0.14) (0.14)
- 第 44 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.23; code rank 2 (0.23)
