## 复盘：run CSLHFCBSC1UM — 阵亡，最高第 17 层

- 决策 468 个；Jev 调用 89 次，Claude 0 次，大脑 16 次（codex 16）；token 417,503 入 / 4,010 出，约 $0.0177（Jev）；大脑 token 2,125,973 入（缓存命中 1,359,360，64%）/ 3,401 出；用时 20.8 分钟
- 决策者：code 220，jev-plan 141，jev 89，codex 18

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 56→55（-1），决策 code 9，jev-plan 7，jev 3
- 第 3 层 淤泥旋螺: HP 55→55（-0），决策 jev-plan 4，code 4，jev 3
- 第 5 层 蟾蜍蝌蚪: HP 55→55（-0），决策 jev-plan 4，code 3，jev 1
- 第 6 层 卑鄙地精/地精佣兵/胖地精: HP 55→39（-16），决策 jev-plan 9，code 7，jev 5
- 第 8 层 下水道蚌: HP 39→33（-6），决策 code 13，jev 3，jev-plan 3
- 第 11 层 骇鳗: HP 54→41（-13），决策 code 17，jev 6，jev-plan 6
- 第 12 层 幽灵船: HP 41→41（-0），决策 code 11，jev-plan 8，jev 5
- 第 14 层 噬尸蛞蝓: HP 62→62（-0），决策 jev-plan 10，jev 4，code 4
- 第 15 层 花园幽灵鳗: HP 62→43（-19），决策 code 14，jev-plan 4，jev 3
- 第 17 层 乐加维林族母: HP 64→0（-64），决策 jev-plan 86，code 82，jev 56

### 死亡战斗：第 17 层 乐加维林族母
- T8 [jev] combat/plan-choice: Jev chose plan 2/2 (打击 -> 乐加维林族母, 中和 -> 乐加维林族母, 猎杀者 -> 乐加维林族母) with confidence 0.22; code rank 2 conf 0.22
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 中和 -> 乐加维林族母
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 猎杀者 -> 乐加维林族母
- T8 [code] combat/plan: code plan (only line): end turn; hp -12, dmg 11
- T9 [jev] combat/plan-choice: Jev chose plan 1/2 (带毒刺击 -> 乐加维林族母, 迷雾) with confidence 0.74; code rank 1 conf 0.74
- T9 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 迷雾
- T9 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 17
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-9): 防御, 生存者, 防御
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 生存者
- T10 [jev] selection/choose: Jev chose 打击 with confidence 0.86 conf 0.86
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-9): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 141
- combat/plan / code: 88
- combat/plan-choice / jev: 77
- combat/plan-continue / code: 47
- reward/claim / code: 22
- map/route-follow / code: 15
- combat/lethal / code: 11
- selection/choose / jev: 11
- combat/least-loss / code: 9
- reward/card / codex: 9
- reward/proceed / code: 9
- combat/end_turn / code: 8
- rest/plan / codex: 4
- rest/proceed / code: 4
- event/leave / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-choice+potion / jev: 1
- event/choose / codex: 1
- event/plan / codex: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/enchant / codex: 1
- selection/take into my hand / code: 1
- selection/upgrade / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：11 个
- 第 6 层 combat/plan-choice: Jev chose plan 3/3 (中和 -> 胖地精, 防御, 致命毒药 -> 胖地精, 防御) with confidence 0.29; code rank 3 (0.29)
- 第 12 层 combat/plan-choice: Jev chose plan 1/2 (切割 -> 幽灵船, 打击 -> 幽灵船, 突然一拳 -> 幽灵船, 防御) with confidence 0.08; code rank 1 (0.08)
- 第 15 层 combat/plan-choice: Jev chose plan 1/2 (致命毒药+ -> 花园幽灵鳗 #4, 猎杀者 -> 花园幽灵鳗 #4) with confidence 0.20; code rank 1 (0.20)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (防御, 切割 -> 乐加维林族母, 猎杀者 -> 乐加维林族母) with confidence 0.04; code rank 2 (0.04)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (防御, 切割 -> 乐加维林族母, 猎杀者 -> 乐加维林族母) with confidence 0.34; code rank 2 (0.34)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (防御, 切割 -> 乐加维林族母, 猎杀者 -> 乐加维林族母) with confidence 0.34; code rank 2 (0.34)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 乐加维林族母, 中和 -> 乐加维林族母, 猎杀者 -> 乐加维林族母) with confidence 0.24; code rank 2 (0.24)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (防御, 切割 -> 乐加维林族母, 猎杀者 -> 乐加维林族母) with confidence 0.30; code rank 2 (0.30)
- 第 17 层 combat/plan-choice: Jev chose plan 3/3 (防御, 防御, 串刺 -> 乐加维林族母, 中和 -> 乐加维林族母) with confidence 0.28; code rank 3 (0.28)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 乐加维林族母, 中和 -> 乐加维林族母, 猎杀者 -> 乐加维林族母) with confidence 0.28; code rank 2 (0.28)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 乐加维林族母, 中和 -> 乐加维林族母, 猎杀者 -> 乐加维林族母) with confidence 0.22; code rank 2 (0.22)
