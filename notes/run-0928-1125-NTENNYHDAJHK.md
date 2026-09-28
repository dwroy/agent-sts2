## 复盘：run NTENNYHDAJHK — 阵亡，最高第 33 层

- 决策 367 个；Jev 调用 115 次，Claude 0 次，DeepSeek 0 次；token 309,913 入 / 5,185 出，约 $0.0132；用时 16.8 分钟
- 决策者：code 189，jev 115，jev-plan 63

### 战斗掉血（按层）
- 第 2 层 小啃兽: HP 64→61（-3），决策 code 7，jev-plan 4，jev 2
- 第 3 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 67→63（-4），决策 code 5，jev 4，jev-plan 3
- 第 5 层 毛绒伏地虫: HP 69→67（-2），决策 jev 2，jev-plan 1
- 第 5 层 毛绒伏地虫: HP 67→66（-1），决策 code 3，jev 2
- 第 8 层 利齿之眼/雾菇: HP 72→62（-10），决策 jev 4，jev-plan 2，code 1
- 第 12 层 蛮兽: HP 68→57（-11），决策 code 4，jev 3，jev-plan 2
- 第 17 层 仪式兽: HP 80→3（-77），决策 code 12，jev 9，jev-plan 8
- 第 19 层 外骨骼虫: HP 65→65（-0），决策 code 4，jev-plan 2，jev 1
- 第 20 层 地道虫: HP 71→65（-6），决策 jev-plan 6，code 6，jev 4
- 第 22 层 虱虫之祖: HP 71→53（-18），决策 code 10，jev-plan 6，jev 5
- 第 28 层 异螨: HP 59→51（-8），决策 jev-plan 7，code 5，jev 3
- 第 29 层 外骨骼虫: HP 57→44（-13），决策 jev-plan 6，code 6，jev 4
- 第 30 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 50→1（-49），决策 jev-plan 10，jev 9，code 7
- 第 31 层 猎人杀手: HP 7→5（-2），决策 code 5，jev-plan 3，jev 2
- 第 33 层 火箭/碾碎爪: HP 60→2（-58），决策 code 18，jev 3，jev-plan 3

### 死亡战斗：第 33 层 火箭/碾碎爪
- T4 [code] combat/plan: code plan (only line): 巨像, 压扁 -> 火箭, 防御; hp -10, dmg 7
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 压扁 -> 火箭
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T4 [code] combat/plan: code plan (only line): end turn; hp -10, dmg 0
- T5 [code] combat/plan: code plan (only line): 邪眼, 打击 -> 碾碎爪, 防御; hp -0, dmg 4
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 碾碎爪
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T5 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T6 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 27): 剑柄打击 -> 火箭, 熔融之拳 -> 火箭
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-14): 熔融之拳 -> 碾碎爪, 防御
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-14): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 63
- combat/plan-choice / jev: 57
- combat/plan / code: 48
- reward/claim / code: 33
- combat/plan-continue / code: 23
- map/route / code: 18
- map/route / jev: 14
- reward/proceed / code: 14
- combat/lethal / code: 13
- reward/card / jev: 13
- event/choose / jev: 9
- event/leave / code: 9
- shop/buy / jev: 7
- selection/upgrade / jev: 6
- combat/end_turn / code: 5
- rest/choose / jev: 5
- rest/proceed / code: 5
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- combat/least-loss / code: 3
- selection/remove / jev: 2
- shop/buy / code: 2
- shop/leave / code: 2
- shop/open / code: 2
- combat/plan-potion / code: 1
- pause/close_submenu / code: 1
- run/finalize / code: 1
- selection/take into my hand / jev: 1
- selection/transform / jev: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：21 个
- 第 3 层 combat/plan-choice: Jev chose plan 1/4 (打击 -> 树枝史莱姆（小）, 打击 -> 树叶史莱姆（中）, 防御) with confidence 0.10; code reference rank 1 (0.10)
- 第 3 层 combat/plan-choice: Jev chose plan 1/4 (打击 -> 树叶史莱姆（中）, 防御) with confidence 0.28; code reference rank 1 (0.28)
- 第 3 层 combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.23; code reference rank 1 (0.23)
- 第 4 层 event/choose: Jev chose 装瓶 with confidence 0.25; code rank 2/2 (0.25)
- 第 5 层 combat/plan-choice: Jev chose plan 2/3 (potion 技能药水, card from 技能药水) with confidence 0.19; code reference rank 2 (0.19)
- 第 9 层 shop/buy: Jev chose buy 无惧疼痛 (77g) with confidence 0.30; code rank 1/4 (0.30)
- 第 9 层 map/route: Jev chose Treasure (row 9, col 1) with confidence 0.34; code rank 1/2 (0.34)
- 第 11 层 event/choose: Jev chose 那个 with confidence 0.25; code rank 1/2 (0.25)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (突破+, 旋风斩+) with confidence 0.29; code reference rank 1 (0.29)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (打击 -> 仪式兽, 双重打击 -> 仪式兽, 踩踏+) with confidence 0.13; code reference rank 1 (0.13)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (potion 再生药水) with confidence 0.17; code reference rank 2 (0.17)
- 第 17 层 reward/card: Jev chose 契约终结 (Attack, 0E) with confidence 0.30; code rank 4/4 (0.30)
- 第 18 层 event/choose: Jev chose 佩尔的士兵 with confidence 0.12; code rank 1/3 (0.12)
- 第 20 层 combat/plan-choice: Jev chose plan 1/4 (防御, 双重打击 -> 地道虫, 剑柄打击 -> 地道虫) with confidence 0.33; code reference rank 1 (0.33)
- 第 20 层 combat/plan-choice: Jev chose plan 2/2 (potion 能量药水, 旋风斩+) with confidence 0.31; code reference rank 2 (0.31)
