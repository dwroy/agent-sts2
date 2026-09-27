## 复盘：run 5JU3FNJXZFD4 — 阵亡，最高第 11 层

- 决策 146 个；Jev 调用 25 次，Claude 0 次，DeepSeek 0 次；token 37,356 入 / 1,131 出，约 $0.0016；用时 5.2 分钟
- 决策者：code 103，jev 20，jev-plan 18，code-fallback 5

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→55（-9），决策 code 6，jev-plan 2，jev 1，code-fallback 1
- 第 3 层 淤泥旋螺: HP 61→52（-9），决策 code 6，jev-plan 2，code-fallback 1，jev 1
- 第 4 层 噬尸蛞蝓: HP 58→49（-9），决策 code 9，jev 1，jev-plan 1
- 第 5 层 幽灵船: HP 55→30（-25），决策 code 7，jev 3，jev-plan 2
- 第 7 层 下水道蚌: HP 36→34（-2），决策 code 14
- 第 9 层 化石追踪者: HP 64→24（-40），决策 code 14，jev-plan 4，jev 2，code-fallback 1
- 第 11 层 噬尸蛞蝓: HP 30→2（-28），决策 jev-plan 7，jev 6，code 6，code-fallback 2

### 死亡战斗：第 11 层 噬尸蛞蝓
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 铁斩波 -> 噬尸蛞蝓
- T3 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T4 [jev] combat/plan-choice+potion: Jev chose plan 2/3 (打击 -> 噬尸蛞蝓, 防御, 铁斩波 -> 噬尸蛞蝓) with confidence 0.77; code rank 2 conf 0.77
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 铁斩波 -> 噬尸蛞蝓
- T4 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.05; code rank 1 conf 0.05
- T5 [code] combat/plan: code plan (only line): 防御, 防御, 防御; hp -5, dmg 0
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T5 [code] combat/plan: code plan (only line): end turn; hp -5, dmg 0
- T6 [jev] combat/play: Jev chose p0 (Drink 再生药水) with confidence 0.54 conf 0.54
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 血墙, potion 超巨化药水, 双重打击 -> 噬尸蛞蝓

### 各类决策由谁做
- combat/plan / code: 31
- combat/plan-continue / code: 24
- combat/plan-continue / jev-plan: 18
- reward/claim / code: 14
- combat/plan-choice / jev: 9
- combat/lethal / code: 6
- map/route / code: 6
- reward/proceed / code: 6
- reward/card / code: 5
- combat/plan-choice+potion / jev: 4
- map/route / jev: 4
- combat/plan-choice+potion / code-fallback: 3
- combat/plan-choice / code-fallback: 2
- event/leave / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/least-loss / code: 1
- combat/play / jev: 1
- event/choose / jev: 1
- event/only / code: 1
- rest/choose / code: 1
- rest/proceed / code: 1
- reward/card / jev: 1
- run/finalize / code: 1
- selection/upgrade / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：3 个
- 第 4 层 combat/plan-choice: Jev chose plan 1/3 (防御, 痛击+ -> 噬尸蛞蝓) with confidence 0.11; code rank 1 (0.11)
- 第 4 层 map/route: Jev chose Monster (row 4, col 1) with confidence 0.14 (0.14)
- 第 11 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.05; code rank 1 (0.05)
