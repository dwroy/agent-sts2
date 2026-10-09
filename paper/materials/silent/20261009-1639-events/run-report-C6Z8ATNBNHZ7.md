## 复盘：run C6Z8ATNBNHZ7 — 阵亡，最高第 23 层

- 决策 412 个；Jev 调用 133 次，Claude 0 次，大脑 24 次（codex 24）；token 606,999 入 / 9,987 出，约 $0.0259（Jev）；大脑 token 3,215,742 入（缓存命中 1,609,088，50%）/ 5,793 出；用时 19.6 分钟
- 决策者：code 143，jev 133，jev-plan 104，codex 32

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 56→49（-7），决策 code 8，jev-plan 4，jev 3
- 第 3 层 蟾蜍蝌蚪: HP 49→46（-3），决策 code 8，jev-plan 7，jev 6
- 第 6 层 海洋混混: HP 46→38（-8），决策 code 7，jev-plan 6，jev 3
- 第 8 层 鬼祟珊瑚群: HP 59→39（-20），决策 code 7，jev-plan 6，jev 4
- 第 14 层 潮湿邪教徒/钙化邪教徒: HP 39→33（-6），决策 jev-plan 7，code 6，jev 3
- 第 15 层 拳击构装体: HP 33→21（-12），决策 jev 5，jev-plan 4，code 4
- 第 17 层 灵魂异鱼: HP 44→22（-22），决策 code 18，jev 10，jev-plan 9
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 66→44（-22），决策 jev-plan 11，jev 10，code 3
- 第 22 层 偷窃草蜢: HP 44→28（-16），决策 jev 9，jev-plan 8，code 3
- 第 23 层 啃咬机: HP 28→0（-28），决策 jev 80，jev-plan 42，code 7

### 死亡战斗：第 23 层 啃咬机
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T4 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.77; code rank 1 conf 0.77
- T5 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (蛇咬 -> 啃咬机 #1, 匕首雨) with confidence 0.88; code rank 1 conf 0.88
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 匕首雨
- T5 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.80; code rank 1 [calc mismatch: solver says ending now does not kill, mod says lethal: no end-of-turn block, Reg conf 0.80
- T6 [jev] combat/play: Jev chose c2->e0 (Play 中和+ on 啃咬机) with confidence 0.31 conf 0.31
- T6 [jev] combat/play: Jev chose p0 (Drink 狡诈药水) with confidence 0.70 conf 0.70
- T6 [jev] combat/play: Jev chose c5->e0 (Play 小刀+ on 啃咬机) with confidence 0.30 conf 0.30
- T6 [jev] combat/play: Jev chose c5->e0 (Play 小刀+ on 啃咬机) with confidence 0.45 conf 0.45
- T6 [jev] combat/play: Jev chose c5->e0 (Play 小刀+ on 啃咬机) with confidence 0.62 conf 0.62
- T6 [jev] combat/play: Jev chose p1->e0 (Drink 毒药水 on 啃咬机) with confidence 0.84 conf 0.84
- T6 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 104
- combat/plan-choice+potion / jev: 65
- combat/plan / code: 29
- combat/play / jev: 25
- combat/plan-choice / jev: 24
- reward/claim / code: 24
- combat/plan-continue / code: 22
- map/route-follow / code: 19
- selection/choose / jev: 18
- combat/lethal / code: 15
- reward/card / codex: 9
- reward/proceed / code: 9
- event/leave / code: 6
- shop/buy / codex: 6
- event/choose / codex: 4
- combat/least-loss / code: 3
- rest/plan / codex: 3
- rest/proceed / code: 3
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / codex: 3
- combat/end_turn / code: 2
- selection/add / codex: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- event/act-plan / codex: 1
- event/plan / codex: 1
- map/route-follow / codex: 1
- map/route-only / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/take into my hand / jev: 1
- selection/upgrade / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：15 个
- 第 15 层 combat/plan-choice+potion: Jev chose plan 2/2 (end turn) with confidence 0.18; code rank - (rollout's best line, added) (0.18)
- 第 15 层 combat/plan-choice+potion: Jev chose to drink 能力药水, then re-plan (confidence 0.30) (0.30)
- 第 22 层 combat/plan-choice+potion: Jev chose plan 2/3 (打击 -> 偷窃草蜢, 致命毒药+ -> 偷窃草蜢, 幻影之刃) with confidence 0.34; code rank 2 (0.34)
- 第 23 层 selection/choose: Jev chose 打击 with confidence 0.28 (0.28)
- 第 23 层 combat/play: Jev chose p0 (Drink 狡诈药水) with confidence 0.14 (0.14)
- 第 23 层 combat/play: Jev chose c3 (Play 幻影之刃) with confidence 0.17 (0.17)
- 第 23 层 selection/choose: Jev chose 打击 with confidence 0.27 (0.27)
- 第 23 层 combat/play: Jev chose c3->e0 (Play 中和+ on 啃咬机) with confidence 0.24 (0.24)
- 第 23 层 selection/choose: Jev chose 打击 with confidence 0.17 (0.17)
- 第 23 层 combat/play: Jev chose p0 (Drink 狡诈药水) with confidence 0.15 (0.15)
- 第 23 层 combat/play: Jev chose c7->e0 (Play 小刀+ on 啃咬机) with confidence 0.18 (0.18)
- 第 23 层 combat/play: Jev chose p1->e0 (Drink 毒药水 on 啃咬机) with confidence 0.15 (0.15)
- 第 23 层 selection/choose: Jev chose 狂乱撕扯 with confidence 0.12 (0.12)
- 第 23 层 combat/play: Jev chose c2->e0 (Play 中和+ on 啃咬机) with confidence 0.31 (0.31)
- 第 23 层 combat/play: Jev chose c5->e0 (Play 小刀+ on 啃咬机) with confidence 0.30 (0.30)
