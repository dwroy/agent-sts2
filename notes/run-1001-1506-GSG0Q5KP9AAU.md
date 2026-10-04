## 复盘：run GSG0Q5KP9AAU — 阵亡，最高第 33 层

- 决策 466 个；Jev 调用 90 次，Claude 0 次，DeepSeek 32 次；token 537,876 入 / 4,398 出，约 $0.0228（Jev）；DeepSeek token 4,398,124 入（缓存命中 4,074,752，93%）/ 146,310 出；用时 29.0 分钟
- 决策者：code 236，jev-plan 96，jev 90，deepseek 44

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→53（-11，战后回复 +6），决策 code 10，jev-plan 4，jev 2
- 第 4 层 淤泥旋螺: HP 52→48（-4，战后回复 +6），决策 code 14，jev-plan 2，jev 1
- 第 6 层 海洋混混: HP 60→49（-11，战后回复 +6），决策 jev 7，jev-plan 7，code 2
- 第 9 层 鬼祟珊瑚群: HP 55→26（-29，战后回复 +6），决策 jev 8，jev-plan 8，code 2
- 第 12 层 卑鄙地精/地精佣兵/胖地精: HP 57→49（-8，战后回复 +6），决策 jev 10，jev-plan 4，code 3
- 第 15 层 噬尸蛞蝓: HP 65→42（-23，战后回复 +6），决策 jev 5，code 5，jev-plan 3
- 第 17 层 灵魂异鱼: HP 73→41（-32，战后回复 +6），决策 code 29，jev-plan 16，jev 11
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 78→74（-4，战后回复 +6），决策 jev 7，code 5，jev-plan 1
- 第 21 层 外骨骼虫: HP 80→71（-9，战后回复 +6），决策 jev-plan 10，jev 9，code 3
- 第 22 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 77→46（-31，战后回复 +6），决策 jev-plan 13，jev 8，code 7
- 第 23 层 虱虫之祖: HP 52→35（-17，战后回复 +6），决策 code 20，jev-plan 8，jev 7
- 第 25 层 残杀千足虫: HP 66→2（-64，战后回复 +6），决策 code 11，jev-plan 5，jev 3
- 第 28 层 寄生惧魔/胧光怪: HP 33→3（-30，战后回复 +6），决策 jev 9，code 9，jev-plan 7
- 第 33 层 火箭/碾碎爪: HP 34→0（-34），决策 code 9，jev-plan 8，jev 3

### 死亡战斗：第 33 层 火箭/碾碎爪
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 突破
- T2 [code] combat/plan: code plan (only line): end turn; hp -14, dmg 0
- T3 [jev] combat/plan-choice: Jev chose plan 2/5 (闪电霹雳, 打击 -> 碾碎爪, 防御) with confidence 0.39; code rank 2 conf 0.39
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 碾碎爪
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T3 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T4 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 22): 契约终结+, 熔融之拳 -> 碾碎爪, 打击
- T4 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 22): 耸肩无视, 熔融之拳 -> 碾碎爪, 打击 
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 熔融之拳 -> 碾碎爪, 打击 -> 碾碎爪, 怨恨 -> 火箭
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 碾碎爪
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 怨恨 -> 火箭
- T4 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 96
- combat/plan / code: 53
- combat/plan-choice+potion / jev: 46
- combat/plan-choice / jev: 43
- combat/plan-continue / code: 42
- reward/claim / code: 34
- map/route-follow / code: 29
- combat/lethal / code: 14
- reward/card / deepseek: 14
- reward/proceed / code: 13
- shop/buy / deepseek: 8
- selection/exhaust / code: 7
- event/leave / code: 6
- rest/plan / deepseek: 6
- rest/proceed / code: 6
- combat/end_turn / code: 5
- selection/take into my hand / code: 5
- shop/leave / code: 5
- shop/open / code: 5
- event/choose / deepseek: 4
- shop/plan / deepseek: 4
- combat/least-loss / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- event/act-plan / deepseek: 1
- event/plan / deepseek: 1
- map/route-change / deepseek: 1
- map/route-follow / deepseek: 1
- map/route-only / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/choose / deepseek: 1
- selection/remove / deepseek: 1
- selection/take into my hand / jev: 1
- selection/upgrade / deepseek: 1
- shop/buy / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：3 个
- 第 22 层 combat/plan-choice: Jev chose plan 4/4 (防御, 打击 -> 盛碗虫（石）, 被遗忘的仪式, 重振精神) with confidence 0.32; code rank - (rollout's best line, added) (0.32)
- 第 23 层 combat/plan-choice: Jev chose plan 3/3 (打击 -> 虱虫之祖, 薪火之源, 怨恨 -> 虱虫之祖) with confidence 0.32; code rank 3 (0.32)
- 第 28 层 combat/plan-choice+potion: Jev chose plan 4/7 (防御, 重振精神, 打击 -> 胧光怪) with confidence 0.19; code rank 4 (0.19)
