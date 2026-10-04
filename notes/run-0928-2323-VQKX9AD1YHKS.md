## 复盘：run VQKX9AD1YHKS — 阵亡，最高第 48 层

- 决策 677 个；Jev 调用 116 次，Claude 0 次，DeepSeek 57 次；token 353,964 入 / 6,180 出，约 $0.0151（Jev）；DeepSeek token 1,116,684 入（缓存命中 818,048，73%）/ 171,000 出；用时 43.3 分钟
- 决策者：code 352，jev-plan 152，jev 116，deepseek 57

### 战斗掉血（按层）
- 第 2 层 缩小甲虫: HP 64→64（-0），决策 code 7
- 第 3 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 70→67（-3），决策 code 8，jev-plan 5，jev 3
- 第 7 层 小啃兽: HP 73→71（-2），决策 code 7，jev 1，jev-plan 1
- 第 11 层 树叶史莱姆（中）/飞蝇菌子: HP 77→77（-0），决策 jev 1
- 第 11 层 树叶史莱姆（中）/飞蝇菌子: HP 77→66（-11），决策 code 11，jev 6，jev-plan 3
- 第 12 层 旧日雕像: HP 72→47（-25），决策 code 10，jev 5，jev-plan 5
- 第 14 层 利齿之眼/雾菇: HP 76→64（-12），决策 code 7，jev-plan 4，jev 3
- 第 17 层 仪式兽: HP 70→41（-29），决策 code 18，jev 5，jev-plan 4
- 第 19 层 外骨骼虫: HP 71→60（-11），决策 code 7，jev-plan 6，jev 2
- 第 21 层 地道虫: HP 66→60（-6），决策 jev-plan 4，code 4，jev 1
- 第 23 层 胧光怪: HP 66→65（-1），决策 jev-plan 2，jev 1
- 第 23 层 寄生惧魔/胧光怪: HP 64→39（-25），决策 code 7，jev-plan 6，jev 5
- 第 24 层 外骨骼虫: HP 45→38（-7），决策 jev-plan 6，code 5，jev 3
- 第 24 层 外骨骼虫: HP 37→33（-4），决策 jev 4，jev-plan 4，code 4
- 第 27 层 猎人杀手: HP 62→53（-9），决策 jev-plan 8，jev 5，code 3
- 第 27 层 猎人杀手: HP 52→37（-15），决策 code 5，jev 2，jev-plan 2
- 第 30 层 啃咬机: HP 66→66（-0），决策 code 8，jev-plan 6，jev 4
- 第 30 层 啃咬机: HP 65→61（-4），决策 jev-plan 2，code 2，jev 1
- 第 31 层 异螨: HP 67→53（-14），决策 jev-plan 8，code 5，jev 3
- 第 33 层 知识恶魔: HP 77→77（-0），决策 jev 1
- 第 33 层 知识恶魔: HP 76→74（-2），决策 jev 2，jev-plan 2
- 第 33 层 知识恶魔: HP 74→64（-10），决策 code 8，jev-plan 6，jev 4
- 第 33 层 知识恶魔: HP 64→23（-41），决策 jev 8，jev-plan 5，code 4
- 第 33 层 知识恶魔: HP 23→23（-0），决策 code 1
- 第 35 层 虔诚雕刻师: HP 67→54（-13），决策 jev-plan 8，jev 6，code 5
- 第 36 层 活体盾/高塔炮手: HP 59→59（-0），决策 jev 1
- 第 36 层 活体盾/高塔炮手: HP 59→55（-4），决策 jev-plan 7，code 7，jev 4
- 第 36 层 高塔炮手: HP 54→54（-0），决策 code 3
- 第 38 层 拳击构装体/方柱构装体: HP 59→59（-0），决策 jev 1
- 第 38 层 拳击构装体/方柱构装体: HP 58→33（-25），决策 code 10，jev-plan 9，jev 5
- 第 39 层 咬人卷轴: HP 39→34（-5），决策 jev 3，jev-plan 3，code 2
- 第 43 层 幽灵骑士/连枷骑士/魔法骑士: HP 63→52（-11），决策 jev-plan 9，jev 5，code 1
- 第 43 层 幽灵骑士/连枷骑士/魔法骑士: HP 51→41（-10），决策 code 4，jev-plan 2，jev 1
- 第 46 层 失落之物/遗忘之物: HP 72→63（-9），决策 jev-plan 6，jev 4，code 1
- 第 46 层 遗忘之物: HP 63→63（-0），决策 jev-plan 3，jev 1
- 第 48 层 实验体 #C26: HP 71→71（-0），决策 jev 2，jev-plan 2
- 第 48 层 实验体 #C26: HP 71→51（-20），决策 jev 8，jev-plan 8，code 2
- 第 48 层 实验体 #C26: HP 51→2（-49），决策 code 8，jev-plan 6，jev 3

### 死亡战斗：第 48 层 实验体 #C26
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 熔融之拳 -> 实验体 #C26
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 旋风斩+
- T5 [code] combat/plan: code plan (only line): end turn; hp -19, dmg 0
- T6 [jev] combat/plan-choice: Jev chose plan 1/3 (防御+, 双重打击 -> 实验体 #C26, 灰烬打击 -> 实验体 #C26) with confidence 0.87; code rank 1 conf 0.87
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 双重打击 -> 实验体 #C26
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 灰烬打击 -> 实验体 #C26
- T6 [code] combat/plan: code plan (only line): end turn; hp -30, dmg 0
- T7 [code] combat/plan: code plan (only distinct line): 打击 -> 实验体 #C26, 剑柄打击 -> 实验体 #C26; hp -1, dmg 2
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 剑柄打击 -> 实验体 #C26
- T7 [code] combat/plan: code plan (only distinct line): 耸肩无视, 愤怒 -> 实验体 #C26; hp -1, dmg 7
- T7 [code] combat/plan: code plan (only distinct line): 愤怒 -> 实验体 #C26; hp -1, dmg 7
- T7 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 0

### 各类决策由谁做
- combat/plan-continue / jev-plan: 152
- combat/plan / code: 86
- combat/plan-choice / jev: 71
- reward/claim / code: 54
- combat/plan-continue / code: 51
- combat/plan-choice+potion / jev: 43
- map/route-follow / code: 42
- combat/lethal / code: 28
- reward/card / deepseek: 22
- reward/proceed / code: 22
- event/choose / deepseek: 13
- event/leave / code: 11
- rest/choose / deepseek: 9
- rest/proceed / code: 9
- selection/exhaust / code: 9
- combat/end_turn / code: 8
- selection/curse / code: 5
- chest/open / code: 4
- chest/proceed / code: 4
- chest/relic / code: 4
- map/route-plan / deepseek: 3
- selection/upgrade / deepseek: 3
- shop/buy / deepseek: 3
- map/route / code: 2
- selection/discard / code: 2
- selection/enchant / deepseek: 2
- selection/take into my hand / jev: 2
- shop/buy / code: 2
- shop/leave / code: 2
- shop/open / code: 2
- bundle/choose / deepseek: 1
- bundle/confirm / code: 1
- combat/plan-potion / code: 1
- run/finalize / code: 1
- selection/confirm / code: 1
- selection/remove / deepseek: 1
- selection/take into my hand / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：13 个
- 第 3 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 树枝史莱姆（小）, 防御, 打击 -> 树枝史莱姆（小）) with confidence 0.14; code rank 1 (0.14)
- 第 11 层 combat/plan-choice: Jev chose plan 3/5 (防御, 防御, 打击 -> 飞蝇菌子) with confidence 0.28; code rank 3 (0.28)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.15; code rank 1 (0.15)
- 第 19 层 combat/plan-choice: Jev chose plan 1/4 (防御, 熔融之拳 -> 外骨骼虫, 突破) with confidence 0.23; code rank 1 (0.23)
- 第 30 层 combat/plan-choice: Jev chose plan 4/6 (防御, 打击 -> 啃咬机, 耸肩无视) with confidence 0.28; code rank 4 (0.28)
- 第 33 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.00; code rank 2 (0.00)
- 第 33 层 combat/plan-choice: Jev chose plan 1/2 (突破+) with confidence 0.29; code rank 1 (0.29)
- 第 33 层 combat/plan-choice: Jev chose plan 1/4 (愤怒 -> 知识恶魔) with confidence 0.25; code rank 1 (0.25)
- 第 33 层 combat/plan-choice: Jev chose plan 2/2 (防御+, 剑柄打击 -> 知识恶魔, 坚毅) with confidence 0.01; code rank 2 (0.01)
- 第 43 层 combat/plan-choice+potion: Jev chose plan 1/6 (防御, 烙印, 熔融之拳 -> 连枷骑士, 御血术 -> 连枷骑士, 坚毅) with confidence 0.19; code rank 1 (0.19)
- 第 46 层 combat/plan-choice+potion: Jev chose plan 1/3 (恶魔形态+, 防御+) with confidence 0.33; code rank 1 (0.33)
- 第 48 层 combat/plan-choice+potion: Jev chose plan 1/2 (灰烬打击 -> 实验体 #C26) with confidence 0.27; code rank 1 (0.27)
- 第 48 层 combat/plan-choice+potion: Jev chose plan 3/6 (战斗专注+) with confidence 0.33; code rank 3 (0.33)
