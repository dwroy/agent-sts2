## 复盘：run NX48MBG3SPRJ — 阵亡，最高第 35 层

- 决策 426 个；Jev 调用 72 次，Claude 0 次，DeepSeek 0 次；token 130,888 入 / 3,133 出，约 $0.0056；用时 17.0 分钟
- 决策者：code 309，jev 71，jev-plan 45，code-fallback 1

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 64→54（-10），决策 code 7，jev-plan 3，jev 2
- 第 3 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 60→60（-0），决策 code 4，jev 1
- 第 3 层 树叶史莱姆（小）/树枝史莱姆（中）: HP 60→49（-11），决策 code 6
- 第 4 层 小啃兽: HP 55→37（-18），决策 jev-plan 3，code 3，jev 2
- 第 8 层 多尼斯异鸟: HP 67→67（-0），决策 jev 3，jev-plan 2
- 第 8 层 多尼斯异鸟: HP 67→65（-2），决策 code 4
- 第 8 层 多尼斯异鸟: HP 65→65（-0），决策 code 1
- 第 8 层 多尼斯异鸟: HP 65→34（-31），决策 code 6
- 第 12 层 毛绒伏地虫/缩小甲虫: HP 64→53（-11），决策 code 10，jev-plan 2，jev 1
- 第 12 层 毛绒伏地虫: HP 53→48（-5），决策 code 4
- 第 13 层 利齿之眼/雾菇: HP 54→34（-20），决策 code 5，jev 3，jev-plan 3
- 第 14 层 树叶史莱姆（中）/飞蝇菌子: HP 40→38（-2），决策 code 5，jev 2，jev-plan 2
- 第 14 层 树叶史莱姆（中）: HP 38→38（-0），决策 code 3
- 第 15 层 小啃兽: HP 44→40（-4），决策 code 4，jev 3，jev-plan 3
- 第 15 层 小啃兽: HP 40→32（-8），决策 code 2
- 第 17 层 仪式兽: HP 62→47（-15），决策 jev 5，jev-plan 2，code-fallback 1
- 第 17 层 仪式兽: HP 47→22（-25），决策 code 8，jev 4，jev-plan 2
- 第 19 层 地道虫: HP 69→47（-22），决策 code 11，jev-plan 3，jev 2
- 第 20 层 外骨骼虫: HP 53→53（-0），决策 jev-plan 3，jev 2，code 1
- 第 20 层 外骨骼虫: HP 53→32（-21），决策 jev 3，code 2，jev-plan 1
- 第 20 层 外骨骼虫: HP 32→29（-3），决策 jev 2，code 2
- 第 23 层 虱虫之祖: HP 35→28（-7），决策 code 10
- 第 23 层 虱虫之祖: HP 28→12（-16），决策 code 4，jev 2，jev-plan 1
- 第 28 层 寄生惧魔/胧光怪: HP 66→57（-9），决策 code 7，jev 4，jev-plan 2
- 第 30 层 直飞产卵虫/结实的卵: HP 80→80（-0），决策 code 4，jev 1，jev-plan 1
- 第 30 层 幼虫/直飞产卵虫/结实的卵: HP 80→59（-21），决策 code 7，jev 1
- 第 31 层 猎人杀手: HP 65→53（-12），决策 code 7，jev 3，jev-plan 1
- 第 33 层 火箭/碾碎爪: HP 80→32（-48），决策 code 15，jev 7，jev-plan 5
- 第 33 层 碾碎爪: HP 32→24（-8），决策 code 7
- 第 35 层 虔诚雕刻师: HP 69→23（-46），决策 code 9，jev-plan 6，jev 5

### 死亡战斗：第 35 层 虔诚雕刻师
- T3 [jev] combat/plan-choice: Jev chose plan 1/2 (飞剑回旋镖, 巨像, 打击 -> 虔诚雕刻师) with confidence 0.72; code rank 1 conf 0.72
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 巨像
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 虔诚雕刻师
- T3 [code] combat/plan: code plan (only line): end turn; hp -15, dmg 0
- T4 [jev] combat/plan-choice: Jev chose plan 1/3 (痛击 -> 虔诚雕刻师, 剑柄打击 -> 虔诚雕刻师, 头槌 -> 虔诚雕刻师) with confidence 0.77; code rank 1 conf 0.77
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 剑柄打击 -> 虔诚雕刻师
- T4 [code] combat/plan: code plan (+9.3 over next): 主宰 -> 虔诚雕刻师; hp -29, dmg 0
- T4 [code] combat/plan: code plan (only line): end turn; hp -29, dmg 0
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-11): 防御, 头槌+ -> 虔诚雕刻师, 打击 -> 虔诚雕刻师
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 头槌+ -> 虔诚雕刻师
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 虔诚雕刻师
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-11): end turn

### 各类决策由谁做
- combat/plan / code: 92
- combat/plan-continue / jev-plan: 45
- combat/plan-choice / jev: 43
- reward/claim / code: 41
- combat/plan-continue / code: 38
- map/route / code: 32
- combat/lethal / code: 19
- reward/card / code: 17
- reward/proceed / code: 16
- combat/plan-choice+potion / jev: 15
- selection/add / code: 10
- event/leave / code: 7
- rest/proceed / code: 7
- combat/plan-guarded / code: 5
- event/choose / jev: 5
- rest/choose / code: 5
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/end_turn / code: 2
- combat/least-loss / code: 2
- event/only / code: 2
- map/route / jev: 2
- rest/choose / jev: 2
- selection/add / jev: 2
- shop/buy / code: 2
- shop/leave / code: 2
- shop/open / code: 2
- combat/plan-choice+potion / code-fallback: 1
- run/finalize / code: 1
- selection/remove / code: 1
- selection/take into my hand / jev: 1
- shop/buy / jev: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：14 个
- 第 1 层 event/choose: Jev chose 轰鸣海螺 with confidence 0.21 (0.21)
- 第 3 层 combat/plan-choice: Jev chose plan 1/4 (头槌 -> 树叶史莱姆（小）, 痛击 -> 树叶史莱姆（小）) with confidence 0.27; code rank 1 (0.27)
- 第 6 层 event/choose: Jev chose 放入普通药水 with confidence 0.06 (0.06)
- 第 8 层 combat/plan-choice+potion: Jev chose to drink 技能药水 (confidence 0.30) (0.30)
- 第 8 层 selection/take into my hand: Jev chose 跃跃欲试 with confidence 0.34 (0.34)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (打击 -> 仪式兽, 旋风斩) with confidence 0.10; code rank 1 (0.10)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.10; code rank 1 (0.10)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 明耀酊剂 (confidence 0.10) (0.10)
- 第 21 层 shop/buy: Jev chose stop shopping with confidence 0.28 (0.28)
- 第 23 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.14; code rank 1 (0.14)
- 第 28 层 combat/plan-choice: Jev chose plan 1/4 (打击 -> 寄生惧魔, 御血术 -> 胧光怪) with confidence 0.19; code rank 1 (0.19)
- 第 28 层 combat/plan-choice: Jev chose plan 1/3 (剑柄打击+ -> 胧光怪) with confidence 0.17; code rank 1 (0.17)
- 第 33 层 combat/plan-choice+potion: Jev chose to drink 铁心药水 (confidence 0.20) (0.20)
- 第 34 层 event/choose: Jev chose 领主阳伞 with confidence 0.01 (0.01)
