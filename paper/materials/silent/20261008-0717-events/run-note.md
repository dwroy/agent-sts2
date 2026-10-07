## 复盘：run GXNKW8X1XYJP — 阵亡，最高第 45 层

- 决策 649 个；Jev 调用 158 次，Claude 0 次，大脑 48 次（codex 48）；token 818,706 入 / 11,012 出，约 $0.0348（Jev）；大脑 token 6,462,568 入（缓存命中 3,903,232，60%）/ 15,599 出；用时 39.2 分钟
- 决策者：code 270，jev 158，jev-plan 149，codex 72

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 56→43（-13），决策 code 9，jev-plan 8，jev 5
- 第 3 层 淤泥旋螺: HP 43→43（-0），决策 code 14，jev 7，jev-plan 5
- 第 4 层 海洋混混: HP 43→30（-13），决策 jev-plan 6，jev 4，code 4
- 第 6 层 卑鄙地精/地精佣兵/胖地精: HP 30→21（-9），决策 code 12，jev-plan 9，jev 5
- 第 9 层 鬼祟珊瑚群: HP 42→21（-21），决策 code 12，jev-plan 8，jev 7
- 第 17 层 乐加维林族母: HP 36→2（-34），决策 code 27，jev-plan 25，jev 24
- 第 19 层 外骨骼虫: HP 56→50（-6），决策 jev-plan 8，jev 6，code 6
- 第 20 层 地道虫: HP 50→32（-18），决策 code 11，jev-plan 6，jev 5
- 第 29 层 残杀千足虫: HP 69→55（-14），决策 jev-plan 11，jev 7，code 5
- 第 33 层 知识恶魔: HP 57→54（-3），决策 jev-plan 12，jev 11，code 10
- 第 35 层 虔诚雕刻师: HP 99→84（-15），决策 jev-plan 9，code 4，jev 3
- 第 38 层 活体盾/高塔炮手: HP 86→66（-20），决策 code 5，jev 4，jev-plan 3
- 第 40 层 电球头: HP 68→41（-27），决策 jev 9，jev-plan 8，code 2
- 第 44 层 噪音机器人/电击机器人/组装师: HP 73→5（-68），决策 jev 10，jev-plan 9，code 2
- 第 45 层 幽灵骑士/连枷骑士/魔法骑士: HP 7→0（-7），决策 jev 51，jev-plan 22，code 5

### 死亡战斗：第 45 层 幽灵骑士/连枷骑士/魔法骑士
- T2 [jev] combat/plan-choice+potion: Jev chose plan 4/6 (毒雾, 致命毒药+ -> 连枷骑士, 致命毒药+ -> 连枷骑士) with confidence 0.99; code rank 4; SL explore (T2, the 2nd latest question before attempt 2's death on T3) conf 0.99
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 致命毒药+ -> 连枷骑士
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 闪躲翻滚
- T2 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.92; code rank 1 conf 0.92
- T3 [jev] combat/play: Jev chose c0 (Play 防御) with confidence 0.68 conf 0.68
- T3 [jev] combat/play: Jev chose c0 (Play 防御) with confidence 0.89 conf 0.89
- T3 [jev] combat/play: Jev chose c0 (Play 刀刃之舞) with confidence 0.14 conf 0.14
- T3 [jev] combat/play: Jev chose c2->e0 (Play 小刀 on 连枷骑士) with confidence 0.25 conf 0.25
- T3 [jev] combat/play: Jev chose c2->e0 (Play 小刀 on 连枷骑士) with confidence 0.22 conf 0.22
- T3 [jev] combat/play: Jev chose c2->e0 (Play 小刀 on 连枷骑士) with confidence 0.28 conf 0.28
- T3 [jev] combat/play: Jev chose p0->e0 (Drink 毒药水 on 连枷骑士) with confidence 0.43 conf 0.43
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 149
- combat/plan-choice / jev: 70
- combat/plan / code: 67
- combat/plan-choice+potion / jev: 46
- map/route-follow / code: 39
- reward/claim / code: 38
- combat/plan-continue / code: 26
- combat/lethal / code: 23
- combat/play / jev: 22
- selection/choose / jev: 19
- reward/card / codex: 14
- reward/proceed / code: 14
- shop/buy / codex: 12
- event/leave / code: 11
- event/choose / codex: 10
- rest/plan / codex: 8
- rest/proceed / code: 8
- combat/least-loss / code: 6
- shop/leave / code: 6
- shop/open / code: 6
- shop/plan / codex: 6
- chest/open / code: 4
- chest/proceed / code: 4
- chest/relic / code: 4
- event/plan / codex: 3
- map/route-change / codex: 3
- selection/add / codex: 3
- selection/curse / code: 3
- selection/upgrade / codex: 3
- sphere/clear / code: 3
- combat/end_turn / code: 2
- event/act-plan / codex: 2
- map/route-follow / codex: 2
- map/route-only / code: 2
- selection/remove / codex: 2
- selection/transform / codex: 2
- bundle/choose / codex: 1
- bundle/confirm / code: 1
- combat/mod-lethal / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/take into my hand / jev: 1
- sphere/proceed / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：18 个
- 第 2 层 combat/plan-choice: Jev chose plan 3/3 (打击 -> 噬尸蛞蝓 #2, 打击 -> 噬尸蛞蝓 #2, 打击 -> 噬尸蛞蝓 #2, 中和 -> 噬尸蛞蝓 #2) with confidence 0.25; code rank 3 (0.25)
- 第 9 层 selection/choose: Jev chose 进阶之灾 with confidence 0.24 (0.24)
- 第 9 层 combat/plan-choice: Jev chose plan 2/2 (斗篷与匕首, 切割 -> 鬼祟珊瑚群) with confidence 0.12; code rank 2 (0.12)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (中和 -> 乐加维林族母, 扫腿 -> 乐加维林族母) with confidence 0.30; code rank 2 (0.30)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.28; code rank 2 (0.28)
- 第 29 层 combat/plan-choice: Jev chose plan 6/10 (斗篷与匕首, 触媒, 刀刃之舞, 群蛇形态, potion 瓶中船) with confidence 0.13; code rank 6 (0.13)
- 第 29 层 combat/plan-choice: Jev chose plan 3/10 (触媒, 尖啸, 打击 -> 残杀千足虫 (BACK), 群蛇形态) with confidence 0.30; code rank 3 (0.30)
- 第 45 层 selection/choose: Jev chose 斗篷与匕首 with confidence 0.14 (0.14)
- 第 45 层 combat/play: Jev chose p0->e0 (Drink 毒药水 on 连枷骑士) with confidence 0.32 (0.32)
- 第 45 层 combat/play: Jev chose c0 (Play 刀刃之舞) with confidence 0.19 (0.19)
- 第 45 层 combat/play: Jev chose c2->e0 (Play 小刀 on 连枷骑士) with confidence 0.21 (0.21)
- 第 45 层 combat/play: Jev chose c2->e0 (Play 小刀 on 连枷骑士) with confidence 0.20 (0.20)
- 第 45 层 combat/play: Jev chose c2->e0 (Play 小刀 on 连枷骑士) with confidence 0.24 (0.24)
- 第 45 层 selection/choose: Jev chose 斗篷与匕首 with confidence 0.18 (0.18)
- 第 45 层 combat/play: Jev chose c0 (Play 刀刃之舞) with confidence 0.14 (0.14)
