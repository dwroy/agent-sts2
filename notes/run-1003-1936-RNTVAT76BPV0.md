## 复盘：run RNTVAT76BPV0 — 阵亡，最高第 38 层

- 决策 492 个；Jev 调用 93 次，Claude 0 次，DeepSeek 39 次；token 560,110 入 / 5,013 出，约 $0.0237（Jev）；DeepSeek token 5,927,199 入（缓存命中 4,004,608，68%）/ 181,006 出；用时 96.5 分钟
- 决策者：code 250，jev-plan 97，jev 93，deepseek 52

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→54（-10，战后回复 +6），决策 code 5，jev-plan 4，jev 2
- 第 3 层 噬尸蛞蝓: HP 60→51（-9，战后回复 +6），决策 code 6，jev 4，jev-plan 3
- 第 6 层 海洋混混: HP 51→48（-3，战后回复 +6），决策 jev 4，jev-plan 2，code 2
- 第 7 层 下水道蚌: HP 54→45（-9，战后回复 +6），决策 jev 5，jev-plan 4，code 2
- 第 9 层 拳击构装体: HP 51→48（-3，战后回复 +6），决策 code 5，jev 2，jev-plan 1
- 第 12 层 骇鳗: HP 51→48（-3，战后回复 +6），决策 code 9，jev 2
- 第 15 层 幽灵船: HP 54→53（-1，战后回复 +6），决策 jev-plan 6，jev 3，code 1
- 第 17 层 乐加维林族母: HP 80→50（-30，战后回复 +6），决策 code 11，jev-plan 10，jev 9
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 75→74（-1，战后回复 +6），决策 code 5，jev 4，jev-plan 3
- 第 21 层 外骨骼虫: HP 80→66（-14，战后回复 +6），决策 code 4，jev 3，jev-plan 2
- 第 23 层 盛碗虫（卵）/盛碗虫（石）/盛碗虫（蜜）: HP 72→47（-25，战后回复 +6），决策 jev 9，jev-plan 3，code 2
- 第 27 层 寄生惧魔/胧光怪: HP 77→74（-3，战后回复 +6），决策 code 4，jev 3，jev-plan 1
- 第 30 层 虱虫之祖: HP 80→57（-23，战后回复 +6），决策 jev 8，jev-plan 6，code 2
- 第 33 层 无厌沙虫: HP 80→17（-63，战后回复 +6），决策 jev-plan 17，code 10，jev 9
- 第 35 层 虔诚雕刻师: HP 68→39（-29，战后回复 +6），决策 jev-plan 9，jev 7，code 6
- 第 36 层 咬人卷轴: HP 45→31（-14，战后回复 +6），决策 jev 2，jev-plan 2，code 2
- 第 37 层 戳刺机器人/电击机器人/组装师: HP 37→4（-33，战后回复 +6），决策 jev 5，jev-plan 4，code 4
- 第 38 层 巨斧机器人: HP 10→0（-10），决策 code 41，jev-plan 20，jev 12

### 死亡战斗：第 38 层 巨斧机器人
- T1 [code] combat/plan: fallback after repeated illegal plays: code plan (only distinct line): 小刀; hp -2, dmg 6
- T2 [jev] combat/plan-choice+potion: Jev chose to drink 精炼混沌, then re-plan (confidence 0.43) conf 0.43
- T2 [jev] combat/plan-choice: Jev chose plan 1/5 (防御, 放血+, 燃烧+, 打击 -> 巨斧机器人, 完美打击+ -> 巨斧机器人) with confidence 0.18; code rank 1 conf 0.18
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 放血+
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 燃烧+
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 巨斧机器人
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 完美打击+ -> 巨斧机器人
- T2 [code] combat/end_turn: no playable cards; ending the turn
- T3 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 26): 劫掠+ -> 巨斧机器人, 打击 -> 巨斧
- T3 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 6): 耸肩无视, 打击 -> 巨斧机器人
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): 主宰 -> 巨斧机器人
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 97
- combat/plan-choice / jev: 70
- reward/claim / code: 47
- combat/plan / code: 42
- combat/plan-continue / code: 38
- map/route-follow / code: 32
- combat/lethal / code: 21
- reward/card / deepseek: 20
- combat/plan-choice+potion / jev: 18
- reward/proceed / code: 18
- combat/least-loss / code: 12
- event/leave / code: 8
- shop/buy / deepseek: 7
- combat/end_turn / code: 6
- event/choose / deepseek: 6
- rest/plan / deepseek: 6
- rest/proceed / code: 6
- combat/plan-choice+potion-lethal / jev: 4
- shop/leave / code: 4
- shop/open / code: 4
- shop/plan / deepseek: 4
- selection/upgrade / deepseek: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- event/act-plan / deepseek: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- combat/mod-lethal / code: 1
- event/only / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/remove / deepseek: 1
- selection/take into my hand / code: 1
- selection/take into my hand / jev: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：6 个
- 第 27 层 combat/plan-choice: Jev chose plan 1/7 (战斗专注, 防御, 痛击+ -> 胧光怪, potion 明耀酊剂, 全身撞击 -> 胧光怪) with confidence 0.29; code rank 1 (0.29)
- 第 30 层 combat/plan-choice: Jev chose plan 3/4 (耸肩无视, potion 明耀酊剂, potion 消亡粉末 -> 虱虫之祖); plan 1 (耸肩无视, potion 明耀酊剂) is as good or better on every axis, playing it with confidence (0.30)
- 第 38 层 combat/plan-choice+potion: fallback after repeated illegal plays: Jev chose plan 1/2 (小刀) with confidence 0.32; code rank 1 (0.32)
- 第 38 层 combat/plan-choice+potion: Jev chose plan 3/3 (防御, 小刀) with confidence 0.23; code rank - (rollout's best line, added) (0.23)
- 第 38 层 combat/plan-choice: Jev chose plan 1/5 (防御, 放血+, 燃烧+, 打击 -> 巨斧机器人, 完美打击+ -> 巨斧机器人) with confidence 0.27; code rank 1 (0.27)
- 第 38 层 combat/plan-choice: Jev chose plan 1/5 (防御, 放血+, 燃烧+, 打击 -> 巨斧机器人, 完美打击+ -> 巨斧机器人) with confidence 0.18; code rank 1 (0.18)
