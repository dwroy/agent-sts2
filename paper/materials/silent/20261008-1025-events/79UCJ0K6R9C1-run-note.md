## 复盘：run 79UCJ0K6R9C1 — 阵亡，最高第 14 层

- 决策 235 个；Jev 调用 89 次，Claude 0 次，大脑 14 次（codex 14）；token 376,203 入 / 4,943 出，约 $0.0160（Jev）；大脑 token 1,825,951 入（缓存命中 840,448，46%）/ 4,831 出；用时 11.9 分钟
- 决策者：jev 89，jev-plan 65，code 64，codex 17

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 56→56（-0），决策 jev 10，jev-plan 8，code 4
- 第 3 层 小啃兽: HP 56→56（-0），决策 jev 10，jev-plan 10，code 1
- 第 4 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 56→56（-0），决策 jev 7，jev-plan 6，code 4
- 第 6 层 劫掠者斧手/劫掠者暴徒/劫掠者追踪手: HP 56→47（-9），决策 jev 11，jev-plan 10，code 3
- 第 8 层 旧日雕像: HP 47→7（-40），决策 jev 13，jev-plan 10，code 2
- 第 12 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 49→30（-19），决策 jev 12，jev-plan 7，code 1
- 第 14 层 异蛙寄生虫/扭动虫: HP 51→0（-51），决策 jev 26，jev-plan 14，code 2

### 死亡战斗：第 14 层 异蛙寄生虫/扭动虫
- T9 [jev] selection/choose: Jev chose 致命毒药 with confidence 0.53 conf 0.53
- T9 [jev] combat/plan-choice+potion: Jev chose plan 3/3 (打击 -> 扭动虫 #4, 防御) with confidence 0.92; code rank - (rollout's best line, added) conf 0.92
- T9 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T9 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.64; code rank 1 conf 0.64
- T10 [jev] combat/plan-choice+potion: Jev chose plan 2/2 (坚韧之环, 偏折, 致命毒药 -> 扭动虫 #1) with confidence 0.85; code rank 2 conf 0.85
- T10 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 偏折
- T10 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 致命毒药 -> 扭动虫 #1
- T10 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.74; code rank 1 conf 0.74
- T11 [jev] combat/play: Jev chose c0->e2 (Play 打击 on 扭动虫) with confidence 0.43 conf 0.43
- T11 [jev] combat/play: Jev chose c1->e0 (Play 打击 on 扭动虫) with confidence 0.43 conf 0.43
- T11 [jev] combat/play: Jev chose p0->e0 (Drink 毒药水 on 扭动虫) with confidence 0.55 conf 0.55
- T11 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan-choice+potion / jev: 78
- combat/plan-continue / jev-plan: 65
- reward/claim / code: 18
- map/route-follow / code: 12
- combat/lethal / code: 10
- selection/choose / jev: 8
- reward/card / codex: 7
- reward/proceed / code: 6
- combat/plan-continue / code: 4
- combat/play / jev: 3
- rest/plan / codex: 3
- rest/proceed / code: 3
- event/leave / code: 2
- event/plan / codex: 2
- selection/take into my hand / code: 2
- shop/buy / codex: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/end_turn / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/transform / codex: 1
- shop/leave / code: 1
- shop/open / code: 1
- shop/plan / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：5 个
- 第 2 层 selection/choose: Jev chose 进阶之灾 with confidence 0.22 (0.22)
- 第 3 层 selection/choose: Jev chose 进阶之灾 with confidence 0.33 (0.33)
- 第 14 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.06; code rank 1 (0.06)
- 第 14 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.30; code rank 1 (0.30)
- 第 14 层 combat/plan-choice+potion: Jev chose plan 1/2 (生存者, 打击 -> 扭动虫 #2, 致命毒药 -> 扭动虫 #3) with confidence 0.19; code rank 1 (0.19)
