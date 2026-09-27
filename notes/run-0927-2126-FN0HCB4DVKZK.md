## 复盘：run FN0HCB4DVKZK — 阵亡，最高第 33 层

- 决策 399 个；Jev 调用 71 次，Claude 0 次，DeepSeek 0 次；token 124,997 入 / 3,016 出，约 $0.0054；用时 16.0 分钟
- 决策者：code 262，jev 67，jev-plan 66，code-fallback 4

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 66→54（-12），决策 code 8，jev 2，jev-plan 2
- 第 5 层 蟾蜍蝌蚪: HP 62→52（-10），决策 code 6，jev-plan 3，jev 2
- 第 6 层 淤泥旋螺: HP 60→52（-8），决策 code 5，jev 2，jev-plan 2
- 第 7 层 双尾鼠: HP 60→46（-14），决策 code 12，jev-plan 2，jev 1
- 第 11 层 化石追踪者: HP 54→42（-12），决策 code 6，jev-plan 4，jev 2
- 第 12 层 卑鄙地精/地精佣兵/胖地精: HP 50→34（-16），决策 code 10，jev 2，jev-plan 2
- 第 14 层 下水道蚌: HP 66→55（-11），决策 jev-plan 4，jev 3，code 2
- 第 14 层 下水道蚌: HP 55→41（-14），决策 code 3
- 第 17 层 乐加维林族母: HP 73→11（-62），决策 code 23，jev-plan 3，jev 2，code-fallback 1
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 69→66（-3），决策 code 12，jev 1，jev-plan 1
- 第 21 层 偷窃草蜢: HP 83→76（-7），决策 jev-plan 7，code 6，jev 5
- 第 22 层 异螨: HP 83→34（-49），决策 jev-plan 9，code 8，jev 4，code-fallback 2
- 第 22 层 异螨: HP 34→34（-0），决策 jev-plan 3，code 3，jev 2
- 第 28 层 猎人杀手: HP 81→55（-26），决策 code 10，jev-plan 6，jev 2，code-fallback 1
- 第 31 层 外骨骼虫: HP 57→46（-11），决策 jev 2，jev-plan 2，code 1
- 第 31 层 外骨骼虫: HP 46→46（-0），决策 code 4，jev 1，jev-plan 1
- 第 33 层 无厌沙虫: HP 78→78（-0），决策 jev 5，jev-plan 3
- 第 33 层 无厌沙虫: HP 78→5（-73），决策 code 16，jev-plan 12，jev 10

### 死亡战斗：第 33 层 无厌沙虫
- T9 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 狂乱逃离
- T9 [code] combat/plan: code plan (only line): end turn; hp -18, dmg 0
- T10 [code] combat/plan: code plan (+16.5 over next): 防御, 防御, 痛殴+ -> 无厌沙虫; hp -14, dmg 36
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 痛殴+ -> 无厌沙虫
- T10 [code] combat/plan: code plan (only line): end turn; hp -14, dmg 0
- T11 [code] combat/plan: code plan (only line): 跃跃欲试; hp -2, dmg 0
- T11 [code] combat/plan: code plan (only line): end turn; hp -2, dmg 0
- T12 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (5): 挑衅 -> 无厌沙虫, 预备打击 -> 无厌沙虫, 杀灭
- T12 [code] combat/plan-continue: continuing the code-chosen plan: 预备打击 -> 无厌沙虫
- T12 [code] combat/plan-continue: continuing the code-chosen plan: 杀灭
- T12 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (5): end turn

### 各类决策由谁做
- combat/plan / code: 88
- combat/plan-continue / jev-plan: 66
- combat/plan-choice / jev: 34
- combat/plan-continue / code: 32
- reward/claim / code: 31
- map/route / code: 26
- combat/plan-choice+potion / jev: 14
- combat/lethal / code: 13
- reward/proceed / code: 13
- reward/card / code: 8
- event/leave / code: 6
- map/route / jev: 6
- rest/choose / code: 6
- rest/proceed / code: 6
- reward/card / jev: 6
- shop/buy / code: 6
- event/choose / jev: 5
- combat/plan-choice / code-fallback: 4
- selection/add / code: 4
- shop/leave / code: 4
- shop/open / code: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- combat/least-loss / code: 2
- event/only / code: 1
- run/finalize / code: 1
- selection/remove / code: 1
- selection/upgrade / code: 1
- selection/upgrade / jev: 1
- shop/buy / jev: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：15 个
- 第 1 层 event/choose: Jev chose 巨大扭蛋 with confidence 0.13 (0.13)
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 噬尸蛞蝓, 打击 -> 噬尸蛞蝓) with confidence 0.21; code rank 1 (0.21)
- 第 6 层 reward/card: Jev chose 预备打击 (Attack, 1E) with confidence 0.19 (0.19)
- 第 9 层 shop/buy: Jev chose buy 头槌 (51g) with confidence 0.08 (0.08)
- 第 14 层 reward/card: Jev chose skip the card reward with confidence 0.03 (0.03)
- 第 14 层 map/route: Jev chose Unknown (row 14, col 3) with confidence 0.30 (0.30)
- 第 15 层 event/choose: Jev chose 放入事件药水 with confidence 0.06 (0.06)
- 第 18 层 event/choose: Jev chose 佩尔之角 with confidence 0.26 (0.26)
- 第 19 层 combat/plan-choice: Jev chose plan 1/3 (燃烧, 痛殴+ -> 盛碗虫（石）) with confidence 0.16; code rank 1 (0.16)
- 第 21 层 map/route: Jev chose Monster (row 4, col 5) with confidence 0.21 (0.21)
- 第 23 层 event/choose: Jev chose 学习杀灭的技巧 with confidence 0.18 (0.18)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.29; code rank 1 (0.29)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.31; code rank 1 (0.31)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.24; code rank 1 (0.24)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.22; code rank 1 (0.22)
