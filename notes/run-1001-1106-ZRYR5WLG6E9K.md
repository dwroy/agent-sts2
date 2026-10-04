## 复盘：run ZRYR5WLG6E9K — 阵亡，最高第 39 层

- 决策 543 个；Jev 调用 107 次，Claude 0 次，DeepSeek 40 次；token 578,564 入 / 5,282 出，约 $0.0245（Jev）；DeepSeek token 5,522,022 入（缓存命中 5,084,416，92%）/ 233,258 出；用时 39.7 分钟
- 决策者：code 260，jev-plan 117，jev 107，deepseek 59

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 64→62（-2，战后回复 +6），决策 code 9，jev-plan 6，jev 3
- 第 3 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 68→61（-7，战后回复 +6），决策 jev-plan 6，code 4，jev 3
- 第 4 层 缩小甲虫: HP 67→65（-2，战后回复 +6），决策 code 6，jev-plan 2，jev 1
- 第 7 层 旧日雕像: HP 71→52（-19，战后回复 +6），决策 jev 6，jev-plan 3，code 1
- 第 8 层 蛮兽: HP 58→50（-8，战后回复 +6），决策 jev 4，jev-plan 1，code 1
- 第 11 层 毛绒伏地虫/缩小甲虫: HP 63→48（-15，战后回复 +6），决策 jev 8，jev-plan 6，code 2
- 第 12 层 多尼斯异鸟: HP 54→42（-12，战后回复 +6），决策 jev 4，code 3，jev-plan 2
- 第 14 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 74→74（-0，战后回复 +6），决策 jev 8，jev-plan 4，code 1
- 第 17 层 墨影幻灵: HP 87→23（-64，战后回复 +6），决策 code 17，jev 9，jev-plan 9
- 第 19 层 地道虫: HP 75→75（-0，战后回复 +6），决策 jev 5，code 5，jev-plan 4
- 第 20 层 偷窃草蜢: HP 81→74（-7，战后回复 +6），决策 code 3，jev 2，jev-plan 2
- 第 22 层 啃咬机: HP 80→80（-0，战后回复 +6），决策 jev-plan 4，jev 3，code 3
- 第 23 层 寄生惧魔/胧光怪: HP 86→73（-13，战后回复 +6），决策 jev-plan 7，code 7，jev 6
- 第 25 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 79→63（-16，战后回复 +6），决策 code 12，jev-plan 9，jev 5
- 第 30 层 感染棱柱: HP 87→69（-18，战后回复 +6），决策 jev-plan 8，jev 6，code 2
- 第 31 层 异螨: HP 75→66（-9，战后回复 +6），决策 jev 8，jev-plan 8，code 2
- 第 33 层 无厌沙虫: HP 72→27（-45，战后回复 +6），决策 jev-plan 10，code 10，jev 5
- 第 35 层 咬人卷轴: HP 76→76（-0，战后回复 +6），决策 jev 5，jev-plan 4，code 4
- 第 37 层 活体盾/高塔炮手: HP 82→70（-12，战后回复 +6），决策 jev 5，jev-plan 5，code 2
- 第 38 层 猫头鹰法官: HP 76→46（-30，战后回复 +6），决策 jev-plan 12，jev 6，code 3
- 第 39 层 巨斧机器人: HP 52→0（-52），决策 code 25，jev 5，jev-plan 5

### 死亡战斗：第 39 层 巨斧机器人
- T4 [code] combat/plan: code plan (only distinct line): end turn; hp -23, dmg 0
- T5 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 24): 战斗专注, 邪眼, 闪电霹雳, 双重打击 -
- T5 [code] combat/plan: code plan (only distinct line): 预备打击 -> 巨斧机器人, 双重打击 -> 巨斧机器人; hp -0, dmg 25
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击 -> 巨斧机器人
- T5 [code] combat/plan: code plan (only distinct line): 闪电霹雳, 切割+ -> 巨斧机器人; hp -0, dmg 18
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 切割+ -> 巨斧机器人
- T5 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-10): 防御, 无情猛攻+ -> 巨斧机器人, 痛击+ -> 巨斧机器人, 打击 -> 巨斧机器人
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 无情猛攻+ -> 巨斧机器人
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 痛击+ -> 巨斧机器人
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 巨斧机器人
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-10): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 117
- combat/plan-choice / jev: 61
- reward/claim / code: 55
- combat/plan-continue / code: 51
- combat/plan-choice+potion / jev: 44
- combat/plan / code: 40
- map/route-follow / code: 33
- combat/lethal / code: 24
- reward/card / deepseek: 23
- reward/proceed / code: 21
- shop/buy / deepseek: 10
- event/leave / code: 7
- rest/plan / deepseek: 6
- rest/proceed / code: 6
- combat/end_turn / code: 3
- combat/least-loss / code: 3
- selection/upgrade / deepseek: 3
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / deepseek: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- event/act-plan / deepseek: 2
- event/choose / deepseek: 2
- event/plan / deepseek: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- selection/enchant / deepseek: 2
- selection/remove / deepseek: 2
- selection/take into my hand / jev: 2
- event/only / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/add / deepseek: 1
- selection/take-planned / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：7 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫, 防御) with confidence 0.24; code rank 1 (0.24)
- 第 4 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 缩小甲虫, 防御, 飞剑回旋镖) with confidence 0.31; code rank 1 (0.31)
- 第 19 层 combat/plan-choice: Jev chose plan 3/3 (打击 -> 地道虫, 防御, 防御, 飞剑回旋镖) with confidence 0.20; code rank - (rollout's best line, added) (0.20)
- 第 23 层 combat/plan-choice: Jev chose plan 2/3 (愤怒 -> 胧光怪, 打击 -> 胧光怪, 重锤 -> 胧光怪) with confidence 0.29; code rank 2 (0.29)
- 第 23 层 combat/plan-choice: Jev chose plan 2/3 (end turn) with confidence 0.19; code rank 2 (0.19)
- 第 23 层 combat/plan-choice: Jev chose plan 3/3 (飞剑回旋镖, 痛击 -> 寄生惧魔, 打击 -> 寄生惧魔) with confidence 0.04; code rank 3 (0.04)
- 第 25 层 combat/plan-choice: Jev chose plan 2/2 (战斗专注, 飞剑回旋镖, 愤怒 -> 盛碗虫（丝）, 飞剑回旋镖, 愤怒 -> 熟睡甲虫) with confidence 0.19; code rank 2 (0.19)
