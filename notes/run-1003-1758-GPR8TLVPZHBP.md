## 复盘：run GPR8TLVPZHBP — 阵亡，最高第 40 层

- 决策 791 个；Jev 调用 150 次，Claude 0 次，DeepSeek 49 次；token 858,909 入 / 7,712 出，约 $0.0364（Jev）；DeepSeek token 7,498,485 入（缓存命中 7,037,184，94%）/ 293,279 出；用时 50.6 分钟
- 决策者：code 414，jev-plan 162，jev 150，deepseek 65

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 64→47（-17，战后回复 +6），决策 code 9，jev 5，jev-plan 5
- 第 4 层 缩小甲虫: HP 53→50（-3，战后回复 +6），决策 jev 4，jev-plan 4，code 2
- 第 6 层 毛绒伏地虫: HP 50→50（-0，战后回复 +6），决策 jev 7，jev-plan 5
- 第 7 层 利齿之眼/雾菇: HP 56→46（-10，战后回复 +6），决策 code 7，jev-plan 5，jev 3
- 第 9 层 异蛙寄生虫/扭动虫: HP 76→20（-56，战后回复 +6），决策 code 18，jev-plan 10，jev 7
- 第 12 层 旧日雕像: HP 50→20（-30，战后回复 +6），决策 code 14，jev-plan 7，jev 4
- 第 13 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 26→13（-13，战后回复 +6），决策 jev 8，code 8，jev-plan 4
- 第 14 层 闪光贾克斯果/飞蝇菌子: HP 19→4（-15，战后回复 +6），决策 jev 8，jev-plan 6，code 2
- 第 15 层 墨宝: HP 10→6（-4，战后回复 +6），决策 code 4，jev 3，jev-plan 3
- 第 17 层 仪式兽: HP 36→6（-30，战后回复 +6），决策 code 17，jev-plan 16，jev 12
- 第 19 层 偷窃草蜢: HP 66→62（-4，战后回复 +6），决策 code 9，jev-plan 8，jev 6
- 第 20 层 盛碗虫（卵）/盛碗虫（石）: HP 68→56（-12，战后回复 +6），决策 jev 4，jev-plan 4，code 1
- 第 23 层 啃咬机: HP 62→42（-20，战后回复 +6），决策 code 13，jev-plan 7，jev 4
- 第 24 层 棘刺蟾蜍: HP 48→44（-4，战后回复 +6），决策 code 11，jev 4，jev-plan 1
- 第 27 层 盛碗虫（丝）/盛碗虫（卵）/盛碗虫（石）: HP 50→31（-19，战后回复 +6），决策 code 12，jev-plan 8，jev 6
- 第 29 层 寄生惧魔/胧光怪: HP 61→41（-20，战后回复 +6），决策 code 16，jev 9，jev-plan 7
- 第 30 层 幼虫/直飞产卵虫/结实的卵: HP 47→37（-10，战后回复 +6），决策 code 13，jev 7，jev-plan 7
- 第 33 层 无厌沙虫: HP 67→7（-60，战后回复 +6），决策 code 19，jev-plan 10，jev 7
- 第 35 层 咬人卷轴: HP 66→63（-3，战后回复 +6），决策 code 12，jev-plan 9，jev 6
- 第 38 层 活体盾/高塔炮手: HP 69→46（-23，战后回复 +6），决策 code 14，jev 5，jev-plan 5
- 第 39 层 电球头: HP 52→29（-23，战后回复 +6），决策 code 9，jev 8，jev-plan 4
- 第 40 层 灵魂枢纽: HP 35→0（-35），决策 code 50，jev-plan 27，jev 23

### 死亡战斗：第 40 层 灵魂枢纽
- T4 [jev] combat/plan-choice: Jev chose plan 1/2 (灵体, 岩石铠甲) with confidence 0.90; code rank 1 conf 0.90
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 岩石铠甲
- T4 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T5 [code] selection/exhaust: code: 灵体 scores 55 vs 灵体 55
- T5 [jev] combat/plan-choice: Jev chose plan 2/3 (铁斩波+ -> 灵魂枢纽, 拆卸 -> 灵魂枢纽, 灵体) with confidence 0.90; code rank 2 conf 0.90
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 拆卸 -> 灵魂枢纽
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 灵体
- T5 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T6 [code] selection/exhaust: code: 腐朽 scores 100 vs 凡庸 100
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-24): 撕裂, 战栗 -> 灵魂枢纽
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 战栗 -> 灵魂枢纽
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-24): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 162
- combat/plan-choice / jev: 125
- combat/plan / code: 107
- selection/exhaust / code: 76
- reward/claim / code: 62
- combat/plan-continue / code: 46
- map/route-follow / code: 25
- combat/lethal / code: 23
- reward/card / deepseek: 21
- reward/proceed / code: 21
- combat/plan-choice+potion / jev: 15
- combat/least-loss / code: 9
- map/statue-potion / deepseek: 9
- shop/buy / deepseek: 9
- combat/end_turn / code: 8
- combat/plan-choice+potion-lethal / jev: 8
- event/leave / code: 6
- rest/plan / deepseek: 6
- rest/proceed / code: 6
- map/after-discard / code: 5
- selection/remove / deepseek: 4
- shop/leave / code: 4
- shop/open / code: 4
- shop/plan / deepseek: 4
- event/plan / deepseek: 3
- selection/free-card / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- event/act-plan / deepseek: 2
- event/choose / deepseek: 2
- map/route-only / code: 2
- selection/take into my hand / jev: 2
- map/route-follow / deepseek: 1
- map/route-plan / deepseek: 1
- map/route-review / deepseek: 1
- run/finalize / code: 1
- selection/enchant / deepseek: 1
- selection/upgrade / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：13 个
- 第 9 层 combat/plan-choice: Jev chose plan 3/3 (愤怒 -> 异蛙寄生虫, 御血术 -> 异蛙寄生虫); plan 1 (愤怒 -> 异蛙寄生虫, 打击 -> 异蛙寄生虫, 御血术 -> 异蛙寄生虫) is as good or better on every axis, playing it with co (0.17)
- 第 15 层 combat/plan-choice: Jev chose plan 3/3 (邪眼) with confidence 0.34; code rank - (rollout's best line, added) (0.34)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 无色药水, then re-plan (confidence 0.07) (0.07)
- 第 24 层 combat/plan-choice: Jev chose plan 4/4 (岩石铠甲, 剑柄打击 -> 棘刺蟾蜍) with confidence 0.19; code rank - (rollout's best line, added) (0.19)
- 第 24 层 combat/plan-choice: Jev chose plan 2/4 (potion 力量药水) with confidence 0.27; code rank 2 (0.27)
- 第 29 层 combat/plan-choice: Jev chose plan 3/5 (究极打击 -> 胧光怪, 势不可当) with confidence 0.34; code rank 3 (0.34)
- 第 33 层 combat/plan-choice+potion: Jev chose to drink 明晰提取物, then re-plan (confidence 0.29) (0.29)
- 第 33 层 combat/plan-choice: Jev chose plan 2/2 (potion 敏捷药水); plan 1 (end turn) is as good or better on every axis, playing it with confidence 0.03; code rank 1 (0.03)
- 第 33 层 combat/plan-choice: Jev chose plan 1/3 (御血术 -> 无厌沙虫, 愤怒 -> 无厌沙虫, potion 敏捷药水, 血墙+, 全身撞击+ -> 无厌沙虫) with confidence 0.33; code rank 1 (0.33)
- 第 40 层 combat/plan-choice: Jev chose plan 2/2 (potion 癫狂之触, 扯碎 -> 灵魂枢纽) with confidence 0.30; code rank 2 (0.30)
- 第 40 层 combat/plan-choice: Jev chose plan 3/5 (妙计, 扯碎 -> 灵魂枢纽, 剑柄打击 -> 灵魂枢纽, 应急按钮) with confidence 0.24; code rank 3 (0.24)
- 第 40 层 combat/plan-choice: Jev chose plan 3/5 (扯碎 -> 灵魂枢纽, 剑柄打击 -> 灵魂枢纽, 应急按钮) with confidence 0.30; code rank 3 (0.30)
- 第 40 层 combat/plan-choice: Jev chose plan 3/4 (究极打击+ -> 灵魂枢纽, 邪眼, potion 癫狂之触, 血墙+) with confidence 0.27; code rank 3 (0.27)
