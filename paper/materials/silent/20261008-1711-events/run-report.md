## 复盘：run Y5H4CFAQ2WTG — 阵亡，最高第 33 层

- 决策 496 个；Jev 调用 74 次，Claude 0 次，大脑 32 次（codex 32）；token 307,574 入 / 3,616 出，约 $0.0131（Jev）；大脑 token 4,199,518 入（缓存命中 2,281,984，54%）/ 7,804 出；用时 23.4 分钟
- 决策者：code 261，jev-plan 120，jev 74，codex 41

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 56→53（-3），决策 code 9，jev-plan 7，jev 3
- 第 3 层 淤泥旋螺: HP 53→53（-0），决策 code 7
- 第 4 层 噬尸蛞蝓: HP 53→53（-0），决策 code 5，jev-plan 4，jev 2
- 第 6 层 海洋混混/钙化邪教徒: HP 53→43（-10），决策 jev-plan 12，jev 7，code 4
- 第 8 层 下水道蚌: HP 43→43（-0），决策 jev-plan 9，jev 4，code 3
- 第 11 层 拳击构装体: HP 43→43（-0），决策 jev-plan 5，code 5，jev 2
- 第 14 层 骇鳗: HP 64→38（-26），决策 jev-plan 12，code 10，jev 6
- 第 15 层 化石追踪者: HP 38→38（-0），决策 jev-plan 4，jev 3
- 第 17 层 瀑布巨兽: HP 59→18（-41），决策 code 16，jev 11，jev-plan 10
- 第 19 层 地道虫: HP 59→20（-39），决策 code 13，jev 5，jev-plan 4
- 第 21 层 外骨骼虫: HP 20→20（-0），决策 jev-plan 6，code 5，jev 4
- 第 25 层 寄生惧魔/胧光怪: HP 45→25（-20），决策 code 12，jev-plan 5，jev 3
- 第 30 层 感染棱柱: HP 61→44（-17），决策 jev-plan 11，code 9，jev 4
- 第 31 层 虱虫之祖: HP 44→38（-6），决策 jev-plan 9，jev 8，code 4
- 第 33 层 无厌沙虫: HP 59→0（-59），决策 jev-plan 22，jev 12，code 12

### 死亡战斗：第 33 层 无厌沙虫
- T8 [jev] combat/plan-choice: Jev chose plan 1/2 (狂乱逃离, 匕首雨, 串刺 -> 无厌沙虫) with confidence 0.42; code rank 1 [ending now kills by what the mod's lethal flag does not count: the Sandpit reaches conf 0.42
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 匕首雨
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 串刺 -> 无厌沙虫
- T8 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 6
- T9 [jev] combat/plan-choice: Jev chose plan 2/3 (致命毒药+ -> 无厌沙虫, 咕嘟冒泡+ -> 无厌沙虫, 狂乱逃离) with confidence 1.00; code rank 2 [ending now kills by what the mod's lethal flag does not count: the Sa conf 1.00
- T9 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 咕嘟冒泡+ -> 无厌沙虫
- T9 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 狂乱逃离
- T9 [code] combat/plan: code plan (only line): end turn; hp -30, dmg 24
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): 狂乱逃离, 防御, 蜃景
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 蜃景
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 120
- combat/plan / code: 66
- combat/plan-choice / jev: 66
- reward/claim / code: 39
- selection/discard / code: 30
- combat/plan-continue / code: 29
- map/route-follow / code: 29
- combat/lethal / code: 16
- reward/card / codex: 15
- reward/proceed / code: 14
- selection/confirm / code: 10
- event/leave / code: 8
- rest/plan / codex: 7
- rest/proceed / code: 7
- selection/choose / jev: 6
- event/plan / codex: 4
- event/choose / codex: 3
- selection/upgrade / codex: 3
- shop/buy / codex: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/least-loss / code: 2
- combat/plan-choice+potion-lethal / jev: 2
- combat/end_turn / code: 1
- event/act-plan / codex: 1
- map/route-follow / codex: 1
- map/route-only / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/enchant / codex: 1
- selection/remove / codex: 1
- shop/leave / code: 1
- shop/open / code: 1
- shop/plan / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：5 个
- 第 15 层 combat/plan-choice: Jev chose plan 3/3 (刺杀 -> 化石追踪者, 冲刺 -> 化石追踪者, 中和 -> 化石追踪者, 打击+ -> 化石追踪者) with confidence 0.20; code rank - (rollout's best line, added) (0.20)
- 第 15 层 combat/plan-choice: Jev chose plan 3/3 (end turn) with confidence 0.14; code rank - (rollout's best line, added) (0.14)
- 第 19 层 selection/choose: Jev chose 进阶之灾 with confidence 0.19 (0.19)
- 第 33 层 combat/plan-choice: Jev chose plan 3/8 (突然一拳 -> 无厌沙虫, 打击 -> 无厌沙虫, 究极防御, potion 能量药水, 冲刺 -> 无厌沙虫) with confidence 0.31; code rank 3 (0.31)
- 第 33 层 selection/choose: Jev chose 打击 with confidence 0.25 (0.25)
