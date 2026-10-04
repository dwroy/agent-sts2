## 复盘：run ADR6TU34MJAH — 阵亡，最高第 24 层

- 决策 277 个；Jev 调用 81 次，Claude 0 次，DeepSeek 0 次；token 209,752 入 / 3,704 出，约 $0.0090；用时 15.7 分钟
- 决策者：code 168，jev 81，jev-plan 28

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→59（-5），决策 jev-plan 6，code 6，jev 3
- 第 5 层 蟾蜍蝌蚪: HP 65→55（-10），决策 code 8，jev 2，jev-plan 1
- 第 7 层 噬尸蛞蝓: HP 80→66（-14），决策 jev 4，jev-plan 3，code 3
- 第 8 层 鬼祟珊瑚群: HP 72→35（-37），决策 jev-plan 8，code 8，jev 6
- 第 12 层 幽灵船: HP 41→29（-12），决策 jev 6，code 2，jev-plan 1
- 第 15 层 双尾鼠: HP 59→53（-6），决策 code 6，jev 1，jev-plan 1
- 第 17 层 乐加维林族母: HP 80→60（-20），决策 code 6，jev 3，jev-plan 2
- 第 17 层 乐加维林族母: HP 60→36（-24），决策 code 9，jev 1
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 72→72（-0），决策 code 3
- 第 20 层 偷窃草蜢: HP 78→50（-28），决策 code 6，jev 2，jev-plan 1
- 第 21 层 幼虫/直飞产卵虫/结实的卵: HP 56→20（-36），决策 code 7，jev 2，jev-plan 1
- 第 21 层 幼虫/直飞产卵虫: HP 20→20（-0），决策 code 1
- 第 22 层 虱虫之祖: HP 26→26（-0），决策 code 3，jev 2
- 第 22 层 虱虫之祖: HP 26→3（-23），决策 code 11，jev 3，jev-plan 2
- 第 24 层 棘刺蟾蜍: HP 9→9（-0），决策 jev 1，jev-plan 1
- 第 24 层 棘刺蟾蜍: HP 9→9（-0），决策 code 1，jev 1
- 第 24 层 棘刺蟾蜍: HP 9→2（-7），决策 code 4，jev 2，jev-plan 1

### 死亡战斗：第 24 层 棘刺蟾蜍
- T1 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T2 [jev] combat/plan-choice: Jev chose plan 1/2 (防御, 耸肩无视+) with confidence 0.74; code reference rank 1 conf 0.74
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 耸肩无视+
- T2 [jev] combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.78; code reference rank 1 conf 0.78
- T3 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 43): potion 迅捷药水, 重锤+ -> 棘刺
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-15): 重锤+ -> 棘刺蟾蜍
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-15): end turn

### 各类决策由谁做
- combat/plan / code: 48
- combat/plan-choice / jev: 39
- reward/claim / code: 30
- combat/plan-continue / jev-plan: 28
- combat/plan-continue / code: 19
- map/route / code: 14
- combat/lethal / code: 13
- reward/card / jev: 11
- reward/proceed / code: 11
- map/route / jev: 9
- shop/buy / jev: 8
- event/choose / jev: 5
- event/leave / code: 5
- selection/upgrade / jev: 4
- shop/leave / code: 4
- shop/open / code: 4
- combat/least-loss / code: 3
- selection/discard / code: 3
- selection/remove / jev: 3
- rest/choose / jev: 2
- rest/proceed / code: 2
- selection/add / code: 2
- selection/exhaust / code: 2
- shop/buy / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-potion / code: 1
- run/finalize / code: 1
- selection/confirm / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：12 个
- 第 1 层 selection/remove: Jev chose 痛击 with confidence 0.26; code rank 3/3 (0.26)
- 第 4 层 event/choose: Jev chose 暗之门 with confidence 0.04; code rank 1/2 (0.04)
- 第 6 层 map/route: Jev chose Unknown (row 6, col 2) with confidence 0.26; code rank 1/2 (0.26)
- 第 7 层 combat/plan-choice: Jev chose plan 3/3 (potion 能量药水, 打击 -> 噬尸蛞蝓) with confidence 0.34; code reference rank 3 (0.34)
- 第 7 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 噬尸蛞蝓) with confidence 0.14; code reference rank 2 (0.14)
- 第 8 层 combat/plan-choice: Jev chose plan 4/4 (打击 -> 鬼祟珊瑚群, 防御, 防御) with confidence 0.34; code reference rank 4 (0.34)
- 第 8 层 reward/card: Jev chose 血墙 (Skill, 2E) with confidence 0.30; code rank 3/4 (0.30)
- 第 11 层 event/choose: Jev chose 那个 with confidence 0.34; code rank 1/2 (0.34)
- 第 15 层 reward/card: Jev chose 血墙 (Skill, 2E) with confidence 0.14; code rank 3/4 (0.14)
- 第 17 层 reward/card: Jev chose 连环拳 (Skill, 1E) with confidence 0.30; code rank 2/4 (0.30)
- 第 22 层 combat/plan-choice: Jev chose plan 2/3 (耸肩无视+, 无情猛攻+ -> 虱虫之祖) with confidence 0.28; code reference rank 2 (0.28)
- 第 23 层 shop/buy: Jev chose buy 火焰药水 (49g) with confidence 0.25; code rank 1/6 (0.25)
