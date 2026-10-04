## 复盘：run 1YXMHF6FSPK4 — 阵亡，最高第 33 层

- 决策 510 个；Jev 调用 94 次，Claude 0 次，DeepSeek 33 次；token 648,738 入 / 4,846 出，约 $0.0275（Jev）；DeepSeek token 4,672,506 入（缓存命中 4,307,584，92%）/ 281,695 出；用时 52.8 分钟
- 决策者：code 287，jev 94，jev-plan 81，deepseek 48

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→50（-14，战后回复 +6），决策 code 5，jev-plan 4，jev 3
- 第 3 层 蟾蜍蝌蚪: HP 56→48（-8，战后回复 +6），决策 code 6，jev 2，jev-plan 1
- 第 4 层 海洋混混: HP 54→53（-1，战后回复 +6），决策 jev-plan 3，code 3，jev 2
- 第 5 层 幽灵船: HP 59→27（-32，战后回复 +6），决策 code 14，jev 2，jev-plan 2
- 第 7 层 拳击构装体: HP 33→21（-12，战后回复 +6），决策 jev 4，code 2，jev-plan 1
- 第 9 层 潮湿邪教徒/钙化邪教徒: HP 51→42（-9，战后回复 +6），决策 jev 6，jev-plan 3，code 2
- 第 11 层 下水道蚌: HP 48→44（-4，战后回复 +6），决策 jev 4，jev-plan 4，code 1
- 第 13 层 海洋混混/钙化邪教徒: HP 74→66（-8，战后回复 +6），决策 jev 7，jev-plan 4，code 2
- 第 17 层 灵魂异鱼: HP 72→57（-15，战后回复 +6），决策 code 13，jev 6，jev-plan 6
- 第 19 层 偷窃草蜢: HP 76→66（-10，战后回复 +6），决策 code 5，jev 2，jev-plan 2
- 第 21 层 地道虫: HP 72→65（-7，战后回复 +6），决策 jev 8，code 6，jev-plan 2
- 第 25 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 71→43（-28，战后回复 +6），决策 code 12，jev 10，jev-plan 4
- 第 28 层 残杀千足虫: HP 82→12（-70，战后回复 +6），决策 code 14，jev-plan 7，jev 5
- 第 31 层 外骨骼虫: HP 39→31（-8，战后回复 +6），决策 code 3，jev 2，jev-plan 1
- 第 33 层 火箭/碾碎爪: HP 63→0（-63），决策 code 90，jev-plan 37，jev 31

### 死亡战斗：第 33 层 火箭/碾碎爪
- T4 [jev] combat/plan-choice: Jev chose plan 4/5 (防御, 痛击 -> 火箭) with confidence 0.63; code rank 4 conf 0.63
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 痛击 -> 火箭
- T4 [code] combat/plan: code plan (only line): end turn; hp -31, dmg 0
- T5 [code] selection/exhaust: code: 与我一战！ scores 5 vs 狱火+ -3
- T5 [jev] combat/plan-choice: Jev chose plan 2/3 (血墙, 铁斩波 -> 碾碎爪) with confidence 0.61; code rank 2 conf 0.61
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 铁斩波 -> 碾碎爪
- T5 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T6 [code] selection/exhaust: code: 痛击 scores 17 vs 双重打击 11
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-6): 防御, 双重打击 -> 碾碎爪, 防御
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击 -> 碾碎爪
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-6): end turn

### 各类决策由谁做
- combat/plan-choice / jev: 91
- combat/plan-continue / jev-plan: 81
- combat/plan / code: 64
- selection/exhaust / code: 61
- reward/claim / code: 34
- combat/plan-continue / code: 29
- map/route-follow / code: 28
- reward/card / deepseek: 14
- reward/proceed / code: 14
- combat/lethal / code: 13
- combat/least-loss / code: 12
- rest/plan / deepseek: 7
- rest/proceed / code: 7
- shop/buy / deepseek: 7
- event/leave / code: 6
- event/choose / deepseek: 5
- combat/end_turn / code: 4
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / deepseek: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/plan-choice+potion / jev: 2
- event/plan / deepseek: 2
- map/route-follow / deepseek: 2
- selection/remove / deepseek: 2
- selection/upgrade / deepseek: 2
- combat/plan-choice+potion-lethal / jev: 1
- event/act-plan / deepseek: 1
- map/route-change / deepseek: 1
- map/route-only / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/enchant / deepseek: 1
- selection/take into my hand / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：4 个
- 第 21 层 combat/plan-choice: Jev chose plan 4/8 (血墙) with confidence 0.22; code rank 4 (0.22)
- 第 25 层 combat/plan-choice+potion: Jev chose plan 1/7 (燃烧, 上勾拳+ -> 盛碗虫（石）) with confidence 0.30; code rank 1 (0.30)
- 第 25 层 combat/plan-choice: Jev chose plan 3/3 (end turn) with confidence 0.34; code rank - (rollout's best line, added) (0.34)
- 第 33 层 combat/plan-choice: Jev chose plan 2/3 (上勾拳 -> 火箭, 被遗忘的仪式, 重锤 -> 火箭) with confidence 0.25; code rank 2 (0.25)
