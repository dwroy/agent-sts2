## 复盘：run 3RMEW7ZXS8TF — 阵亡，最高第 33 层

- 决策 408 个；Jev 调用 78 次，Claude 0 次，DeepSeek 30 次；token 294,984 入 / 4,434 出，约 $0.0126（Jev）；DeepSeek token 758,823 入（缓存命中 489,600，65%）/ 150,330 出；用时 26.9 分钟
- 决策者：code 212，jev 78，jev-plan 70，deepseek 48

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 64→62（-2，战后回复 +6），决策 jev-plan 8，code 8，jev 6
- 第 4 层 缩小甲虫: HP 68→65（-3，战后回复 +6），决策 code 8，jev-plan 5，jev 3
- 第 9 层 异蛙寄生虫/扭动虫: HP 80→68（-12，战后回复 +6），决策 code 12，jev 5，jev-plan 4
- 第 12 层 多尼斯异鸟: HP 74→37（-37，战后回复 +6），决策 code 14，jev 3，jev-plan 2
- 第 14 层 旧日雕像: HP 67→54（-13，战后回复 +6），决策 code 8，jev-plan 5，jev 4
- 第 15 层 小啃兽: HP 62→59（-3，战后回复 +6），决策 jev 5，jev-plan 5，code 3
- 第 17 层 仪式兽: HP 80→35（-45，战后回复 +6），决策 code 12，jev 10，jev-plan 6
- 第 19 层 地道虫: HP 74→73（-1，战后回复 +6），决策 jev-plan 5，jev 4，code 4
- 第 22 层 外骨骼虫: HP 71→80（+9），决策 jev 8，jev-plan 6，code 6
- 第 27 层 棘刺蟾蜍: HP 77→63（-14，战后回复 +6），决策 jev 7，jev-plan 6，code 4
- 第 29 层 蜂群术士: HP 71→36（-35，战后回复 +6），决策 code 9，jev 6，jev-plan 4
- 第 30 层 异螨: HP 44→16（-28，战后回复 +6），决策 jev 7，jev-plan 5，code 5
- 第 33 层 火箭/碾碎爪: HP 73→0（-73），决策 code 11，jev 10，jev-plan 9

### 死亡战斗：第 33 层 火箭/碾碎爪
- T5 [code] combat/plan: code plan (only line): end turn; hp -2, dmg 0
- T6 [jev] combat/plan-choice: Jev chose plan 5/9 (剑柄打击 -> 火箭, 剑柄打击 -> 火箭, 剑柄打击 -> 碾碎爪, 战斗专注) with confidence 0.31; code rank 5 conf 0.31
- T6 [jev] combat/plan-choice: Jev chose plan 4/8 (战斗专注, 无情猛攻 -> 火箭, 剑柄打击 -> 碾碎爪) with confidence 0.73; code rank 4 conf 0.73
- T6 [jev] combat/plan-choice: Jev chose plan 6/7 (防御, 熔融之拳 -> 火箭, 欺凌 -> 碾碎爪) with confidence 0.68; code rank 6 conf 0.68
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 熔融之拳 -> 火箭
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 欺凌 -> 碾碎爪
- T6 [code] combat/plan: code plan (only line): end turn; hp -16, dmg 0
- T7 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 33): 剑柄打击 -> 碾碎爪, 剑柄打击 -> 碾
- T7 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 21): 剑柄打击 -> 碾碎爪, 打击 -> 火箭
- T7 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 0): 耸肩无视
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-9): 欺凌 -> 火箭
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-9): end turn

### 各类决策由谁做
- combat/plan-choice / jev: 78
- combat/plan-continue / jev-plan: 70
- combat/plan / code: 62
- reward/claim / code: 36
- map/route-follow / code: 29
- combat/lethal / code: 19
- combat/plan-continue / code: 17
- reward/card / deepseek: 13
- reward/proceed / code: 13
- event/leave / code: 8
- shop/buy / deepseek: 8
- rest/plan / deepseek: 6
- rest/proceed / code: 6
- combat/least-loss / code: 5
- event/choose / deepseek: 4
- selection/remove / deepseek: 4
- selection/upgrade / deepseek: 4
- shop/leave / code: 4
- event/plan / deepseek: 3
- shop/open / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- shop/plan / deepseek: 2
- combat/end_turn / code: 1
- event/act-plan / deepseek: 1
- map/route / code: 1
- map/route-change / deepseek: 1
- map/route-follow / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- shop/buy / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：12 个
- 第 9 层 combat/plan-choice: Jev chose plan 1/2 (potion 爆炸安瓿) with confidence 0.20; code rank 1 (0.20)
- 第 15 层 combat/plan-choice: Jev chose plan 4/4 (战斗专注, 防御, 双重打击 -> 小啃兽) with confidence 0.31; code rank - (rollout's best line, added) (0.31)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (痛击+ -> 仪式兽) with confidence 0.28; code rank 1 (0.28)
- 第 22 层 combat/plan-choice: Jev chose plan 5/10 (岿然不动, 燃烧+, potion 明耀酊剂, 打击 -> 外骨骼虫 #3, potion 鲜血药水) with confidence 0.28; code rank 5 (0.28)
- 第 22 层 combat/plan-choice: Jev chose plan 3/3 (火焰屏障) with confidence 0.15; code rank 3 (0.15)
- 第 22 层 combat/plan-choice: Jev chose plan 1/10 (耸肩无视, 双重打击 -> 外骨骼虫 #1, 剑柄打击 -> 外骨骼虫 #1, 狱火) with confidence 0.21; code rank 1 (0.21)
- 第 27 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.19; code rank 2 (0.19)
- 第 27 层 combat/plan-choice: Jev chose plan 1/6 (战斗专注, 无情猛攻 -> 棘刺蟾蜍, 双重打击 -> 棘刺蟾蜍) with confidence 0.33; code rank 1 (0.33)
- 第 29 层 combat/plan-choice: Jev chose plan 1/2 (potion 爆炸安瓿) with confidence 0.23; code rank 1 (0.23)
- 第 30 层 combat/plan-choice: Jev chose plan 4/4 (打击 -> 异螨 #1, 剑柄打击 -> 异螨 #2) with confidence 0.31; code rank - (rollout's best line, added) (0.31)
- 第 33 层 combat/plan-choice: Jev chose plan 6/6 (无情猛攻 -> 火箭, 痛击+ -> 碾碎爪, 旋风斩+) with confidence 0.34; code rank - (rollout's best line, added) (0.34)
- 第 33 层 combat/plan-choice: Jev chose plan 5/9 (剑柄打击 -> 火箭, 剑柄打击 -> 火箭, 剑柄打击 -> 碾碎爪, 战斗专注) with confidence 0.31; code rank 5 (0.31)
