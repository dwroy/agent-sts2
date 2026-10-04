## 复盘：run BVJT7HFW6X2S — 阵亡，最高第 33 层

- 决策 500 个；Jev 调用 153 次，Claude 0 次，DeepSeek 42 次；token 870,992 入 / 7,970 出，约 $0.0369（Jev）；DeepSeek token 6,245,351 入（缓存命中 5,867,904，94%）/ 246,297 出；用时 43.5 分钟
- 决策者：code 201，jev 153，jev-plan 94，deepseek 52

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 64→51（-13，战后回复 +6），决策 jev 8，jev-plan 5，code 2
- 第 3 层 小啃兽: HP 57→49（-8，战后回复 +6），决策 jev 7，jev-plan 4，code 2
- 第 4 层 缩小甲虫: HP 55→55（-0，战后回复 +6），决策 code 3，jev 2，jev-plan 1
- 第 5 层 方柱构装体: HP 61→46（-15，战后回复 +6），决策 jev 11，jev-plan 6，code 2
- 第 6 层 树叶史莱姆（中）/飞蝇菌子: HP 52→42（-10，战后回复 +6），决策 jev 16，jev-plan 8，code 4
- 第 9 层 异蛙寄生虫/扭动虫: HP 72→47（-25，战后回复 +6），决策 jev 16，jev-plan 7
- 第 11 层 蛮兽: HP 53→46（-7，战后回复 +6），决策 jev 6，jev-plan 5，code 2
- 第 12 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 52→39（-13，战后回复 +6），决策 jev 11，jev-plan 6，code 2
- 第 14 层 多尼斯异鸟: HP 69→40（-29，战后回复 +6），决策 jev 6，jev-plan 5，code 1
- 第 15 层 毛绒伏地虫/缩小甲虫: HP 46→26（-20，战后回复 +6），决策 jev 10，jev-plan 8，code 2
- 第 17 层 同族信徒/同族神官: HP 68→10（-58，战后回复 +6），决策 jev-plan 17，code 17，jev 14
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 67→40（-27，战后回复 +6），决策 jev 7，code 4，jev-plan 3
- 第 22 层 偷窃草蜢: HP 61→45（-16，战后回复 +6），决策 jev 5，jev-plan 4，code 4
- 第 23 层 猎人杀手: HP 51→24（-27，战后回复 +6），决策 jev 10，jev-plan 6，code 5
- 第 30 层 感染棱柱: HP 80→16（-64，战后回复 +6），决策 jev 13，code 6，jev-plan 5
- 第 31 层 虱虫之祖: HP 22→22（-0，战后回复 +6），决策 code 15，jev 5，jev-plan 2
- 第 33 层 无厌沙虫: HP 67→0（-67），决策 code 13，jev 6，jev-plan 2

### 死亡战斗：第 33 层 无厌沙虫
- T3 [jev] combat/plan-choice: Jev chose plan 1/2 (重锤+ -> 无厌沙虫) with confidence 0.94; code rank 1 conf 0.94
- T3 [code] combat/plan: code plan (only line): end turn; hp -31, dmg 0
- T4 [code] selection/exhaust: code: 战斗专注 scores 17 vs 战斗专注 17
- T4 [jev] combat/plan-choice: Jev chose plan 1/3 (剑柄打击 -> 无厌沙虫, 熔融之拳 -> 无厌沙虫, 御血术 -> 无厌沙虫) with confidence 0.97; code rank 1 conf 0.97
- T4 [jev] combat/plan-choice: Jev chose plan 1/4 (熔融之拳 -> 无厌沙虫, 御血术 -> 无厌沙虫) with confidence 0.96; code rank 1 conf 0.96
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 御血术 -> 无厌沙虫
- T4 [jev] combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.97; code rank 1 conf 0.97
- T5 [code] selection/exhaust: code: 欺凌 scores 34 vs 欺凌 34
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (9): 熔融之拳 -> 无厌沙虫, 火焰屏障, 欺凌 -> 无厌沙虫
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 火焰屏障
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 欺凌 -> 无厌沙虫
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (9): end turn

### 各类决策由谁做
- combat/plan-choice+potion / jev: 130
- combat/plan-continue / jev-plan: 94
- reward/claim / code: 49
- selection/exhaust / code: 28
- combat/plan / code: 25
- map/route-follow / code: 20
- combat/lethal / code: 18
- combat/plan-choice / jev: 18
- combat/plan-continue / code: 16
- reward/card / deepseek: 16
- reward/proceed / code: 16
- map/statue-potion / deepseek: 9
- rest/plan / deepseek: 7
- rest/proceed / code: 7
- event/leave / code: 6
- event/choose / deepseek: 4
- map/after-discard / code: 3
- selection/take into my hand / jev: 3
- selection/upgrade / deepseek: 3
- shop/buy / deepseek: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/least-loss / code: 2
- combat/plan-choice+potion-lethal / jev: 2
- event/plan / deepseek: 2
- selection/transform / deepseek: 2
- event/act-plan / deepseek: 1
- map/route-follow / deepseek: 1
- map/route-only / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/add / deepseek: 1
- selection/free-card / code: 1
- selection/remove / deepseek: 1
- shop/leave / code: 1
- shop/open / code: 1
- shop/plan / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：9 个
- 第 2 层 combat/plan-choice+potion: Jev chose plan 5/5 (打击 -> 树枝史莱姆（小）, 打击 -> 树枝史莱姆（小）) with confidence 0.33; code rank - (rollout's best line, added) (0.33)
- 第 5 层 combat/plan-choice+potion: Jev chose plan 4/4 (potion 异鱼之油, 打击 -> 方柱构装体) with confidence 0.11; code rank 4 (0.11)
- 第 5 层 combat/plan-choice+potion: Jev chose plan 1/2 (end turn) with confidence 0.32; code rank 1 (0.32)
- 第 5 层 combat/plan-choice+potion: Jev chose plan 3/4 (防御) with confidence 0.23; code rank 3 (0.23)
- 第 12 层 combat/plan-choice+potion: Jev chose plan 1/6 (痛击 -> 树枝史莱姆（小）, 打击 -> 树枝史莱姆（小）) with confidence 0.19; code rank 1 (0.19)
- 第 12 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.19; code rank 1 (0.19)
- 第 22 层 combat/plan-choice+potion: Jev chose plan 3/9 (防御, potion 易伤药水 -> 偷窃草蜢, 剑柄打击 -> 偷窃草蜢, 御血术 -> 偷窃草蜢) with confidence 0.30; code rank 3 (0.30)
- 第 30 层 combat/plan-choice+potion: Jev chose plan 2/2 (防御, 剑柄打击 -> 感染棱柱) with confidence 0.26; code rank - (rollout's best line, added) (0.26)
- 第 31 层 selection/take into my hand: Jev chose 凶恶 with confidence 0.26 (0.26)
