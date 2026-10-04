## 复盘：run 3JHE2AWF5MWB — 阵亡，最高第 45 层

- 决策 641 个；Jev 调用 145 次，Claude 0 次，大脑 41 次（codex 38，deepseek 3）；token 835,915 入 / 7,897 出，约 $0.0354（Jev）；大脑 token 6,528,290 入（缓存命中 3,698,816，57%）/ 32,162 出；用时 46.8 分钟
- 决策者：code 270，jev-plan 166，jev 145，deepseek 60

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 64→50（-14，战后回复 +6），决策 code 7，jev-plan 4，jev 2
- 第 3 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 56→49（-7，战后回复 +6），决策 jev 12，jev-plan 6，code 2
- 第 4 层 小啃兽: HP 55→50（-5，战后回复 +6），决策 jev-plan 9，jev 8
- 第 5 层 方柱构装体: HP 56→31（-25，战后回复 +6），决策 jev 11，jev-plan 8，code 3
- 第 6 层 藤蔓蹒跚者: HP 37→18（-19，战后回复 +6），决策 jev 6，jev-plan 5，code 3
- 第 7 层 蛮兽: HP 24→39（+15，战后回复 +6），决策 jev-plan 5，code 5，jev 2
- 第 11 层 树叶史莱姆（中）/飞蝇菌子: HP 69→58（-11，战后回复 +6），决策 jev-plan 8，code 6，jev 3
- 第 12 层 毛绒伏地虫/缩小甲虫: HP 64→48（-16，战后回复 +6），决策 jev 8，jev-plan 7，code 6
- 第 15 层 闪光贾克斯果/飞蝇菌子: HP 54→43（-11，战后回复 +6），决策 jev-plan 5，code 5，jev 3
- 第 17 层 仪式兽: HP 73→52（-21，战后回复 +6），决策 code 12，jev-plan 10，jev 7
- 第 19 层 外骨骼虫: HP 75→66（-9，战后回复 +6），决策 jev 10，jev-plan 7，code 1
- 第 20 层 偷窃草蜢: HP 72→62（-10，战后回复 +6），决策 jev-plan 6，jev 4，code 3
- 第 21 层 盛碗虫（卵）/盛碗虫（石）/盛碗虫（蜜）: HP 68→51（-17，战后回复 +6），决策 jev 6，jev-plan 5，code 1
- 第 25 层 蜂群术士: HP 80→28（-52，战后回复 +6），决策 jev 18，jev-plan 15，code 3
- 第 30 层 残杀千足虫: HP 58→59（+1，战后回复 +6），决策 jev-plan 13，jev 7，code 6
- 第 33 层 火箭/碾碎爪: HP 80→27（-53，战后回复 +6），决策 jev-plan 16，jev 10，code 9
- 第 35 层 虔诚雕刻师: HP 70→67（-3，战后回复 +6），决策 code 9，jev 5，jev-plan 2
- 第 37 层 活体盾/高塔炮手: HP 73→45（-28，战后回复 +6），决策 jev-plan 10，code 5，jev 4
- 第 38 层 史莱姆狂战士: HP 51→31（-20，战后回复 +6），决策 code 16，jev-plan 9，jev 8
- 第 39 层 战斗好伙伴V1.0: HP 37→37（-0，战后回复 +6），决策 code 4，jev 3，jev-plan 2
- 第 45 层 机甲骑士: HP 78→0（-78），决策 code 15，jev-plan 14，jev 8

### 死亡战斗：第 45 层 机甲骑士
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 祭品
- T5 [jev] combat/plan-choice: Jev chose plan 1/2 (与我一战！ -> 机甲骑士, 打击 -> 机甲骑士) with confidence 0.75; code rank 1 conf 0.75
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 机甲骑士
- T5 [code] combat/plan: code plan (only distinct line): end turn; hp -13, dmg 0
- T6 [code] combat/plan: code plan (dominates the score-best line): 万向斩 -> 机甲骑士, 打击 -> 机甲骑士, 血墙+; hp -2, dmg 26
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 机甲骑士
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 血墙+
- T6 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-12): 愤怒+ -> 机甲骑士, 痛击+ -> 机甲骑士, 飞剑回旋镖
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 痛击+ -> 机甲骑士
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 飞剑回旋镖
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-12): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 166
- combat/plan-choice / jev: 143
- reward/claim / code: 53
- combat/plan / code: 51
- map/route-follow / code: 39
- combat/plan-continue / code: 34
- combat/lethal / code: 26
- reward/card / deepseek: 19
- reward/proceed / code: 19
- event/leave / code: 9
- rest/plan / deepseek: 9
- rest/proceed / code: 9
- shop/buy / deepseek: 9
- combat/end_turn / code: 5
- chest/open / code: 4
- chest/proceed / code: 4
- event/choose / deepseek: 4
- chest/relic / code: 3
- event/plan / deepseek: 3
- map/route-change / deepseek: 3
- selection/upgrade / deepseek: 3
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / deepseek: 3
- combat/least-loss / code: 2
- combat/potion-now / code: 2
- event/act-plan / deepseek: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- combat/plan-choice+potion / jev: 1
- combat/plan-choice+potion-lethal / jev: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/enchant / deepseek: 1
- selection/remove / deepseek: 1
- selection/take into my hand / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：11 个
- 第 5 层 combat/plan-choice: Jev chose plan 1/6 (打击 -> 方柱构装体, 打击 -> 方柱构装体, 耸肩无视+) with confidence 0.30; code rank 1 (0.30)
- 第 5 层 combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.34; code rank 1 (0.34)
- 第 6 层 combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.33; code rank 1 (0.33)
- 第 21 层 combat/plan-choice: Jev chose plan 1/10 (飞剑回旋镖, 打击 -> 盛碗虫（石）, 耸肩无视+) with confidence 0.27; code rank 1 (0.27)
- 第 25 层 combat/plan-choice: Jev chose plan 2/10 (防御, 防御, 战栗 -> 蜂群术士, potion 格挡药水) with confidence 0.30; code rank 2 (0.30)
- 第 30 层 combat/plan-choice: Jev chose plan 1/5 (预备打击 -> 残杀千足虫 (FRONT), 耸肩无视, 飞剑回旋镖, 防御) with confidence 0.27; code rank 1 (0.27)
- 第 30 层 combat/plan-choice: Jev chose plan 1/3 (飞剑回旋镖, 防御, 岩石铠甲) with confidence 0.04; code rank 1 (0.04)
- 第 30 层 combat/plan-choice: Jev chose plan 3/3 (potion 幸运补剂, potion 鲜血药水) with confidence 0.18; code rank 3 (0.18)
- 第 33 层 combat/plan-choice+potion: Jev chose to drink 能力药水, then re-plan (confidence 0.21) (0.21)
- 第 33 层 combat/plan-choice: Jev chose plan 9/9 (祭品, 与我一战！ -> 火箭, 万向斩 -> 火箭, 突破+, 恶魔形态) with confidence 0.28; code rank 9 (0.28)
- 第 45 层 combat/plan-choice: Jev chose plan 1/2 (预备打击 -> 机甲骑士, 打击 -> 机甲骑士, 突破+, 踩踏, 打击 -> 机甲骑士) with confidence 0.28; code rank 1 (0.28)
