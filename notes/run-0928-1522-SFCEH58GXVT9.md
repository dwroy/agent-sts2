## 复盘：run SFCEH58GXVT9 — 阵亡，最高第 33 层

- 决策 462 个；Jev 调用 115 次，Claude 0 次，DeepSeek 0 次；token 163,369 入 / 5,057 出，约 $0.0071；用时 26.6 分钟
- 决策者：code 231，jev 107，jev-plan 72，deepseek 44，code-fallback 8

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→60（-4），决策 code 5，jev 4，jev-plan 4
- 第 3 层 噬尸蛞蝓: HP 66→65（-1），决策 code 5，jev 3，jev-plan 2
- 第 4 层 淤泥旋螺: HP 70→64（-6），决策 jev 2，jev-plan 2，code 2
- 第 5 层 潮湿邪教徒/钙化邪教徒: HP 69→60（-9），决策 jev-plan 6，jev 5，code 5
- 第 8 层 鬼祟珊瑚群: HP 60→54（-6），决策 jev 4，jev-plan 3，code 3
- 第 8 层 鬼祟珊瑚群: HP 54→50（-4），决策 jev 2，code 1，jev-plan 1
- 第 8 层 鬼祟珊瑚群: HP 50→41（-9），决策 code 4，jev 2
- 第 14 层 骇鳗: HP 80→76（-4），决策 jev 4，jev-plan 2，code 2
- 第 14 层 骇鳗: HP 76→59（-17），决策 jev 3，code 3，jev-plan 1
- 第 14 层 骇鳗: HP 59→59（-0），决策 code 3
- 第 17 层 灵魂异鱼: HP 87→87（-0），决策 jev 1
- 第 17 层 灵魂异鱼: HP 87→10（-77），决策 jev 21，jev-plan 14，code 8，code-fallback 3
- 第 19 层 外骨骼虫: HP 72→71（-1），决策 jev 1，jev-plan 1，code 1
- 第 19 层 外骨骼虫: HP 71→51（-20），决策 code 4，jev 3，jev-plan 2
- 第 20 层 偷窃草蜢: HP 57→40（-17），决策 code 8，jev 4，jev-plan 4
- 第 23 层 寄生惧魔/胧光怪: HP 56→55（-1），决策 jev 4，jev-plan 3，code 2
- 第 23 层 寄生惧魔/胧光怪: HP 55→27（-28），决策 code 7，jev 5，jev-plan 3
- 第 25 层 幼虫/直飞产卵虫/结实的卵: HP 62→30（-32），决策 code 7，jev 5，jev-plan 4
- 第 28 层 异螨: HP 65→59（-6），决策 jev 7，code 3，jev-plan 2
- 第 28 层 异螨: HP 59→58（-1），决策 code 2，jev 1，jev-plan 1
- 第 30 层 虱虫之祖: HP 93→70（-23），决策 code 8，code-fallback 3，jev 2，jev-plan 1
- 第 31 层 啃咬机: HP 76→49（-27），决策 jev 5，jev-plan 4，code 4，code-fallback 1
- 第 31 层 啃咬机: HP 49→47（-2），决策 code 4，jev 3，jev-plan 1
- 第 33 层 火箭/碾碎爪: HP 82→11（-71），决策 jev 15，jev-plan 11，code 11，code-fallback 1
- 第 33 层 火箭/碾碎爪: HP 11→11（-0），决策 code 1

### 死亡战斗：第 33 层 火箭/碾碎爪
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-21): end turn

### 各类决策由谁做
- combat/plan-choice / jev: 86
- combat/plan-continue / jev-plan: 72
- combat/plan / code: 70
- reward/claim / code: 45
- map/route-follow / code: 29
- combat/plan-choice+potion / jev: 20
- combat/lethal / code: 16
- combat/plan-continue / code: 14
- reward/card / deepseek: 14
- reward/proceed / code: 14
- rest/choose / deepseek: 8
- rest/proceed / code: 8
- selection/add / code: 8
- selection/upgrade / deepseek: 6
- shop/buy / deepseek: 6
- combat/plan-choice / code-fallback: 5
- event/leave / code: 5
- event/choose / deepseek: 4
- combat/least-loss / code: 3
- combat/plan-choice+potion / code-fallback: 3
- shop/leave / code: 3
- shop/open / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- map/route-plan / deepseek: 2
- selection/remove / deepseek: 2
- shop/buy / code: 2
- bundle/choose / deepseek: 1
- bundle/confirm / code: 1
- event/only / code: 1
- map/route / code: 1
- run/finalize / code: 1
- selection/add / jev: 1
- selection/enchant / deepseek: 1
- selection/exhaust / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：41 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (防御, 上勾拳 -> 蟾蜍蝌蚪) with confidence 0.25; code rank 1 (0.25)
- 第 2 层 combat/plan-choice: Jev chose plan 3/3 (耸肩无视, 打击 -> 蟾蜍蝌蚪, 打击 -> 蟾蜍蝌蚪) with confidence 0.05; code rank 3 (0.05)
- 第 8 层 combat/plan-choice+potion: Jev chose plan 2/3 (防御, 头槌 -> 鬼祟珊瑚群) with confidence 0.07; code rank 2 (0.07)
- 第 14 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.21; code rank 1 (0.21)
- 第 14 层 combat/plan-choice: Jev chose plan 1/3 (突破, 剑柄打击 -> 骇鳗) with confidence 0.16; code rank 1 (0.16)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 3/3 (燃烧契约, 耸肩无视) with confidence 0.07; code rank 3 (0.07)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 2/2 (耸肩无视) with confidence 0.22; code rank 2 (0.22)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 4/4 (打击 -> 灵魂异鱼, 防御, 剑柄打击 -> 灵魂异鱼) with confidence 0.19; code rank 4 (0.19)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.32; code rank 1 (0.32)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (打击 -> 灵魂异鱼, 痛击+ -> 灵魂异鱼) with confidence 0.06; code rank 1 (0.06)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/2 (呼唤, 打击 -> 灵魂异鱼, 御血术 -> 灵魂异鱼) with confidence 0.09; code rank 1 (0.09)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/4 (打击 -> 灵魂异鱼, 突破) with confidence 0.20; code rank 1; HP guard: plan 1 (打击 -> 灵魂异鱼, 突破) loses 29 HP, more than 7 over the cheapest li (0.20)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.10; code rank 1 (0.10)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/3 (重锤 -> 灵魂异鱼) with confidence 0.22; code rank 1 (0.22)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 熔炉的祝福 (confidence 0.27) (0.27)
