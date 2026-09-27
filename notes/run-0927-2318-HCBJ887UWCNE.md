## 复盘：run HCBJ887UWCNE — 阵亡，最高第 17 层

- 决策 216 个；Jev 调用 30 次，Claude 0 次，DeepSeek 0 次；token 50,287 入 / 1,162 出，约 $0.0022；用时 11.3 分钟
- 决策者：code 155，jev-plan 31，jev 28，code-fallback 2

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→55（-9），决策 code 8，jev-plan 3，jev 2，code-fallback 1
- 第 3 层 噬尸蛞蝓: HP 61→47（-14），决策 code 4，jev 1，jev-plan 1
- 第 5 层 海洋混混: HP 53→40（-13），决策 code 3，jev 2，jev-plan 1
- 第 6 层 幽灵船: HP 46→17（-29），决策 code 11，jev-plan 5，jev 3，code-fallback 1
- 第 8 层 噬尸蛞蝓: HP 47→33（-14），决策 code 4
- 第 11 层 双尾鼠: HP 39→19（-20），决策 jev 4，code 2
- 第 13 层 潮湿邪教徒/钙化邪教徒: HP 49→39（-10），决策 code 6，jev-plan 4，jev 2
- 第 14 层 化石追踪者: HP 45→22（-23），决策 code 10，jev-plan 6，jev 4
- 第 15 层 拳击构装体: HP 28→22（-6），决策 code 11，jev-plan 4，jev 2
- 第 17 层 乐加维林族母: HP 52→18（-34），决策 code 23，jev-plan 7，jev 3

### 死亡战斗：第 17 层 乐加维林族母
- T7 [code] combat/plan: code plan (only distinct line): 打击 -> 乐加维林族母, 打击 -> 乐加维林族母, 旋风斩; hp -1, dmg 15
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 乐加维林族母
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 旋风斩
- T7 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 0
- T8 [jev] combat/plan-choice: Jev chose plan 1/3 (挑衅 -> 乐加维林族母, 预备打击 -> 乐加维林族母, 打击 -> 乐加维林族母) with confidence 0.82; code rank 1 conf 0.82
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 预备打击 -> 乐加维林族母
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 乐加维林族母
- T8 [code] combat/plan: code plan (only line): end turn; hp -18, dmg 0
- T9 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 21): 剑柄打击 -> 乐加维林族母, 痛击 -> 
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): 打击 -> 乐加维林族母, 防御
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): end turn

### 各类决策由谁做
- combat/plan / code: 45
- combat/plan-continue / jev-plan: 31
- combat/plan-continue / code: 24
- reward/claim / code: 23
- combat/plan-choice / jev: 18
- map/route / code: 16
- reward/proceed / code: 11
- combat/lethal / code: 9
- reward/card / code: 8
- combat/plan-choice+potion / jev: 5
- combat/least-loss / code: 3
- event/choose / jev: 3
- event/leave / code: 3
- rest/choose / code: 3
- rest/proceed / code: 3
- combat/plan-choice / code-fallback: 2
- map/discard-potion / code: 2
- reward/card / jev: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/end_turn / code: 1
- run/finalize / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：4 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (防御, 打击 -> 淤泥旋螺, 防御) with confidence 0.18; code rank 1 (0.18)
- 第 4 层 event/choose: Jev chose 顺走地图 with confidence 0.09 (0.09)
- 第 6 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 幽灵船, 挑衅 -> 幽灵船, 打击 -> 幽灵船) with confidence 0.23; code rank 1 (0.23)
- 第 11 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.21; code rank 1 (0.21)
