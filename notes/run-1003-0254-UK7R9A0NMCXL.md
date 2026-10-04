## 复盘：run UK7R9A0NMCXL — 阵亡，最高第 33 层

- 决策 507 个；Jev 调用 89 次，Claude 0 次，DeepSeek 31 次；token 621,815 入 / 4,722 出，约 $0.0263（Jev）；DeepSeek token 4,357,498 入（缓存命中 3,961,984，91%）/ 211,951 出；用时 40.4 分钟
- 决策者：code 269，jev-plan 105，jev 89，deepseek 44

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→55（-9，战后回复 +6），决策 jev-plan 7，code 6，jev 4
- 第 4 层 噬尸蛞蝓: HP 61→51（-10，战后回复 +6），决策 jev-plan 8，code 5，jev 4
- 第 5 层 蟾蜍蝌蚪: HP 57→54（-3，战后回复 +6），决策 code 9，jev-plan 2，jev 1
- 第 6 层 卑鄙地精/地精佣兵/胖地精: HP 60→51（-9，战后回复 +6），决策 jev-plan 7，jev 4，code 3
- 第 8 层 化石追踪者: HP 57→42（-15，战后回复 +6），决策 code 3，jev 2，jev-plan 2
- 第 12 层 花园幽灵鳗: HP 72→53（-19，战后回复 +6），决策 jev-plan 10，jev 8
- 第 14 层 下水道蚌: HP 59→52（-7，战后回复 +6），决策 jev 4，jev-plan 3，code 3
- 第 17 层 乐加维林族母: HP 80→56（-24，战后回复 +6），决策 code 12，jev-plan 8，jev 6
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 76→57（-19，战后回复 +6），决策 code 7，jev 2，jev-plan 2
- 第 20 层 偷窃草蜢: HP 63→52（-11，战后回复 +6），决策 jev-plan 5，jev 4，code 3
- 第 22 层 啃咬机: HP 58→31（-27，战后回复 +6），决策 code 12，jev-plan 4，jev 2
- 第 27 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 76→38（-38，战后回复 +6），决策 jev 7，jev-plan 6，code 5
- 第 30 层 残杀千足虫: HP 80→30（-50，战后回复 +6），决策 jev 7，jev-plan 5，code 5
- 第 31 层 虱虫之祖: HP 36→22（-14，战后回复 +6），决策 jev-plan 5，jev 4，code 4
- 第 33 层 火箭/碾碎爪: HP 67→0（-67），决策 code 76，jev-plan 31，jev 30

### 死亡战斗：第 33 层 火箭/碾碎爪
- T3 [code] selection/exhaust: code: 打击 scores 64 vs 连环拳 46
- T3 [jev] combat/plan-choice: Jev chose plan 2/4 (火焰屏障, 双重打击 -> 碾碎爪) with confidence 0.63; code rank 2 conf 0.63
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 双重打击 -> 碾碎爪
- T3 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T4 [code] selection/exhaust: code: 战栗 scores 70 vs 狱火+ -3
- T4 [code] combat/plan: code plan (only line): 血墙, 与我一战！ -> 火箭; hp -29, dmg 14
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 与我一战！ -> 火箭
- T4 [code] combat/plan: code plan (only line): end turn; hp -27, dmg 0
- T5 [code] selection/exhaust: code: 拆卸 scores 20 vs 无情猛攻 18
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-9): 无情猛攻 -> 碾碎爪, 防御
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-9): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 105
- combat/plan-choice / jev: 69
- combat/plan / code: 49
- selection/exhaust / code: 49
- reward/claim / code: 39
- combat/plan-continue / code: 33
- map/route-follow / code: 29
- combat/plan-choice+potion / jev: 18
- reward/card / deepseek: 14
- reward/proceed / code: 14
- combat/least-loss / code: 12
- combat/lethal / code: 12
- rest/plan / deepseek: 7
- rest/proceed / code: 7
- event/leave / code: 6
- shop/buy / deepseek: 5
- combat/end_turn / code: 4
- event/plan / deepseek: 3
- selection/remove / deepseek: 3
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / deepseek: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- event/choose / deepseek: 2
- selection/upgrade / deepseek: 2
- combat/plan-choice+potion-lethal / jev: 1
- event/act-plan / deepseek: 1
- map/route-change / deepseek: 1
- map/route-follow / deepseek: 1
- map/route-only / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/enchant / deepseek: 1
- selection/take into my hand / jev: 1
- selection/take-planned / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：21 个
- 第 2 层 combat/plan-choice: Jev chose plan 3/3 (防御, 防御, 打击 -> 淤泥旋螺) with confidence 0.30; code rank 3 (0.30)
- 第 6 层 combat/plan-choice: Jev chose plan 2/2 (防御, 无情猛攻 -> 胖地精) with confidence 0.02; code rank 2 (0.02)
- 第 12 层 combat/plan-choice+potion: Jev chose plan 1/3 (end turn) with confidence 0.22; code rank 1 (0.22)
- 第 27 层 combat/plan-choice: Jev chose plan 1/8 (燃烧+, 无情猛攻 -> 盛碗虫（石）, 踩踏) with confidence 0.23; code rank 1 (0.23)
- 第 33 层 combat/plan-choice: Jev chose plan 4/8 (potion 缚魂药水, 欺凌 -> 碾碎爪, potion 虚弱药水 -> 碾碎爪) with confidence 0.27; code rank 4 (0.27)
- 第 33 层 combat/plan-choice: Jev chose plan 2/5 (双重打击+ -> 碾碎爪) with confidence 0.10; code rank 2 (0.10)
- 第 33 层 combat/plan-choice: Jev chose plan 1/3 (御血术 -> 碾碎爪) with confidence 0.33; code rank 1 (0.33)
- 第 33 层 combat/plan-choice: Jev chose plan 4/8 (potion 缚魂药水, 欺凌 -> 碾碎爪, potion 虚弱药水 -> 碾碎爪) with confidence 0.21; code rank 4 (0.21)
- 第 33 层 combat/plan-choice: Jev chose plan 2/5 (双重打击+ -> 碾碎爪) with confidence 0.19; code rank 2 (0.19)
- 第 33 层 combat/plan-choice: Jev chose plan 2/3 (end turn) with confidence 0.17; code rank 2 (0.17)
- 第 33 层 combat/plan-choice: Jev chose plan 1/8 (potion 缚魂药水, 双重打击+ -> 碾碎爪, 御血术 -> 火箭, 欺凌 -> 碾碎爪, potion 虚弱药水 -> 碾碎爪) with confidence 0.19; code rank 1; SL explore: replaying atte (0.19)
- 第 33 层 combat/plan-choice: Jev chose plan 2/5 (双重打击+ -> 碾碎爪) with confidence 0.13; code rank 2 (0.13)
- 第 33 层 combat/plan-choice: Jev chose plan 2/3 (end turn) with confidence 0.14; code rank 2 (0.14)
- 第 33 层 combat/plan-choice: Jev chose plan 1/8 (potion 缚魂药水, 双重打击+ -> 碾碎爪, 御血术 -> 火箭, 欺凌 -> 碾碎爪, potion 虚弱药水 -> 碾碎爪) with confidence 0.21; code rank 1; SL explore: replaying atte (0.21)
- 第 33 层 combat/plan-choice: Jev chose plan 2/5 (双重打击+ -> 碾碎爪) with confidence 0.16; code rank 2 (0.16)
