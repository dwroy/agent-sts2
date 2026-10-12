## 复盘：run AF76L5UTPP8U — 阵亡，最高第 23 层

- 决策 438 个；Jev 调用 109 次，Claude 0 次，大脑 22 次（codex 22）；token 520,294 入 / 6,722 出，约 $0.0221（Jev）；大脑 token 2,934,592 入（缓存命中 1,365,504，47%）/ 6,140 出；用时 24.7 分钟
- 决策者：code 187，jev-plan 110，jev 109，codex 32

### 战斗掉血（按层）
- 第 2 层 小啃兽: HP 56→43（-13），决策 code 9，jev-plan 2，jev 1
- 第 3 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 43→31（-12），决策 jev-plan 8，jev 7，code 6
- 第 7 层 毛绒伏地虫: HP 36→36（-0），决策 code 12，jev 10，jev-plan 6
- 第 9 层 旧日雕像: HP 58→2（-56），决策 jev-plan 19，jev 13，code 13
- 第 12 层 利齿之眼/雾菇: HP 42→28（-14），决策 code 19，jev 6，jev-plan 6
- 第 14 层 小啃兽: HP 37→26（-11），决策 code 16，jev-plan 10，jev 7
- 第 15 层 方柱构装体: HP 26→23（-3），决策 code 10，jev-plan 8，jev 6
- 第 17 层 同族信徒/同族神官: HP 59→15（-44），决策 jev-plan 26，jev 22，code 18
- 第 19 层 外骨骼虫: HP 68→59（-9），决策 jev 8，jev-plan 7，code 2
- 第 21 层 盛碗虫（卵）/盛碗虫（石）: HP 59→51（-8），决策 jev-plan 8，jev 7，code 3
- 第 22 层 棘刺蟾蜍: HP 51→41（-10），决策 jev 10，jev-plan 5，code 3
- 第 23 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 41→0（-41），决策 jev 12，jev-plan 5，code 1

### 死亡战斗：第 23 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 盛碗虫（丝）
- T2 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.92; code rank 1 conf 0.92
- T3 [jev] combat/plan-choice+potion: Jev chose plan 2/3 (迷雾+, 防御) with confidence 0.96; code rank 2 conf 0.96
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T3 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.83; code rank 1 conf 0.83
- T4 [jev] combat/play: Jev chose c2 (Play 防御) with confidence 0.50 conf 0.50
- T4 [jev] combat/play: Jev chose c2 (Play 防御) with confidence 0.80 conf 0.80
- T4 [jev] combat/play: Jev chose c1->e1 (Play 带毒刺击 on 盛碗虫（丝）) with confidence 0.13 conf 0.13
- T4 [jev] combat/play: Jev chose c1->e1 (Play 精确切击 on 盛碗虫（丝）) with confidence 0.62 conf 0.62
- T4 [jev] combat/play: Jev chose c1->e0 (Play 中和+ on 盛碗虫（石）) with confidence 0.37 conf 0.37
- T4 [jev] combat/play: Jev chose p0->e0 (Drink 毒药水 on 盛碗虫（石）) with confidence 0.31 conf 0.31
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-7): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 110
- combat/plan / code: 66
- combat/plan-choice / jev: 53
- combat/plan-choice+potion / jev: 37
- reward/claim / code: 28
- combat/plan-continue / code: 25
- map/route-follow / code: 19
- combat/lethal / code: 18
- selection/choose / jev: 12
- reward/card / codex: 11
- reward/proceed / code: 11
- combat/play / jev: 6
- shop/buy / codex: 5
- event/leave / code: 4
- rest/plan / codex: 4
- rest/proceed / code: 4
- event/plan / codex: 3
- combat/end_turn / code: 2
- shop/leave / code: 2
- shop/open / code: 2
- shop/plan / codex: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/least-loss / code: 1
- event/act-plan / codex: 1
- map/route-change / codex: 1
- map/route-follow / codex: 1
- map/route-only / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/enchant / codex: 1
- selection/remove / codex: 1
- selection/take into my hand / jev: 1
- selection/upgrade / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：8 个
- 第 7 层 combat/plan-choice+potion: Jev chose plan 5/5 (灵动步法, 防御) with confidence 0.29; code rank - (rollout's best line, added) (0.29)
- 第 7 层 combat/plan-choice+potion: Jev chose to drink 能力药水, then re-plan (confidence 0.02) (0.02)
- 第 12 层 combat/plan-choice: Jev chose plan 3/3 (打击 -> 雾菇, 后空翻) with confidence 0.20; code rank - (rollout's best line, added) (0.20)
- 第 17 层 combat/plan-choice: Jev chose plan 2/3 (后空翻) with confidence 0.28; code rank 2 (0.28)
- 第 17 层 combat/plan-choice: Jev chose plan 3/3 (打击 -> 同族信徒, 偏折, 防御, 打击 -> 同族神官) with confidence 0.31; code rank - (rollout's best line, added) (0.31)
- 第 17 层 selection/choose: Jev chose 偏折 with confidence 0.22 (0.22)
- 第 23 层 combat/play: Jev chose c1->e1 (Play 带毒刺击 on 盛碗虫（丝）) with confidence 0.13 (0.13)
- 第 23 层 combat/play: Jev chose p0->e0 (Drink 毒药水 on 盛碗虫（石）) with confidence 0.31 (0.31)
