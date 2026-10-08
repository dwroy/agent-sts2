## 复盘：run QHK1XQ928TTM — 阵亡，最高第 33 层

- 决策 746 个；Jev 调用 291 次，Claude 0 次，大脑 34 次（codex 34）；token 1,396,895 入 / 18,943 出，约 $0.0595（Jev）；大脑 token 4,479,640 入（缓存命中 2,388,480，53%）/ 9,180 出；用时 46.1 分钟
- 决策者：jev 291，jev-plan 217，code 190，codex 48

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 56→54（-2），决策 code 8，jev-plan 7，jev 5
- 第 3 层 淤泥旋螺: HP 54→54（-0），决策 code 10，jev-plan 7，jev 4
- 第 4 层 噬尸蛞蝓: HP 54→47（-7），决策 code 13，jev 4，jev-plan 2
- 第 5 层 海洋混混/钙化邪教徒: HP 47→31（-16），决策 jev-plan 10，code 9，jev 7
- 第 8 层 花园幽灵鳗: HP 52→43（-9），决策 jev 13，jev-plan 11，code 1
- 第 11 层 骇鳗: HP 64→58（-6），决策 jev 17，jev-plan 15，code 2
- 第 14 层 噬尸蛞蝓: HP 58→48（-10），决策 jev 15，jev-plan 7，code 1
- 第 15 层 幽灵船: HP 48→44（-4），决策 jev 10，jev-plan 6，code 2
- 第 17 层 乐加维林族母: HP 65→26（-39），决策 jev 37，jev-plan 19，code 4
- 第 19 层 外骨骼虫: HP 61→53（-8），决策 jev 11，jev-plan 11，code 1
- 第 20 层 偷窃草蜢: HP 53→34（-19），决策 jev 9，jev-plan 9，code 3
- 第 24 层 蜂群术士: HP 34→10（-24），决策 jev 31，jev-plan 19，code 7
- 第 27 层 寄生惧魔/胧光怪: HP 31→15（-16），决策 jev 14，jev-plan 13，code 4
- 第 31 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 36→17（-19），决策 jev 19，jev-plan 15，code 6
- 第 33 层 火箭/碾碎爪: HP 38→0（-38），决策 jev 95，jev-plan 66，code 6

### 死亡战斗：第 33 层 火箭/碾碎爪
- T3 [jev] combat/plan-choice+potion: Jev chose plan 3/4 (幻影之刃, 灵动步法, 打击 -> 碾碎爪, 带毒刺击 -> 碾碎爪) with confidence 0.21; code rank 3; SL explore (T3, the 5th latest question before attempt 2's death on T conf 0.21
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 灵动步法
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 火箭
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 带毒刺击 -> 火箭
- T3 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.48; code rank 1 conf 0.48
- T4 [jev] combat/play: Jev chose c1->e0 (Play 冲刺 on 碾碎爪) with confidence 0.34 conf 0.34
- T4 [jev] combat/play: Jev chose c0 (Play 防御) with confidence 0.57 conf 0.57
- T4 [jev] combat/play: Jev chose c2 (Play 祭品) with confidence 0.59 conf 0.59
- T4 [jev] combat/play: Jev chose c3 (Play 防御) with confidence 0.68 conf 0.68
- T4 [jev] combat/play: Jev chose c2->e0 (Play 全身撞击 on 碾碎爪) with confidence 0.16 conf 0.16
- T4 [jev] combat/play: Jev chose p1->e1 (Drink 毒药水 on 火箭) with confidence 0.35 conf 0.35
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-9): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 217
- combat/plan-choice+potion / jev: 192
- selection/choose / jev: 45
- reward/claim / code: 42
- combat/play / jev: 32
- map/route-follow / code: 29
- combat/lethal / code: 23
- combat/plan-continue / code: 22
- combat/plan / code: 18
- reward/card / codex: 17
- combat/plan-choice / jev: 15
- reward/proceed / code: 14
- shop/buy / codex: 10
- combat/least-loss / code: 7
- rest/plan / codex: 7
- rest/proceed / code: 7
- selection/take into my hand / jev: 7
- event/leave / code: 5
- selection/take into my hand / code: 4
- shop/leave / code: 4
- shop/open / code: 4
- shop/plan / codex: 4
- combat/end_turn / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- event/choose / codex: 2
- event/plan / codex: 2
- event/act-plan / codex: 1
- map/route-follow / codex: 1
- map/route-only / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/enchant / codex: 1
- selection/remove / codex: 1
- selection/upgrade / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：46 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 蟾蜍蝌蚪 #1, 打击 -> 蟾蜍蝌蚪 #1, 防御, 中和 -> 蟾蜍蝌蚪 #2) with confidence 0.24; code rank 1 (0.24)
- 第 14 层 selection/choose: Jev chose 冲刺 with confidence 0.30 (0.30)
- 第 17 层 selection/choose: Jev chose 匕首雨 with confidence 0.33 (0.33)
- 第 17 层 selection/choose: Jev chose 进阶之灾 with confidence 0.27 (0.27)
- 第 17 层 selection/choose: Jev chose 打击 with confidence 0.34 (0.34)
- 第 17 层 selection/choose: Jev chose 冲刺 with confidence 0.16 (0.16)
- 第 17 层 selection/choose: Jev chose 打击 with confidence 0.31 (0.31)
- 第 19 层 selection/choose: Jev chose 进阶之灾 with confidence 0.06 (0.06)
- 第 20 层 combat/plan-choice+potion: Jev chose plan 2/3 (end turn) with confidence 0.29; code rank 2 (0.29)
- 第 24 层 combat/plan-choice+potion: Jev chose plan 1/1 (非凡技艺) with confidence 0.33; code rank 1 (0.33)
- 第 24 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.34; code rank 1 (0.34)
- 第 24 层 selection/choose: Jev chose 打击 with confidence 0.28 (0.28)
- 第 24 层 combat/play: Jev chose c2->e0 (Play 带毒刺击 on 蜂群术士) with confidence 0.34 (0.34)
- 第 24 层 combat/play: Jev chose p1->e0 (Drink 毒药水 on 蜂群术士) with confidence 0.33 (0.33)
- 第 24 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.02; code rank 1 (0.02)
