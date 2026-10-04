## 复盘：run EZ2LP1P5VRPT — 阵亡，最高第 48 层

- 决策 594 个；Jev 调用 114 次，Claude 0 次，DeepSeek 58 次；token 229,662 入 / 5,260 出，约 $0.0099（Jev）；DeepSeek token 1,162,323 入（缓存命中 842,496，72%）/ 183,460 出；用时 36.6 分钟
- 决策者：code 321，jev 107，jev-plan 101，deepseek 58，code-fallback 7

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→61（-3），决策 code 9，jev-plan 2，jev 1
- 第 4 层 噬尸蛞蝓: HP 67→67（-0），决策 jev-plan 2，jev 1
- 第 4 层 噬尸蛞蝓: HP 67→64（-3），决策 code 8，jev-plan 5，jev 3
- 第 8 层 海洋混混: HP 80→80（-0），决策 code 2
- 第 8 层 海洋混混: HP 80→69（-11），决策 code 3，jev 1
- 第 11 层 化石追踪者: HP 75→75（-0），决策 jev-plan 6，code 5，jev 4
- 第 13 层 花园幽灵鳗: HP 80→80（-0），决策 code 1
- 第 14 层 下水道蚌: HP 80→68（-12），决策 code 10，jev 3，jev-plan 3
- 第 14 层 下水道蚌: HP 68→68（-0），决策 code 4
- 第 14 层 下水道蚌: HP 68→68（-0），决策 code 1
- 第 17 层 乐加维林族母: HP 74→74（-0），决策 jev 1，jev-plan 1
- 第 17 层 乐加维林族母: HP 74→60（-14），决策 jev 6，jev-plan 6，code 5
- 第 17 层 乐加维林族母: HP 60→60（-0），决策 code 4，jev 1
- 第 19 层 外骨骼虫: HP 77→71（-6），决策 code 5，jev 4，jev-plan 2
- 第 20 层 盛碗虫（卵）/盛碗虫（石）: HP 77→71（-6），决策 jev-plan 4，code 4，jev 2
- 第 22 层 异螨: HP 77→68（-9），决策 jev-plan 8，code 6，jev 5
- 第 27 层 虱虫之祖: HP 74→72（-2），决策 jev-plan 7，jev 5，code 3
- 第 27 层 虱虫之祖: HP 72→70（-2），决策 code 2
- 第 28 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 76→74（-2），决策 jev 7，code 6，jev-plan 2，code-fallback 1
- 第 28 层 熟睡甲虫: HP 74→72（-2），决策 code 3
- 第 30 层 棘刺蟾蜍: HP 78→51（-27），决策 jev 6，jev-plan 5，code 5
- 第 31 层 寄生惧魔/胧光怪: HP 57→55（-2），决策 code 10，jev 1，jev-plan 1
- 第 33 层 火箭/碾碎爪: HP 80→80（-0），决策 jev 4，code 3，code-fallback 1，jev-plan 1
- 第 33 层 火箭/碾碎爪: HP 80→48（-32），决策 jev 16，jev-plan 13，code-fallback 4，code 4
- 第 35 层 虔诚雕刻师: HP 74→58（-16），决策 code 8，jev-plan 7，jev 4
- 第 35 层 虔诚雕刻师: HP 58→58（-0），决策 code 1
- 第 37 层 咬人卷轴: HP 64→54（-10），决策 jev 3，jev-plan 3，code 3
- 第 38 层 青蛙骑士: HP 60→55（-5），决策 jev 6，jev-plan 6，code 2
- 第 38 层 青蛙骑士: HP 55→47（-8），决策 code 4，jev 2，jev-plan 1
- 第 44 层 巨斧机器人: HP 61→61（-0），决策 code 6
- 第 44 层 巨斧机器人: HP 61→31（-30），决策 code 7，jev 7，jev-plan 7
- 第 48 层 女王/火炬头聚合体: HP 66→66（-0），决策 jev-plan 3，jev 1
- 第 48 层 女王/火炬头聚合体: HP 66→2（-64），决策 code 13，jev 9，jev-plan 6，code-fallback 1

### 死亡战斗：第 48 层 女王/火炬头聚合体
- T4 [jev] combat/plan-choice: Jev chose plan 1/2 (放血, 与我一战！ -> 女王, 双重打击 -> 女王) with confidence 0.43; code rank 1 conf 0.43
- T4 [code] combat/plan: code plan (only distinct line): 打击 -> 女王, 双重打击 -> 女王; hp -12, dmg 31
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击 -> 女王
- T4 [code] combat/plan: code plan (only line): end turn; hp -12, dmg 0
- T5 [code] combat/plan: code plan (only distinct line): 岩石铠甲, 剑柄打击 -> 火炬头聚合体, 坚毅; hp -16, dmg 15
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 剑柄打击 -> 火炬头聚合体
- T5 [code] combat/plan: code plan (only line): 坚毅; hp -16, dmg 0
- T5 [code] combat/plan: code plan (only line): end turn; hp -16, dmg 0
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-34): 血墙, 防御+, 邪眼
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 防御+
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 邪眼
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-34): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 101
- combat/plan-choice / jev: 71
- combat/plan / code: 68
- reward/claim / code: 52
- map/route-follow / code: 41
- combat/plan-continue / code: 39
- combat/plan-choice+potion / jev: 32
- combat/lethal / code: 29
- reward/card / deepseek: 20
- reward/proceed / code: 20
- shop/buy / deepseek: 11
- event/choose / deepseek: 8
- event/leave / code: 8
- rest/choose / deepseek: 8
- rest/proceed / code: 8
- selection/add / code: 8
- shop/buy / code: 7
- shop/leave / code: 7
- shop/open / code: 7
- combat/end_turn / code: 6
- combat/plan-choice+potion / code-fallback: 6
- selection/upgrade / deepseek: 5
- chest/open / code: 4
- chest/proceed / code: 4
- chest/relic / code: 4
- map/route-plan / deepseek: 4
- combat/plan-potion / code: 3
- selection/take into my hand / jev: 3
- combat/least-loss / code: 2
- map/route / code: 2
- selection/add / deepseek: 2
- combat/plan-choice / code-fallback: 1
- run/finalize / code: 1
- selection/add / jev: 1
- selection/take into my hand / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：13 个
- 第 28 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.30; code rank 2 (0.30)
- 第 28 层 combat/plan-choice: Jev chose plan 1/3 (头槌 -> 熟睡甲虫) with confidence 0.22; code rank 1 (0.22)
- 第 30 层 combat/plan-choice: Jev chose plan 4/5 (双重打击 -> 棘刺蟾蜍, 打击 -> 棘刺蟾蜍) with confidence 0.23; code rank 4 (0.23)
- 第 33 层 combat/plan-choice: Jev chose plan 2/2 (防御+) with confidence 0.17; code rank 2 (0.17)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 2/4 (与我一战！ -> 碾碎爪, 痛击+ -> 火箭) with confidence 0.04; code rank 2 (0.04)
- 第 33 层 combat/plan-choice+potion: Jev chose to drink 混沌药水 (confidence 0.13) (0.13)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/2 (potion 技能药水, card from 技能药水) with confidence 0.22; code rank 1 (0.22)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.02; code rank 1 (0.02)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.32; code rank 1 (0.32)
- 第 48 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.24; code rank 1 (0.24)
- 第 48 层 combat/plan-choice+potion: Jev chose plan 1/4 (突破, 打击 -> 女王, 剑柄打击 -> 女王, 愤怒 -> 女王) with confidence 0.11; code rank 1 (0.11)
- 第 48 层 combat/plan-choice+potion: Jev chose plan 1/1 (愤怒 -> 女王) with confidence 0.17; code rank 1 (0.17)
- 第 48 层 combat/plan-choice+potion: Jev chose plan 3/4 (被遗忘的仪式, 防御+, 防御, 旋风斩+) with confidence 0.20; code rank 3 (0.20)
