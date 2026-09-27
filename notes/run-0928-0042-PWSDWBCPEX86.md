## 复盘：run PWSDWBCPEX86 — 阵亡，最高第 23 层

- 决策 312 个；Jev 调用 62 次，Claude 0 次，DeepSeek 0 次；token 123,719 入 / 3,120 出，约 $0.0053；用时 15.6 分钟
- 决策者：code 198，jev 60，jev-plan 52，code-fallback 2

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 64→54（-10），决策 code 8，jev-plan 2，code-fallback 1，jev 1
- 第 3 层 小啃兽: HP 60→52（-8），决策 code 8，jev-plan 2，code-fallback 1，jev 1
- 第 6 层 毛绒伏地虫: HP 78→74（-4），决策 code 7，jev 1，jev-plan 1
- 第 7 层 异蛙寄生虫/扭动虫: HP 80→40（-40），决策 code 18，jev 4，jev-plan 4
- 第 11 层 旧日雕像: HP 72→23（-49），决策 code 9，jev 6，jev-plan 5
- 第 12 层 蛇行扼杀者/闪光贾克斯果: HP 31→23（-8），决策 code 12，jev-plan 2，jev 1
- 第 14 层 方柱构装体: HP 55→38（-17），决策 code 7，jev-plan 4，jev 2
- 第 14 层 方柱构装体: HP 38→38（-0），决策 code 1
- 第 17 层 仪式兽: HP 80→10（-70），决策 jev 17，jev-plan 17，code 6
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 69→36（-33），决策 code 11，jev 3，jev-plan 2
- 第 20 层 外骨骼虫: HP 44→33（-11），决策 code 4，jev 1
- 第 20 层 外骨骼虫: HP 33→19（-14），决策 code 10，jev 1，jev-plan 1
- 第 22 层 直飞产卵虫/结实的卵: HP 27→12（-15），决策 code 6，jev-plan 4，jev 2
- 第 23 层 盛碗虫（丝）/盛碗虫（石）/盛碗虫（蜜）: HP 20→1（-19），决策 jev 9，jev-plan 8，code 4

### 死亡战斗：第 23 层 盛碗虫（丝）/盛碗虫（石）/盛碗虫（蜜）
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 放血
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 踩踏
- T2 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.21; code rank 1 conf 0.21
- T3 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (打击 -> 盛碗虫（石）, 防御, 双重打击 -> 盛碗虫（蜜）) with confidence 0.68; code rank 1 conf 0.68
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 双重打击 -> 盛碗虫（蜜）
- T3 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.41; code rank 1 [calc mismatch: solver says ending now does not kill, mod says lethal] conf 0.41
- T4 [jev] combat/play: Jev chose p2 (Drink 液态记忆) with confidence 0.61 conf 0.61
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-6): 打击 -> 盛碗虫（石）, 双重打击+ -> 盛碗虫（石）, 打击+ -> 盛碗虫（石）
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击+ -> 盛碗虫（石）
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 打击+ -> 盛碗虫（石）
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-6): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 52
- combat/plan / code: 44
- combat/plan-continue / code: 42
- combat/plan-choice+potion / jev: 35
- reward/claim / code: 26
- map/route / code: 18
- combat/lethal / code: 13
- combat/plan-choice / jev: 12
- reward/proceed / code: 12
- reward/card / code: 10
- combat/end_turn / code: 9
- event/leave / code: 7
- event/choose / jev: 5
- map/route / jev: 4
- rest/proceed / code: 3
- combat/least-loss / code: 2
- combat/plan-choice / code-fallback: 2
- combat/play / jev: 2
- event/only / code: 2
- rest/choose / code: 2
- selection/exhaust / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-guarded / code: 1
- rest/choose / jev: 1
- reward/card / jev: 1
- run/finalize / code: 1
- selection/upgrade / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：8 个
- 第 1 层 event/choose: Jev chose 药瓶皮套 with confidence 0.22 (0.22)
- 第 4 层 event/choose: Jev chose 砸碎 with confidence 0.11 (0.11)
- 第 5 层 event/choose: Jev chose 交换金币 with confidence 0.21 (0.21)
- 第 18 层 event/choose: Jev chose 佩尔之血 with confidence 0.15 (0.15)
- 第 19 层 reward/card: Jev chose skip the card reward with confidence 0.20 (0.20)
- 第 21 层 event/choose: Jev chose 学习杀灭的技巧 with confidence 0.08 (0.08)
- 第 23 层 combat/plan-choice+potion: Jev chose plan 2/4 (岩石铠甲, 防御, 杀灭) with confidence 0.33; code rank 2 (0.33)
- 第 23 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.21; code rank 1 (0.21)
