## 复盘：run PF90JTU0UZ5M — 阵亡，最高第 22 层

- 决策 444 个；Jev 调用 156 次，Claude 0 次，大脑 23 次（codex 23）；token 674,811 入 / 11,269 出，约 $0.0288（Jev）；大脑 token 2,997,758 入（缓存命中 1,682,816，56%）/ 6,555 出；用时 22.9 分钟
- 决策者：jev 156，code 143，jev-plan 116，codex 29

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 56→54（-2），决策 jev-plan 10，code 6，jev 5
- 第 3 层 淤泥旋螺: HP 54→41（-13），决策 code 8，jev-plan 5，jev 2
- 第 4 层 噬尸蛞蝓: HP 41→40（-1），决策 code 7，jev-plan 6，jev 3
- 第 5 层 下水道蚌: HP 40→32（-8），决策 code 13，jev 5，jev-plan 5
- 第 9 层 花园幽灵鳗: HP 53→1（-52），决策 code 16，jev 10，jev-plan 9
- 第 13 层 化石追踪者: HP 22→15（-7），决策 code 9，jev-plan 4，jev 1
- 第 17 层 瀑布巨兽: HP 59→46（-13），决策 jev 27，jev-plan 18
- 第 19 层 外骨骼虫: HP 65→47（-18），决策 jev 13，jev-plan 12，code 1
- 第 20 层 地道虫: HP 47→21（-26），决策 jev-plan 16，jev 15，code 4
- 第 21 层 外骨骼虫: HP 21→3（-18），决策 jev 21，jev-plan 12，code 3
- 第 22 层 异螨: HP 3→0（-3），决策 jev 54，jev-plan 19，code 4

### 死亡战斗：第 22 层 异螨
- T2 [jev] combat/plan-choice+potion: Jev chose plan 2/2 (后空翻, 打击 -> 异螨 #2, 后空翻, 偏折, 中和 -> 异螨 #2) with confidence 0.37; code rank 2; SL explore (the deviation's turn, T2): playing 后空翻, 后空翻, 偏折, 中和 - conf 0.37
- T2 [jev] combat/plan-choice+potion: Jev chose plan 2/2 (打击 -> 异螨 #2, 后空翻, 偏折, 中和 -> 异螨 #2) with confidence 0.32; code rank 2; SL explore (the deviation's turn, T2): playing 后空翻, 偏折, 中和 -> 异螨 #2, 灵 conf 0.32
- T2 [jev] combat/plan-choice+potion: Jev chose plan 2/2 (打击 -> 异螨 #2, 偏折, 中和 -> 异螨 #2) with confidence 0.28; code rank 2 [ending now kills by what the mod's lethal flag does not count: 4 HP lost in conf 0.28
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 中和 -> 异螨 #2
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 灵动步法
- T2 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.61; code rank 1 conf 0.61
- T3 [jev] combat/play: Jev chose c2 (Play 防御) with confidence 0.31 conf 0.31
- T3 [jev] combat/play: Jev chose c3 (Play 防御) with confidence 0.39 conf 0.39
- T3 [jev] combat/play: Jev chose c4 (Play 防御) with confidence 0.92 conf 0.92
- T3 [jev] combat/play: Jev chose c2->e1 (Play 突然一拳 on 异螨) with confidence 0.07 conf 0.07
- T3 [jev] combat/play: Jev chose p0->e1 (Drink 毒药水 on 异螨) with confidence 0.37 conf 0.37
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 116
- combat/plan-choice+potion / jev: 96
- combat/plan / code: 33
- combat/play / jev: 27
- reward/claim / code: 26
- combat/plan-choice / jev: 22
- combat/plan-continue / code: 19
- map/route-follow / code: 18
- combat/lethal / code: 13
- reward/card / codex: 10
- reward/proceed / code: 10
- selection/choose / jev: 9
- combat/least-loss / code: 5
- event/leave / code: 5
- shop/buy / codex: 4
- rest/plan / codex: 3
- rest/proceed / code: 3
- selection/add / codex: 3
- event/choose / codex: 2
- selection/take into my hand / jev: 2
- shop/leave / code: 2
- shop/open / code: 2
- shop/plan / codex: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/end_turn / code: 1
- event/act-plan / codex: 1
- event/only / code: 1
- event/plan / codex: 1
- map/route-change / codex: 1
- map/route-follow / codex: 1
- map/route-only / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：22 个
- 第 9 层 combat/plan-choice: Jev chose plan 1/2 (中和 -> 花园幽灵鳗 #1, 防御, 打击 -> 花园幽灵鳗 #2) with confidence 0.18; code rank 1 (0.18)
- 第 17 层 selection/choose: Jev chose 进阶之灾 with confidence 0.14 (0.14)
- 第 21 层 combat/plan-choice+potion: Jev chose plan 2/6 (打击 -> 外骨骼虫 #3, 灵动步法, 生存者, 后空翻) with confidence 0.21; code rank 2 (0.21)
- 第 21 层 combat/plan-choice+potion: Jev chose to drink 能力药水, then re-plan (confidence 0.34) (0.34)
- 第 21 层 combat/play: Jev chose c2 (Play 谋划专家) with confidence 0.14 (0.14)
- 第 21 层 combat/play: Jev chose c0->e2 (Play 致命毒药 on 外骨骼虫) with confidence 0.13 (0.13)
- 第 21 层 combat/plan-choice+potion: Jev chose to drink 能力药水, then re-plan (confidence 0.30) (0.30)
- 第 22 层 combat/play: Jev chose c0 (Play 翻越撑击) with confidence 0.27 (0.27)
- 第 22 层 selection/choose: Jev chose 进阶之灾 with confidence 0.20 (0.20)
- 第 22 层 combat/play: Jev chose c3 (Play 灵动步法) with confidence 0.14 (0.14)
- 第 22 层 combat/play: Jev chose c3->e1 (Play 突然一拳 on 异螨) with confidence 0.20 (0.20)
- 第 22 层 combat/play: Jev chose p0->e0 (Drink 毒药水 on 异螨) with confidence 0.18 (0.18)
- 第 22 层 combat/plan-choice+potion: Jev chose plan 2/2 (后空翻, 后空翻, 打击 -> 异螨 #2, 后空翻, 偏折, 中和 -> 异螨 #2) with confidence 0.28; code rank 2 (0.28)
- 第 22 层 combat/play: Jev chose c2 (Play 防御) with confidence 0.28 (0.28)
- 第 22 层 combat/play: Jev chose c5 (Play 防御) with confidence 0.32 (0.32)
