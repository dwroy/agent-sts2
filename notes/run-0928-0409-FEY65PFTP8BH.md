## 复盘：run FEY65PFTP8BH — 阵亡，最高第 17 层

- 决策 207 个；Jev 调用 29 次，Claude 0 次，DeepSeek 0 次；token 49,378 入 / 1,183 出，约 $0.0021；用时 8.4 分钟
- 决策者：code 158，jev 28，jev-plan 20，code-fallback 1

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→57（-7），决策 code 7，jev 2，jev-plan 2，code-fallback 1
- 第 3 层 蟾蜍蝌蚪: HP 63→55（-8），决策 code 7，jev-plan 2，jev 1
- 第 5 层 噬尸蛞蝓: HP 58→50（-8），决策 code 4，jev 3，jev-plan 2
- 第 6 层 卑鄙地精/地精佣兵/胖地精: HP 56→30（-26），决策 code 9，jev 4，jev-plan 2
- 第 11 层 下水道蚌: HP 60→41（-19），决策 code 12，jev-plan 4，jev 3
- 第 13 层 花园幽灵鳗: HP 71→38（-33），决策 code 15，jev-plan 4，jev 2
- 第 15 层 鬼祟珊瑚群: HP 44→31（-13），决策 code 8，jev 3，jev-plan 3
- 第 15 层 鬼祟珊瑚群: HP 31→21（-10），决策 code 3
- 第 17 层 乐加维林族母: HP 51→51（-0），决策 code 2
- 第 17 层 乐加维林族母: HP 51→15（-36），决策 code 23，jev 2，jev-plan 1

### 死亡战斗：第 17 层 乐加维林族母
- T5 [code] combat/plan: code plan (only line): end turn; hp -10, dmg 0
- T6 [jev] combat/plan-choice: Jev chose plan 1/2 (上勾拳 -> 乐加维林族母, 打击 -> 乐加维林族母) with confidence 0.68; code rank 1; HP guard: plan 1 (上勾拳 -> 乐加维林族母, 打击 -> 乐加维林族母) loses 8 HP, more than 6 over  conf 0.68
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 坚毅
- T6 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 0
- T7 [code] combat/plan: code plan (+14.6 over next): 打击 -> 乐加维林族母, 剑柄打击 -> 乐加维林族母, 突破; hp -2, dmg 38
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 剑柄打击 -> 乐加维林族母
- T7 [jev] combat/plan-choice: Jev chose plan 1/2 (突破) with confidence 0.91; code rank 1 conf 0.91
- T7 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 0
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): 防御, 打击 -> 乐加维林族母, 飞剑回旋镖
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 乐加维林族母
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 飞剑回旋镖
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): end turn

### 各类决策由谁做
- combat/plan / code: 55
- combat/plan-continue / code: 25
- combat/plan-choice / jev: 20
- combat/plan-continue / jev-plan: 20
- reward/claim / code: 20
- map/route / code: 15
- combat/lethal / code: 8
- reward/proceed / code: 7
- reward/card / code: 5
- event/leave / code: 4
- rest/choose / code: 4
- rest/proceed / code: 4
- event/choose / jev: 3
- reward/card / jev: 3
- selection/add / code: 3
- combat/least-loss / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-choice / code-fallback: 1
- event/only / code: 1
- map/route / jev: 1
- run/finalize / code: 1
- selection/take into my hand / jev: 1
- selection/upgrade / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：3 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 淤泥旋螺, 防御) with confidence 0.34; code rank 1 (0.34)
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (防御, 上勾拳 -> 淤泥旋螺) with confidence 0.13; code rank 1 (0.13)
- 第 3 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 蟾蜍蝌蚪, 打击 -> 蟾蜍蝌蚪, 防御) with confidence 0.22; code rank 1 (0.22)
