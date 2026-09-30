## 复盘：run RLCNBC0L2QUC — 阵亡，最高第 24 层

- 决策 317 个；Jev 调用 43 次，Claude 0 次，DeepSeek 29 次；token 209,803 入 / 2,151 出，约 $0.0089（Jev）；DeepSeek token 3,745,630 入（缓存命中 3,107,584，83%）/ 181,474 出；用时 24.6 分钟
- 决策者：code 178，jev-plan 56，jev 43，deepseek 40

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→60（-4，战后回复 +6），决策 code 8，jev-plan 4，jev 2
- 第 4 层 蟾蜍蝌蚪: HP 66→60（-6，战后回复 +6），决策 jev 6，code 5，jev-plan 3
- 第 5 层 噬尸蛞蝓: HP 66→62（-4，战后回复 +6），决策 jev-plan 4，code 4，jev 2
- 第 8 层 鬼祟珊瑚群: HP 84→57（-27，战后回复 +6），决策 code 11，jev-plan 6，jev 3
- 第 13 层 拳击构装体: HP 55→50（-5，战后回复 +6），决策 code 6，jev-plan 5，jev 3
- 第 14 层 幽灵船: HP 56→56（-0，战后回复 +6），决策 code 9，jev-plan 3，jev 1
- 第 17 层 灵魂异鱼: HP 88→35（-53，战后回复 +6），决策 code 23，jev-plan 10，jev 7
- 第 19 层 地道虫: HP 78→52（-26，战后回复 +6），决策 code 10，jev 5，jev-plan 5
- 第 21 层 盛碗虫（卵）/盛碗虫（石）: HP 58→58（-0，战后回复 +6），决策 code 8，jev-plan 5，jev 4
- 第 23 层 幼虫/直飞产卵虫/结实的卵: HP 64→1（-63，战后回复 +6），决策 code 11，jev-plan 10，jev 7
- 第 24 层 异螨: HP 7→0（-7），决策 code 7，jev 3，jev-plan 1

### 死亡战斗：第 24 层 异螨
- T1 [jev] combat/plan-choice+potion: Jev chose to drink 技能药水, then re-plan (confidence 0.29) conf 0.29
- T1 [jev] selection/take into my hand: Jev chose 血墙 with confidence 0.87 conf 0.87
- T1 [jev] combat/plan-choice: Jev chose plan 3/3 (飞剑回旋镖, 耸肩无视, 双重打击 -> 异螨 #2) with confidence 0.67; code rank 3 conf 0.67
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 耸肩无视
- T1 [code] combat/plan: code plan (only distinct line): 双重打击 -> 异螨 #2; hp -0, dmg 10
- T1 [code] combat/plan: code plan (only distinct line): end turn; hp -0, dmg 0
- T2 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): 毒素, 毒素, 防御, 愤怒 -> 异螨 #2
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 毒素
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 愤怒 -> 异螨 #2
- T2 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 56
- combat/plan / code: 47
- combat/plan-choice / jev: 36
- combat/plan-continue / code: 30
- reward/claim / code: 26
- map/route-follow / code: 20
- combat/lethal / code: 14
- reward/card / deepseek: 10
- reward/proceed / code: 10
- event/choose / deepseek: 7
- event/leave / code: 6
- combat/plan-choice+potion / jev: 5
- shop/buy / deepseek: 5
- combat/end_turn / code: 4
- rest/plan / deepseek: 3
- rest/proceed / code: 3
- selection/exhaust / code: 3
- selection/remove / deepseek: 3
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / deepseek: 3
- combat/least-loss / code: 2
- event/plan / deepseek: 2
- selection/add / deepseek: 2
- selection/take into my hand / code: 2
- selection/take into my hand / jev: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- event/act-plan / deepseek: 1
- map/route-follow / deepseek: 1
- map/route-only / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/enchant / deepseek: 1
- selection/upgrade / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：6 个
- 第 2 层 combat/plan-choice: Jev chose plan 2/3 (防御, 打击 -> 海洋混混, 防御) with confidence 0.14; code rank 2 (0.14)
- 第 8 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 鬼祟珊瑚群, 防御, 防御, 愤怒 -> 鬼祟珊瑚群) with confidence 0.15; code rank 1 (0.15)
- 第 14 层 combat/plan-choice: Jev chose plan 2/8 (燃烧+, 打击 -> 幽灵船, 双重打击+ -> 幽灵船, potion 爆炸安瓿) with confidence 0.32; code rank 2 (0.32)
- 第 17 层 combat/plan-choice: Jev chose plan 3/3 (打击 -> 灵魂异鱼, 双重打击 -> 灵魂异鱼, 打击+ -> 灵魂异鱼, 愤怒 -> 灵魂异鱼, 燃烧契约) with confidence 0.28; code rank - (rollout's best line, added) (0.28)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 灵魂异鱼, 飞剑回旋镖, 愤怒 -> 灵魂异鱼) with confidence 0.06; code rank 1 (0.06)
- 第 24 层 combat/plan-choice+potion: Jev chose to drink 技能药水, then re-plan (confidence 0.29) (0.29)
